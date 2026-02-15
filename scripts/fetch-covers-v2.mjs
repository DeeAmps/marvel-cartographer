#!/usr/bin/env node
/**
 * Cover Image Enrichment v2 — Conservative, resumable approach
 *
 * - ONE query per edition (not 4)
 * - 2-second delay between requests (not 500ms)
 * - Saves progress every 20 editions (resumable)
 * - Exponential backoff on rate limits
 * - Falls back to Open Library for any ISBN matches
 *
 * Usage:
 *   node scripts/fetch-covers-v2.mjs             # Run Google Books
 *   node scripts/fetch-covers-v2.mjs --skip=100  # Skip first 100 missing editions
 *   node scripts/fetch-covers-v2.mjs --limit=200 # Process max 200 editions
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

const args = process.argv.slice(2);
const skipArg = args.find(a => a.startsWith("--skip="));
const limitArg = args.find(a => a.startsWith("--limit="));
const skip = skipArg ? parseInt(skipArg.split("=")[1]) : 0;
const limit = limitArg ? parseInt(limitArg.split("=")[1]) : Infinity;

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function buildQuery(edition) {
  // Single, clean query — don't overthink it
  let title = edition.title
    .replace(/\(.*?\)/g, "")         // Remove parenthetical years
    .replace(/Vol\.\s*/, "Volume ")  // Expand Vol.
    .trim();

  // If we have an ISBN, just use that — most reliable
  if (edition.isbn) {
    return `isbn:${edition.isbn}`;
  }

  return `intitle:${title} Marvel`;
}

function getHighResUrl(imageLinks) {
  if (!imageLinks) return null;
  let url = imageLinks.thumbnail || imageLinks.smallThumbnail;
  if (!url) return null;
  url = url.replace("zoom=5", "zoom=1").replace("http://", "https://").replace("&edge=curl", "");
  return url;
}

async function searchWithBackoff(query, attempt = 0) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=3&printType=books`;

  const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });

  if (resp.status === 429) {
    const waitTime = Math.min(60000 * Math.pow(2, attempt), 300000); // 60s, 120s, 240s, max 5min
    console.log(`  Rate limited. Waiting ${waitTime / 1000}s (attempt ${attempt + 1})...`);
    await sleep(waitTime);
    if (attempt < 4) {
      return searchWithBackoff(query, attempt + 1);
    }
    return null;
  }

  if (!resp.ok) return null;

  const data = await resp.json();
  return data.items || null;
}

function findBestMatch(items, title) {
  if (!items || items.length === 0) return null;

  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const item of items) {
    const info = item.volumeInfo;
    if (!info) continue;
    const bookTitle = ((info.title || "") + " " + (info.subtitle || ""))
      .toLowerCase().replace(/[^a-z0-9]/g, "");

    if (bookTitle.includes(normalized) || normalized.includes(bookTitle)) {
      return info;
    }
  }

  // Fall back to first result if it has a cover
  const first = items[0]?.volumeInfo;
  if (first?.imageLinks?.thumbnail) return first;

  return null;
}

async function tryOpenLibrary(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
    return resp.status === 200 ? `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg` : null;
  } catch {
    return null;
  }
}

async function main() {
  console.log("Cover Enrichment v2 — Conservative approach");
  console.log("============================================\n");

  const raw = await readFile(DATA_PATH, "utf-8");
  const editions = JSON.parse(raw);

  const allMissing = editions.filter(e => !e.cover_image_url);
  const candidates = allMissing.slice(skip, skip + limit);

  console.log(`Total editions: ${editions.length}`);
  console.log(`Missing covers: ${allMissing.length}`);
  console.log(`Processing: ${candidates.length} (skip=${skip}, limit=${limit === Infinity ? "none" : limit})\n`);

  let found = 0;
  let failed = 0;
  let isbnBackfilled = 0;

  for (let i = 0; i < candidates.length; i++) {
    const edition = candidates[i];
    const query = buildQuery(edition);

    process.stdout.write(`[${i + 1}/${candidates.length}] ${edition.slug} ... `);

    try {
      const items = await searchWithBackoff(query);
      const match = findBestMatch(items, edition.title);

      if (match) {
        const coverUrl = getHighResUrl(match.imageLinks);
        const isbn13 = match.industryIdentifiers?.find(id => id.type === "ISBN_13")?.identifier;
        const isbn10 = match.industryIdentifiers?.find(id => id.type === "ISBN_10")?.identifier;

        if (coverUrl) {
          edition.cover_image_url = coverUrl;
          found++;
          console.log("FOUND");
        } else if (isbn13 || isbn10) {
          // Try Open Library with the ISBN we found
          const isbn = isbn13 || isbn10;
          const olUrl = await tryOpenLibrary(isbn);
          if (olUrl) {
            edition.cover_image_url = olUrl;
            found++;
            console.log("FOUND (Open Library fallback)");
          } else {
            failed++;
            console.log("no cover image");
          }
        } else {
          failed++;
          console.log("no cover image");
        }

        // Backfill ISBN
        if (!edition.isbn && (isbn13 || isbn10)) {
          edition.isbn = isbn13 || isbn10;
          isbnBackfilled++;
        }
      } else {
        failed++;
        console.log("no match");
      }
    } catch (err) {
      failed++;
      console.log(`error: ${err.message}`);
    }

    // Save progress every 20 editions
    if ((i + 1) % 20 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");
      const totalWithCovers = editions.filter(e => e.cover_image_url).length;
      console.log(`\n--- Saved. Progress: ${found} found, ${failed} failed. Total coverage: ${totalWithCovers}/${editions.length} ---\n`);
    }

    // 2-second delay between requests
    await sleep(2000);
  }

  // Final save
  await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");

  const totalWithCovers = editions.filter(e => e.cover_image_url).length;
  const totalMissing = editions.filter(e => !e.cover_image_url).length;

  console.log("\n============================================");
  console.log("  RESULTS");
  console.log("============================================");
  console.log(`Found:          ${found}`);
  console.log(`Failed:         ${failed}`);
  console.log(`ISBNs added:    ${isbnBackfilled}`);
  console.log(`Total coverage: ${totalWithCovers}/${editions.length} (${Math.round(totalWithCovers / editions.length * 100)}%)`);
  console.log(`Still missing:  ${totalMissing}`);
  console.log(`\nData saved to ${DATA_PATH}`);
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

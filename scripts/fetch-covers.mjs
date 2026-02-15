#!/usr/bin/env node
/**
 * Fetches cover images and ISBNs from Google Books API
 * for all collected editions in the catalog.
 *
 * Usage: node scripts/fetch-covers.mjs
 *
 * Respects rate limits with delays between requests.
 * Updates data/collected_editions.json in place.
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// Delay between API requests (ms) to be respectful
const DELAY_MS = 800;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Build a search query optimized for finding Marvel collected editions
function buildQuery(edition) {
  // Clean up title for search
  let title = edition.title
    .replace(/\(.*?\)/g, "") // Remove parenthetical years
    .replace(/Vol\.\s*/, "Volume ")
    .trim();

  return `intitle:${title} Marvel`;
}

async function searchGoogleBooks(query) {
  const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=3&printType=books`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`  API error: ${resp.status}`);
    return null;
  }
  const data = await resp.json();
  return data.items || [];
}

function findBestMatch(items, title) {
  if (!items || items.length === 0) return null;

  // Try to find exact-ish title match
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (const item of items) {
    const info = item.volumeInfo;
    const bookTitle = (info.title + " " + (info.subtitle || "")).toLowerCase().replace(/[^a-z0-9]/g, "");

    if (bookTitle.includes(normalizedTitle) || normalizedTitle.includes(bookTitle)) {
      return info;
    }
  }

  // Fall back to first result
  return items[0].volumeInfo;
}

function getHighResUrl(imageLinks) {
  if (!imageLinks) return null;

  // Google Books thumbnail URLs can be modified for higher resolution
  // Replace zoom=1 with zoom=0 for full size, or use thumbnail as-is
  let url = imageLinks.thumbnail || imageLinks.smallThumbnail;
  if (!url) return null;

  // Upgrade to higher resolution
  url = url.replace("zoom=5", "zoom=0").replace("zoom=1", "zoom=0");
  // Use HTTPS
  url = url.replace("http://", "https://");
  // Remove edge=curl for cleaner image
  url = url.replace("&edge=curl", "");

  return url;
}

async function main() {
  console.log("Loading collected editions...");
  const raw = await readFile(DATA_PATH, "utf-8");
  const editions = JSON.parse(raw);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < editions.length; i++) {
    const edition = editions[i];

    // Skip if already has a cover image
    if (edition.cover_image_url) {
      console.log(`[${i + 1}/${editions.length}] SKIP ${edition.slug} (already has cover)`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${editions.length}] Searching: ${edition.title}`);

    try {
      const query = buildQuery(edition);
      const items = await searchGoogleBooks(query);
      const match = findBestMatch(items, edition.title);

      if (match) {
        const coverUrl = getHighResUrl(match.imageLinks);
        const isbn13 = match.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier;
        const isbn10 = match.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier;

        if (coverUrl) {
          edition.cover_image_url = coverUrl;
          console.log(`  -> Cover found!`);
          updated++;
        } else {
          console.log(`  -> No cover image in result`);
          failed++;
        }

        if (isbn13) {
          edition.isbn = isbn13;
          console.log(`  -> ISBN-13: ${isbn13}`);
        } else if (isbn10) {
          edition.isbn = isbn10;
          console.log(`  -> ISBN-10: ${isbn10}`);
        }

        // Also try Open Library as fallback for cover
        if (!coverUrl && (isbn13 || isbn10)) {
          const isbn = isbn13 || isbn10;
          const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
          try {
            const olResp = await fetch(olUrl, { method: "HEAD" });
            if (olResp.ok) {
              edition.cover_image_url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
              console.log(`  -> Open Library fallback cover found!`);
              updated++;
              failed--;
            }
          } catch {
            // ignore
          }
        }
      } else {
        console.log(`  -> No results found`);
        failed++;
      }
    } catch (err) {
      console.error(`  -> Error: ${err.message}`);
      failed++;
    }

    await sleep(DELAY_MS);
  }

  // Write updated data
  await writeFile(DATA_PATH, JSON.stringify(editions, null, 4) + "\n", "utf-8");

  console.log("\n--- Results ---");
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (already had cover): ${skipped}`);
  console.log(`Failed (no cover found): ${failed}`);
  console.log(`Total: ${editions.length}`);
  console.log(`\nData written to ${DATA_PATH}`);
}

main().catch(console.error);

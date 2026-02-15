#!/usr/bin/env node
/**
 * Cover Image Enrichment v3 — Multi-source, no rate limiting
 *
 * Sources (in priority order):
 *   1. Open Library Search API → cover_i → direct cover URL
 *   2. Open Library Search API → ISBN → Amazon direct image URL
 *   3. Bookcover API (longitood.com) → Goodreads/Amazon covers
 *
 * The key insight: Open Library SEARCH API returns ISBNs and cover IDs
 * even when the cover URL pattern (by ISBN) doesn't work. Then we use
 * those ISBNs to construct Amazon direct image URLs which have no rate limit.
 *
 * Usage:
 *   node scripts/fetch-covers-v3.mjs             # Run all
 *   node scripts/fetch-covers-v3.mjs --skip=100  # Skip first 100
 *   node scripts/fetch-covers-v3.mjs --limit=50  # Process max 50
 *   node scripts/fetch-covers-v3.mjs --dry-run   # Preview only
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

const args = process.argv.slice(2);
const skipN = parseInt(args.find(a => a.startsWith("--skip="))?.split("=")[1] || "0");
const limitN = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] || "99999");
const dryRun = args.includes("--dry-run");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// ISBN-13 → ISBN-10 conversion
// ---------------------------------------------------------------------------
function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const body = isbn13.substring(3, 12); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(body[i]) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

// ---------------------------------------------------------------------------
// Source 1: Open Library Search API
// ---------------------------------------------------------------------------
async function searchOpenLibrary(title) {
  // Clean up title for better search results
  const cleaned = title
    .replace(/\(.*?\)/g, "")
    .replace(/Vol\.\s*/, "Volume ")
    .replace(/\s+/g, " ")
    .trim();

  const query = `${cleaned} Marvel`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,isbn,cover_i,publisher`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.docs || data.docs.length === 0) return null;

    // Score results by title similarity
    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

    let best = null;
    let bestScore = -1;

    for (const doc of data.docs) {
      const docTitle = (doc.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      let score = 0;

      if (docTitle === normalizedTitle) score = 100;
      else if (docTitle.includes(normalizedTitle)) score = 80;
      else if (normalizedTitle.includes(docTitle)) score = 60;
      else {
        // Word-level overlap
        const titleWords = normalizedTitle.match(/.{4,}/g) || [];
        for (const w of titleWords) {
          if (docTitle.includes(w)) score += 15;
        }
      }

      // Bonus for having a cover
      if (doc.cover_i) score += 30;

      // Bonus for having ISBNs
      if (doc.isbn && doc.isbn.length > 0) score += 10;

      // Bonus for Marvel publisher
      if (doc.publisher && doc.publisher.some(p => p.toLowerCase().includes("marvel"))) {
        score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        best = doc;
      }
    }

    if (!best || bestScore < 20) return null;

    return {
      title: best.title,
      coverId: best.cover_i || null,
      isbns: best.isbn || [],
      score: bestScore,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 2: Amazon direct image URL (from ISBN-10)
// ---------------------------------------------------------------------------
async function getAmazonCover(isbn10) {
  const url = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;

  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) return null;

    // Check content-length to filter out placeholders (43 bytes)
    const contentLength = parseInt(resp.headers.get("content-length") || "0");
    if (contentLength < 1000) return null; // Placeholder images are tiny

    return url;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Source 3: Bookcover API (longitood.com)
// ---------------------------------------------------------------------------
async function getBookcoverUrl(isbn) {
  try {
    const resp = await fetch(`https://bookcover.longitood.com/bookcover/${isbn}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.url || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main pipeline for a single edition
// ---------------------------------------------------------------------------
async function findCover(edition) {
  const result = { coverUrl: null, isbn: null, source: null };

  // === Phase 1: If edition already has ISBN, try Amazon + Bookcover directly ===
  if (edition.isbn) {
    const isbn10 = isbn13to10(edition.isbn) || edition.isbn;

    // Try Amazon
    const amazonUrl = await getAmazonCover(isbn10);
    if (amazonUrl) {
      result.coverUrl = amazonUrl;
      result.source = "amazon_direct";
      return result;
    }

    // Try Bookcover API
    const bcUrl = await getBookcoverUrl(edition.isbn);
    if (bcUrl) {
      result.coverUrl = bcUrl;
      result.source = "bookcover_api";
      return result;
    }
  }

  // === Phase 2: Search Open Library for ISBN and cover_i ===
  const olResult = await searchOpenLibrary(edition.title);
  if (olResult) {
    // Try OL cover by cover_i
    if (olResult.coverId) {
      const coverUrl = `https://covers.openlibrary.org/b/id/${olResult.coverId}-L.jpg`;
      result.coverUrl = coverUrl;
      result.source = "open_library_cover_id";

      // Also backfill ISBN if found
      if (!edition.isbn && olResult.isbns.length > 0) {
        const isbn13 = olResult.isbns.find(i => i.startsWith("978") && i.length === 13);
        const isbn10 = olResult.isbns.find(i => i.length === 10);
        result.isbn = isbn13 || isbn10 || null;
      }
      return result;
    }

    // No cover_i but has ISBNs — try Amazon direct
    if (olResult.isbns.length > 0) {
      // Find a usable ISBN
      const isbn13 = olResult.isbns.find(i => i.startsWith("978") && i.length === 13);
      const isbn10f = olResult.isbns.find(i => i.length === 10 && !i.startsWith("978"));
      const useIsbn10 = isbn10f || (isbn13 ? isbn13to10(isbn13) : null);

      if (useIsbn10) {
        const amazonUrl = await getAmazonCover(useIsbn10);
        if (amazonUrl) {
          result.coverUrl = amazonUrl;
          result.isbn = isbn13 || isbn10f || null;
          result.source = "amazon_via_ol_isbn";
          return result;
        }
      }

      // Try Bookcover API with found ISBN
      const bcIsbn = isbn13 || isbn10f || olResult.isbns[0];
      if (bcIsbn) {
        const bcUrl = await getBookcoverUrl(bcIsbn);
        if (bcUrl) {
          result.coverUrl = bcUrl;
          result.isbn = isbn13 || isbn10f || null;
          result.source = "bookcover_via_ol_isbn";
          return result;
        }
      }

      // Even without cover, backfill the ISBN
      if (!edition.isbn) {
        result.isbn = isbn13 || isbn10f || null;
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("Cover Enrichment v3 — Multi-source approach");
  console.log("=============================================\n");

  const raw = await readFile(DATA_PATH, "utf-8");
  const editions = JSON.parse(raw);

  const allMissing = editions.filter(e => !e.cover_image_url);
  const candidates = allMissing.slice(skipN, skipN + limitN);

  console.log(`Total editions: ${editions.length}`);
  console.log(`Missing covers: ${allMissing.length}`);
  console.log(`Processing: ${candidates.length} (skip=${skipN}, limit=${limitN >= 99999 ? "none" : limitN})`);
  console.log(`Dry run: ${dryRun}\n`);

  let found = 0;
  let failed = 0;
  let isbnBackfilled = 0;
  const sourceCounts = {};

  for (let i = 0; i < candidates.length; i++) {
    const edition = candidates[i];

    process.stdout.write(`[${i + 1}/${candidates.length}] ${edition.slug} ... `);

    try {
      const result = await findCover(edition);

      if (result.coverUrl) {
        if (!dryRun) edition.cover_image_url = result.coverUrl;
        found++;
        sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
        console.log(`FOUND (${result.source})`);
      } else {
        failed++;
        console.log("not found");
      }

      if (result.isbn && !edition.isbn) {
        if (!dryRun) edition.isbn = result.isbn;
        isbnBackfilled++;
      }
    } catch (err) {
      failed++;
      console.log(`error: ${err.message}`);
    }

    // Save progress every 25 editions
    if (!dryRun && (i + 1) % 25 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");
      const totalCov = editions.filter(e => e.cover_image_url).length;
      console.log(`\n--- Saved. ${found} found so far. Coverage: ${totalCov}/${editions.length} (${Math.round(totalCov / editions.length * 100)}%) ---\n`);
    }

    // 1.5s delay between editions (respectful to OL)
    await sleep(1500);
  }

  // Final save
  if (!dryRun) {
    await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");
  }

  const totalCov = editions.filter(e => e.cover_image_url).length;
  const totalMissing = editions.filter(e => !e.cover_image_url).length;

  console.log("\n=============================================");
  console.log("  RESULTS");
  console.log("=============================================");
  console.log(`Found:        ${found}`);
  console.log(`Failed:       ${failed}`);
  console.log(`ISBNs added:  ${isbnBackfilled}`);
  console.log(`\nBy source:`);
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }
  console.log(`\nCoverage: ${totalCov}/${editions.length} (${Math.round(totalCov / editions.length * 100)}%)`);
  console.log(`Still missing: ${totalMissing}`);

  if (totalMissing > 0 && totalMissing <= 30) {
    console.log(`\nRemaining missing:`);
    editions.filter(e => !e.cover_image_url).forEach(e => console.log(`  - ${e.slug}`));
  }

  if (!dryRun) {
    console.log(`\nData saved to ${DATA_PATH}`);
  } else {
    console.log("\n[DRY RUN] No changes written.");
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

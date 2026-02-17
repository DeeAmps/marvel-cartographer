#!/usr/bin/env node

/**
 * Targeted cover enrichment for DB editions missing covers.
 *
 * 1. Queries Supabase for editions with null/empty cover_image_url
 * 2. Tries multiple sources: Open Library ISBN, Amazon direct, Google Books, Bookcover API
 * 3. Patches covers directly back into Supabase
 *
 * Usage: node scripts/enrich-missing-covers-db.mjs
 *        node scripts/enrich-missing-covers-db.mjs --dry-run
 */

import { readFileSync } from "fs";

// ---------------------------------------------------------------------------
// .env loading
// ---------------------------------------------------------------------------
const envContent = readFileSync(".env", "utf-8");
for (const line of envContent.split("\n")) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eqIdx = trimmed.indexOf("=");
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim();
  if (!process.env[key]) process.env[key] = val;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const dryRun = process.argv.includes("--dry-run");

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// ISBN-13 → ISBN-10 conversion
// ---------------------------------------------------------------------------
function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const body = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(body[i]) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

// ---------------------------------------------------------------------------
// Validate ISBN checksum
// ---------------------------------------------------------------------------
function isValidIsbn13(isbn) {
  if (!isbn || isbn.length !== 13 || !/^\d{13}$/.test(isbn)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(isbn[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return check === parseInt(isbn[12]);
}

function isValidIsbn10(isbn) {
  if (!isbn || isbn.length !== 10) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    if (!/\d/.test(isbn[i])) return false;
    sum += parseInt(isbn[i]) * (10 - i);
  }
  const last = isbn[9].toUpperCase();
  sum += last === "X" ? 10 : parseInt(last);
  return sum % 11 === 0;
}

// ---------------------------------------------------------------------------
// Source 1: Open Library — direct ISBN cover URL (HEAD check)
// ---------------------------------------------------------------------------
async function tryOpenLibraryIsbn(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  const checkUrl = `${url}?default=false`;
  try {
    const resp = await fetch(checkUrl, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
    });
    if (resp.status === 200) return url;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Source 2: Amazon direct image URL (from ISBN-10)
// ---------------------------------------------------------------------------
async function tryAmazonDirect(isbn10) {
  const url = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const contentLength = parseInt(resp.headers.get("content-length") || "0");
    if (contentLength < 1000) return null; // placeholder
    return url;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Source 3: Google Books API (search by ISBN or title)
// ---------------------------------------------------------------------------
async function tryGoogleBooks(title, isbn) {
  // Try ISBN first, then title
  const queries = [];
  if (isbn) queries.push(`isbn:${isbn}`);
  queries.push(`intitle:"${title}" Marvel`);

  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (resp.status === 429) {
        console.log("  Google Books rate limit — waiting 60s...");
        await sleep(60000);
        continue;
      }
      if (!resp.ok) continue;

      const data = await resp.json();
      if (!data.items) continue;

      // Find best match with a cover
      const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

      for (const item of data.items) {
        const info = item.volumeInfo;
        if (!info?.imageLinks?.thumbnail) continue;

        const bookTitle = ((info.title || "") + " " + (info.subtitle || ""))
          .toLowerCase().replace(/[^a-z0-9]/g, "");

        // Check title similarity
        let score = 0;
        if (bookTitle.includes(normalizedTitle)) score = 100;
        else if (normalizedTitle.includes(bookTitle)) score = 80;
        else {
          const words = normalizedTitle.match(/.{4,}/g) || [];
          for (const w of words) {
            if (bookTitle.includes(w)) score += 15;
          }
        }

        // Also accept ISBN match regardless of title
        const bookIsbns = (info.industryIdentifiers || []).map(i => i.identifier);
        if (isbn && bookIsbns.includes(isbn)) score = 100;

        if (score >= 30) {
          let coverUrl = info.imageLinks.thumbnail;
          coverUrl = coverUrl
            .replace("http://", "https://")
            .replace("zoom=5", "zoom=1")
            .replace("&edge=curl", "");
          return coverUrl;
        }
      }
    } catch {}
    await sleep(500);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Source 4: Bookcover API (longitood.com)
// ---------------------------------------------------------------------------
async function tryBookcoverApi(isbn) {
  try {
    const resp = await fetch(`https://bookcover.longitood.com/bookcover/${isbn}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.url || null;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
async function fetchMissing() {
  let all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/collected_editions` +
      `?select=id,slug,title,isbn,format,print_status,importance` +
      `&or=(cover_image_url.is.null,cover_image_url.eq.)` +
      `&order=title&offset=${offset}&limit=${PAGE}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Failed to fetch: ${resp.status} ${await resp.text()}`);
      break;
    }
    const batch = await resp.json();
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return all;
}

async function patchCover(id, coverUrl) {
  const url = `${SUPABASE_URL}/rest/v1/collected_editions?id=eq.${id}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ cover_image_url: coverUrl }),
  });
  return resp.ok;
}

// ---------------------------------------------------------------------------
// Main pipeline for a single edition
// ---------------------------------------------------------------------------
async function findCover(edition) {
  const { title, isbn } = edition;

  // Validate ISBN before using it
  let validIsbn = null;
  if (isbn && isbn.trim()) {
    const cleaned = isbn.replace(/[^0-9X]/gi, "");
    if (cleaned.length === 13 && isValidIsbn13(cleaned)) {
      validIsbn = cleaned;
    } else if (cleaned.length === 10 && isValidIsbn10(cleaned)) {
      validIsbn = cleaned;
    } else {
      // ISBN present but invalid checksum
      console.log(`\n  WARNING: Invalid ISBN checksum for "${title}": ${isbn}`);
    }
  }

  const isbn10 = validIsbn ? (isbn13to10(validIsbn) || validIsbn) : null;

  // Source 1: Open Library by ISBN
  if (validIsbn) {
    const olUrl = await tryOpenLibraryIsbn(validIsbn);
    if (olUrl) return { url: olUrl, source: "open_library_isbn" };
  }

  // Source 2: Amazon direct by ISBN-10
  if (isbn10) {
    const amzUrl = await tryAmazonDirect(isbn10);
    if (amzUrl) return { url: amzUrl, source: "amazon_direct" };
  }

  // Source 3: Google Books (ISBN then title)
  const gbUrl = await tryGoogleBooks(title, validIsbn);
  if (gbUrl) return { url: gbUrl, source: "google_books" };

  // Source 4: Bookcover API
  if (validIsbn) {
    const bcUrl = await tryBookcoverApi(validIsbn);
    if (bcUrl) return { url: bcUrl, source: "bookcover_api" };
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(55));
  console.log("  Cover Enrichment — Direct DB (134 missing targets)");
  console.log("=".repeat(55));
  console.log(`Dry run: ${dryRun}\n`);

  // Step 1: Fetch missing editions from Supabase
  console.log("Fetching editions with missing covers from Supabase...");
  const missing = await fetchMissing();
  console.log(`Found ${missing.length} editions missing covers\n`);

  if (missing.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  // Stats
  let found = 0;
  let failed = 0;
  let invalidIsbn = 0;
  const sourceCounts = {};
  const failures = [];

  // Step 2: Process each edition
  for (let i = 0; i < missing.length; i++) {
    const edition = missing[i];
    const hasIsbn = edition.isbn && edition.isbn.trim();

    process.stdout.write(`[${i + 1}/${missing.length}] ${edition.title.substring(0, 60).padEnd(60)} `);

    const result = await findCover(edition);

    if (result) {
      found++;
      sourceCounts[result.source] = (sourceCounts[result.source] || 0) + 1;
      console.log(`FOUND (${result.source})`);

      if (!dryRun) {
        const ok = await patchCover(edition.id, result.url);
        if (!ok) console.log(`  ERROR: Failed to patch DB for ${edition.slug}`);
      }
    } else {
      failed++;
      failures.push({ title: edition.title, isbn: edition.isbn, slug: edition.slug });
      console.log(`NOT FOUND${hasIsbn ? "" : " (no ISBN)"}`);
    }

    // Respectful delay between editions
    await sleep(1200);

    // Progress every 20
    if ((i + 1) % 20 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${missing.length} | Found: ${found} | Failed: ${failed} ---\n`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(55));
  console.log("  RESULTS");
  console.log("=".repeat(55));
  console.log(`\nProcessed: ${missing.length}`);
  console.log(`Found:     ${found}`);
  console.log(`Failed:    ${failed}`);
  console.log(`\nBy source:`);
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }

  if (failures.length > 0 && failures.length <= 50) {
    console.log(`\nStill missing (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.title} (ISBN: ${f.isbn || "none"})`);
    }
  }

  if (dryRun) {
    console.log("\n[DRY RUN] No changes written to DB.");
  } else {
    console.log(`\n${found} covers patched directly into Supabase.`);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

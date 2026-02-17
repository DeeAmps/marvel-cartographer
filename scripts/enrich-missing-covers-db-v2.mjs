#!/usr/bin/env node

/**
 * Cover enrichment v2 — strips variant cover artist names from titles
 * and searches for the base edition. Most of the 122 remaining are
 * "X-Men Omnibus Vol. 1 Jim Lee Cover" where the base "X-Men Omnibus Vol. 1"
 * IS indexed in Open Library / Google Books / Amazon.
 *
 * Usage: node scripts/enrich-missing-covers-db-v2.mjs
 *        node scripts/enrich-missing-covers-db-v2.mjs --dry-run
 */

import { readFileSync } from "fs";

// .env loading
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

function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const body = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(body[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

// ---------------------------------------------------------------------------
// Strip variant cover artist names to get base title
// ---------------------------------------------------------------------------
function getBaseTitle(title) {
  // Common patterns:
  // "X-Men Omnibus Vol. 1 Jim Lee Cover" → "X-Men Omnibus Vol. 1"
  // "Immortal Hulk Omnibus HC Ross Timeless Cover" → "Immortal Hulk Omnibus"
  // "Captain America Omnibus Vol. 2 John Romita Sr. Cover" → "Captain America Omnibus Vol. 2"

  let base = title;

  // Remove "Cover" suffix and the artist name before it
  // Pattern: everything after the last known structural word (Vol., HC, Omnibus, etc.) + artist name + Cover
  base = base
    .replace(/\s+[A-Z][a-zA-Z'.]+(\s+[A-Z][a-zA-Z'.]+)*\s+Cover$/i, "")
    .replace(/\s+HC\s*$/, "")
    .replace(/\s+Nc\s+.*$/i, "")  // "Nc Kirby Cover" leftover
    .trim();

  // If we stripped too much or nothing, try more patterns
  if (base === title) {
    // Try removing everything after known keywords that wouldn't be followed by more title
    const coverMatch = title.match(/^(.+?)\s+(?:[A-Z][a-z]+\s+){1,4}Cover$/);
    if (coverMatch) base = coverMatch[1].trim();
  }

  // Remove trailing "HC" if present
  base = base.replace(/\s+HC$/i, "").trim();

  return base;
}

// Build multiple search query variations
function buildQueries(title, baseTitle, isbn) {
  const queries = [];

  // ISBN search (most precise)
  if (isbn) queries.push(`isbn:${isbn}`);

  // Base title searches
  if (baseTitle !== title) {
    queries.push(`intitle:"${baseTitle}" inpublisher:Marvel`);
    queries.push(`"${baseTitle}" Marvel omnibus`);
  }

  // Original title (less likely to work but worth trying)
  queries.push(`intitle:"${title}" Marvel`);

  // Very simplified - core series name only
  const core = baseTitle
    .replace(/Omnibus|Vol\.|Volume|HC|Gallery Edition|Archive Edition|Marvel Masterworks:|Mighty Marvel Masterworks:/gi, "")
    .replace(/\d+/g, (m) => parseInt(m) > 100 ? "" : m)
    .replace(/\s+/g, " ")
    .trim();
  if (core.length > 5) {
    queries.push(`"${core}" Marvel comics`);
  }

  return queries;
}

// ---------------------------------------------------------------------------
// Google Books search with multiple query strategies
// ---------------------------------------------------------------------------
async function tryGoogleBooks(queries) {
  for (const query of queries) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (resp.status === 429) {
        console.log("\n  Rate limited — waiting 60s...");
        await sleep(60000);
        continue;
      }
      if (!resp.ok) continue;

      const data = await resp.json();
      if (!data.items) continue;

      for (const item of data.items) {
        const info = item.volumeInfo;
        if (!info?.imageLinks?.thumbnail) continue;

        // Check if publisher is Marvel
        const isMarvelpub = info.publisher?.toLowerCase().includes("marvel");

        // Accept if Marvel publisher, or if query was ISBN-based
        if (isMarvelpub || query.startsWith("isbn:")) {
          let coverUrl = info.imageLinks.thumbnail;
          coverUrl = coverUrl
            .replace("http://", "https://")
            .replace("zoom=5", "zoom=1")
            .replace("&edge=curl", "");
          return { url: coverUrl, matchedTitle: info.title };
        }
      }
    } catch {}
    await sleep(400);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Open Library search by base title
// ---------------------------------------------------------------------------
async function tryOpenLibrarySearch(baseTitle) {
  const query = `${baseTitle} Marvel`;
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,cover_i,publisher,isbn`;

  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.docs) return null;

    for (const doc of data.docs) {
      if (!doc.cover_i) continue;
      const isMarvel = doc.publisher?.some(p => p.toLowerCase().includes("marvel"));
      if (isMarvel) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    }

    // Fallback: any result with a cover
    for (const doc of data.docs) {
      if (doc.cover_i) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    }
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Amazon direct by ISBN
// ---------------------------------------------------------------------------
async function tryAmazonDirect(isbn) {
  const isbn10 = isbn13to10(isbn) || isbn;
  const url = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
  try {
    const resp = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const len = parseInt(resp.headers.get("content-length") || "0");
    if (len < 1000) return null;
    return url;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
async function fetchMissing() {
  let all = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/collected_editions` +
      `?select=id,slug,title,isbn,format` +
      `&or=(cover_image_url.is.null,cover_image_url.eq.)` +
      `&order=title&offset=${offset}&limit=1000`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) break;
    const batch = await resp.json();
    all.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
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
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(55));
  console.log("  Cover Enrichment v2 — Base Title Strategy");
  console.log("=".repeat(55));
  console.log(`Dry run: ${dryRun}\n`);

  const missing = await fetchMissing();
  console.log(`Found ${missing.length} editions still missing covers\n`);

  if (missing.length === 0) {
    console.log("Nothing to do!");
    return;
  }

  let found = 0;
  let failed = 0;
  const sourceCounts = {};
  const failures = [];

  for (let i = 0; i < missing.length; i++) {
    const edition = missing[i];
    const baseTitle = getBaseTitle(edition.title);
    const titleChanged = baseTitle !== edition.title;

    process.stdout.write(
      `[${i + 1}/${missing.length}] ${edition.title.substring(0, 55).padEnd(55)} `
    );
    if (titleChanged) {
      process.stdout.write(`\n  base: "${baseTitle}" ... `);
    }

    let coverUrl = null;
    let source = null;

    // Strategy 1: Amazon direct with existing ISBN
    if (edition.isbn && edition.isbn.trim()) {
      coverUrl = await tryAmazonDirect(edition.isbn);
      if (coverUrl) source = "amazon_direct";
    }

    // Strategy 2: Google Books with base title + ISBN
    if (!coverUrl) {
      const queries = buildQueries(edition.title, baseTitle, edition.isbn);
      const gbResult = await tryGoogleBooks(queries);
      if (gbResult) {
        coverUrl = gbResult.url;
        source = `google_books (matched: "${gbResult.matchedTitle}")`;
      }
    }

    // Strategy 3: Open Library search with base title
    if (!coverUrl && titleChanged) {
      coverUrl = await tryOpenLibrarySearch(baseTitle);
      if (coverUrl) source = "open_library_search";
    }

    if (coverUrl) {
      found++;
      const shortSource = source.split(" (")[0];
      sourceCounts[shortSource] = (sourceCounts[shortSource] || 0) + 1;
      console.log(`FOUND (${source})`);

      if (!dryRun) {
        const ok = await patchCover(edition.id, coverUrl);
        if (!ok) console.log(`  ERROR patching DB`);
      }
    } else {
      failed++;
      failures.push({ title: edition.title, base: baseTitle, isbn: edition.isbn });
      console.log("NOT FOUND");
    }

    await sleep(1200);

    if ((i + 1) % 20 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${missing.length} | Found: ${found} | Failed: ${failed} ---\n`);
    }
  }

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

  if (failures.length > 0) {
    console.log(`\nStill missing (${failures.length}):`);
    for (const f of failures) {
      console.log(`  - ${f.title}${f.isbn ? ` (ISBN: ${f.isbn})` : " (no ISBN)"}`);
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

#!/usr/bin/env node

/**
 * Cover enrichment — skips Google Books (rate limited).
 * Uses: Open Library ISBN, Amazon Direct, Bookcover API, Open Library Search.
 *
 * Usage: node scripts/enrich-covers-no-google.mjs
 */

import { readFileSync } from "fs";

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

// Source 1: Open Library ISBN cover
async function tryOlIsbn(isbn) {
  const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const resp = await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (resp.status === 200) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  } catch {}
  return null;
}

// Source 2: Amazon Direct
async function tryAmazon(isbn10) {
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

// Source 3: Bookcover API
async function tryBookcover(isbn) {
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

// Source 4: Open Library Search (by title)
async function tryOlSearch(title) {
  const cleaned = title
    .replace(/\(.*?\)/g, "")
    .replace(/Vol\.\s*/, "Volume ")
    .replace(/\s+[A-Z][a-zA-Z'.]+(\s+[A-Z][a-zA-Z'.]+)*\s+Cover$/i, "")
    .replace(/\s+HC$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const query = `${cleaned} Marvel`;
  try {
    const resp = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,cover_i,publisher`,
      { signal: AbortSignal.timeout(15000) }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.docs) return null;

    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

    // Score results
    for (const doc of data.docs) {
      if (!doc.cover_i) continue;
      const docTitle = (doc.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      let score = 0;
      if (docTitle.includes(normalizedTitle) || normalizedTitle.includes(docTitle)) score = 100;
      else {
        const words = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matched = words.filter(w => docTitle.includes(w.replace(/[^a-z0-9]/g, "")));
        score = words.length > 0 ? (matched.length / words.length) * 100 : 0;
      }

      const isMarvel = doc.publisher?.some(p => p.toLowerCase().includes("marvel"));
      if (isMarvel) score += 20;

      if (score >= 50) {
        return `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    }
  } catch {}
  return null;
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

async function main() {
  console.log("Cover Enrichment (No Google Books)\n");

  // Fetch missing
  let missing = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/collected_editions` +
      `?select=id,slug,title,isbn,format` +
      `&or=(cover_image_url.is.null,cover_image_url.eq.)` +
      `&order=title&offset=${offset}&limit=1000`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) break;
    const batch = await resp.json();
    missing.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }

  console.log(`${missing.length} editions missing covers\n`);

  let found = 0;
  let failed = 0;
  const sourceCounts = {};

  for (let i = 0; i < missing.length; i++) {
    const e = missing[i];
    const isbn = e.isbn?.replace(/[^0-9X]/gi, "") || null;
    const isbn10 = isbn ? (isbn13to10(isbn) || isbn) : null;

    process.stdout.write(`[${i + 1}/${missing.length}] ${e.title.substring(0, 55).padEnd(55)} `);

    let coverUrl = null;
    let source = null;

    // 1. OL ISBN
    if (isbn && !coverUrl) {
      coverUrl = await tryOlIsbn(isbn);
      if (coverUrl) source = "open_library_isbn";
    }

    // 2. Amazon
    if (isbn10 && !coverUrl) {
      coverUrl = await tryAmazon(isbn10);
      if (coverUrl) source = "amazon_direct";
    }

    // 3. Bookcover API
    if (isbn && !coverUrl) {
      coverUrl = await tryBookcover(isbn);
      if (coverUrl) source = "bookcover_api";
    }

    // 4. OL Search (title)
    if (!coverUrl) {
      coverUrl = await tryOlSearch(e.title);
      if (coverUrl) source = "open_library_search";
    }

    if (coverUrl) {
      found++;
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
      console.log(`FOUND (${source})`);
      if (!dryRun) await patchCover(e.id, coverUrl);
    } else {
      failed++;
      console.log("NOT FOUND");
    }

    await sleep(800);

    if ((i + 1) % 25 === 0) {
      console.log(`\n--- ${i + 1}/${missing.length} | Found: ${found} | Failed: ${failed} ---\n`);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Processed: ${missing.length}`);
  console.log(`Found: ${found}`);
  console.log(`Failed: ${failed}`);
  console.log(`\nBy source:`);
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }
  if (!dryRun) console.log(`\n${found} covers patched into Supabase.`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

#!/usr/bin/env node

/**
 * Replace unreliable Open Library ISBN and Google Books covers with Amazon Direct covers.
 * Amazon covers are more reliable and consistently match the correct book.
 *
 * Usage:
 *   node scripts/replace-covers-with-amazon.mjs --dry-run    # Preview only
 *   node scripts/replace-covers-with-amazon.mjs              # Execute changes
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

async function tryAmazon(isbn10) {
  const url = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
  try {
    const resp = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const len = parseInt(resp.headers.get("content-length") || "0");
    if (len < 1000) return null; // placeholder image
    return url;
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
  console.log("=".repeat(55));
  console.log("  Replace OL/Google Covers with Amazon");
  console.log(`  Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log("=".repeat(55));
  console.log();

  // Fetch all editions with covers
  let all = [];
  let offset = 0;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/collected_editions` +
      `?select=id,slug,title,isbn,cover_image_url` +
      `&cover_image_url=not.is.null&cover_image_url=neq.` +
      `&order=title&offset=${offset}&limit=1000`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) break;
    const batch = await resp.json();
    all.push(...batch);
    if (batch.length < 1000) break;
    offset += 1000;
  }

  // Filter to OL ISBN + Google Books covers that have a valid ISBN
  const targets = all.filter(e => {
    const isOL = e.cover_image_url?.includes("covers.openlibrary.org/b/isbn/");
    const isGoogle = e.cover_image_url?.includes("books.google.com");
    if (!isOL && !isGoogle) return false;
    const isbn = e.isbn?.replace(/[^0-9X]/gi, "") || "";
    return isbn.length >= 10;
  });

  console.log(`Total editions with covers: ${all.length}`);
  console.log(`OL ISBN + Google Books covers with valid ISBN: ${targets.length}`);
  console.log();

  let replaced = 0;
  let kept = 0;
  let failed = 0;
  const sourceBreakdown = { ol_isbn: 0, google: 0 };

  for (let i = 0; i < targets.length; i++) {
    const e = targets[i];
    const isbn = e.isbn.replace(/[^0-9X]/gi, "");
    const isbn10 = isbn.length === 13 ? isbn13to10(isbn) : isbn.length === 10 ? isbn : null;

    const source = e.cover_image_url.includes("openlibrary") ? "OL" : "GB";
    process.stdout.write(`[${i + 1}/${targets.length}] (${source}) ${e.title.substring(0, 50).padEnd(50)} `);

    if (!isbn10) {
      console.log("NO ISBN-10");
      failed++;
      continue;
    }

    const amazonUrl = await tryAmazon(isbn10);

    if (amazonUrl) {
      replaced++;
      if (source === "OL") sourceBreakdown.ol_isbn++;
      else sourceBreakdown.google++;
      console.log("REPLACED");
      if (!dryRun) await patchCover(e.id, amazonUrl);
    } else {
      kept++;
      console.log("NO AMAZON (kept)");
    }

    await sleep(300);

    if ((i + 1) % 50 === 0) {
      console.log(`\n--- ${i + 1}/${targets.length} | Replaced: ${replaced} | Kept: ${kept} | Failed: ${failed} ---\n`);
    }
  }

  console.log(`\n${"=".repeat(55)}`);
  console.log(`Processed: ${targets.length}`);
  console.log(`Replaced with Amazon: ${replaced}`);
  console.log(`  from OL ISBN: ${sourceBreakdown.ol_isbn}`);
  console.log(`  from Google Books: ${sourceBreakdown.google}`);
  console.log(`Kept (no Amazon available): ${kept}`);
  console.log(`Failed (no ISBN-10): ${failed}`);
  if (!dryRun) console.log(`\n${replaced} covers updated in Supabase.`);
  else console.log(`\nDRY RUN — no changes made.`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

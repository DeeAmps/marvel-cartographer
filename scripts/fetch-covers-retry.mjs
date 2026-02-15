#!/usr/bin/env node
/**
 * Cover Retry — Alternate search strategies for remaining missing covers
 *
 * Uses multiple query variations per edition against Open Library + Amazon:
 *   1. Full title search
 *   2. Stripped title (no volume numbers, format words)
 *   3. Series name + "Marvel" + format type
 *   4. Creator name + series name (if we have creators data)
 *
 * Also tries ISBN → Amazon for any newly discovered ISBNs.
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const body = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(body[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

async function getAmazonCover(isbn10) {
  const url = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
  try {
    const resp = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return null;
    const cl = parseInt(resp.headers.get("content-length") || "0");
    return cl > 1000 ? url : null;
  } catch { return null; }
}

function buildAlternateQueries(edition) {
  const title = edition.title;
  const queries = [];

  // Strategy 1: Original title
  queries.push(title);

  // Strategy 2: Strip format words + volume numbers for broader match
  const stripped = title
    .replace(/Omnibus|Epic Collection|Complete Collection|Trade Paperback|Masterworks|Compendium|Oversized Hardcover/gi, "")
    .replace(/Vol\.\s*\d+|Volume\s*\d+/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped !== title) queries.push(stripped + " Marvel");

  // Strategy 3: Try with "omnibus" or "marvel comics" appended
  if (edition.format === "omnibus") {
    queries.push(stripped + " Omnibus");
  }

  // Strategy 4: Extract just the character/team name
  const seriesMatch = title.match(/^([\w\s\-']+?)(?:\s+(?:Omnibus|by|Epic|Complete|Vol|Volume|Classic|\())/i);
  if (seriesMatch) {
    const series = seriesMatch[1].trim();
    queries.push(series + " Marvel Comics");
  }

  // Strategy 5: Slug-based — convert slug to title-like search
  const fromSlug = edition.slug
    .replace(/-/g, " ")
    .replace(/\bv(\d+)\b/g, "Volume $1")
    .replace(/\bomnibus\b/gi, "Omnibus");
  if (fromSlug !== title.toLowerCase()) {
    queries.push(fromSlug + " Marvel");
  }

  return [...new Set(queries)]; // Deduplicate
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5&fields=title,isbn,cover_i,publisher`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.docs || null;
  } catch { return null; }
}

function scoreDocs(docs, title) {
  if (!docs || docs.length === 0) return null;
  const norm = title.toLowerCase().replace(/[^a-z0-9]/g, "");

  let best = null;
  let bestScore = -1;

  for (const doc of docs) {
    const docNorm = (doc.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    let score = 0;

    if (docNorm === norm) score = 100;
    else if (docNorm.includes(norm)) score = 80;
    else if (norm.includes(docNorm)) score = 60;
    else {
      // Word overlap — use longer chunks for better matching
      const words = norm.match(/.{5,}/g) || [];
      for (const w of words) {
        if (docNorm.includes(w)) score += 12;
      }
    }

    if (doc.cover_i) score += 30;
    if (doc.isbn?.length > 0) score += 10;
    if (doc.publisher?.some(p => p.toLowerCase().includes("marvel"))) score += 20;

    if (score > bestScore) {
      bestScore = score;
      best = { ...doc, _score: score };
    }
  }

  return best && bestScore >= 25 ? best : null;
}

async function main() {
  console.log("Cover Retry — Alternate search strategies");
  console.log("==========================================\n");

  const raw = await readFile(DATA_PATH, "utf-8");
  const editions = JSON.parse(raw);
  const missing = editions.filter(e => !e.cover_image_url);

  console.log(`Total: ${editions.length} | Missing: ${missing.length}\n`);

  let found = 0;
  let failed = 0;
  let isbnAdded = 0;

  for (let i = 0; i < missing.length; i++) {
    const edition = missing[i];
    const queries = buildAlternateQueries(edition);

    process.stdout.write(`[${i + 1}/${missing.length}] ${edition.slug} ... `);

    let coverFound = false;

    for (const query of queries) {
      if (coverFound) break;

      const docs = await searchOpenLibrary(query);
      const best = scoreDocs(docs, edition.title);

      if (best) {
        // Try cover_i
        if (best.cover_i) {
          edition.cover_image_url = `https://covers.openlibrary.org/b/id/${best.cover_i}-L.jpg`;
          found++;
          coverFound = true;
          console.log(`FOUND (OL: "${query.substring(0, 40)}")`);
        }

        // Backfill ISBN + try Amazon
        if (!coverFound && best.isbn?.length > 0) {
          const isbn13 = best.isbn.find(i => i.startsWith("978") && i.length === 13);
          const isbn10 = best.isbn.find(i => i.length === 10 && !i.startsWith("978"));
          const useIsbn10 = isbn10 || (isbn13 ? isbn13to10(isbn13) : null);

          if (useIsbn10) {
            const amazonUrl = await getAmazonCover(useIsbn10);
            if (amazonUrl) {
              edition.cover_image_url = amazonUrl;
              found++;
              coverFound = true;
              console.log(`FOUND (Amazon: "${query.substring(0, 40)}")`);
            }
          }

          if (!edition.isbn && (isbn13 || isbn10)) {
            edition.isbn = isbn13 || isbn10;
            isbnAdded++;
          }
        }
      }

      await sleep(1200); // Be polite to OL between queries
    }

    if (!coverFound) {
      failed++;
      console.log("not found");
    }

    // Save every 25
    if ((i + 1) % 25 === 0) {
      await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");
      const total = editions.filter(e => e.cover_image_url).length;
      console.log(`\n--- Saved. ${found} new. Coverage: ${total}/${editions.length} (${Math.round(total / editions.length * 100)}%) ---\n`);
    }

    await sleep(500);
  }

  await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");

  const totalCov = editions.filter(e => e.cover_image_url).length;
  console.log("\n==========================================");
  console.log("  RESULTS");
  console.log("==========================================");
  console.log(`New covers:    ${found}`);
  console.log(`Failed:        ${failed}`);
  console.log(`ISBNs added:   ${isbnAdded}`);
  console.log(`Coverage:      ${totalCov}/${editions.length} (${Math.round(totalCov / editions.length * 100)}%)`);
  console.log(`Still missing: ${editions.length - totalCov}`);
  console.log(`\nSaved to ${DATA_PATH}`);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });

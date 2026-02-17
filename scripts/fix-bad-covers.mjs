#!/usr/bin/env node

/**
 * Fix covers that were matched to wrong books due to aggressive title stripping.
 * Also try remaining 31 with more precise ISBN-based searches.
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

// These were matched to completely wrong books — clear them
const BAD_MATCHES = [
  // "Adam" matched "The Marvel Art Of Adam Kubert" — wrong book entirely
  "Adam Warlock Omnibus HC Starlin Cover",
  // "Black" matched "Marvel's Black Widow Prelude" — wrong character
  "Black Panther By Reginald Hudlin Omnibus Alan Davis Cover",
  // "Avengers" (too generic from "Avengers Forever") matched just "Avengers"
  "Avengers Forever By Jason Aaron Omnibus Phil Jimenez Cover",
  // "Dark" matched "X-Men" — wrong book
  "Dark Web Omnibus Ryan Stegman Cover",
  // "Death" matched "Hawkeye Epic Collection" — wrong book
  "Death Of Wolverine Omnibus Joe Quesada Cover",
  // "Doctor" matched "Marvel's Doctor Strange Prelude" — MCU tie-in, not the omnibus
  "Doctor Strange By Jed Mackay Omnibus Stephanie Hans Cover",
  // "Godzilla:" matched "Godzilla vs. the Marvel Universe" — different book
  "Godzilla: The Original Marvel Years Omnibus Herb Trimpe War Of The Giants Cover",
  // "Iron Man:" matched "Iron Man: War Machine" — wrong series
  "Iron Man: Armor Wars Omnibus John Romita Jr. Cover",
  // "Loki:" matched "Loki Modern Era Epic Collection" — wrong format
  "Loki: God Of Stories Omnibus HC Frank Cho Cover",
  // "Marvel" matched "Marvel 1602 by Neil Gaiman" — wrong book entirely
  "Marvel Zomnibus Suydam Amazing Fantasy Cover",
  // "Marvel:" matched "Marvel 1602" — wrong book
  "Marvel: The End Omnibus Claudio Castellini Cover",
  // "Moon" matched "Moon Knight Epic Collection" — wrong format, probably ok cover though... keep
  // "The" matched "Marvel's Ant-Man And The Wasp Prelude" — wrong book entirely
  "The Sentry Omnibus Dave Bullock Cover",
  // "The Nam" matched "Captain America Omnibus Vol. 2" — wrong book entirely
  "The Nam: 1966-1969 Omnibus John Romita Sr. & Ron Frenz Cover",
  // "The New Avengers" matched "The Avengers Omnibus Vol. 2" — close but different series
  "The New Avengers Omnibus Vol. 1 Joe Quesada Cover",
  // "Secret" matched "Marvel Super Heroes Secret Wars" — wrong Secret event
  "Secret War By Brian Michael Bendis Omnibus Gabriele Dell'otto Secret War Black Costumes Cover",
  // "Punisher" matched "The Punisher Vol. 2" — too generic
  "Punisher By Rick Remender Omnibus Dan Brereton Cover",
  // "Immortal" matched "Immortal Hulk Vol. 1" — this is actually ok if it's Hulk, keep
  // "Dazzler" matched "Dazzler Masterworks Vol. 1" — different format but same character, probably ok
  // "Strikeforce:" matched "Strikeforce" — probably ok
  // Marvel Masterworks ASM Vol. 1 matched "Superior Spider-Man" — wrong series
  "Marvel Masterworks: The Amazing Spider-Man Vol. 1 HC Variant",
  // Marvel Archive matched wrong Archive edition
  "Marvel Archive Edition: Marvel Super Heroes Secret Wars Gallery Edition Mike Zeck Hidden Gem Cover",
  "Marvel Archive Edition: Marvel Super Heroes Secret Wars Gallery Edition Mike Zeck Original Collection Cover",
  // Star Wars covers that matched generic "Star Wars" or wrong SW book
  "Star Wars: Crimson Reign Omnibus Rod Reis Cover",
  "Star Wars: The High Republic Phase II - Quest Of The Jedi Omnibus Marc Laming Cover",
  "Star Wars: Doctor Aphra - Friends And Enemies Omnibus Betsy Cola Cover",
  // Wolverine covers matched wrong series
  "Wolverine Goes To Hell Omnibus Arthur Adams Cover",
  "Wolverine: Sabretooth War Omnibus Greg Capullo Cover",
  // X-Men covers that matched generic "X-Men" (wrong specific series)
  "X-Men By Al Ewing Omnibus Felipe Massafera Cover",
  "X-Men By Marc Guggenheim Omnibus Arthur Adams Cover",
  "X-Men: Decimation Omnibus Esad Ribic Cover",
  "X-Men: Fatal Attractions Omnibus Bob Larkin Cover",
  "X-Men: Fatal Attractions Omnibus Greg Capullo Cover",
  "X-Men: X-Tinction Agenda Omnibus Jim Lee Wanted Cover",
];

async function patchCover(id, coverUrl) {
  const url = `${SUPABASE_URL}/rest/v1/collected_editions?id=eq.${id}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ cover_image_url: coverUrl }),
  });
  return resp.ok;
}

async function clearCover(id) {
  const url = `${SUPABASE_URL}/rest/v1/collected_editions?id=eq.${id}`;
  const resp = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ cover_image_url: null }),
  });
  return resp.ok;
}

async function main() {
  console.log("=".repeat(55));
  console.log("  Fix Bad Cover Matches");
  console.log("=".repeat(55));
  console.log(`\nClearing ${BAD_MATCHES.length} incorrectly matched covers...\n`);

  // Find these editions in the DB
  let cleared = 0;
  for (const title of BAD_MATCHES) {
    const encodedTitle = encodeURIComponent(title);
    const url = `${SUPABASE_URL}/rest/v1/collected_editions?select=id,title,cover_image_url&title=eq.${encodedTitle}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.log(`  SKIP: Could not find "${title.substring(0, 50)}..."`);
      continue;
    }
    const rows = await resp.json();
    if (rows.length === 0) {
      console.log(`  SKIP: Not found: "${title.substring(0, 50)}..."`);
      continue;
    }

    const edition = rows[0];
    if (!edition.cover_image_url) {
      console.log(`  SKIP: Already null: "${title.substring(0, 50)}..."`);
      continue;
    }

    if (!dryRun) {
      const ok = await clearCover(edition.id);
      if (ok) {
        cleared++;
        console.log(`  CLEARED: ${title.substring(0, 60)}`);
      } else {
        console.log(`  ERROR: Failed to clear ${title.substring(0, 50)}`);
      }
    } else {
      cleared++;
      console.log(`  [DRY] Would clear: ${title.substring(0, 60)}`);
    }

    await sleep(200);
  }

  console.log(`\nCleared ${cleared} bad covers.`);

  // Now try to find correct covers for the now-missing ones using precise ISBN search
  console.log("\n\nNow searching for correct covers using precise title matching...\n");

  // Fetch all currently missing
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

  console.log(`${missing.length} editions now missing covers\n`);

  // For each, try Google Books with precise title (not stripped)
  let found = 0;
  for (let i = 0; i < missing.length; i++) {
    const edition = missing[i];
    process.stdout.write(`[${i + 1}/${missing.length}] ${edition.title.substring(0, 55).padEnd(55)} `);

    let coverUrl = null;

    // Strategy 1: Google Books ISBN search (most reliable)
    if (edition.isbn) {
      coverUrl = await tryGoogleBooksIsbn(edition.isbn);
    }

    // Strategy 2: Google Books with full title (precise)
    if (!coverUrl) {
      coverUrl = await tryGoogleBooksPrecise(edition.title);
    }

    // Strategy 3: Google Books with cleaned title (remove cover artist, keep series detail)
    if (!coverUrl) {
      const cleaned = cleanTitle(edition.title);
      if (cleaned !== edition.title) {
        coverUrl = await tryGoogleBooksPrecise(cleaned);
      }
    }

    if (coverUrl) {
      found++;
      console.log("FOUND");
      if (!dryRun) await patchCover(edition.id, coverUrl);
    } else {
      console.log("NOT FOUND");
    }

    await sleep(1500);
  }

  console.log(`\n\nDone. Found ${found} more covers.`);
  console.log(`Total cleared: ${cleared}, Total recovered: ${found}`);
}

function cleanTitle(title) {
  // Remove just the cover artist suffix, keeping the full series title
  return title
    .replace(/\s+(?:[A-Z][a-zA-Z'.]+\s+){1,4}Cover$/i, "")
    .replace(/\s+HC$/i, "")
    .trim();
}

async function tryGoogleBooksIsbn(isbn) {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=3`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.items) return null;

    for (const item of data.items) {
      const info = item.volumeInfo;
      if (info?.imageLinks?.thumbnail) {
        return info.imageLinks.thumbnail
          .replace("http://", "https://")
          .replace("zoom=5", "zoom=1")
          .replace("&edge=curl", "");
      }
    }
  } catch {}
  return null;
}

async function tryGoogleBooksPrecise(title) {
  try {
    const query = `intitle:"${title}" inpublisher:Marvel`;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (resp.status === 429) {
      await sleep(60000);
      return null;
    }
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.items) return null;

    const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const item of data.items) {
      const info = item.volumeInfo;
      if (!info?.imageLinks?.thumbnail) continue;

      const bookTitle = ((info.title || "") + " " + (info.subtitle || ""))
        .toLowerCase().replace(/[^a-z0-9]/g, "");

      // Require reasonable title overlap
      let score = 0;
      if (bookTitle.includes(normalizedTitle)) score = 100;
      else if (normalizedTitle.includes(bookTitle) && bookTitle.length > 15) score = 80;
      else {
        // Check core word overlap
        const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matchedWords = titleWords.filter(w => bookTitle.includes(w.replace(/[^a-z0-9]/g, "")));
        const overlapRatio = matchedWords.length / titleWords.length;
        if (overlapRatio >= 0.5) score = 60;
      }

      const isMarvel = info.publisher?.toLowerCase().includes("marvel");
      if (isMarvel) score += 20;

      if (score >= 60) {
        return info.imageLinks.thumbnail
          .replace("http://", "https://")
          .replace("zoom=5", "zoom=1")
          .replace("&edge=curl", "");
      }
    }
  } catch {}
  return null;
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

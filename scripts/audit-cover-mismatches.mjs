#!/usr/bin/env node

/**
 * Audit all covers in the DB for mismatches.
 *
 * Checks:
 * 1. Open Library URLs — extracts ISBN from URL, compares to edition ISBN
 * 2. Amazon URLs — extracts ISBN-10 from URL, converts edition ISBN-13 → 10, compares
 * 3. Google Books URLs — re-searches by ISBN, checks if returned cover matches stored URL
 * 4. Dead/broken URLs — HEAD request to check if image is still accessible
 * 5. Placeholder detection — checks content-length for tiny/placeholder images
 *
 * Usage:
 *   node scripts/audit-cover-mismatches.mjs                  # Full audit
 *   node scripts/audit-cover-mismatches.mjs --check-dead     # Also verify URLs are live (slow)
 *   node scripts/audit-cover-mismatches.mjs --fix            # Clear mismatched covers
 *   node scripts/audit-cover-mismatches.mjs --fix --refetch   # Clear + try to find correct ones
 */

import { readFileSync, writeFileSync } from "fs";

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

const args = process.argv.slice(2);
const checkDead = args.includes("--check-dead");
const doFix = args.includes("--fix");
const doRefetch = args.includes("--refetch");

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------------------------------------------------------------------------
// ISBN helpers
// ---------------------------------------------------------------------------
function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13 || !isbn13.startsWith("978")) return null;
  const body = isbn13.substring(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(body[i]) * (10 - i);
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? "X" : String(check));
}

function isbn10to13(isbn10) {
  if (!isbn10 || isbn10.length !== 10) return null;
  const body = "978" + isbn10.substring(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(body[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return body + check;
}

function normalizeIsbn(isbn) {
  if (!isbn) return null;
  return isbn.replace(/[^0-9X]/gi, "");
}

// ---------------------------------------------------------------------------
// Classify cover URL source
// ---------------------------------------------------------------------------
function classifyUrl(url) {
  if (!url) return { source: "none" };

  if (url.includes("covers.openlibrary.org/b/isbn/")) {
    const match = url.match(/\/isbn\/([0-9X]+)/i);
    return { source: "open_library_isbn", extractedIsbn: match?.[1] || null };
  }

  if (url.includes("covers.openlibrary.org/b/id/")) {
    const match = url.match(/\/id\/(\d+)/);
    return { source: "open_library_id", coverId: match?.[1] || null };
  }

  if (url.includes("m.media-amazon.com/images/P/")) {
    const match = url.match(/\/P\/([0-9X]+)\./i);
    return { source: "amazon_direct", extractedIsbn10: match?.[1] || null };
  }

  if (url.includes("books.google.com") || url.includes("googleapis.com")) {
    return { source: "google_books" };
  }

  if (url.includes("bookcover.longitood.com")) {
    return { source: "bookcover_api" };
  }

  if (url.includes("metron.cloud")) {
    return { source: "metron" };
  }

  return { source: "unknown" };
}

// ---------------------------------------------------------------------------
// Check 1: ISBN mismatch in URL
// ---------------------------------------------------------------------------
function checkIsbnMismatch(edition, urlInfo) {
  const editionIsbn = normalizeIsbn(edition.isbn);
  if (!editionIsbn) return null; // Can't check without edition ISBN

  if (urlInfo.source === "open_library_isbn" && urlInfo.extractedIsbn) {
    const urlIsbn = normalizeIsbn(urlInfo.extractedIsbn);
    // Compare: could be ISBN-13 vs ISBN-13, or ISBN-10 in URL vs ISBN-13 on edition
    const editionIsbn10 = isbn13to10(editionIsbn);
    const urlIsbn13 = urlIsbn.length === 10 ? isbn10to13(urlIsbn) : urlIsbn;

    if (editionIsbn !== urlIsbn && editionIsbn !== urlIsbn13 &&
        editionIsbn10 !== urlIsbn) {
      return {
        type: "isbn_mismatch",
        detail: `URL has ISBN ${urlIsbn}, edition has ${editionIsbn}`,
      };
    }
  }

  if (urlInfo.source === "amazon_direct" && urlInfo.extractedIsbn10) {
    const urlIsbn10 = urlInfo.extractedIsbn10;
    const editionIsbn10 = isbn13to10(editionIsbn) || editionIsbn;

    if (editionIsbn10 !== urlIsbn10) {
      return {
        type: "isbn_mismatch",
        detail: `URL has ISBN-10 ${urlIsbn10}, edition expects ${editionIsbn10}`,
      };
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Check 2: Google Books — re-search by ISBN, compare cover
// ---------------------------------------------------------------------------
async function checkGoogleBooksCover(edition) {
  const isbn = normalizeIsbn(edition.isbn);
  if (!isbn) return null; // Can't verify without ISBN

  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=3`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (resp.status === 429) {
      return { type: "rate_limited", detail: "Google Books rate limit" };
    }
    if (!resp.ok) return null;

    const data = await resp.json();
    if (!data.items || data.items.length === 0) {
      return { type: "isbn_not_found_in_google", detail: `ISBN ${isbn} not in Google Books` };
    }

    // Check if any result matches the edition title reasonably
    const editionTitle = edition.title.toLowerCase().replace(/[^a-z0-9]/g, "");

    for (const item of data.items) {
      const info = item.volumeInfo;
      const bookTitle = ((info.title || "") + " " + (info.subtitle || ""))
        .toLowerCase().replace(/[^a-z0-9]/g, "");

      // Check ISBN match
      const bookIsbns = (info.industryIdentifiers || []).map(i => normalizeIsbn(i.identifier));
      if (!bookIsbns.includes(isbn) && !bookIsbns.includes(isbn13to10(isbn))) {
        continue;
      }

      // ISBN matches — check title similarity
      let titleScore = 0;
      if (bookTitle.includes(editionTitle) || editionTitle.includes(bookTitle)) {
        titleScore = 100;
      } else {
        // Word overlap
        const edWords = edition.title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const matched = edWords.filter(w => bookTitle.includes(w.replace(/[^a-z0-9]/g, "")));
        titleScore = edWords.length > 0 ? (matched.length / edWords.length) * 100 : 0;
      }

      if (titleScore < 30) {
        return {
          type: "title_mismatch",
          detail: `ISBN ${isbn} maps to "${info.title}" but edition is "${edition.title}"`,
          googleTitle: info.title,
        };
      }

      // Title matches — check if cover URL matches
      if (info.imageLinks?.thumbnail) {
        const correctUrl = info.imageLinks.thumbnail
          .replace("http://", "https://")
          .replace("zoom=5", "zoom=1")
          .replace("&edge=curl", "");

        // Extract the book ID from both URLs to compare
        const storedId = edition.cover_image_url.match(/id=([^&]+)/)?.[1];
        const correctId = correctUrl.match(/id=([^&]+)/)?.[1];

        if (storedId && correctId && storedId !== correctId) {
          return {
            type: "wrong_google_book",
            detail: `Cover is for different Google Books entry (stored: ${storedId}, correct: ${correctId})`,
            correctUrl,
          };
        }
      }

      return null; // Looks good
    }

    // None of the results had matching ISBN — suspicious
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Check 3: Dead/broken URL
// ---------------------------------------------------------------------------
async function checkUrlAlive(url) {
  try {
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      return { type: "dead_url", detail: `HTTP ${resp.status}` };
    }

    // Check for placeholder images
    const contentLength = parseInt(resp.headers.get("content-length") || "0");
    const contentType = resp.headers.get("content-type") || "";

    if (contentLength > 0 && contentLength < 1000 && contentType.includes("image")) {
      return { type: "placeholder", detail: `Tiny image (${contentLength} bytes)` };
    }

    // Open Library returns a 1x1 GIF as redirect for missing covers
    if (contentLength === 43) {
      return { type: "placeholder", detail: "Open Library 1x1 placeholder (43 bytes)" };
    }

    return null;
  } catch (err) {
    return { type: "dead_url", detail: `Fetch error: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Check 4: Cross-edition cover duplication (same URL on different editions)
// ---------------------------------------------------------------------------
function findDuplicateCovers(editions) {
  const urlMap = new Map(); // url → [edition titles]
  for (const e of editions) {
    if (!e.cover_image_url) continue;
    if (!urlMap.has(e.cover_image_url)) {
      urlMap.set(e.cover_image_url, []);
    }
    urlMap.get(e.cover_image_url).push(e);
  }

  const dupes = [];
  for (const [url, editions] of urlMap) {
    if (editions.length > 1) {
      dupes.push({ url, editions });
    }
  }
  return dupes;
}

// ---------------------------------------------------------------------------
// Supabase helpers
// ---------------------------------------------------------------------------
async function fetchAllEditions() {
  let all = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const url = `${SUPABASE_URL}/rest/v1/collected_editions` +
      `?select=id,slug,title,isbn,format,print_status,importance,cover_image_url` +
      `&not.cover_image_url.is.null&cover_image_url=neq.` +
      `&order=title&offset=${offset}&limit=${PAGE}`;
    const resp = await fetch(url, { headers });
    if (!resp.ok) {
      console.error(`Fetch error: ${resp.status} ${await resp.text()}`);
      break;
    }
    const batch = await resp.json();
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }
  return all;
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
// Refetch correct cover for a single edition
// ---------------------------------------------------------------------------
async function refetchCover(edition) {
  const isbn = normalizeIsbn(edition.isbn);
  if (!isbn) return null;

  // Try Google Books by ISBN
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}&maxResults=3`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!resp.ok) return null;
    const data = await resp.json();
    if (!data.items) return null;

    for (const item of data.items) {
      const info = item.volumeInfo;
      if (!info?.imageLinks?.thumbnail) continue;
      const bookIsbns = (info.industryIdentifiers || []).map(i => normalizeIsbn(i.identifier));
      if (bookIsbns.includes(isbn) || bookIsbns.includes(isbn13to10(isbn))) {
        return info.imageLinks.thumbnail
          .replace("http://", "https://")
          .replace("zoom=5", "zoom=1")
          .replace("&edge=curl", "");
      }
    }
  } catch {}

  // Try Open Library
  const olUrl = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  try {
    const resp = await fetch(olUrl, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(8000) });
    if (resp.status === 200) return `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
  } catch {}

  // Try Amazon
  const isbn10 = isbn13to10(isbn);
  if (isbn10) {
    const amzUrl = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
    try {
      const resp = await fetch(amzUrl, { method: "HEAD", signal: AbortSignal.timeout(8000) });
      if (resp.ok) {
        const len = parseInt(resp.headers.get("content-length") || "0");
        if (len > 1000) return amzUrl;
      }
    } catch {}
  }

  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=".repeat(60));
  console.log("  Cover Mismatch Audit");
  console.log("=".repeat(60));
  console.log(`Check dead URLs: ${checkDead}`);
  console.log(`Fix mismatches: ${doFix}`);
  console.log(`Refetch correct covers: ${doRefetch}\n`);

  console.log("Fetching all editions with covers from Supabase...");
  const editions = await fetchAllEditions();
  console.log(`Loaded ${editions.length} editions with covers\n`);

  // ── Check 4 first (no API calls): Duplicate covers ──
  console.log("── Checking for duplicate covers ──");
  const dupes = findDuplicateCovers(editions);
  if (dupes.length > 0) {
    console.log(`\nFound ${dupes.length} cover URLs shared by multiple editions:\n`);
    for (const dupe of dupes) {
      console.log(`  URL: ${dupe.url.substring(0, 80)}...`);
      for (const e of dupe.editions) {
        console.log(`    - ${e.title.substring(0, 70)} (ISBN: ${e.isbn || "none"})`);
      }
      console.log();
    }
  } else {
    console.log("  No duplicate covers found.\n");
  }

  // ── Classify all URLs ──
  console.log("── URL Source Distribution ──");
  const sourceCounts = {};
  for (const e of editions) {
    const info = classifyUrl(e.cover_image_url);
    sourceCounts[info.source] = (sourceCounts[info.source] || 0) + 1;
  }
  for (const [src, count] of Object.entries(sourceCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src}: ${count}`);
  }
  console.log();

  // ── Check 1: ISBN mismatches in URLs ──
  console.log("── Checking ISBN mismatches in cover URLs ──\n");
  const isbnMismatches = [];
  for (const e of editions) {
    const urlInfo = classifyUrl(e.cover_image_url);
    if (urlInfo.source === "open_library_isbn" || urlInfo.source === "amazon_direct") {
      const issue = checkIsbnMismatch(e, urlInfo);
      if (issue) {
        isbnMismatches.push({ edition: e, issue });
      }
    }
  }

  if (isbnMismatches.length > 0) {
    console.log(`Found ${isbnMismatches.length} ISBN mismatches:\n`);
    for (const { edition, issue } of isbnMismatches) {
      console.log(`  [MISMATCH] ${edition.title.substring(0, 60)}`);
      console.log(`    ${issue.detail}`);
      console.log(`    URL: ${edition.cover_image_url.substring(0, 80)}`);
      console.log();
    }
  } else {
    console.log("  No ISBN mismatches found in Open Library/Amazon URLs.\n");
  }

  // ── Check 2: Google Books cover verification ──
  const googleEditions = editions.filter(e => {
    const info = classifyUrl(e.cover_image_url);
    return info.source === "google_books" && e.isbn;
  });

  console.log(`── Verifying ${googleEditions.length} Google Books covers by ISBN ──\n`);
  const googleIssues = [];
  let rateLimited = false;

  for (let i = 0; i < googleEditions.length; i++) {
    const e = googleEditions[i];

    if (rateLimited) break;

    const issue = await checkGoogleBooksCover(e);
    if (issue) {
      if (issue.type === "rate_limited") {
        console.log("  Google Books rate limit hit. Stopping Google verification.\n");
        rateLimited = true;
        break;
      }
      googleIssues.push({ edition: e, issue });
    }

    if ((i + 1) % 50 === 0) {
      console.log(`  Verified ${i + 1}/${googleEditions.length} (${googleIssues.length} issues found)`);
    }

    await sleep(300); // Respect rate limits
  }

  if (googleIssues.length > 0) {
    console.log(`\nFound ${googleIssues.length} Google Books cover issues:\n`);
    for (const { edition, issue } of googleIssues) {
      console.log(`  [${issue.type.toUpperCase()}] ${edition.title.substring(0, 60)}`);
      console.log(`    ${issue.detail}`);
      if (issue.correctUrl) console.log(`    Correct URL: ${issue.correctUrl.substring(0, 80)}`);
      console.log();
    }
  } else {
    console.log(`  No Google Books issues found (${rateLimited ? "partial check" : "all checked"}).\n`);
  }

  // ── Check 3: Dead URLs (optional, slow) ──
  let deadUrls = [];
  let placeholders = [];
  if (checkDead) {
    console.log(`── Checking ${editions.length} cover URLs for dead links ──\n`);
    for (let i = 0; i < editions.length; i++) {
      const e = editions[i];
      const issue = await checkUrlAlive(e.cover_image_url);
      if (issue) {
        if (issue.type === "placeholder") {
          placeholders.push({ edition: e, issue });
        } else {
          deadUrls.push({ edition: e, issue });
        }
      }

      if ((i + 1) % 100 === 0) {
        console.log(`  Checked ${i + 1}/${editions.length} (${deadUrls.length} dead, ${placeholders.length} placeholders)`);
      }

      await sleep(100);
    }

    if (deadUrls.length > 0) {
      console.log(`\nFound ${deadUrls.length} dead cover URLs:\n`);
      for (const { edition, issue } of deadUrls) {
        console.log(`  [DEAD] ${edition.title.substring(0, 60)} — ${issue.detail}`);
      }
    }
    if (placeholders.length > 0) {
      console.log(`\nFound ${placeholders.length} placeholder images:\n`);
      for (const { edition, issue } of placeholders) {
        console.log(`  [PLACEHOLDER] ${edition.title.substring(0, 60)} — ${issue.detail}`);
      }
    }
    if (deadUrls.length === 0 && placeholders.length === 0) {
      console.log("  All cover URLs are live.\n");
    }
    console.log();
  }

  // ── Summary ──
  const allIssues = [
    ...isbnMismatches.map(m => ({ ...m, category: "isbn_mismatch" })),
    ...googleIssues.map(m => ({ ...m, category: "google_issue" })),
    ...deadUrls.map(m => ({ ...m, category: "dead" })),
    ...placeholders.map(m => ({ ...m, category: "placeholder" })),
  ];

  console.log("=".repeat(60));
  console.log("  SUMMARY");
  console.log("=".repeat(60));
  console.log(`\nTotal editions with covers: ${editions.length}`);
  console.log(`Duplicate cover URLs: ${dupes.length}`);
  console.log(`ISBN mismatches (OL/Amazon): ${isbnMismatches.length}`);
  console.log(`Google Books issues: ${googleIssues.length}`);
  if (checkDead) {
    console.log(`Dead URLs: ${deadUrls.length}`);
    console.log(`Placeholders: ${placeholders.length}`);
  }
  console.log(`\nTotal issues: ${allIssues.length} + ${dupes.length} duplicate groups`);

  // ── Write report ──
  const report = {
    timestamp: new Date().toISOString(),
    totalEditions: editions.length,
    duplicateGroups: dupes.length,
    isbnMismatches: isbnMismatches.length,
    googleIssues: googleIssues.length,
    deadUrls: deadUrls.length,
    placeholders: placeholders.length,
    details: {
      duplicates: dupes.map(d => ({
        url: d.url,
        editions: d.editions.map(e => ({ title: e.title, isbn: e.isbn, slug: e.slug })),
      })),
      isbnMismatches: isbnMismatches.map(m => ({
        title: m.edition.title,
        slug: m.edition.slug,
        isbn: m.edition.isbn,
        coverUrl: m.edition.cover_image_url,
        issue: m.issue,
      })),
      googleIssues: googleIssues.map(m => ({
        title: m.edition.title,
        slug: m.edition.slug,
        isbn: m.edition.isbn,
        coverUrl: m.edition.cover_image_url,
        issue: m.issue,
      })),
      deadUrls: deadUrls.map(m => ({
        title: m.edition.title,
        slug: m.edition.slug,
        coverUrl: m.edition.cover_image_url,
        issue: m.issue,
      })),
      placeholders: placeholders.map(m => ({
        title: m.edition.title,
        slug: m.edition.slug,
        coverUrl: m.edition.cover_image_url,
        issue: m.issue,
      })),
    },
  };

  const reportPath = "data/cover-audit-report.json";
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(`\nReport saved to ${reportPath}`);

  // ── Fix mode ──
  if (doFix && allIssues.length > 0) {
    console.log(`\n── Fixing ${allIssues.length} issues ──\n`);

    let cleared = 0;
    let refetched = 0;

    // Deduplicate by edition ID
    const seenIds = new Set();
    const uniqueIssues = allIssues.filter(i => {
      if (seenIds.has(i.edition.id)) return false;
      seenIds.add(i.edition.id);
      return true;
    });

    for (const item of uniqueIssues) {
      const e = item.edition;

      // If Google Books issue has a correct URL, use it directly
      if (item.issue.correctUrl) {
        const ok = await patchCover(e.id, item.issue.correctUrl);
        if (ok) {
          refetched++;
          console.log(`  REPLACED: ${e.title.substring(0, 60)}`);
        }
        await sleep(200);
        continue;
      }

      // Clear the bad cover
      const ok = await clearCover(e.id);
      if (ok) {
        cleared++;
        console.log(`  CLEARED: ${e.title.substring(0, 60)}`);
      }
      await sleep(200);

      // Try to refetch correct cover
      if (doRefetch) {
        const newUrl = await refetchCover(e);
        if (newUrl) {
          await patchCover(e.id, newUrl);
          refetched++;
          console.log(`  REFETCHED: ${e.title.substring(0, 60)}`);
        }
        await sleep(1000);
      }
    }

    console.log(`\nCleared: ${cleared}, Refetched: ${refetched}`);
  }

  // ── Fix duplicates ──
  if (doFix && dupes.length > 0) {
    console.log(`\n── Fixing ${dupes.length} duplicate cover groups ──\n`);
    console.log("For each group, keeping cover on first edition, clearing others.\n");

    let dupeCleared = 0;
    let dupeRefetched = 0;

    for (const dupe of dupes) {
      // Sort: keep the one whose ISBN matches the URL (if any), or the first one
      const sorted = [...dupe.editions].sort((a, b) => {
        const aInfo = classifyUrl(a.cover_image_url);
        const bInfo = classifyUrl(b.cover_image_url);
        const aMatch = !checkIsbnMismatch(a, aInfo) ? 1 : 0;
        const bMatch = !checkIsbnMismatch(b, bInfo) ? 1 : 0;
        return bMatch - aMatch;
      });

      // Keep first, clear rest
      console.log(`  Keeping: ${sorted[0].title.substring(0, 55)} (ISBN: ${sorted[0].isbn || "none"})`);

      for (let i = 1; i < sorted.length; i++) {
        const e = sorted[i];
        await clearCover(e.id);
        dupeCleared++;
        console.log(`    Cleared: ${e.title.substring(0, 55)} (ISBN: ${e.isbn || "none"})`);

        if (doRefetch) {
          const newUrl = await refetchCover(e);
          if (newUrl) {
            await patchCover(e.id, newUrl);
            dupeRefetched++;
            console.log(`    Refetched: ${e.title.substring(0, 55)}`);
          }
          await sleep(1000);
        }

        await sleep(200);
      }
      console.log();
    }

    console.log(`Duplicates cleared: ${dupeCleared}, Refetched: ${dupeRefetched}`);
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});

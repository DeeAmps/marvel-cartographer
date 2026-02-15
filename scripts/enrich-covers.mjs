#!/usr/bin/env node
/**
 * 3-Tier Cover Image Enrichment Script
 * =====================================
 * Tier 1: Open Library — direct URL construction from ISBNs (zero API calls)
 * Tier 2: Google Books API — search by title (1,000/day free, no key needed)
 * Tier 3: Metron API — search by series/issue for remaining (rate-limited, needs creds)
 *
 * Usage:
 *   node scripts/enrich-covers.mjs                    # Run all tiers
 *   node scripts/enrich-covers.mjs --tier=1            # Open Library only
 *   node scripts/enrich-covers.mjs --tier=2            # Google Books only
 *   node scripts/enrich-covers.mjs --tier=3            # Metron only
 *   node scripts/enrich-covers.mjs --tier=1,2          # Tiers 1 and 2
 *   node scripts/enrich-covers.mjs --dry-run           # Preview without writing
 *   node scripts/enrich-covers.mjs --tier=3 --limit=50 # Metron with batch limit
 */

import { readFile, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "..", "data", "collected_editions.json");

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
const tierArg = args.find((a) => a.startsWith("--tier="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const dryRun = args.includes("--dry-run");

const tiersToRun = tierArg
  ? tierArg.replace("--tier=", "").split(",").map(Number)
  : [1, 2, 3];
const metronLimit = limitArg ? parseInt(limitArg.replace("--limit=", "")) : 200;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function log(tier, slug, msg) {
  const prefix = `[Tier ${tier}]`;
  console.log(`${prefix} ${slug}: ${msg}`);
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------
const stats = {
  tier1: { checked: 0, found: 0, skipped: 0 },
  tier2: { checked: 0, found: 0, failed: 0 },
  tier3: { checked: 0, found: 0, failed: 0, skipped: 0 },
};

// ===========================================================================
// TIER 1 — Open Library (Zero API calls)
// ===========================================================================
// Open Library cover URLs are deterministic: covers.openlibrary.org/b/isbn/{ISBN}-L.jpg
// If the ISBN is valid and OL has the cover, the URL works.
// If not, it redirects to a 1x1 placeholder — we verify with a HEAD request.
// Even the HEAD requests are very fast and have no documented rate limit.
// ===========================================================================
async function tier1_openLibrary(editions) {
  console.log("\n========================================");
  console.log("TIER 1: Open Library (ISBN → Cover URL)");
  console.log("========================================\n");

  const candidates = editions.filter((e) => !e.cover_image_url && e.isbn);
  console.log(`${candidates.length} editions have ISBNs but no cover image\n`);

  if (candidates.length === 0) {
    console.log("Nothing to do for Tier 1.\n");
    return;
  }

  // Batch: construct URLs and verify in parallel (groups of 10)
  const batchSize = 10;
  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(async (edition) => {
        stats.tier1.checked++;
        const isbn = edition.isbn;
        const url = `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg`;
        const checkUrl = `${url}?default=false`;

        try {
          const resp = await fetch(checkUrl, {
            method: "HEAD",
            redirect: "manual",
            signal: AbortSignal.timeout(8000),
          });

          // OL returns 302 redirect to placeholder if not found, 200 if found
          if (resp.status === 200) {
            edition.cover_image_url = url;
            stats.tier1.found++;
            log(1, edition.slug, `FOUND (${isbn})`);
            return true;
          } else {
            stats.tier1.skipped++;
            log(1, edition.slug, `not on Open Library (${isbn})`);
            return false;
          }
        } catch {
          stats.tier1.skipped++;
          log(1, edition.slug, `timeout/error (${isbn})`);
          return false;
        }
      })
    );

    // Brief pause between batches to be polite
    if (i + batchSize < candidates.length) {
      await sleep(200);
    }
  }

  console.log(`\nTier 1 done: ${stats.tier1.found} covers found from ${stats.tier1.checked} checked\n`);
}

// ===========================================================================
// TIER 2 — Google Books API (1,000/day free, no API key)
// ===========================================================================
async function tier2_googleBooks(editions) {
  console.log("\n========================================");
  console.log("TIER 2: Google Books API (Search by title)");
  console.log("========================================\n");

  const candidates = editions.filter((e) => !e.cover_image_url);
  console.log(`${candidates.length} editions still need covers\n`);

  if (candidates.length === 0) {
    console.log("Nothing to do for Tier 2.\n");
    return;
  }

  for (let i = 0; i < candidates.length; i++) {
    const edition = candidates[i];
    stats.tier2.checked++;

    // Build multiple search queries to improve hit rate
    const queries = buildSearchQueries(edition);

    let found = false;
    for (const query of queries) {
      try {
        const result = await searchGoogleBooks(query, edition.title);
        if (result) {
          if (result.coverUrl) {
            edition.cover_image_url = result.coverUrl;
            log(2, edition.slug, `FOUND via "${query.substring(0, 50)}..."`);
            found = true;
            stats.tier2.found++;
          }
          // Also backfill ISBN if we don't have one
          if (!edition.isbn && result.isbn) {
            edition.isbn = result.isbn;
            log(2, edition.slug, `ISBN backfilled: ${result.isbn}`);
          }
          if (found) break;
        }
      } catch (err) {
        // Might be rate limited — back off
        if (err.message?.includes("429")) {
          console.log("\nGoogle Books rate limit hit. Waiting 60s...");
          await sleep(60000);
        }
      }
      await sleep(500); // Between query attempts
    }

    if (!found) {
      stats.tier2.failed++;
      log(2, edition.slug, "NOT FOUND");
    }

    // Delay between editions
    await sleep(800);

    // Progress every 25
    if ((i + 1) % 25 === 0) {
      console.log(`\n--- Progress: ${i + 1}/${candidates.length} (${stats.tier2.found} found) ---\n`);
    }
  }

  console.log(`\nTier 2 done: ${stats.tier2.found} covers found from ${stats.tier2.checked} searched\n`);
}

function buildSearchQueries(edition) {
  const title = edition.title;
  const queries = [];

  // Query 1: Exact title + Marvel
  queries.push(`intitle:"${title}" Marvel`);

  // Query 2: Cleaned title + inpublisher
  const cleaned = title
    .replace(/\(.*?\)/g, "")
    .replace(/Vol\.\s*/, "Volume ")
    .trim();
  queries.push(`intitle:${cleaned} inpublisher:Marvel`);

  // Query 3: ISBN search if we have one
  if (edition.isbn) {
    queries.push(`isbn:${edition.isbn}`);
  }

  // Query 4: Simplified - just core title words
  const coreWords = title
    .replace(/Omnibus|Vol\.|Volume|Complete Collection|Trade Paperback|Epic Collection/gi, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\d+/g, (m) => (parseInt(m) > 2000 ? "" : m)) // Strip years but keep volume numbers
    .replace(/\s+/g, " ")
    .trim();
  if (coreWords !== cleaned) {
    queries.push(`${coreWords} Marvel comics omnibus`);
  }

  return queries;
}

async function searchGoogleBooks(query, originalTitle) {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&printType=books`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });

  if (resp.status === 429) {
    throw new Error("429 rate limit");
  }
  if (!resp.ok) return null;

  const data = await resp.json();
  if (!data.items || data.items.length === 0) return null;

  // Score each result by title similarity
  const normalizedOriginal = originalTitle.toLowerCase().replace(/[^a-z0-9]/g, "");

  let best = null;
  let bestScore = -1;

  for (const item of data.items) {
    const info = item.volumeInfo;
    if (!info) continue;

    const bookTitle = ((info.title || "") + " " + (info.subtitle || ""))
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    // Simple overlap scoring
    let score = 0;
    if (bookTitle.includes(normalizedOriginal)) score += 100;
    else if (normalizedOriginal.includes(bookTitle)) score += 80;
    else {
      // Word overlap
      const origWords = new Set(normalizedOriginal.match(/.{3,}/g) || []);
      const bookWords = new Set(bookTitle.match(/.{3,}/g) || []);
      for (const w of origWords) {
        if (bookTitle.includes(w)) score += 10;
      }
    }

    // Bonus for having a cover image
    if (info.imageLinks?.thumbnail) score += 50;

    // Bonus for Marvel publisher
    if (info.publisher?.toLowerCase().includes("marvel")) score += 30;

    if (score > bestScore) {
      bestScore = score;
      best = info;
    }
  }

  if (!best || bestScore < 30) return null;

  // Extract cover URL
  let coverUrl = null;
  if (best.imageLinks) {
    coverUrl = best.imageLinks.thumbnail || best.imageLinks.smallThumbnail;
    if (coverUrl) {
      coverUrl = coverUrl
        .replace("http://", "https://")
        .replace("zoom=5", "zoom=1")
        .replace("&edge=curl", "");
    }
  }

  // Extract ISBN
  const isbn13 = best.industryIdentifiers?.find((id) => id.type === "ISBN_13")?.identifier;
  const isbn10 = best.industryIdentifiers?.find((id) => id.type === "ISBN_10")?.identifier;

  return {
    coverUrl,
    isbn: isbn13 || isbn10 || null,
    title: best.title,
    publisher: best.publisher,
  };
}

// ===========================================================================
// TIER 3 — Metron API (rate-limited, needs credentials)
// ===========================================================================
// Metron tracks individual issues, not collected editions. Strategy:
//   1. Parse the edition's issues_collected field to extract series name + issue range
//   2. Search Metron for the series
//   3. Get the first issue in the range
//   4. Pull the cover image from that issue
//   5. Rate limit: 1 request per 5 seconds (community server)
// ===========================================================================
async function tier3_metron(editions) {
  console.log("\n========================================");
  console.log("TIER 3: Metron API (Series/Issue lookup)");
  console.log("========================================\n");

  // Check for credentials
  const username = process.env.METRON_USERNAME;
  const password = process.env.METRON_PASSWORD;

  if (!username || !password || username === "your-metron-username") {
    console.log("Metron credentials not configured.");
    console.log("Set METRON_USERNAME and METRON_PASSWORD environment variables.");
    console.log("Sign up free at https://metron.cloud\n");
    console.log("Example:");
    console.log("  METRON_USERNAME=myuser METRON_PASSWORD=mypass node scripts/enrich-covers.mjs --tier=3\n");
    return;
  }

  const authHeader = "Basic " + Buffer.from(`${username}:${password}`).toString("base64");

  const candidates = editions.filter((e) => !e.cover_image_url);
  const toProcess = candidates.slice(0, metronLimit);
  console.log(`${candidates.length} editions still need covers (processing up to ${metronLimit})\n`);

  if (toProcess.length === 0) {
    console.log("Nothing to do for Tier 3.\n");
    return;
  }

  for (let i = 0; i < toProcess.length; i++) {
    const edition = toProcess[i];
    stats.tier3.checked++;

    const parsed = parseIssuesCollected(edition.issues_collected);
    if (!parsed) {
      log(3, edition.slug, `could not parse issues: "${edition.issues_collected}"`);
      stats.tier3.failed++;
      await sleep(1000);
      continue;
    }

    try {
      // Step 1: Search for the series on Metron
      const series = await metronSearchSeries(parsed.seriesName, authHeader);
      if (!series) {
        log(3, edition.slug, `series not found: "${parsed.seriesName}"`);
        stats.tier3.failed++;
        await sleep(5000);
        continue;
      }

      log(3, edition.slug, `series found: ${series.name} (ID: ${series.id})`);
      await sleep(5000); // Rate limit

      // Step 2: Get the first issue in the range
      const issue = await metronGetIssue(series.id, parsed.firstIssue, authHeader);
      if (!issue) {
        log(3, edition.slug, `issue #${parsed.firstIssue} not found in series ${series.id}`);
        stats.tier3.failed++;
        await sleep(5000);
        continue;
      }

      // Step 3: Extract cover image
      if (issue.image) {
        edition.cover_image_url = issue.image;
        if (!edition.metron_id) edition.metron_id = issue.id;
        stats.tier3.found++;
        log(3, edition.slug, `FOUND cover from issue #${parsed.firstIssue}`);
      } else {
        log(3, edition.slug, `issue found but no cover image`);
        stats.tier3.failed++;
      }

      await sleep(5000); // Rate limit between editions
    } catch (err) {
      log(3, edition.slug, `error: ${err.message}`);
      stats.tier3.failed++;
      await sleep(5000);
    }

    // Progress every 10
    if ((i + 1) % 10 === 0) {
      console.log(`\n--- Metron progress: ${i + 1}/${toProcess.length} (${stats.tier3.found} found) ---\n`);
    }
  }

  console.log(`\nTier 3 done: ${stats.tier3.found} covers found from ${stats.tier3.checked} searched\n`);
}

/**
 * Parse "FF #1-30, Annual #1" → { seriesName: "Fantastic Four", firstIssue: 1 }
 * Parse "ASM #1-38" → { seriesName: "Amazing Spider-Man", firstIssue: 1 }
 */
function parseIssuesCollected(issuesStr) {
  if (!issuesStr) return null;

  // Map common abbreviations to full series names for Metron search
  const abbreviations = {
    FF: "Fantastic Four",
    ASM: "Amazing Spider-Man",
    UXM: "Uncanny X-Men",
    AF: "Amazing Fantasy",
    MTIO: "Marvel Two-in-One",
    WBN: "Werewolf by Night",
    NXM: "New X-Men",
    AXM: "Astonishing X-Men",
    DD: "Daredevil",
    SS: "Silver Surfer",
    ToD: "Tomb of Dracula",
    GotG: "Guardians of the Galaxy",
    GSXM: "Giant-Size X-Men",
    NA: "New Avengers",
  };

  // Try to extract first series and issue number
  // Patterns: "FF #1-30", "Fantastic Four (1961) #1-30", "Avengers #1-30"
  const match = issuesStr.match(/^([A-Za-z\s\-.']+?)(?:\s*\([\d\-]+\))?\s*#(\d+)/);
  if (!match) return null;

  let seriesName = match[1].trim();
  const firstIssue = parseInt(match[2]);

  // Expand abbreviation if needed
  if (abbreviations[seriesName]) {
    seriesName = abbreviations[seriesName];
  }

  return { seriesName, firstIssue };
}

async function metronSearchSeries(name, authHeader) {
  const url = `https://metron.cloud/api/series/?name=${encodeURIComponent(name)}&publisher_name=Marvel`;

  const resp = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) {
    if (resp.status === 401) throw new Error("Metron auth failed — check credentials");
    return null;
  }

  const data = await resp.json();
  if (!data.results || data.results.length === 0) return null;

  // Find best match by name similarity
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  let best = data.results[0];
  let bestScore = 0;

  for (const series of data.results) {
    const sNorm = series.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    let score = 0;
    if (sNorm === normalized) score = 100;
    else if (sNorm.includes(normalized)) score = 80;
    else if (normalized.includes(sNorm)) score = 60;

    if (score > bestScore) {
      bestScore = score;
      best = series;
    }
  }

  return best;
}

async function metronGetIssue(seriesId, issueNumber, authHeader) {
  const url = `https://metron.cloud/api/issue/?series_id=${seriesId}&number=${issueNumber}`;

  const resp = await fetch(url, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!resp.ok) return null;

  const data = await resp.json();
  if (!data.results || data.results.length === 0) return null;

  // Get full issue detail for the cover image
  const issueId = data.results[0].id;
  await sleep(5000); // Rate limit

  const detailUrl = `https://metron.cloud/api/issue/${issueId}/`;
  const detailResp = await fetch(detailUrl, {
    headers: {
      Authorization: authHeader,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!detailResp.ok) return null;
  return await detailResp.json();
}

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  console.log("=".repeat(50));
  console.log("  Marvel Cartographer — Cover Enrichment");
  console.log("=".repeat(50));
  console.log(`\nTiers to run: ${tiersToRun.join(", ")}`);
  console.log(`Dry run: ${dryRun}`);
  if (tiersToRun.includes(3)) console.log(`Metron batch limit: ${metronLimit}`);

  // Load data
  const raw = await readFile(DATA_PATH, "utf-8");
  const editions = JSON.parse(raw);

  const missingBefore = editions.filter((e) => !e.cover_image_url).length;
  console.log(`\nLoaded ${editions.length} editions`);
  console.log(`Missing covers: ${missingBefore} (${Math.round((missingBefore / editions.length) * 100)}%)\n`);

  // Run tiers
  if (tiersToRun.includes(1)) await tier1_openLibrary(editions);
  if (tiersToRun.includes(2)) await tier2_googleBooks(editions);
  if (tiersToRun.includes(3)) await tier3_metron(editions);

  // Summary
  const missingAfter = editions.filter((e) => !e.cover_image_url).length;
  const totalFound = missingBefore - missingAfter;

  console.log("\n" + "=".repeat(50));
  console.log("  RESULTS");
  console.log("=".repeat(50));
  console.log(`\nBefore: ${missingBefore} missing covers`);
  console.log(`After:  ${missingAfter} missing covers`);
  console.log(`Found:  ${totalFound} new covers\n`);

  if (tiersToRun.includes(1)) {
    console.log(`Tier 1 (Open Library): ${stats.tier1.found}/${stats.tier1.checked} found`);
  }
  if (tiersToRun.includes(2)) {
    console.log(`Tier 2 (Google Books): ${stats.tier2.found}/${stats.tier2.checked} found`);
  }
  if (tiersToRun.includes(3)) {
    console.log(`Tier 3 (Metron):       ${stats.tier3.found}/${stats.tier3.checked} found`);
  }

  console.log(`\nCoverage: ${editions.length - missingAfter}/${editions.length} (${Math.round(((editions.length - missingAfter) / editions.length) * 100)}%)`);

  // List remaining missing
  if (missingAfter > 0 && missingAfter <= 50) {
    console.log(`\nStill missing (${missingAfter}):`);
    editions
      .filter((e) => !e.cover_image_url)
      .forEach((e) => console.log(`  - ${e.slug} (ISBN: ${e.isbn || "none"})`));
  }

  // Write results
  if (!dryRun) {
    await writeFile(DATA_PATH, JSON.stringify(editions, null, 2) + "\n", "utf-8");
    console.log(`\nData written to ${DATA_PATH}`);
  } else {
    console.log("\n[DRY RUN] No changes written.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

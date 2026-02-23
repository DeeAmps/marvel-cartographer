#!/usr/bin/env node

/**
 * seed-2026-editions.mjs
 *
 * Reads data/marvel_collected_editions_2026.json (281 raw entries),
 * deduplicates DM-only variants, transforms to DB format, fetches covers,
 * generates connections, and upserts into Supabase.
 *
 * Usage:
 *   node scripts/seed-2026-editions.mjs              # full run
 *   node scripts/seed-2026-editions.mjs --dry-run     # preview without writing to DB
 *   node scripts/seed-2026-editions.mjs --skip-covers  # skip cover fetching
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'package.json')
);
const { createClient } = require('@supabase/supabase-js');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_COVERS = process.argv.includes('--skip-covers');

if (DRY_RUN) console.log('*** DRY RUN — no database writes ***\n');

// ---------------------------------------------------------------------------
// .env loader (same pattern as seed-supabase.mjs)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env file not found at', envPath);
    process.exit(1);
  }
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const FORMAT_MAP = {
  'Omnibus': 'omnibus',
  'TPB': 'trade_paperback',
  'Epic Collection': 'epic_collection',
  'Epic Collection TPB': 'epic_collection',
  'Masterworks TPB': 'masterworks',
  'Complete Collection TPB': 'complete_collection',
  'OHC': 'oversized_hardcover',
  'SHC': 'hardcover',
  'Digest': 'trade_paperback',
  'Premier Collection Digest TPB': 'premier_collection',
  'Treasury': 'oversized_hardcover',
  'Gallery': 'hardcover',
  'Archive': 'hardcover',
};

// Eras ordered by priority for year-range matching.
// When ranges overlap, later entries in this list win for years in the overlap zone.
const ERA_RANGES = [
  { slug: 'birth-of-marvel', start: 1961, end: 1966 },
  { slug: 'the-expansion', start: 1966, end: 1970 },
  { slug: 'bronze-age', start: 1970, end: 1975 },
  { slug: 'rise-of-x-men', start: 1975, end: 1985 },
  { slug: 'event-age', start: 1985, end: 1992 },
  { slug: 'speculation-crash', start: 1992, end: 1996 },
  { slug: 'heroes-reborn-return', start: 1996, end: 1998 },
  { slug: 'marvel-knights-ultimate', start: 1998, end: 2004 },
  { slug: 'bendis-avengers', start: 2004, end: 2009 },
  { slug: 'hickman-saga', start: 2009, end: 2015 },
  { slug: 'all-new-all-different', start: 2015, end: 2018 },
  { slug: 'dawn-of-krakoa', start: 2019, end: 2024 },
  { slug: 'blood-hunt-doom', start: 2024, end: 2025 },
  { slug: 'current-ongoings', start: 2025, end: 2026 },
];

// Series keywords → essential importance
const ESSENTIAL_SERIES = [
  'amazing spider-man', 'uncanny x-men', 'x-men', 'fantastic four',
  'avengers', 'daredevil', 'hulk', 'iron man', 'thor', 'captain america',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/\[dm only\]/gi, '')
    .replace(/\[.*?\]/gi, '')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

/**
 * Parse the earliest year from a "collects" string.
 * Looks for patterns like "(1963)", "(2020)", or uses known series start dates.
 */
function parseEarliestYear(collects) {
  if (!collects) return null;

  // Match parenthesized years like (1963), (2020)
  const yearMatches = collects.match(/\((\d{4})\)/g);
  if (yearMatches && yearMatches.length > 0) {
    const years = yearMatches
      .map(m => parseInt(m.replace(/[()]/g, ''), 10))
      .filter(y => y >= 1938 && y <= 2030); // valid comic years
    if (years.length > 0) return Math.min(...years);
  }

  // Fallback: look up known series by name and issue range
  const SERIES_START_YEARS = {
    'amazing spider-man': 1963,
    'uncanny x-men': 1963,
    'fantastic four': 1961,
    'avengers': 1963,
    'daredevil': 1964,
    'incredible hulk': 1962,
    'iron man': 1968,
    'thor': 1962,
    'captain america': 1968,
    'x-men': 1963,
    'wolverine': 1988,
    'new mutants': 1983,
    'excalibur': 1988,
    'alpha flight': 1983,
    'west coast avengers': 1985,
    'micronauts': 1979,
    'rom': 1979,
    'power man and iron fist': 1978,
    'spectacular spider-man': 1976,
    'defenders': 1972,
    'ghost rider': 1973,
    'moon knight': 1980,
    'silver surfer': 1968,
    'doctor strange': 1968,
    'conan the barbarian': 1970,
    'savage sword of conan': 1974,
    'star wars': 1977,
    'punisher': 1987,
    'marvel team-up': 1972,
    'marvel two-in-one': 1974,
    'marvel premiere': 1972,
    'eternals': 1976,
    'inhumans': 1975,
    'ms. marvel': 1977,
    'she-hulk': 1980,
    'power pack': 1984,
    'new warriors': 1990,
    'x-force': 1991,
    'x-factor': 1986,
    'spider-man 2099': 1992,
    'thunderbolts': 1997,
    'runaways': 2003,
    'young avengers': 2005,
    'nova': 2007,
    'scarlet spider': 2012,
    'deadpool': 1997,
    'miles morales': 2011,
    'ultimates': 2002,
    'ultimate spider-man': 2000,
  };

  const lower = collects.toLowerCase();
  // Try to estimate year from series name + issue number
  for (const [series, startYear] of Object.entries(SERIES_START_YEARS)) {
    if (lower.includes(series)) {
      // Extract earliest issue number
      const issueMatch = lower.match(new RegExp(series.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*#(\\d+)'));
      if (issueMatch) {
        const issueNum = parseInt(issueMatch[1], 10);
        // Rough estimate: ~12 issues per year
        const estimatedYear = startYear + Math.floor(issueNum / 12);
        return Math.min(estimatedYear, 2026);
      }
      return startYear;
    }
  }

  return null;
}

/**
 * Determine the story era based on the earliest issue year.
 */
function assignEra(year) {
  if (!year) return 'current-ongoings';

  // Walk backwards through ERA_RANGES to find the best fit.
  // Later entries take priority for overlapping ranges.
  for (let i = ERA_RANGES.length - 1; i >= 0; i--) {
    const era = ERA_RANGES[i];
    if (year >= era.start && year <= era.end) {
      return era.slug;
    }
  }

  // Fallback
  if (year < 1961) return 'birth-of-marvel';
  return 'current-ongoings';
}

/**
 * Determine importance level.
 */
function assignImportance(title, format) {
  const lower = title.toLowerCase();

  // Omnibuses of key series → essential
  if (format === 'omnibus') {
    for (const series of ESSENTIAL_SERIES) {
      if (lower.includes(series)) return 'essential';
    }
    return 'recommended';
  }

  // Epic Collections of key series → recommended
  if (format === 'epic_collection') return 'recommended';

  // Masterworks → recommended
  if (format === 'masterworks') return 'recommended';

  // Everything else
  return 'supplemental';
}

/**
 * Parse price string like "$125.00" → number
 */
function parsePrice(priceStr) {
  if (!priceStr) return null;
  const cleaned = priceStr.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

/**
 * Normalize ISBN — strip hyphens, take last 13 or 10 digits
 */
function normalizeIsbn(isbn) {
  if (!isbn) return null;
  return isbn.replace(/[-\s]/g, '');
}

/**
 * Convert ISBN-13 to ISBN-10 (for Amazon cover URLs)
 */
function isbn13to10(isbn13) {
  if (!isbn13 || isbn13.length !== 13) return isbn13;
  if (!isbn13.startsWith('978')) return isbn13;
  const body = isbn13.slice(3, 12);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(body[i], 10) * (10 - i);
  }
  const check = (11 - (sum % 11)) % 11;
  return body + (check === 10 ? 'X' : String(check));
}

/**
 * Generate a simple synopsis from available data.
 */
function generateSynopsis(entry, format) {
  const formatLabel = {
    omnibus: 'Omnibus',
    trade_paperback: 'Trade Paperback',
    epic_collection: 'Epic Collection',
    masterworks: 'Marvel Masterworks',
    complete_collection: 'Complete Collection',
    oversized_hardcover: 'Oversized Hardcover',
    hardcover: 'Hardcover',
    premier_collection: 'Premier Collection',
    compendium: 'Compendium',
  };

  const fmtName = formatLabel[format] || format;
  return `Collects ${entry.collects}. Published by Marvel in ${fmtName} format.`;
}

/**
 * Fetch a cover image URL for an edition via OpenLibrary + Amazon fallback.
 */
async function fetchCoverUrl(isbn) {
  if (!isbn) return null;

  const normalizedIsbn = normalizeIsbn(isbn);

  // Try OpenLibrary first
  const olUrl = `https://covers.openlibrary.org/b/isbn/${normalizedIsbn}-L.jpg`;
  try {
    const resp = await fetch(olUrl, { method: 'HEAD', redirect: 'follow' });
    if (resp.ok) {
      const contentLength = resp.headers.get('content-length');
      // OpenLibrary returns a 1x1 pixel for missing covers (~43 bytes)
      if (contentLength && parseInt(contentLength, 10) > 1000) {
        return olUrl;
      }
    }
  } catch { /* ignore */ }

  // Try Amazon direct
  const isbn10 = isbn13to10(normalizedIsbn);
  if (isbn10 && isbn10.length === 10) {
    const amazonUrl = `https://m.media-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`;
    try {
      const resp = await fetch(amazonUrl, { method: 'HEAD', redirect: 'follow' });
      if (resp.ok) {
        const contentLength = resp.headers.get('content-length');
        if (contentLength && parseInt(contentLength, 10) > 1000) {
          return amazonUrl;
        }
      }
    } catch { /* ignore */ }
  }

  return null;
}

/**
 * Sleep helper for rate limiting
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract series name and volume number from a title for connection generation.
 * e.g. "Excalibur Omnibus Vol. 4" → { series: "excalibur-omnibus", vol: 4 }
 */
function parseSeriesAndVolume(title) {
  const lower = title.toLowerCase();
  // Match "Vol. N", "Vol N", "Volume N"
  const volMatch = lower.match(/\bvol\.?\s*(\d+)\b/);
  if (!volMatch) return null;
  const vol = parseInt(volMatch[1], 10);
  // Series is everything before "vol."
  const seriesRaw = lower.slice(0, volMatch.index).trim();
  const series = seriesRaw
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!series) return null;
  return { series, vol };
}


// ===========================================================================
// Main pipeline
// ===========================================================================

async function main() {
  console.log('=== Marvel Cartographer: 2026 Editions Seed ===\n');

  // -----------------------------------------------------------------------
  // 1. Load raw data
  // -----------------------------------------------------------------------
  const rawPath = resolve(PROJECT_ROOT, 'data', 'marvel_collected_editions_2026.json');
  if (!existsSync(rawPath)) {
    console.error('ERROR: Raw data file not found at', rawPath);
    process.exit(1);
  }
  const rawData = JSON.parse(readFileSync(rawPath, 'utf-8'));
  console.log(`1. Loaded ${rawData.length} raw entries.`);

  // -----------------------------------------------------------------------
  // 2. Deduplicate
  // -----------------------------------------------------------------------
  // Two-pass dedup:
  // Pass 1: Group by exact collects field
  // Pass 2: Also catch DM-Only entries where title matches but collects differs slightly
  const collectsMap = new Map();
  for (const entry of rawData) {
    const key = entry.collects;
    if (!collectsMap.has(key)) {
      collectsMap.set(key, []);
    }
    collectsMap.get(key).push(entry);
  }

  let deduped = [];
  let dmRemoved = 0;
  let dupeRemoved = 0;

  for (const [, entries] of collectsMap) {
    if (entries.length === 1) {
      deduped.push(entries[0]);
      continue;
    }

    // Prefer the non-DM-Only entry
    const nonDM = entries.filter(e => !e.title.includes('[DM Only]'));
    const dm = entries.filter(e => e.title.includes('[DM Only]'));

    if (nonDM.length > 0) {
      // Among non-DM entries, prefer the one with more fields (price, amazon_link)
      nonDM.sort((a, b) => {
        const scoreA = (a.price ? 1 : 0) + (a.amazon_link ? 1 : 0);
        const scoreB = (b.price ? 1 : 0) + (b.amazon_link ? 1 : 0);
        return scoreB - scoreA;
      });
      const kept = nonDM[0];
      // Store DM ISBNs as a note
      if (dm.length > 0) {
        kept._dm_isbns = dm.map(d => d.isbn).filter(Boolean);
      }
      deduped.push(kept);
      dmRemoved += dm.length;
      dupeRemoved += nonDM.length - 1;
    } else {
      // All entries are DM-Only (shouldn't happen but handle it)
      deduped.push(entries[0]);
      dmRemoved += entries.length - 1;
    }
  }

  // Pass 2: Remove remaining DM-Only entries whose base title matches a standard entry
  // (catches cases where DM variant has slightly different collects)
  const standardEntries = deduped.filter(e => !e.title.includes('[DM Only]'));
  const pass2 = [];
  for (const entry of deduped) {
    if (entry.title.includes('[DM Only]')) {
      // Strip everything after "Cover [DM Only]" or just "[DM Only]"
      const dmStripped = entry.title
        .replace(/\s*\[DM Only\]$/i, '')
        .replace(/\s+\S+\s+Cover$/i, '')  // try removing "Artist Cover" (1 word artist)
        .toLowerCase().trim();
      // Also try stripping 2-word artist names
      const dmStripped2 = entry.title
        .replace(/\s*\[DM Only\]$/i, '')
        .replace(/\s+\S+\s+\S+\s+Cover$/i, '')
        .toLowerCase().trim();
      // Also try stripping 3-word artist names
      const dmStripped3 = entry.title
        .replace(/\s*\[DM Only\]$/i, '')
        .replace(/\s+\S+\s+\S+\s+\S+\s+Cover$/i, '')
        .toLowerCase().trim();

      const match = standardEntries.find(std => {
        const stdLower = std.title.toLowerCase().trim();
        return stdLower === dmStripped || stdLower === dmStripped2 || stdLower === dmStripped3;
      });

      if (match) {
        dmRemoved++;
        if (!match._dm_isbns) match._dm_isbns = [];
        if (entry.isbn) match._dm_isbns.push(entry.isbn);
        continue;
      }
    }
    pass2.push(entry);
  }
  deduped = pass2;

  console.log(`2. Deduplication: removed ${dmRemoved} DM-Only variants, ${dupeRemoved} source duplicates.`);
  console.log(`   Unique editions: ${deduped.length}`);

  // -----------------------------------------------------------------------
  // 3. Transform to DB format
  // -----------------------------------------------------------------------
  const slugsSeen = new Set();
  const editions = [];

  for (const entry of deduped) {
    const format = FORMAT_MAP[entry.format];
    if (!format) {
      console.warn(`   WARN: Unknown format "${entry.format}" for "${entry.title}", defaulting to trade_paperback`);
    }
    const dbFormat = format || 'trade_paperback';

    // Slug
    let slug = generateSlug(entry.title);
    if (slugsSeen.has(slug)) {
      slug = slug + '-2';
    }
    if (slugsSeen.has(slug)) {
      slug = slug.replace(/-2$/, '-3');
    }
    slugsSeen.add(slug);

    // Era assignment
    const year = parseEarliestYear(entry.collects);
    const eraSlug = assignEra(year);
    // Publication era is always current-ongoings since these are 2026 releases
    const publicationEraSlug = 'current-ongoings';

    // Importance
    const importance = assignImportance(entry.title, dbFormat);

    // Print status
    const releaseDate = entry.release_date || null;
    let printStatus = 'upcoming';
    if (releaseDate && releaseDate !== '2099-01-01') {
      const rd = new Date(releaseDate);
      if (rd <= new Date()) {
        printStatus = 'in_print';
      }
    }

    // Price
    const coverPrice = parsePrice(entry.price);

    // ISBN
    const isbn = normalizeIsbn(entry.isbn);

    // Synopsis
    const synopsis = generateSynopsis(entry, dbFormat);

    // Connection notes for DM variants
    let connectionNotes = null;
    if (entry._dm_isbns && entry._dm_isbns.length > 0) {
      connectionNotes = `Also available as DM-Only variant (ISBN: ${entry._dm_isbns.join(', ')}).`;
    }

    editions.push({
      slug,
      title: entry.title,
      format: dbFormat,
      issues_collected: entry.collects,
      isbn,
      cover_price: coverPrice,
      print_status: printStatus,
      importance,
      release_date: releaseDate === '2099-01-01' ? null : releaseDate,
      edition_number: 1,
      era_slug: eraSlug,
      publication_era_slug: publicationEraSlug,
      synopsis,
      connection_notes: connectionNotes,
      cover_image_url: null, // filled in step 4
      _original: entry, // keep for cover fetching
    });
  }

  console.log(`3. Transformed ${editions.length} editions.`);

  // Log era distribution
  const eraDistribution = {};
  for (const e of editions) {
    eraDistribution[e.era_slug] = (eraDistribution[e.era_slug] || 0) + 1;
  }
  console.log('   Era distribution:');
  for (const [era, count] of Object.entries(eraDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${era}: ${count}`);
  }

  // Log format distribution
  const formatDistribution = {};
  for (const e of editions) {
    formatDistribution[e.format] = (formatDistribution[e.format] || 0) + 1;
  }
  console.log('   Format distribution:');
  for (const [fmt, count] of Object.entries(formatDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`     ${fmt}: ${count}`);
  }

  // -----------------------------------------------------------------------
  // 4. Fetch cover images
  // -----------------------------------------------------------------------
  if (!SKIP_COVERS) {
    console.log('\n4. Fetching cover images...');
    let found = 0;
    let missed = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < editions.length; i += BATCH_SIZE) {
      const batch = editions.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map(async (edition) => {
          const url = await fetchCoverUrl(edition.isbn);
          return { edition, url };
        })
      );
      for (const { edition, url } of results) {
        if (url) {
          edition.cover_image_url = url;
          found++;
        } else {
          missed++;
        }
      }
      // Rate limit between batches
      if (i + BATCH_SIZE < editions.length) {
        await sleep(200);
      }
      process.stdout.write(`   Processed ${Math.min(i + BATCH_SIZE, editions.length)}/${editions.length} (${found} covers found)\r`);
    }
    console.log(`\n   Cover results: ${found} found, ${missed} missing.`);
  } else {
    console.log('\n4. Skipping cover image fetching (--skip-covers).');
  }

  // -----------------------------------------------------------------------
  // 5. Generate connections
  // -----------------------------------------------------------------------
  console.log('\n5. Generating connections...');
  const connections = [];

  // Group editions by series for sequential connections
  const seriesGroups = new Map();
  for (const edition of editions) {
    const parsed = parseSeriesAndVolume(edition.title);
    if (!parsed) continue;
    if (!seriesGroups.has(parsed.series)) {
      seriesGroups.set(parsed.series, []);
    }
    seriesGroups.get(parsed.series).push({ ...parsed, slug: edition.slug });
  }

  for (const [series, vols] of seriesGroups) {
    if (vols.length < 2) continue;
    vols.sort((a, b) => a.vol - b.vol);
    for (let i = 0; i < vols.length - 1; i++) {
      connections.push({
        source_slug: vols[i].slug,
        target_slug: vols[i + 1].slug,
        connection_type: 'leads_to',
        strength: 8,
        confidence: 90,
        description: `${series} Vol. ${vols[i].vol} → Vol. ${vols[i + 1].vol}`,
      });
    }
  }

  console.log(`   Generated ${connections.length} sequential connections across ${seriesGroups.size} series.`);

  // -----------------------------------------------------------------------
  // 6. Upsert to Supabase
  // -----------------------------------------------------------------------
  if (DRY_RUN) {
    console.log('\n6. DRY RUN — skipping database writes.');
    console.log('\n   Preview of first 5 editions:');
    for (const e of editions.slice(0, 5)) {
      console.log(`   - [${e.format}] ${e.title}`);
      console.log(`     slug: ${e.slug}`);
      console.log(`     era: ${e.era_slug} | pub_era: ${e.publication_era_slug}`);
      console.log(`     importance: ${e.importance} | status: ${e.print_status}`);
      console.log(`     cover: ${e.cover_image_url || '(none)'}`);
      console.log();
    }
    if (connections.length > 0) {
      console.log('   Preview of first 5 connections:');
      for (const c of connections.slice(0, 5)) {
        console.log(`   - ${c.source_slug} → ${c.target_slug} (${c.connection_type})`);
      }
    }

    console.log('\n=== DRY RUN COMPLETE ===');
    console.log(`Would insert/update ${editions.length} editions and ${connections.length} connections.`);
    process.exit(0);
  }

  console.log('\n6. Upserting to Supabase...');

  // 6a. Fetch era slug → UUID map
  console.log('   Fetching era map...');
  const { data: eraRows, error: eraErr } = await supabase
    .from('eras')
    .select('id, slug');
  if (eraErr) {
    console.error('ERROR: Failed to fetch eras:', eraErr.message);
    process.exit(1);
  }
  const eraMap = {};
  for (const row of eraRows) {
    eraMap[row.slug] = row.id;
  }
  console.log(`   Loaded ${Object.keys(eraMap).length} eras.`);

  // 6b. Upsert editions
  console.log('   Upserting editions...');
  const editionRows = editions.map(e => ({
    slug: e.slug,
    title: e.title,
    format: e.format,
    issues_collected: e.issues_collected,
    isbn: e.isbn,
    cover_price: e.cover_price,
    print_status: e.print_status,
    importance: e.importance,
    release_date: e.release_date,
    edition_number: e.edition_number,
    era_id: eraMap[e.era_slug] || null,
    publication_era_id: eraMap[e.publication_era_slug] || eraMap[e.era_slug] || null,
    synopsis: e.synopsis,
    connection_notes: e.connection_notes,
    cover_image_url: e.cover_image_url,
  }));

  const BATCH_SIZE = 100;
  let insertedCount = 0;
  for (let i = 0; i < editionRows.length; i += BATCH_SIZE) {
    const batch = editionRows.slice(i, i + BATCH_SIZE);
    const { data: result, error } = await supabase
      .from('collected_editions')
      .upsert(batch, { onConflict: 'slug', ignoreDuplicates: false })
      .select('id, slug');

    if (error) {
      console.error(`   ERROR in batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.code} ${error.message}`);
      // Try inserting one by one to identify the problem row
      for (const row of batch) {
        const { error: singleErr } = await supabase
          .from('collected_editions')
          .upsert([row], { onConflict: 'slug', ignoreDuplicates: false })
          .select('id');
        if (singleErr) {
          console.error(`   FAILED: "${row.title}" (${row.slug}): ${singleErr.message}`);
        } else {
          insertedCount++;
        }
      }
    } else {
      insertedCount += (result || []).length;
    }
  }
  console.log(`   Upserted ${insertedCount} editions.`);

  // 6c. Upsert connections
  if (connections.length > 0) {
    console.log('   Upserting connections...');

    // First, fetch the slug→UUID map for our new editions
    const { data: editionIdRows, error: edIdErr } = await supabase
      .from('collected_editions')
      .select('id, slug')
      .in('slug', editions.map(e => e.slug));

    if (edIdErr) {
      console.error('   ERROR fetching edition IDs:', edIdErr.message);
    } else {
      const editionMap = {};
      for (const row of editionIdRows) {
        editionMap[row.slug] = row.id;
      }

      const connRows = [];
      let skipped = 0;
      for (const conn of connections) {
        const sourceId = editionMap[conn.source_slug];
        const targetId = editionMap[conn.target_slug];
        if (!sourceId || !targetId) {
          skipped++;
          continue;
        }
        connRows.push({
          source_type: 'edition',
          source_id: sourceId,
          target_type: 'edition',
          target_id: targetId,
          connection_type: conn.connection_type,
          strength: conn.strength,
          confidence: conn.confidence,
          description: conn.description,
        });
      }

      if (skipped > 0) {
        console.log(`   Skipped ${skipped} connections (unresolved slugs).`);
      }

      if (connRows.length > 0) {
        const { data: connResult, error: connErr } = await supabase
          .from('connections')
          .upsert(connRows, {
            onConflict: 'source_type,source_id,target_type,target_id,connection_type',
            ignoreDuplicates: false,
          })
          .select('id');

        if (connErr) {
          console.error('   ERROR upserting connections:', connErr.message);
        } else {
          console.log(`   Upserted ${(connResult || []).length} connections.`);
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  console.log('\n=== SEED COMPLETE ===');
  console.log(`Editions upserted: ${insertedCount}`);
  console.log(`Connections created: ${connections.length}`);
  console.log(`DM-Only variants removed: ${dmRemoved}`);
  console.log(`Source duplicates removed: ${dupeRemoved}`);
}

main().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});

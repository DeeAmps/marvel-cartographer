#!/usr/bin/env node

/**
 * seed-edition-issues.mjs
 *
 * Re-seeds ONLY the edition_issues table from the updated JSON file.
 * Deletes all existing rows and re-inserts from data/archive/edition_issues.json.
 *
 * Usage:
 *   node scripts/seed-edition-issues.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// Parse .env
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
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error('ERROR: Missing SUPABASE_URL, ANON_KEY, or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const DATA_DIR = resolve(PROJECT_ROOT, 'data', 'archive');

async function main() {
  const startTime = Date.now();
  console.log('===========================================');
  console.log('  Re-seed edition_issues table');
  console.log('===========================================');

  // 1. Load edition_issues.json
  const issuesPath = resolve(DATA_DIR, 'edition_issues.json');
  if (!existsSync(issuesPath)) {
    console.error('ERROR: edition_issues.json not found at', issuesPath);
    process.exit(1);
  }
  const issuesData = JSON.parse(readFileSync(issuesPath, 'utf-8'));
  console.log(`Loaded ${issuesData.length} issue entries from JSON.`);

  // 2. Load editions to build slug -> UUID map
  console.log('Fetching editions from Supabase...');
  let allEditions = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/collected_editions?select=id,slug&order=slug&offset=${from}&limit=${PAGE_SIZE}`,
      {
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': ANON_KEY,
        },
      }
    );
    if (!res.ok) {
      console.error('Failed to fetch editions:', res.status, await res.text());
      process.exit(1);
    }
    const data = await res.json();
    allEditions.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const slugToId = new Map(allEditions.map(e => [e.slug, e.id]));
  console.log(`Found ${slugToId.size} editions in Supabase.`);

  // 3. Delete all existing edition_issues
  console.log('Deleting existing edition_issues...');
  const delRes = await fetch(
    `${SUPABASE_URL}/rest/v1/edition_issues?id=not.is.null`,
    {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': ANON_KEY,
        'Prefer': 'return=minimal',
      },
    }
  );
  if (!delRes.ok) {
    console.error('Delete failed:', delRes.status, await delRes.text());
    process.exit(1);
  }
  console.log('Deleted all existing rows.');

  // 4. Build rows with edition UUIDs
  const rows = [];
  let skipped = 0;
  for (const ei of issuesData) {
    const editionId = slugToId.get(ei.edition_slug);
    if (!editionId) {
      skipped++;
      continue;
    }
    rows.push({
      edition_id: editionId,
      series_name: ei.series_name,
      issue_number: ei.issue_number,
      is_annual: ei.is_annual ?? false,
    });
  }

  // Deduplicate
  const seen = new Set();
  const deduped = rows.filter(r => {
    const key = `${r.edition_id}|${r.series_name}|${r.issue_number}|${r.is_annual}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (skipped > 0) {
    console.log(`Skipped ${skipped} entries (unresolved edition slugs).`);
  }
  if (deduped.length < rows.length) {
    console.log(`Removed ${rows.length - deduped.length} duplicates.`);
  }

  // 5. Insert in batches
  console.log(`Inserting ${deduped.length} edition_issues in batches of 500...`);
  const BATCH_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < deduped.length; i += BATCH_SIZE) {
    const batch = deduped.slice(i, i + BATCH_SIZE);
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/edition_issues?on_conflict=edition_id,series_name,issue_number,is_annual`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify(batch),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 409 || body.includes('duplicate key')) {
        console.warn(`  WARN: Duplicate key(s) in batch ${Math.floor(i / BATCH_SIZE) + 1}, continuing...`);
        continue;
      }
      console.error(`Insert failed (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${res.status}\n${body}`);
      process.exit(1);
    }
    inserted += batch.length;
    if ((i / BATCH_SIZE + 1) % 10 === 0) {
      console.log(`  ... ${inserted}/${deduped.length} inserted`);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nDone! Inserted ${inserted} edition_issues in ${elapsed}s.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * seed-2026-connections.mjs
 *
 * Generates intelligent graph connections for editions that lack them.
 * Focuses on 2026-seeded editions but connects to the full DB.
 *
 * Two strategies:
 *   1. Volume-based: "Vol. N → Vol. N+1" within the same title series
 *   2. Issue-range-based: Sequential issue runs of the same comic series
 *
 * Usage:
 *   node scripts/seed-2026-connections.mjs              # full run
 *   node scripts/seed-2026-connections.mjs --dry-run     # preview only
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(
  resolve(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'package.json')
);
const { createClient } = require('@supabase/supabase-js');

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) console.log('*** DRY RUN — no database writes ***\n');

function loadEnv() {
  const envPath = resolve(PROJECT_ROOT, '.env');
  if (!existsSync(envPath)) { console.error('ERROR: .env not found'); process.exit(1); }
  const env = {};
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i > 0) env[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// ---------------------------------------------------------------------------
// Parsing helpers
// ---------------------------------------------------------------------------

function parseTitleVolume(title) {
  if (!title) return { series: title, vol: null };
  const m = title.match(/^(.+?)\s+Vol\.\s*(\d+)(?:\s*:\s*(.+))?$/i);
  if (m) return { series: m[1].trim(), vol: parseInt(m[2], 10) };
  return { series: title.trim(), vol: null };
}

function parseIssuesCollected(issuesStr) {
  if (!issuesStr) return [];
  const results = [];
  for (const segment of issuesStr.split(/\s*;\s*/)) {
    const re = /([A-Za-z][A-Za-z0-9\s\-'&:().,]*?)\s*#(\d+)(?:\s*[-\u2013]\s*(\d+))?/g;
    let m;
    while ((m = re.exec(segment)) !== null) {
      results.push({
        series: m[1].trim().replace(/,\s*$/, ''),
        start: parseInt(m[2], 10),
        end: m[3] ? parseInt(m[3], 10) : parseInt(m[2], 10),
      });
    }
  }
  return results;
}

function normalizeSeries(name) {
  if (!name) return '';
  return name
    .replace(/\(\d{4}\)/g, '')   // Remove (2022), (1963), etc.
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Marvel Cartographer: Connection Builder ===\n');

  // 1. Fetch ALL editions (paginated)
  console.log('1. Fetching all editions...');
  let allEditions = [];
  let page = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('collected_editions')
      .select('id, slug, title, issues_collected, format, print_status')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('title');
    if (error) { console.error('Error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allEditions = allEditions.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }
  console.log(`   ${allEditions.length} total editions.\n`);

  // 2. Fetch ALL existing connections (edition→edition)
  console.log('2. Fetching existing connections...');
  let allConns = [];
  page = 0;
  while (true) {
    const { data, error } = await supabase
      .from('connections')
      .select('source_id, target_id, connection_type')
      .eq('source_type', 'edition')
      .eq('target_type', 'edition')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
    if (error) { console.error('Error:', error.message); process.exit(1); }
    if (!data || data.length === 0) break;
    allConns = allConns.concat(data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  const existingKeys = new Set();
  const connectedIds = new Set();
  for (const c of allConns) {
    existingKeys.add(`${c.source_id}->${c.target_id}:${c.connection_type}`);
    connectedIds.add(c.source_id);
    connectedIds.add(c.target_id);
  }
  console.log(`   ${allConns.length} existing edition connections.`);

  const unconnected = allEditions.filter(e => !connectedIds.has(e.id));
  console.log(`   ${unconnected.length} editions have ZERO connections.\n`);

  // 3. Parse all editions
  const parsed = allEditions.map(e => ({
    ...e,
    titleParsed: parseTitleVolume(e.title),
    issueRanges: parseIssuesCollected(e.issues_collected),
  }));

  // Build a set of unconnected IDs for targeting
  const unconnectedIds = new Set(unconnected.map(e => e.id));

  const proposed = [];
  const proposedKeys = new Set();

  function addProposal(source, target, strength, confidence, reason) {
    const key = `${source.id}->${target.id}:leads_to`;
    if (existingKeys.has(key)) return;
    if (proposedKeys.has(key)) return;
    if (source.id === target.id) return;
    proposedKeys.add(key);
    proposed.push({ source, target, strength, confidence, reason });
  }

  // 4. Volume-based connections
  console.log('3. Building volume-based connections...');
  const seriesGroups = new Map();
  for (const e of parsed) {
    if (e.titleParsed.vol === null) continue;
    const key = normalizeSeries(e.titleParsed.series);
    if (!seriesGroups.has(key)) seriesGroups.set(key, []);
    seriesGroups.get(key).push(e);
  }

  let volCount = 0;
  for (const [, editions] of seriesGroups) {
    const sorted = editions.filter(e => e.titleParsed.vol !== null)
      .sort((a, b) => a.titleParsed.vol - b.titleParsed.vol);

    // Deduplicate same volume numbers (keep the one that's connected or has better slug)
    const byVol = new Map();
    for (const e of sorted) {
      const v = e.titleParsed.vol;
      if (!byVol.has(v)) {
        byVol.set(v, e);
      } else {
        // Prefer the one that already has connections
        const existing = byVol.get(v);
        if (connectedIds.has(e.id) && !connectedIds.has(existing.id)) {
          byVol.set(v, e);
        }
        // If neither connected, prefer shorter slug (more likely the canonical one)
        else if (!connectedIds.has(e.id) && !connectedIds.has(existing.id)) {
          if (e.slug.length < existing.slug.length) byVol.set(v, e);
        }
      }
    }

    const dedupedVols = [...byVol.entries()].sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < dedupedVols.length - 1; i++) {
      const [curVol, cur] = dedupedVols[i];
      const [nextVol, next] = dedupedVols[i + 1];
      const gap = nextVol - curVol;
      if (gap < 1 || gap > 2) continue;

      addProposal(cur, next,
        gap === 1 ? 9 : 7,
        gap === 1 ? 95 : 75,
        `Volume: "${cur.titleParsed.series}" Vol. ${curVol} → Vol. ${nextVol}`);
      volCount++;
    }
  }
  console.log(`   ${volCount} volume-based proposals.\n`);

  // 5. Issue-range-based connections
  console.log('4. Building issue-range connections...');
  const issueGroups = new Map();
  for (const e of parsed) {
    for (const range of e.issueRanges) {
      const key = normalizeSeries(range.series);
      if (!issueGroups.has(key)) issueGroups.set(key, []);
      issueGroups.get(key).push({ edition: e, range });
    }
  }

  let issueCount = 0;
  for (const [, entries] of issueGroups) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.range.start - b.range.start);

    for (let i = 0; i < entries.length - 1; i++) {
      const cur = entries[i], next = entries[i + 1];
      const gap = next.range.start - cur.range.end;
      if (gap < 0 || gap > 5) continue;
      if (cur.edition.id === next.edition.id) continue;

      addProposal(cur.edition, next.edition,
        gap <= 1 ? 8 : 6,
        gap <= 1 ? 90 : 70,
        `Issues: "${cur.range.series}" #${cur.range.start}-${cur.range.end} → #${next.range.start}-${next.range.end}`);
      issueCount++;
    }
  }
  console.log(`   ${issueCount} issue-range proposals.\n`);

  console.log(`Total new connections: ${proposed.length}`);

  // Count how many previously-unconnected editions gain a connection
  const newlyConnected = new Set();
  for (const c of proposed) {
    if (unconnectedIds.has(c.source.id)) newlyConnected.add(c.source.id);
    if (unconnectedIds.has(c.target.id)) newlyConnected.add(c.target.id);
  }
  console.log(`Unconnected editions that will gain connections: ${newlyConnected.size} / ${unconnected.length}`);

  // Show sample
  console.log('\nSample (first 25):');
  for (const c of proposed.slice(0, 25)) {
    const srcConn = connectedIds.has(c.source.id) ? '[HAS-CONNS]' : '[ORPHAN]';
    const tgtConn = connectedIds.has(c.target.id) ? '[HAS-CONNS]' : '[ORPHAN]';
    console.log(`  ${srcConn} "${c.source.title.substring(0, 55)}" → ${tgtConn} "${c.target.title.substring(0, 55)}"`);
    console.log(`    ${c.reason}`);
  }

  if (DRY_RUN) {
    console.log(`\n*** DRY RUN — would insert ${proposed.length} connections ***`);
    process.exit(0);
  }

  // 6. Upsert connections
  console.log(`\n5. Upserting ${proposed.length} connections...`);
  const rows = proposed.map(c => ({
    source_type: 'edition',
    source_id: c.source.id,
    target_type: 'edition',
    target_id: c.target.id,
    connection_type: 'leads_to',
    strength: c.strength,
    confidence: c.confidence,
    description: c.reason,
  }));

  let inserted = 0;
  const UPSERT_BATCH = 100;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const { data, error } = await supabase
      .from('connections')
      .upsert(batch, {
        onConflict: 'source_type,source_id,target_type,target_id,connection_type',
        ignoreDuplicates: false,
      })
      .select('id');
    if (error) {
      console.error(`   Batch error: ${error.message}`);
      for (const row of batch) {
        const { error: e2 } = await supabase.from('connections')
          .upsert([row], { onConflict: 'source_type,source_id,target_type,target_id,connection_type', ignoreDuplicates: false })
          .select('id');
        if (e2) console.error(`     Failed: ${row.description}: ${e2.message}`);
        else inserted++;
      }
    } else {
      inserted += (data || []).length;
    }
  }

  console.log(`\n=== COMPLETE ===`);
  console.log(`Connections upserted: ${inserted}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });

#!/usr/bin/env node

/**
 * seed-supabase.mjs
 *
 * Comprehensive seed script that reads all JSON data files from data/
 * and inserts them into the Supabase database via the PostgREST API.
 *
 * Usage:
 *   node scripts/seed-supabase.mjs
 *
 * Run from the project root: /Users/danielbennin/Desktop/Marvel Complete/marvel-cartographer/
 *
 * The script is idempotent — uses upserts (on_conflict) so it can be re-run safely.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Resolve project root
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Parse .env manually
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
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
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

console.log(`Supabase URL: ${SUPABASE_URL}`);
console.log('Service role key loaded.');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const DATA_DIR = resolve(PROJECT_ROOT, 'data', 'archive');

function loadJSON(filename) {
  const filePath = resolve(DATA_DIR, filename);
  if (!existsSync(filePath)) {
    console.warn(`  WARN: ${filename} not found, skipping.`);
    return null;
  }
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Upsert rows into a Supabase table via PostgREST.
 * Returns the inserted/updated rows with generated UUIDs.
 */
async function upsert(table, rows, onConflict = 'slug') {
  if (!rows || rows.length === 0) return [];

  const allResults = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const url = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${onConflict}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation,resolution=merge-duplicates',
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Upsert into ${table} failed (batch ${i / BATCH_SIZE + 1}): ${res.status} ${res.statusText}\n${body}`);
    }

    const data = await res.json();
    allResults.push(...data);
  }

  return allResults;
}

/**
 * Insert rows (no upsert — for junction tables without a slug).
 * Uses POST. If duplicates exist, they'll error; we catch and continue.
 */
async function insertRows(table, rows, onConflict = null) {
  if (!rows || rows.length === 0) return [];

  const allResults = [];
  const BATCH_SIZE = 500;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let url = `${SUPABASE_URL}/rest/v1/${table}`;
    if (onConflict) {
      url += `?on_conflict=${onConflict}`;
    }
    const preferParts = ['return=representation'];
    if (onConflict) {
      preferParts.push('resolution=merge-duplicates');
    }
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': preferParts.join(','),
      },
      body: JSON.stringify(batch),
    });

    if (!res.ok) {
      const body = await res.text();
      // For junction tables, duplicate key errors are expected on re-run
      if (res.status === 409 || body.includes('duplicate key')) {
        console.warn(`    WARN: Duplicate key(s) in ${table} batch ${i / BATCH_SIZE + 1}, skipping.`);
        continue;
      }
      throw new Error(`Insert into ${table} failed (batch ${i / BATCH_SIZE + 1}): ${res.status} ${res.statusText}\n${body}`);
    }

    const data = await res.json();
    allResults.push(...data);
  }

  return allResults;
}

/**
 * Delete all rows from a table (used for clean re-seed of junction tables).
 */
async function deleteAll(table) {
  // PostgREST requires a filter to delete — use a tautology: id is not null
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=not.is.null`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });
  if (!res.ok) {
    const body = await res.text();
    // Some junction tables use composite PKs without an id column
    // Try deleting with a different filter
    const url2 = `${SUPABASE_URL}/rest/v1/${table}?edition_id=not.is.null`;
    const res2 = await fetch(url2, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': ANON_KEY,
        'Prefer': 'return=minimal',
      },
    });
    if (!res2.ok) {
      console.warn(`    WARN: Could not clear ${table}: ${body}`);
    }
  }
}

/**
 * PATCH rows via PostgREST
 */
async function patchRows(table, filter, updates) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`PATCH ${table} failed: ${res.status} ${body}`);
  }
  return res.json();
}

/**
 * Build a slug→UUID lookup map from an array of rows that have slug and id.
 */
function buildSlugMap(rows) {
  const map = {};
  for (const row of rows) {
    if (row.slug && row.id) {
      map[row.slug] = row.id;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Seeding functions
// ---------------------------------------------------------------------------

async function seedEras() {
  console.log('\n1. Seeding eras...');
  const data = loadJSON('eras.json');
  if (!data) return {};
  const rows = data.map(e => ({
    slug: e.slug,
    name: e.name,
    number: e.number,
    year_start: e.year_start,
    year_end: e.year_end,
    subtitle: e.subtitle || null,
    description: e.description || null,
    color: e.color || null,
  }));
  const result = await upsert('eras', rows);
  console.log(`   Seeded ${result.length} eras.`);
  return buildSlugMap(result);
}

async function seedUniverses() {
  console.log('\n2. Seeding universes...');
  const data = loadJSON('universes.json');
  if (!data) return {};
  const rows = data.map(u => ({
    slug: u.slug,
    name: u.name,
    designation: u.designation || null,
    year_start: u.year_start || null,
    year_end: u.year_end || null,
    description: u.description || null,
    is_primary: u.is_primary ?? false,
    color: u.color || null,
  }));
  const result = await upsert('universes', rows);
  console.log(`   Seeded ${result.length} universes.`);
  return buildSlugMap(result);
}

async function seedCreators() {
  console.log('\n3. Seeding creators...');
  const data = loadJSON('creators.json');
  if (!data) return {};
  const rows = data.map(c => ({
    slug: c.slug,
    name: c.name,
    roles: c.roles || [],
    active_years: c.active_years || null,
    bio: c.bio || null,
    image_url: c.image_url || null,
  }));
  const result = await upsert('creators', rows);
  console.log(`   Seeded ${result.length} creators.`);
  return buildSlugMap(result);
}

async function seedCharacters() {
  console.log('\n4. Seeding characters...');
  const data = loadJSON('characters.json');
  if (!data) return {};
  const rows = data.map(c => ({
    slug: c.slug,
    name: c.name,
    aliases: c.aliases || [],
    first_appearance_issue: c.first_appearance_issue || null,
    universe: c.universe || 'Earth-616',
    teams: c.teams || [],
    description: c.description || null,
    image_url: c.image_url || null,
  }));
  const result = await upsert('characters', rows);
  console.log(`   Seeded ${result.length} characters.`);
  return buildSlugMap(result);
}

async function seedCollectedEditions(eraMap, universeMap) {
  console.log('\n5. Seeding collected_editions...');
  const data = loadJSON('collected_editions.json');
  if (!data) return {};

  // Default all editions to earth-616
  const earth616Id = universeMap['earth-616'] || null;

  const rows = data.map(e => ({
    slug: e.slug,
    title: e.title,
    format: e.format,
    issues_collected: e.issues_collected,
    issue_count: e.issue_count || null,
    page_count: e.page_count || null,
    isbn: e.isbn || null,
    cover_price: e.cover_price || null,
    print_status: e.print_status,
    importance: e.importance,
    release_date: e.release_date || null,
    edition_number: e.edition_number || 1,
    era_id: eraMap[e.era_slug] || null,
    universe_id: earth616Id,
    synopsis: e.synopsis || '',
    connection_notes: e.connection_notes || null,
    cover_image_url: e.cover_image_url || null,
  }));

  const result = await upsert('collected_editions', rows);
  console.log(`   Seeded ${result.length} collected editions.`);
  return buildSlugMap(result);
}

async function seedEraChapters(eraMap) {
  console.log('\n6. Seeding era_chapters...');
  const data = loadJSON('era_chapters.json');
  if (!data) return {};
  const rows = data.map(ch => ({
    slug: ch.slug,
    era_id: eraMap[ch.era_slug] || null,
    name: ch.name,
    number: ch.number,
    description: ch.description || null,
    year_start: ch.year_start || null,
    year_end: ch.year_end || null,
  }));
  const result = await upsert('era_chapters', rows);
  console.log(`   Seeded ${result.length} era chapters.`);
  return { slugMap: buildSlugMap(result), rawData: data };
}

async function updateEditionChapters(chapterSlugMap, chapterRawData, editionMap) {
  console.log('\n7. Updating collected_editions.chapter_id...');
  let updateCount = 0;
  for (const ch of chapterRawData) {
    const chapterId = chapterSlugMap[ch.slug];
    if (!chapterId || !ch.edition_slugs || ch.edition_slugs.length === 0) continue;

    // Filter to only edition slugs that exist in our map
    const validSlugs = ch.edition_slugs.filter(s => editionMap[s]);
    if (validSlugs.length === 0) continue;

    // Build filter: id in (uuid1, uuid2, ...)
    const ids = validSlugs.map(s => editionMap[s]);
    const filter = `id=in.(${ids.join(',')})`;

    try {
      await patchRows('collected_editions', filter, { chapter_id: chapterId });
      updateCount += validSlugs.length;
    } catch (err) {
      console.warn(`    WARN: Failed to update chapter for ${ch.slug}: ${err.message}`);
    }
  }
  console.log(`   Updated chapter_id on ${updateCount} editions.`);
}

async function seedEditionCreators(editionMap, creatorNameMap) {
  console.log('\n8. Seeding edition_creators...');
  const data = loadJSON('collected_editions.json');
  if (!data) return;

  // First, clear existing junction entries for clean re-seed
  await deleteAll('edition_creators');

  const rows = [];
  for (const edition of data) {
    const editionId = editionMap[edition.slug];
    if (!editionId || !edition.creators) continue;

    for (const c of edition.creators) {
      const creatorId = creatorNameMap[c.name];
      if (!creatorId) {
        // Creator not in our creators.json — skip
        continue;
      }
      rows.push({
        edition_id: editionId,
        creator_id: creatorId,
        role: c.role || 'writer',
      });
    }
  }

  // Deduplicate by (edition_id, creator_id, role)
  const seen = new Set();
  const deduped = rows.filter(r => {
    const key = `${r.edition_id}|${r.creator_id}|${r.role}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const result = await insertRows('edition_creators', deduped, 'edition_id,creator_id,role');
  console.log(`   Seeded ${deduped.length} edition_creator entries.`);
}

async function seedStoryArcs(eraMap) {
  console.log('\n9. Seeding story_arcs...');
  const data = loadJSON('story_arcs.json');
  if (!data) return {};
  const rows = data.map(a => ({
    slug: a.slug,
    name: a.name,
    issues: a.issues,
    era_id: eraMap[a.era_slug] || null,
    importance: a.importance,
    synopsis: a.synopsis || '',
    tags: a.tags || [],
  }));
  const result = await upsert('story_arcs', rows);
  console.log(`   Seeded ${result.length} story arcs.`);
  return buildSlugMap(result);
}

async function seedEvents(eraMap) {
  console.log('\n10. Seeding events...');
  const data = loadJSON('events.json');
  if (!data) return {};
  const rows = data.map(e => ({
    slug: e.slug,
    name: e.name,
    year: e.year,
    core_issues: e.core_issues,
    importance: e.importance,
    synopsis: e.synopsis || '',
    impact: e.impact || null,
    prerequisites: e.prerequisites || null,
    consequences: e.consequences || null,
    era_id: eraMap[e.era_slug] || null,
    tags: e.tags || [],
  }));
  const result = await upsert('events', rows);
  console.log(`   Seeded ${result.length} events.`);
  return buildSlugMap(result);
}

async function seedEventPhases(eventMap) {
  console.log('\n11. Seeding event_phases...');
  const data = loadJSON('event_phases.json');
  if (!data) return {};

  const rows = [];
  for (const entry of data) {
    const eventId = eventMap[entry.event_slug];
    if (!eventId || !entry.phases) continue;

    for (const phase of entry.phases) {
      rows.push({
        slug: phase.slug,
        event_id: eventId,
        name: phase.name,
        number: phase.number,
        description: phase.description || null,
      });
    }
  }

  // event_phases has UNIQUE(event_id, number) — delete and re-insert
  const delUrl = `${SUPABASE_URL}/rest/v1/event_phases?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const result = await insertRows('event_phases', rows, 'event_id,number');
  console.log(`   Seeded ${rows.length} event phases.`);

  // Build slug map from results
  const slugMap = {};
  for (const row of result) {
    if (row.slug && row.id) slugMap[row.slug] = row.id;
  }
  return slugMap;
}

async function seedEventEditions(eventMap, editionMap) {
  console.log('\n12. Seeding event_editions...');
  const data = loadJSON('event_editions.json');
  if (!data) return;

  await deleteAll('event_editions');

  const rows = [];
  for (const ee of data) {
    const eventId = eventMap[ee.event_slug];
    const editionId = editionMap[ee.edition_slug];
    if (!eventId || !editionId) {
      if (!eventId) console.warn(`    WARN: event_editions: unknown event slug "${ee.event_slug}"`);
      if (!editionId) console.warn(`    WARN: event_editions: unknown edition slug "${ee.edition_slug}"`);
      continue;
    }
    rows.push({
      event_id: eventId,
      edition_id: editionId,
      is_core: ee.is_core ?? false,
      reading_order: ee.reading_order || null,
    });
  }

  const result = await insertRows('event_editions', rows, 'event_id,edition_id');
  console.log(`   Seeded ${rows.length} event_edition entries.`);
}

async function seedConnections(editionMap, arcMap, eventMap) {
  console.log('\n13. Seeding connections...');
  const data = loadJSON('connections.json');
  if (!data) return;

  // Build type-based lookup
  const typeMap = {
    edition: editionMap,
    arc: arcMap,
    event: eventMap,
  };

  const rows = [];
  let skipped = 0;
  for (const conn of data) {
    const sourceMap = typeMap[conn.source_type];
    const targetMap = typeMap[conn.target_type];

    if (!sourceMap || !targetMap) {
      skipped++;
      continue;
    }

    const sourceId = sourceMap[conn.source_slug];
    const targetId = targetMap[conn.target_slug];

    if (!sourceId || !targetId) {
      skipped++;
      continue;
    }

    rows.push({
      source_type: conn.source_type,
      source_id: sourceId,
      target_type: conn.target_type,
      target_id: targetId,
      connection_type: conn.connection_type,
      strength: conn.strength || 5,
      confidence: conn.confidence || 80,
      interpretation: conn.interpretation || 'official',
      description: conn.description || null,
      citation: conn.citation || null,
    });
  }

  if (skipped > 0) {
    console.log(`   Skipped ${skipped} connections (unresolved slugs).`);
  }

  // Deduplicate by the unique constraint
  const seen = new Set();
  const deduped = rows.filter(r => {
    const key = `${r.source_type}|${r.source_id}|${r.target_type}|${r.target_id}|${r.connection_type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Delete existing connections and re-insert
  const delUrl = `${SUPABASE_URL}/rest/v1/connections?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const result = await insertRows('connections', deduped, 'source_type,source_id,target_type,target_id,connection_type');
  console.log(`   Seeded ${deduped.length} connections.`);
}

async function seedContinuityConflicts() {
  console.log('\n14. Seeding continuity_conflicts...');
  const data = loadJSON('continuity_conflicts.json');
  if (!data) return {};
  const rows = data.map(c => ({
    slug: c.slug,
    title: c.title,
    description: c.description || '',
    official_stance: c.official_stance || '',
    fan_interpretation: c.fan_interpretation || '',
    editorial_context: c.editorial_context || '',
    confidence: c.confidence || 50,
    source_citations: c.source_citations || [],
    related_edition_ids: [],  // Will be populated later if needed
    tags: c.tags || [],
  }));
  const result = await upsert('continuity_conflicts', rows);
  console.log(`   Seeded ${result.length} continuity conflicts.`);
  return buildSlugMap(result);
}

async function seedReadingPaths() {
  console.log('\n15. Seeding reading_paths...');
  const data = loadJSON('reading_paths.json');
  if (!data) return {};
  const rows = data.map(p => ({
    slug: p.slug,
    name: p.name,
    path_type: p.path_type,
    difficulty: p.difficulty,
    description: p.description || '',
    estimated_issues: p.estimated_issues || null,
    estimated_cost: p.estimated_cost || null,
  }));
  const result = await upsert('reading_paths', rows);
  console.log(`   Seeded ${result.length} reading paths.`);
  return { slugMap: buildSlugMap(result), rawData: data };
}

async function seedReadingPathEntries(pathSlugMap, pathRawData, editionMap) {
  console.log('\n16. Seeding reading_path_entries...');

  // Clear existing entries
  const delUrl = `${SUPABASE_URL}/rest/v1/reading_path_entries?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const rows = [];
  let skipped = 0;
  for (const path of pathRawData) {
    const pathId = pathSlugMap[path.slug];
    if (!pathId || !path.entries) continue;

    for (const entry of path.entries) {
      const editionId = editionMap[entry.edition_slug];
      if (!editionId) {
        skipped++;
        continue;
      }
      rows.push({
        path_id: pathId,
        edition_id: editionId,
        position: entry.position,
        note: entry.note || null,
        is_optional: entry.is_optional ?? false,
      });
    }
  }

  if (skipped > 0) {
    console.log(`   Skipped ${skipped} entries (unresolved edition slugs).`);
  }

  const result = await insertRows('reading_path_entries', rows, 'path_id,position');
  console.log(`   Seeded ${rows.length} reading path entries.`);
}

async function seedReadingOrderEntries(eventMap, phaseSlugMap, editionMap) {
  console.log('\n17. Seeding reading_order_entries...');
  const data = loadJSON('reading_order_entries.json');
  if (!data) return;

  // Clear existing entries
  const delUrl = `${SUPABASE_URL}/rest/v1/reading_order_entries?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const rows = [];
  let skipped = 0;
  for (const group of data) {
    const contextId = eventMap[group.event_slug];
    if (!contextId) {
      console.warn(`    WARN: reading_order_entries: unknown event slug "${group.event_slug}"`);
      continue;
    }

    const contextType = group.context_type || 'event';

    for (const entry of group.entries) {
      const editionSlug = entry.edition_slug;
      const editionId = editionSlug ? (editionMap[editionSlug] || null) : null;
      const phaseId = entry.phase_slug ? (phaseSlugMap[entry.phase_slug] || null) : null;

      // edition_slug can be null for entries that reference issues not in our editions
      rows.push({
        context_type: contextType,
        context_id: contextId,
        position: entry.position,
        series_title: entry.series_title || null,
        issue_number: entry.issue_number || null,
        edition_slug: editionSlug || null,
        note: entry.note || null,
        is_core: entry.is_core ?? false,
        phase_id: phaseId,
      });
    }
  }

  const result = await insertRows('reading_order_entries', rows, 'context_type,context_id,position');
  console.log(`   Seeded ${rows.length} reading order entries.`);
}

async function seedResources() {
  console.log('\n18. Seeding resources...');
  const data = loadJSON('resources.json');
  if (!data) return;

  // Resources don't have a slug, so we generate one from the name
  const rows = data.map(r => ({
    name: r.name,
    resource_type: r.resource_type,
    url: r.url,
    description: r.description || null,
    focus: r.focus || null,
    best_for: r.best_for || null,
    related_era_ids: [],
    related_edition_ids: [],
  }));

  // Resources have no natural unique key — delete and re-insert
  const delUrl = `${SUPABASE_URL}/rest/v1/resources?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const result = await insertRows('resources', rows);
  console.log(`   Seeded ${rows.length} resources.`);
}

async function seedRetailers() {
  console.log('\n19. Seeding retailers...');
  const data = loadJSON('retailers.json');
  if (!data) return;
  const rows = data.map(r => ({
    slug: r.slug,
    name: r.name,
    url: r.url,
    description: r.description || null,
    notes: r.notes || null,
    is_digital: r.is_digital ?? false,
    ships_international: r.ships_international ?? false,
  }));
  const result = await upsert('retailers', rows);
  console.log(`   Seeded ${result.length} retailers.`);
}

async function seedEditionIssues(editionMap) {
  console.log('\n20. Seeding edition_issues...');
  const data = loadJSON('edition_issues.json');
  if (!data) return;

  // Clear existing
  const delUrl = `${SUPABASE_URL}/rest/v1/edition_issues?id=not.is.null`;
  await fetch(delUrl, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': ANON_KEY,
      'Prefer': 'return=minimal',
    },
  });

  const rows = [];
  let skipped = 0;
  for (const ei of data) {
    const editionId = editionMap[ei.edition_slug];
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

  if (skipped > 0) {
    console.log(`   Skipped ${skipped} edition_issues (unresolved edition slugs).`);
  }

  // Deduplicate by unique constraint (edition_id, series_name, issue_number, is_annual)
  const seen = new Set();
  const deduped = rows.filter(r => {
    const key = `${r.edition_id}|${r.series_name}|${r.issue_number}|${r.is_annual}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (deduped.length < rows.length) {
    console.log(`   Removed ${rows.length - deduped.length} duplicate edition_issues.`);
  }

  // This dataset can be very large, use batched insert
  console.log(`   Inserting ${deduped.length} edition_issues in batches of 500...`);
  const result = await insertRows('edition_issues', deduped, 'edition_id,series_name,issue_number,is_annual');
  console.log(`   Seeded ${deduped.length} edition_issues.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('===========================================');
  console.log('  Marvel Cartographer — Supabase Seed');
  console.log('===========================================');
  console.log(`  Data directory: ${DATA_DIR}`);
  console.log(`  Target: ${SUPABASE_URL}`);

  const startTime = Date.now();

  try {
    // 1. Eras
    const eraMap = await seedEras();

    // 2. Universes
    const universeMap = await seedUniverses();

    // 3. Creators (also build name→id map for edition_creators)
    const creatorSlugMap = await seedCreators();
    // Build name→id map from creators.json
    const creatorsData = loadJSON('creators.json') || [];
    const creatorNameMap = {};
    for (const c of creatorsData) {
      if (creatorSlugMap[c.slug]) {
        creatorNameMap[c.name] = creatorSlugMap[c.slug];
      }
    }

    // 4. Characters
    const characterMap = await seedCharacters();

    // 5. Collected Editions
    const editionMap = await seedCollectedEditions(eraMap, universeMap);

    // 6. Era Chapters
    const { slugMap: chapterSlugMap, rawData: chapterRawData } = await seedEraChapters(eraMap);

    // 7. Update collected_editions.chapter_id
    await updateEditionChapters(chapterSlugMap, chapterRawData, editionMap);

    // 8. Edition Creators (junction)
    await seedEditionCreators(editionMap, creatorNameMap);

    // 9. Story Arcs
    const arcMap = await seedStoryArcs(eraMap);

    // 10. Events
    const eventMap = await seedEvents(eraMap);

    // 11. Event Phases
    const phaseSlugMap = await seedEventPhases(eventMap);

    // 12. Event Editions (junction)
    await seedEventEditions(eventMap, editionMap);

    // 13. Connections
    await seedConnections(editionMap, arcMap, eventMap);

    // 14. Continuity Conflicts
    await seedContinuityConflicts();

    // 15. Reading Paths
    const { slugMap: pathSlugMap, rawData: pathRawData } = await seedReadingPaths();

    // 16. Reading Path Entries
    await seedReadingPathEntries(pathSlugMap, pathRawData, editionMap);

    // 17. Reading Order Entries
    await seedReadingOrderEntries(eventMap, phaseSlugMap, editionMap);

    // 18. Resources
    await seedResources();

    // 19. Retailers
    await seedRetailers();

    // 20. Edition Issues
    await seedEditionIssues(editionMap);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n===========================================');
    console.log(`  Seeding complete in ${elapsed}s`);
    console.log('===========================================');
    console.log('\nSummary of slug maps built:');
    console.log(`  Eras:        ${Object.keys(eraMap).length}`);
    console.log(`  Universes:   ${Object.keys(universeMap).length}`);
    console.log(`  Creators:    ${Object.keys(creatorSlugMap).length}`);
    console.log(`  Characters:  ${Object.keys(characterMap).length}`);
    console.log(`  Editions:    ${Object.keys(editionMap).length}`);
    console.log(`  Chapters:    ${Object.keys(chapterSlugMap).length}`);
    console.log(`  Arcs:        ${Object.keys(arcMap).length}`);
    console.log(`  Events:      ${Object.keys(eventMap).length}`);
    console.log(`  Phases:      ${Object.keys(phaseSlugMap).length}`);
    console.log(`  Conflicts:   (see above)`);
    console.log(`  Paths:       ${Object.keys(pathSlugMap).length}`);

  } catch (err) {
    console.error('\nFATAL ERROR during seeding:');
    console.error(err);
    process.exit(1);
  }
}

main();

#!/usr/bin/env node

/**
 * dedup-editions.mjs
 *
 * Cleans up duplicate editions in the Supabase database:
 *   1. Deletes self-loop connections (source_id === target_id)
 *   2. Deduplicates editions with identical titles (keeps best-scored edition)
 *   3. Logs ISBN conflicts for manual review
 *   4. Prints summary
 *
 * Usage:
 *   node scripts/dedup-editions.mjs              # Execute changes
 *   node scripts/dedup-editions.mjs --dry-run    # Preview only
 *
 * Run from project root: /Users/danielbennin/Desktop/Marvel Complete/marvel-cartographer/
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

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------
const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const headers = {
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'apikey': SERVICE_ROLE_KEY,
  'Content-Type': 'application/json',
};

const headersMinimal = {
  ...headers,
  'Prefer': 'return=minimal',
};

const headersRepresentation = {
  ...headers,
  'Prefer': 'return=representation',
};

/**
 * Paginated fetch from Supabase. Returns all rows.
 */
async function fetchAll(table, select = '*', filter = '', pageSize = 1000, orderBy = 'id') {
  const allRows = [];
  let page = 0;
  while (true) {
    const from = page * pageSize;
    const filterPart = filter ? `&${filter}` : '';
    const url = `${SUPABASE_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}&order=${orderBy}&offset=${from}&limit=${pageSize}${filterPart}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Failed to fetch ${table} (page ${page}): ${res.status} ${body}`);
    }
    const data = await res.json();
    allRows.push(...data);
    if (data.length < pageSize) break;
    page++;
    await sleep(200);
  }
  return allRows;
}

/**
 * DELETE rows matching a filter.
 */
async function deleteRows(table, filter) {
  if (DRY_RUN) return true;
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, { method: 'DELETE', headers: headersMinimal });
  if (!res.ok) {
    const body = await res.text();
    console.error(`  ERROR deleting from ${table}: ${res.status} ${body}`);
    return false;
  }
  return true;
}

/**
 * PATCH (update) rows matching a filter.
 */
async function patchRows(table, filter, body) {
  if (DRY_RUN) return true;
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: headersMinimal,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const respBody = await res.text();
    console.error(`  ERROR patching ${table}: ${res.status} ${respBody}`);
    return false;
  }
  return true;
}

/**
 * POST (insert) rows, ignoring duplicates.
 */
async function insertRows(table, rows) {
  if (DRY_RUN) return true;
  if (rows.length === 0) return true;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...headers,
      'Prefer': 'return=minimal,resolution=ignore-duplicates',
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const respBody = await res.text();
    console.error(`  ERROR inserting into ${table}: ${res.status} ${respBody}`);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------
const summary = {
  selfLoopsDeleted: 0,
  duplicateGroupsFound: 0,
  duplicateEditionsDeleted: 0,
  connectionsMigrated: 0,
  connectionsDeleted: 0,
  charactersMigrated: 0,
  creatorsMigrated: 0,
  pathEditionsMigrated: 0,
  isbnConflicts: 0,
  errors: 0,
};

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  const startTime = Date.now();

  console.log('==========================================================');
  console.log('  Marvel Cartographer — Edition Deduplication');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'LIVE'}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('==========================================================');
  console.log();

  // -----------------------------------------------------------------------
  // Load all data
  // -----------------------------------------------------------------------
  console.log('[LOAD] Fetching all editions...');
  const allEditions = await fetchAll('collected_editions', 'id,slug,title,cover_image_url,isbn,release_date,importance');
  console.log(`  Found ${allEditions.length} editions.`);

  console.log('[LOAD] Fetching all connections (edition->edition)...');
  const allConnections = await fetchAll(
    'connections',
    'id,source_type,source_id,target_type,target_id,connection_type,strength,confidence',
    'source_type=eq.edition&target_type=eq.edition'
  );
  console.log(`  Found ${allConnections.length} edition connections.`);

  console.log('[LOAD] Fetching edition_characters...');
  const allEditionChars = await fetchAll('edition_characters', 'edition_id,character_id', '', 1000, 'edition_id');
  console.log(`  Found ${allEditionChars.length} edition-character links.`);

  console.log('[LOAD] Fetching edition_creators...');
  const allEditionCreators = await fetchAll('edition_creators', 'edition_id,creator_id,role', '', 1000, 'edition_id');
  console.log(`  Found ${allEditionCreators.length} edition-creator links.`);

  console.log('[LOAD] Fetching reading_path_entries...');
  const allPathEditions = await fetchAll('reading_path_entries', 'id,path_id,edition_id,position');
  console.log(`  Found ${allPathEditions.length} reading-path-edition links.`);

  console.log();

  // -----------------------------------------------------------------------
  // Step 1: Delete self-loop connections
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 1: Delete self-loop connections');
  console.log('==========================================================');

  const selfLoops = allConnections.filter((c) => c.source_id === c.target_id);
  console.log(`  Found ${selfLoops.length} self-loop connections.`);

  for (const loop of selfLoops) {
    console.log(`  ${DRY_RUN ? '[DRY]' : '[DEL]'} Self-loop: ${loop.id} (${loop.connection_type})`);
    if (!DRY_RUN) {
      const ok = await deleteRows('connections', `id=eq.${loop.id}`);
      if (ok) {
        summary.selfLoopsDeleted++;
      } else {
        summary.errors++;
      }
      await sleep(200);
    } else {
      summary.selfLoopsDeleted++;
    }
  }

  // Remove self-loops from working set
  const connections = allConnections.filter((c) => c.source_id !== c.target_id);

  console.log();

  // -----------------------------------------------------------------------
  // Step 2: Deduplicate exact-title duplicates
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 2: Deduplicate exact-title duplicates');
  console.log('==========================================================');

  // Build lookup maps
  const connBySource = new Map(); // edition_id -> connections[]
  const connByTarget = new Map(); // edition_id -> connections[]
  for (const c of connections) {
    if (!connBySource.has(c.source_id)) connBySource.set(c.source_id, []);
    connBySource.get(c.source_id).push(c);
    if (!connByTarget.has(c.target_id)) connByTarget.set(c.target_id, []);
    connByTarget.get(c.target_id).push(c);
  }

  const charsByEdition = new Map(); // edition_id -> Set of character_id
  for (const ec of allEditionChars) {
    if (!charsByEdition.has(ec.edition_id)) charsByEdition.set(ec.edition_id, new Set());
    charsByEdition.get(ec.edition_id).add(ec.character_id);
  }

  const creatorsByEdition = new Map(); // edition_id -> [{creator_id, role}]
  for (const ec of allEditionCreators) {
    if (!creatorsByEdition.has(ec.edition_id)) creatorsByEdition.set(ec.edition_id, []);
    creatorsByEdition.get(ec.edition_id).push({ creator_id: ec.creator_id, role: ec.role });
  }

  const pathEdsByEdition = new Map(); // edition_id -> [{id, reading_path_id, position}]
  for (const pe of allPathEditions) {
    if (!pathEdsByEdition.has(pe.edition_id)) pathEdsByEdition.set(pe.edition_id, []);
    pathEdsByEdition.get(pe.edition_id).push(pe);
  }

  // Group editions by title
  const titleGroups = new Map(); // title -> edition[]
  for (const ed of allEditions) {
    const title = ed.title;
    if (!titleGroups.has(title)) titleGroups.set(title, []);
    titleGroups.get(title).push(ed);
  }

  // Filter to only groups with duplicates
  const duplicateGroups = [...titleGroups.entries()].filter(([, group]) => group.length > 1);
  summary.duplicateGroupsFound = duplicateGroups.length;

  console.log(`  Found ${duplicateGroups.length} groups of editions with duplicate titles.`);
  console.log();

  // Score function
  function scoreEdition(ed) {
    let score = 0;
    if (ed.cover_image_url) score += 3;
    if (ed.isbn) score += 2;
    if (ed.release_date) score += 2;
    if (ed.importance === 'essential') score += 2;
    else if (ed.importance === 'recommended') score += 1;

    const outgoing = connBySource.get(ed.id) || [];
    const incoming = connByTarget.get(ed.id) || [];
    score += outgoing.length + incoming.length;

    if (charsByEdition.has(ed.id)) score += 2;
    if (creatorsByEdition.has(ed.id)) score += 2;

    return score;
  }

  // Track which edition IDs have been deleted (to avoid re-processing)
  const deletedIds = new Set();

  for (const [title, group] of duplicateGroups) {
    console.log(`  --- "${title}" (${group.length} copies) ---`);

    // Score each
    const scored = group.map((ed) => ({ ...ed, score: scoreEdition(ed) }));
    scored.sort((a, b) => b.score - a.score);

    const keeper = scored[0];
    const dupes = scored.slice(1);

    console.log(`    KEEP: ${keeper.slug} (id=${keeper.id}, score=${keeper.score})`);
    for (const d of dupes) {
      console.log(`    DUPE: ${d.slug} (id=${d.id}, score=${d.score})`);
    }

    const keeperId = keeper.id;
    const dupeIds = new Set(dupes.map((d) => d.id));
    const groupIds = new Set(group.map((e) => e.id));

    // Build set of existing connection keys on the keeper
    const keeperOutgoing = connBySource.get(keeperId) || [];
    const keeperIncoming = connByTarget.get(keeperId) || [];

    const keeperConnKeys = new Set();
    for (const c of keeperOutgoing) {
      keeperConnKeys.add(`out:${c.target_id}:${c.connection_type}`);
    }
    for (const c of keeperIncoming) {
      keeperConnKeys.add(`in:${c.source_id}:${c.connection_type}`);
    }

    // Existing characters and creators on keeper
    const keeperChars = charsByEdition.get(keeperId) || new Set();
    const keeperCreators = creatorsByEdition.get(keeperId) || [];
    const keeperCreatorKeys = new Set(keeperCreators.map((cr) => `${cr.creator_id}:${cr.role}`));

    for (const dupe of dupes) {
      const dupeId = dupe.id;

      // --- Migrate outgoing connections from dupe ---
      const dupeOutgoing = connBySource.get(dupeId) || [];
      for (const c of dupeOutgoing) {
        // Skip connections to other dupes in this group or to the keeper
        if (groupIds.has(c.target_id)) {
          console.log(`    ${DRY_RUN ? '[DRY]' : '[DEL]'} Skip/delete intra-group connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(200);
          continue;
        }

        const key = `out:${c.target_id}:${c.connection_type}`;
        if (keeperConnKeys.has(key)) {
          // Keeper already has this connection; delete the duplicate one
          console.log(`    ${DRY_RUN ? '[DRY]' : '[DEL]'} Duplicate outgoing connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(200);
        } else {
          // Migrate: re-point source_id to keeper
          console.log(`    ${DRY_RUN ? '[DRY]' : '[MIG]'} Re-point outgoing connection ${c.id} source -> keeper`);
          if (!DRY_RUN) await patchRows('connections', `id=eq.${c.id}`, { source_id: keeperId });
          keeperConnKeys.add(key);
          summary.connectionsMigrated++;
          await sleep(200);
        }
      }

      // --- Migrate incoming connections to dupe ---
      const dupeIncoming = connByTarget.get(dupeId) || [];
      for (const c of dupeIncoming) {
        // Skip connections from other dupes in this group or from the keeper
        if (groupIds.has(c.source_id)) {
          console.log(`    ${DRY_RUN ? '[DRY]' : '[DEL]'} Skip/delete intra-group connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(200);
          continue;
        }

        const key = `in:${c.source_id}:${c.connection_type}`;
        if (keeperConnKeys.has(key)) {
          console.log(`    ${DRY_RUN ? '[DRY]' : '[DEL]'} Duplicate incoming connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(200);
        } else {
          console.log(`    ${DRY_RUN ? '[DRY]' : '[MIG]'} Re-point incoming connection ${c.id} target -> keeper`);
          if (!DRY_RUN) await patchRows('connections', `id=eq.${c.id}`, { target_id: keeperId });
          keeperConnKeys.add(key);
          summary.connectionsMigrated++;
          await sleep(200);
        }
      }

      // --- Migrate edition_characters ---
      const dupeChars = charsByEdition.get(dupeId) || new Set();
      const charsToMigrate = [];
      for (const charId of dupeChars) {
        if (!keeperChars.has(charId)) {
          charsToMigrate.push({ edition_id: keeperId, character_id: charId });
          keeperChars.add(charId);
        }
      }
      if (charsToMigrate.length > 0) {
        console.log(`    ${DRY_RUN ? '[DRY]' : '[MIG]'} Migrate ${charsToMigrate.length} characters to keeper`);
        if (!DRY_RUN) await insertRows('edition_characters', charsToMigrate);
        summary.charactersMigrated += charsToMigrate.length;
        await sleep(200);
      }
      // Delete old character links (will cascade when edition is deleted, but be explicit)
      if (!DRY_RUN && dupeChars.size > 0) {
        await deleteRows('edition_characters', `edition_id=eq.${dupeId}`);
        await sleep(200);
      }

      // --- Migrate edition_creators ---
      const dupeCreators = creatorsByEdition.get(dupeId) || [];
      const creatorsToMigrate = [];
      for (const cr of dupeCreators) {
        const key = `${cr.creator_id}:${cr.role}`;
        if (!keeperCreatorKeys.has(key)) {
          creatorsToMigrate.push({ edition_id: keeperId, creator_id: cr.creator_id, role: cr.role });
          keeperCreatorKeys.add(key);
        }
      }
      if (creatorsToMigrate.length > 0) {
        console.log(`    ${DRY_RUN ? '[DRY]' : '[MIG]'} Migrate ${creatorsToMigrate.length} creators to keeper`);
        if (!DRY_RUN) await insertRows('edition_creators', creatorsToMigrate);
        summary.creatorsMigrated += creatorsToMigrate.length;
        await sleep(200);
      }
      if (!DRY_RUN && dupeCreators.length > 0) {
        await deleteRows('edition_creators', `edition_id=eq.${dupeId}`);
        await sleep(200);
      }

      // --- Migrate reading_path_entries ---
      const dupePathEds = pathEdsByEdition.get(dupeId) || [];
      for (const pe of dupePathEds) {
        console.log(`    ${DRY_RUN ? '[DRY]' : '[MIG]'} Re-point reading_path_edition ${pe.id} -> keeper`);
        if (!DRY_RUN) await patchRows('reading_path_entries', `id=eq.${pe.id}`, { edition_id: keeperId });
        summary.pathEditionsMigrated++;
        await sleep(200);
      }

      // --- Delete the duplicate edition ---
      console.log(`    ${DRY_RUN ? '[DRY]' : '[DEL]'} Delete duplicate edition: ${dupe.slug} (${dupeId})`);
      if (!DRY_RUN) {
        // Delete any remaining connections referencing this dupe (safety)
        await deleteRows('connections', `source_type=eq.edition&source_id=eq.${dupeId}`);
        await sleep(200);
        await deleteRows('connections', `target_type=eq.edition&target_id=eq.${dupeId}`);
        await sleep(200);

        const ok = await deleteRows('collected_editions', `id=eq.${dupeId}`);
        if (ok) {
          summary.duplicateEditionsDeleted++;
        } else {
          summary.errors++;
        }
        await sleep(200);
      } else {
        summary.duplicateEditionsDeleted++;
      }

      deletedIds.add(dupeId);
    }

    console.log();
  }

  // -----------------------------------------------------------------------
  // Step 3: Log ISBN conflicts
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 3: ISBN conflict check');
  console.log('==========================================================');

  const isbnMap = new Map(); // isbn -> edition[]
  for (const ed of allEditions) {
    if (!ed.isbn || deletedIds.has(ed.id)) continue;
    if (!isbnMap.has(ed.isbn)) isbnMap.set(ed.isbn, []);
    isbnMap.get(ed.isbn).push(ed);
  }

  const isbnConflicts = [...isbnMap.entries()].filter(([, group]) => group.length > 1);
  summary.isbnConflicts = isbnConflicts.length;

  if (isbnConflicts.length === 0) {
    console.log('  No ISBN conflicts found.');
  } else {
    console.log(`  Found ${isbnConflicts.length} ISBN(s) shared by multiple editions:`);
    for (const [isbn, group] of isbnConflicts) {
      console.log(`    ISBN ${isbn}:`);
      for (const ed of group) {
        console.log(`      - "${ed.title}" (${ed.slug}, id=${ed.id})`);
      }
    }
    console.log('  NOTE: ISBN conflicts require manual review. No auto-fix applied.');
  }

  console.log();

  // -----------------------------------------------------------------------
  // Step 4: Summary
  // -----------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('==========================================================');
  console.log('  SUMMARY');
  console.log('==========================================================');
  console.log(`  Mode:                     ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Self-loops deleted:       ${summary.selfLoopsDeleted}`);
  console.log(`  Duplicate groups found:   ${summary.duplicateGroupsFound}`);
  console.log(`  Duplicate editions removed: ${summary.duplicateEditionsDeleted}`);
  console.log(`  Connections migrated:     ${summary.connectionsMigrated}`);
  console.log(`  Connections deleted:      ${summary.connectionsDeleted}`);
  console.log(`  Characters migrated:      ${summary.charactersMigrated}`);
  console.log(`  Creators migrated:        ${summary.creatorsMigrated}`);
  console.log(`  Path editions migrated:   ${summary.pathEditionsMigrated}`);
  console.log(`  ISBN conflicts (manual):  ${summary.isbnConflicts}`);
  console.log(`  Errors:                   ${summary.errors}`);
  console.log(`  Elapsed:                  ${elapsed}s`);
  console.log('==========================================================');

  if (DRY_RUN) {
    console.log();
    console.log('  This was a DRY RUN. No changes were made.');
    console.log('  Run without --dry-run to execute.');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

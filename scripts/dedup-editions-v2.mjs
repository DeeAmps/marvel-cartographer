#!/usr/bin/env node

/**
 * dedup-editions-v2.mjs
 *
 * Enhanced edition deduplication that handles:
 *   1. Variant cover editions — same book with different cover art
 *   2. True data duplicates — same book entered under different names
 *   3. Empty issues_collected — skipped (not true duplicates)
 *
 * Groups editions by normalized issues_collected + same format.
 * Merges variant info into cover_variants JSONB on the keeper.
 * Migrates all related data before deleting duplicates.
 *
 * Usage:
 *   node scripts/dedup-editions-v2.mjs              # DRY RUN (default)
 *   node scripts/dedup-editions-v2.mjs --live       # Execute changes
 *
 * Run from project root: marvel-cartographer/
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
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// CLI flags — default is DRY RUN (safe by default)
// ---------------------------------------------------------------------------
const LIVE = process.argv.includes('--live');
const DRY_RUN = !LIVE;

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
// Normalize issues_collected for grouping
// ---------------------------------------------------------------------------
function normalizeIssues(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*[-–—]\s*/g, '-')     // normalize dashes
    .replace(/\s*,\s*/g, ', ')         // normalize comma spacing
    .replace(/\s*#\s*/g, '#')          // normalize hash spacing
    .replace(/\(.*?\)/g, '')           // remove parentheticals
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detect if a title looks like a variant cover edition.
 * Variant covers typically append artist names or "Cover" to the base title.
 */
function isLikelyVariantTitle(title) {
  const variantPatterns = [
    /\bcover\b/i,
    /\bvariant\b/i,
    /\bdm\s+variant\b/i,
    /\bdirect\s+market\b/i,
    /\bbook\s+market\b/i,
    /\bexclusive\b/i,
    /\bDM\b/,
  ];
  return variantPatterns.some((p) => p.test(title));
}

/**
 * Extract the "variant label" from a title by comparing it to the keeper title.
 * e.g., keeper="Agent Venom Omnibus", dupe="Agent Venom Omnibus Mike Deodato Jr. Cover"
 *  -> "Mike Deodato Jr. Cover"
 */
function extractVariantLabel(keeperTitle, dupeTitle) {
  // If dupe title starts with the keeper title, the suffix is the variant
  if (dupeTitle.toLowerCase().startsWith(keeperTitle.toLowerCase())) {
    const suffix = dupeTitle.slice(keeperTitle.length).replace(/^[\s:–—-]+/, '').trim();
    if (suffix) return suffix;
  }
  // Otherwise just use the full dupe title as the label
  return dupeTitle;
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------
const summary = {
  totalEditions: 0,
  duplicateGroupsFound: 0,
  variantGroups: 0,
  trueduplicateGroups: 0,
  emptyIssuesSkipped: 0,
  editionsDeleted: 0,
  variantsMerged: 0,
  connectionsMigrated: 0,
  connectionsDeleted: 0,
  charactersMigrated: 0,
  creatorsMigrated: 0,
  pathEntriesMigrated: 0,
  editionIssuesMigrated: 0,
  userCollectionsMigrated: 0,
  scheduleItemsMigrated: 0,
  ratingsMigrated: 0,
  arrayRefsMigrated: 0,
  errors: 0,
};

// ===========================================================================
// MAIN
// ===========================================================================
async function main() {
  const startTime = Date.now();

  console.log('==========================================================');
  console.log('  Marvel Cartographer — Edition Deduplication v2');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : '*** LIVE — CHANGES WILL BE MADE ***'}`);
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('==========================================================');
  console.log();

  // -----------------------------------------------------------------------
  // Load all data
  // -----------------------------------------------------------------------
  console.log('[LOAD] Fetching all editions...');
  const allEditions = await fetchAll(
    'collected_editions',
    'id,slug,title,format,issues_collected,issue_count,cover_image_url,isbn,release_date,importance,cover_variants'
  );
  summary.totalEditions = allEditions.length;
  console.log(`  Found ${allEditions.length} editions.`);

  console.log('[LOAD] Fetching connections (edition->edition)...');
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
  const allPathEntries = await fetchAll('reading_path_entries', 'id,path_id,edition_id,position');
  console.log(`  Found ${allPathEntries.length} reading-path entries.`);

  console.log('[LOAD] Fetching edition_issues...');
  const allEditionIssues = await fetchAll('edition_issues', 'id,edition_id,series_name,issue_number,is_annual', '', 1000, 'edition_id');
  console.log(`  Found ${allEditionIssues.length} edition-issue links.`);

  console.log('[LOAD] Fetching user_collections...');
  const allUserCollections = await fetchAll('user_collections', 'id,user_id,edition_id', '', 1000, 'id');
  console.log(`  Found ${allUserCollections.length} user-collection entries.`);

  console.log('[LOAD] Fetching schedule_items...');
  const allScheduleItems = await fetchAll('schedule_items', 'id,schedule_id,user_id,edition_id', '', 1000, 'id');
  console.log(`  Found ${allScheduleItems.length} schedule items.`);

  console.log('[LOAD] Fetching edition_ratings...');
  const allRatings = await fetchAll('edition_ratings', 'id,user_id,edition_id', '', 1000, 'id');
  console.log(`  Found ${allRatings.length} edition ratings.`);

  console.log('[LOAD] Fetching continuity_conflicts (for array refs)...');
  const allConflicts = await fetchAll('continuity_conflicts', 'id,related_edition_ids', '', 1000, 'id');
  console.log(`  Found ${allConflicts.length} continuity conflicts.`);

  console.log('[LOAD] Fetching debates (for array refs)...');
  const allDebates = await fetchAll('debates', 'id,related_edition_ids', '', 1000, 'id');
  console.log(`  Found ${allDebates.length} debates.`);

  console.log();

  // -----------------------------------------------------------------------
  // Build lookup maps
  // -----------------------------------------------------------------------
  const connBySource = new Map();
  const connByTarget = new Map();
  for (const c of allConnections) {
    if (!connBySource.has(c.source_id)) connBySource.set(c.source_id, []);
    connBySource.get(c.source_id).push(c);
    if (!connByTarget.has(c.target_id)) connByTarget.set(c.target_id, []);
    connByTarget.get(c.target_id).push(c);
  }

  const charsByEdition = new Map();
  for (const ec of allEditionChars) {
    if (!charsByEdition.has(ec.edition_id)) charsByEdition.set(ec.edition_id, new Set());
    charsByEdition.get(ec.edition_id).add(ec.character_id);
  }

  const creatorsByEdition = new Map();
  for (const ec of allEditionCreators) {
    if (!creatorsByEdition.has(ec.edition_id)) creatorsByEdition.set(ec.edition_id, []);
    creatorsByEdition.get(ec.edition_id).push({ creator_id: ec.creator_id, role: ec.role });
  }

  const pathEntriesByEdition = new Map();
  for (const pe of allPathEntries) {
    if (!pathEntriesByEdition.has(pe.edition_id)) pathEntriesByEdition.set(pe.edition_id, []);
    pathEntriesByEdition.get(pe.edition_id).push(pe);
  }

  const issuesByEdition = new Map();
  for (const ei of allEditionIssues) {
    if (!issuesByEdition.has(ei.edition_id)) issuesByEdition.set(ei.edition_id, []);
    issuesByEdition.get(ei.edition_id).push(ei);
  }

  const userCollByEdition = new Map();
  for (const uc of allUserCollections) {
    if (!userCollByEdition.has(uc.edition_id)) userCollByEdition.set(uc.edition_id, []);
    userCollByEdition.get(uc.edition_id).push(uc);
  }

  const scheduleByEdition = new Map();
  for (const si of allScheduleItems) {
    if (!scheduleByEdition.has(si.edition_id)) scheduleByEdition.set(si.edition_id, []);
    scheduleByEdition.get(si.edition_id).push(si);
  }

  const ratingsByEdition = new Map();
  for (const r of allRatings) {
    if (!ratingsByEdition.has(r.edition_id)) ratingsByEdition.set(r.edition_id, []);
    ratingsByEdition.get(r.edition_id).push(r);
  }

  // -----------------------------------------------------------------------
  // Step 1: Group editions by normalized issues_collected + format
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 1: Group editions by issues_collected + format');
  console.log('==========================================================');

  const groups = new Map(); // "normalized_issues|||format" -> edition[]
  let emptyCount = 0;
  for (const ed of allEditions) {
    const norm = normalizeIssues(ed.issues_collected);
    if (!norm) {
      emptyCount++;
      continue; // Skip empty issues_collected
    }
    const key = `${norm}|||${ed.format || 'unknown'}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(ed);
  }

  summary.emptyIssuesSkipped = emptyCount;
  console.log(`  Skipped ${emptyCount} editions with empty issues_collected.`);

  // Filter to groups with 2+ editions
  const dupeGroups = [...groups.entries()].filter(([, g]) => g.length > 1);
  summary.duplicateGroupsFound = dupeGroups.length;
  console.log(`  Found ${dupeGroups.length} duplicate groups.`);
  console.log();

  // -----------------------------------------------------------------------
  // Step 2: Process each duplicate group
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 2: Process duplicate groups');
  console.log('==========================================================');
  console.log();

  // Score function for keeper selection
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

    // Prefer editions already in reading paths
    if (pathEntriesByEdition.has(ed.id)) score += 3;

    // Prefer shorter/cleaner title (less likely to be a variant)
    if (!isLikelyVariantTitle(ed.title)) score += 1;

    return score;
  }

  const deletedIds = new Set();

  for (const [groupKey, group] of dupeGroups) {
    // Classify: variant covers vs true duplicates
    // If titles differ only by variant-like suffixes, it's a variant group
    const scored = group.map((ed) => ({ ...ed, score: scoreEdition(ed) }));
    scored.sort((a, b) => b.score - a.score);

    const keeper = scored[0];
    const dupes = scored.slice(1);

    // Sanity check: if issue_count differs significantly, skip (not truly same content)
    const keeperIssueCount = keeper.issue_count || 0;
    const mismatch = dupes.some((d) => {
      const dc = d.issue_count || 0;
      if (keeperIssueCount === 0 && dc === 0) return false;
      if (keeperIssueCount === 0 || dc === 0) return false; // one missing, allow
      return Math.abs(dc - keeperIssueCount) > 2; // allow ±2 issue tolerance
    });

    if (mismatch) {
      console.log(`  SKIP: "${keeper.title}" — issue_count mismatch in group (possible different content)`);
      for (const d of scored) {
        console.log(`    - "${d.title}" (${d.slug}) issue_count=${d.issue_count || '?'}`);
      }
      console.log();
      continue;
    }

    // Determine if this is a variant cover group
    const hasVariants = dupes.some((d) =>
      isLikelyVariantTitle(d.title) || isLikelyVariantTitle(keeper.title) ||
      d.title.toLowerCase().includes(keeper.title.toLowerCase()) ||
      keeper.title.toLowerCase().includes(d.title.toLowerCase())
    );

    if (hasVariants) {
      summary.variantGroups++;
    } else {
      summary.trueduplicateGroups++;
    }

    console.log(`  --- ${hasVariants ? 'VARIANT' : 'DUPLICATE'}: "${keeper.title}" (${group.length} editions) ---`);
    console.log(`    KEEP: ${keeper.slug} (id=${keeper.id}, score=${keeper.score})`);
    for (const d of dupes) {
      console.log(`    ${hasVariants ? 'VARIANT' : 'DUPE'}: ${d.slug} (id=${d.id}, score=${d.score})`);
    }

    const keeperId = keeper.id;
    const groupIds = new Set(group.map((e) => e.id));

    // Build existing keys for dedup checking
    const keeperConnKeys = new Set();
    for (const c of (connBySource.get(keeperId) || [])) {
      keeperConnKeys.add(`out:${c.target_id}:${c.connection_type}`);
    }
    for (const c of (connByTarget.get(keeperId) || [])) {
      keeperConnKeys.add(`in:${c.source_id}:${c.connection_type}`);
    }

    const keeperChars = charsByEdition.get(keeperId) || new Set();
    const keeperCreators = creatorsByEdition.get(keeperId) || [];
    const keeperCreatorKeys = new Set(keeperCreators.map((cr) => `${cr.creator_id}:${cr.role}`));

    const keeperIssueKeys = new Set();
    for (const ei of (issuesByEdition.get(keeperId) || [])) {
      keeperIssueKeys.add(`${ei.series_name}:${ei.issue_number}:${ei.is_annual}`);
    }

    const keeperUserCollKeys = new Set();
    for (const uc of (userCollByEdition.get(keeperId) || [])) {
      keeperUserCollKeys.add(uc.user_id);
    }

    const keeperScheduleKeys = new Set();
    for (const si of (scheduleByEdition.get(keeperId) || [])) {
      keeperScheduleKeys.add(`${si.user_id}:${si.schedule_id}`);
    }

    const keeperRatingKeys = new Set();
    for (const r of (ratingsByEdition.get(keeperId) || [])) {
      keeperRatingKeys.add(r.user_id);
    }

    // Collect variant cover info to merge into keeper
    const coverVariants = Array.isArray(keeper.cover_variants) ? [...keeper.cover_variants] : [];

    for (const dupe of dupes) {
      const dupeId = dupe.id;
      const tag = DRY_RUN ? '[DRY]' : '[ACT]';

      // --- Collect variant cover info ---
      if (hasVariants) {
        const variantLabel = extractVariantLabel(keeper.title, dupe.title);
        const variant = {
          title: variantLabel || dupe.title,
        };
        if (dupe.isbn) variant.isbn = dupe.isbn;
        if (dupe.cover_image_url) variant.cover_image_url = dupe.cover_image_url;
        coverVariants.push(variant);
        summary.variantsMerged++;
        console.log(`    ${tag} Stored variant: "${variant.title}"`);
      }

      // --- Migrate connections ---
      const dupeOutgoing = connBySource.get(dupeId) || [];
      for (const c of dupeOutgoing) {
        if (groupIds.has(c.target_id)) {
          console.log(`    ${tag} Delete intra-group connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(100);
          continue;
        }
        const key = `out:${c.target_id}:${c.connection_type}`;
        if (keeperConnKeys.has(key)) {
          console.log(`    ${tag} Delete duplicate outgoing: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
        } else {
          console.log(`    ${tag} Migrate outgoing connection: ${c.id}`);
          if (!DRY_RUN) await patchRows('connections', `id=eq.${c.id}`, { source_id: keeperId });
          keeperConnKeys.add(key);
          summary.connectionsMigrated++;
        }
        await sleep(100);
      }

      const dupeIncoming = connByTarget.get(dupeId) || [];
      for (const c of dupeIncoming) {
        if (groupIds.has(c.source_id)) {
          console.log(`    ${tag} Delete intra-group connection: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
          await sleep(100);
          continue;
        }
        const key = `in:${c.source_id}:${c.connection_type}`;
        if (keeperConnKeys.has(key)) {
          console.log(`    ${tag} Delete duplicate incoming: ${c.id}`);
          if (!DRY_RUN) await deleteRows('connections', `id=eq.${c.id}`);
          summary.connectionsDeleted++;
        } else {
          console.log(`    ${tag} Migrate incoming connection: ${c.id}`);
          if (!DRY_RUN) await patchRows('connections', `id=eq.${c.id}`, { target_id: keeperId });
          keeperConnKeys.add(key);
          summary.connectionsMigrated++;
        }
        await sleep(100);
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
        console.log(`    ${tag} Migrate ${charsToMigrate.length} characters`);
        if (!DRY_RUN) await insertRows('edition_characters', charsToMigrate);
        summary.charactersMigrated += charsToMigrate.length;
        await sleep(100);
      }
      if (!DRY_RUN && dupeChars.size > 0) {
        await deleteRows('edition_characters', `edition_id=eq.${dupeId}`);
        await sleep(100);
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
        console.log(`    ${tag} Migrate ${creatorsToMigrate.length} creators`);
        if (!DRY_RUN) await insertRows('edition_creators', creatorsToMigrate);
        summary.creatorsMigrated += creatorsToMigrate.length;
        await sleep(100);
      }
      if (!DRY_RUN && dupeCreators.length > 0) {
        await deleteRows('edition_creators', `edition_id=eq.${dupeId}`);
        await sleep(100);
      }

      // --- Migrate reading_path_entries ---
      const dupePathEntries = pathEntriesByEdition.get(dupeId) || [];
      for (const pe of dupePathEntries) {
        console.log(`    ${tag} Migrate reading_path_entry ${pe.id}`);
        if (!DRY_RUN) await patchRows('reading_path_entries', `id=eq.${pe.id}`, { edition_id: keeperId });
        summary.pathEntriesMigrated++;
        await sleep(100);
      }

      // --- Migrate edition_issues ---
      const dupeIssues = issuesByEdition.get(dupeId) || [];
      const issuesToMigrate = [];
      for (const ei of dupeIssues) {
        const key = `${ei.series_name}:${ei.issue_number}:${ei.is_annual}`;
        if (!keeperIssueKeys.has(key)) {
          issuesToMigrate.push({
            edition_id: keeperId,
            series_name: ei.series_name,
            issue_number: ei.issue_number,
            is_annual: ei.is_annual,
          });
          keeperIssueKeys.add(key);
        }
      }
      if (issuesToMigrate.length > 0) {
        console.log(`    ${tag} Migrate ${issuesToMigrate.length} edition_issues`);
        if (!DRY_RUN) await insertRows('edition_issues', issuesToMigrate);
        summary.editionIssuesMigrated += issuesToMigrate.length;
        await sleep(100);
      }
      if (!DRY_RUN && dupeIssues.length > 0) {
        await deleteRows('edition_issues', `edition_id=eq.${dupeId}`);
        await sleep(100);
      }

      // --- Migrate user_collections ---
      const dupeUserColls = userCollByEdition.get(dupeId) || [];
      for (const uc of dupeUserColls) {
        if (keeperUserCollKeys.has(uc.user_id)) {
          console.log(`    ${tag} Skip user_collection (user already has keeper): ${uc.id}`);
        } else {
          console.log(`    ${tag} Migrate user_collection ${uc.id}`);
          if (!DRY_RUN) await patchRows('user_collections', `id=eq.${uc.id}`, { edition_id: keeperId });
          keeperUserCollKeys.add(uc.user_id);
          summary.userCollectionsMigrated++;
        }
        await sleep(100);
      }

      // --- Migrate schedule_items ---
      const dupeScheduleItems = scheduleByEdition.get(dupeId) || [];
      for (const si of dupeScheduleItems) {
        const key = `${si.user_id}:${si.schedule_id}`;
        if (keeperScheduleKeys.has(key)) {
          console.log(`    ${tag} Skip schedule_item (already exists for keeper): ${si.id}`);
        } else {
          console.log(`    ${tag} Migrate schedule_item ${si.id}`);
          if (!DRY_RUN) await patchRows('schedule_items', `id=eq.${si.id}`, { edition_id: keeperId });
          keeperScheduleKeys.add(key);
          summary.scheduleItemsMigrated++;
        }
        await sleep(100);
      }

      // --- Migrate edition_ratings ---
      const dupeRatings = ratingsByEdition.get(dupeId) || [];
      for (const r of dupeRatings) {
        if (keeperRatingKeys.has(r.user_id)) {
          console.log(`    ${tag} Skip edition_rating (user already rated keeper): ${r.id}`);
        } else {
          console.log(`    ${tag} Migrate edition_rating ${r.id}`);
          if (!DRY_RUN) await patchRows('edition_ratings', `id=eq.${r.id}`, { edition_id: keeperId });
          keeperRatingKeys.add(r.user_id);
          summary.ratingsMigrated++;
        }
        await sleep(100);
      }

      // --- Delete the duplicate edition ---
      // ON DELETE CASCADE will clean up any remaining FK refs we didn't explicitly migrate
      console.log(`    ${tag} Delete edition: ${dupe.slug} (${dupeId})`);
      if (!DRY_RUN) {
        // Safety: clean remaining connections
        await deleteRows('connections', `source_type=eq.edition&source_id=eq.${dupeId}`);
        await sleep(100);
        await deleteRows('connections', `target_type=eq.edition&target_id=eq.${dupeId}`);
        await sleep(100);

        const ok = await deleteRows('collected_editions', `id=eq.${dupeId}`);
        if (ok) {
          summary.editionsDeleted++;
        } else {
          summary.errors++;
        }
        await sleep(200);
      } else {
        summary.editionsDeleted++;
      }

      deletedIds.add(dupeId);
    }

    // --- Update keeper with cover_variants ---
    if (coverVariants.length > 0) {
      console.log(`    ${DRY_RUN ? '[DRY]' : '[ACT]'} Update keeper cover_variants (${coverVariants.length} variants)`);
      if (!DRY_RUN) {
        await patchRows('collected_editions', `id=eq.${keeperId}`, {
          cover_variants: coverVariants,
        });
        await sleep(100);
      }
    }

    console.log();
  }

  // -----------------------------------------------------------------------
  // Step 3: Update array references (continuity_conflicts, debates)
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 3: Update array references');
  console.log('==========================================================');

  if (deletedIds.size > 0) {
    // Build a mapping from deleted ID -> keeper ID
    // We need to reconstruct this from the groups we processed
    const dupeToKeeper = new Map();
    for (const [, group] of dupeGroups) {
      const scored = group.map((ed) => ({ ...ed, score: scoreEdition(ed) }));
      scored.sort((a, b) => b.score - a.score);
      const keeper = scored[0];
      for (const dupe of scored.slice(1)) {
        if (deletedIds.has(dupe.id)) {
          dupeToKeeper.set(dupe.id, keeper.id);
        }
      }
    }

    // Update continuity_conflicts.related_edition_ids
    for (const conflict of allConflicts) {
      const ids = conflict.related_edition_ids || [];
      if (ids.length === 0) continue;
      let changed = false;
      const newIds = ids.map((id) => {
        if (dupeToKeeper.has(id)) {
          changed = true;
          return dupeToKeeper.get(id);
        }
        return id;
      });
      if (changed) {
        const uniqueIds = [...new Set(newIds)];
        console.log(`  ${DRY_RUN ? '[DRY]' : '[ACT]'} Update continuity_conflict ${conflict.id} array refs`);
        if (!DRY_RUN) {
          await patchRows('continuity_conflicts', `id=eq.${conflict.id}`, {
            related_edition_ids: uniqueIds,
          });
          await sleep(100);
        }
        summary.arrayRefsMigrated++;
      }
    }

    // Update debates.related_edition_ids
    for (const debate of allDebates) {
      const ids = debate.related_edition_ids || [];
      if (ids.length === 0) continue;
      let changed = false;
      const newIds = ids.map((id) => {
        if (dupeToKeeper.has(id)) {
          changed = true;
          return dupeToKeeper.get(id);
        }
        return id;
      });
      if (changed) {
        const uniqueIds = [...new Set(newIds)];
        console.log(`  ${DRY_RUN ? '[DRY]' : '[ACT]'} Update debate ${debate.id} array refs`);
        if (!DRY_RUN) {
          await patchRows('debates', `id=eq.${debate.id}`, {
            related_edition_ids: uniqueIds,
          });
          await sleep(100);
        }
        summary.arrayRefsMigrated++;
      }
    }
  } else {
    console.log('  No deletions to propagate to array refs.');
  }

  console.log();

  // -----------------------------------------------------------------------
  // Step 4: Log empty issues_collected for review
  // -----------------------------------------------------------------------
  console.log('==========================================================');
  console.log('  STEP 4: Editions with empty issues_collected');
  console.log('==========================================================');

  const emptyEditions = allEditions.filter((e) => !normalizeIssues(e.issues_collected));
  if (emptyEditions.length > 0) {
    console.log(`  ${emptyEditions.length} editions have empty issues_collected (NOT deduplicated):`);
    for (const e of emptyEditions.slice(0, 20)) {
      console.log(`    - "${e.title}" (${e.slug})`);
    }
    if (emptyEditions.length > 20) {
      console.log(`    ... and ${emptyEditions.length - 20} more`);
    }
  } else {
    console.log('  None found.');
  }

  console.log();

  // -----------------------------------------------------------------------
  // Summary
  // -----------------------------------------------------------------------
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('==========================================================');
  console.log('  SUMMARY');
  console.log('==========================================================');
  console.log(`  Mode:                      ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log(`  Total editions before:     ${summary.totalEditions}`);
  console.log(`  Duplicate groups found:    ${summary.duplicateGroupsFound}`);
  console.log(`    Variant cover groups:    ${summary.variantGroups}`);
  console.log(`    True duplicate groups:   ${summary.trueduplicateGroups}`);
  console.log(`  Editions deleted:          ${summary.editionsDeleted}`);
  console.log(`  Estimated final count:     ${summary.totalEditions - summary.editionsDeleted}`);
  console.log(`  Variants merged:           ${summary.variantsMerged}`);
  console.log(`  Empty issues skipped:      ${summary.emptyIssuesSkipped}`);
  console.log(`  Connections migrated:      ${summary.connectionsMigrated}`);
  console.log(`  Connections deleted:        ${summary.connectionsDeleted}`);
  console.log(`  Characters migrated:       ${summary.charactersMigrated}`);
  console.log(`  Creators migrated:         ${summary.creatorsMigrated}`);
  console.log(`  Path entries migrated:     ${summary.pathEntriesMigrated}`);
  console.log(`  Edition issues migrated:   ${summary.editionIssuesMigrated}`);
  console.log(`  User collections migrated: ${summary.userCollectionsMigrated}`);
  console.log(`  Schedule items migrated:   ${summary.scheduleItemsMigrated}`);
  console.log(`  Ratings migrated:          ${summary.ratingsMigrated}`);
  console.log(`  Array refs updated:        ${summary.arrayRefsMigrated}`);
  console.log(`  Errors:                    ${summary.errors}`);
  console.log(`  Elapsed:                   ${elapsed}s`);
  console.log('==========================================================');

  if (DRY_RUN) {
    console.log();
    console.log('  This was a DRY RUN. No changes were made.');
    console.log('  Run with --live to execute changes.');
  }
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});

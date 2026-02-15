#!/usr/bin/env node

/**
 * Backfill script: populates source_slug/target_slug on connections
 * and category/sections on reading_paths from the JSON data file.
 *
 * Usage: node scripts/backfill-slugs.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ── Parse .env manually ──────────────────────────────────────────
function loadEnv() {
  const envPath = join(ROOT, ".env");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL, ANON_KEY, or SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const headers = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

// ── Supabase REST helpers ────────────────────────────────────────

async function supabaseGet(table, query = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${table} failed (${res.status}): ${body}`);
  }
  return res.json();
}

async function supabasePatch(table, id, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH ${table} id=${id} failed (${res.status}): ${text}`);
  }
}

// ── Part 1: Backfill source_slug & target_slug on connections ────

async function backfillConnectionSlugs() {
  console.log("\n=== Backfilling connection slugs ===");

  // 1. Fetch all collected_editions to build UUID -> slug map
  const editions = await supabaseGet(
    "collected_editions",
    "select=id,slug&limit=2000"
  );
  const uuidToSlug = new Map();
  for (const e of editions) {
    uuidToSlug.set(e.id, e.slug);
  }
  console.log(`  Loaded ${editions.length} editions for UUID->slug map`);

  // 2. Fetch connections that need backfill (source_slug is null)
  const connections = await supabaseGet(
    "connections",
    "select=id,source_id,target_id,source_slug,target_slug&source_slug=is.null&limit=5000"
  );
  console.log(`  Found ${connections.length} connections with null source_slug`);

  if (connections.length === 0) {
    console.log("  Nothing to backfill - all connections already have slugs");
    return;
  }

  // 3. Update each connection
  let updated = 0;
  let skipped = 0;
  for (const conn of connections) {
    const sourceSlug = uuidToSlug.get(conn.source_id);
    const targetSlug = uuidToSlug.get(conn.target_id);

    if (!sourceSlug && !targetSlug) {
      skipped++;
      continue;
    }

    const patch = {};
    if (sourceSlug) patch.source_slug = sourceSlug;
    if (targetSlug) patch.target_slug = targetSlug;

    try {
      await supabasePatch("connections", conn.id, patch);
      updated++;
    } catch (err) {
      console.error(`  Error updating connection ${conn.id}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`  Updated: ${updated}, Skipped: ${skipped}`);
}

// ── Part 2: Backfill category & sections on reading_paths ────────

async function backfillReadingPaths() {
  console.log("\n=== Backfilling reading_paths category & sections ===");

  // 1. Load the JSON data
  const jsonPath = join(ROOT, "data", "reading_paths.json");
  const jsonData = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`  Loaded ${jsonData.length} paths from JSON`);

  // Build slug -> { category, sections } map from JSON
  const jsonMap = new Map();
  for (const p of jsonData) {
    jsonMap.set(p.slug, {
      category: p.category || p.path_type || null,
      sections: p.sections || null,
    });
  }

  // 2. Fetch all reading_paths from Supabase
  const dbPaths = await supabaseGet(
    "reading_paths",
    "select=id,slug,category,sections&limit=500"
  );
  console.log(`  Found ${dbPaths.length} paths in database`);

  let updated = 0;
  let skipped = 0;
  for (const dbPath of dbPaths) {
    const jsonInfo = jsonMap.get(dbPath.slug);
    if (!jsonInfo) {
      skipped++;
      continue;
    }

    // Only update if something changed
    const needsUpdate =
      (!dbPath.category && jsonInfo.category) ||
      (!dbPath.sections && jsonInfo.sections);

    if (!needsUpdate) {
      skipped++;
      continue;
    }

    const patch = {};
    if (jsonInfo.category) patch.category = jsonInfo.category;
    if (jsonInfo.sections) patch.sections = jsonInfo.sections;

    try {
      await supabasePatch("reading_paths", dbPath.id, patch);
      updated++;
    } catch (err) {
      console.error(`  Error updating path ${dbPath.slug}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`  Updated: ${updated}, Skipped: ${skipped}`);
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  console.log("Backfill script starting...");
  console.log(`Supabase URL: ${SUPABASE_URL}`);

  await backfillConnectionSlugs();
  await backfillReadingPaths();

  console.log("\nBackfill complete.");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

#!/usr/bin/env node

/**
 * Seed script for Tier 7 & Tier 9 data:
 * - MCU content
 * - MCU comic mappings
 * - Debates
 * - Infinity themes on editions
 *
 * Usage: node scripts/seed-tier7-tier9.mjs
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { readFileSync } from "fs";

// Manual .env loading (no dotenv dependency)
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

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

async function supabasePost(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=representation,resolution=merge-duplicates" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ERROR inserting into ${table}: ${res.status} ${text}`);
    return [];
  }
  return res.json();
}

async function supabaseGet(table, select = "*", filters = "") {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=${select}${filters}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    console.error(`  ERROR fetching ${table}: ${res.status}`);
    return [];
  }
  return res.json();
}

async function supabasePatch(table, filters, body) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filters}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`  ERROR patching ${table}: ${res.status} ${text}`);
  }
}

function loadJSON(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

// ──────────────────────────────────────────────
// 1. Seed MCU Content
// ──────────────────────────────────────────────
async function seedMCUContent() {
  console.log("\n📺 Seeding MCU content...");
  const data = loadJSON("data/mcu_content.json");
  const inserted = await supabasePost("mcu_content", data);
  console.log(`  ✓ ${inserted.length || data.length} MCU content entries`);
  return inserted;
}

// ──────────────────────────────────────────────
// 2. Seed MCU Comic Mappings (needs UUID resolution)
// ──────────────────────────────────────────────
async function seedMCUMappings() {
  console.log("\n🔗 Seeding MCU comic mappings...");
  const raw = loadJSON("data/mcu_comic_mappings.json");

  // Fetch MCU content IDs
  const mcuRows = await supabaseGet("mcu_content", "id,slug");
  const mcuMap = Object.fromEntries(mcuRows.map((r) => [r.slug, r.id]));

  // Fetch edition IDs
  const editionRows = await supabaseGet("collected_editions", "id,slug");
  const editionMap = Object.fromEntries(editionRows.map((r) => [r.slug, r.id]));

  const mappings = [];
  let skipped = 0;

  for (const m of raw) {
    const mcuId = mcuMap[m.mcu_content_slug];
    const edId = editionMap[m.edition_slug];
    if (!mcuId || !edId) {
      skipped++;
      if (!mcuId) console.log(`  ⚠ MCU not found: ${m.mcu_content_slug}`);
      if (!edId) console.log(`  ⚠ Edition not found: ${m.edition_slug}`);
      continue;
    }
    mappings.push({
      mcu_content_id: mcuId,
      edition_id: edId,
      mapping_type: m.mapping_type,
      faithfulness: m.faithfulness,
      notes: m.notes,
    });
  }

  if (mappings.length > 0) {
    await supabasePost("mcu_comic_mappings", mappings);
  }
  console.log(`  ✓ ${mappings.length} mappings inserted (${skipped} skipped)`);
}

// ──────────────────────────────────────────────
// 3. Seed Debates
// ──────────────────────────────────────────────
async function seedDebates() {
  console.log("\n⚔️  Seeding debates...");
  const data = loadJSON("data/debates_seed.json");

  // Strip related_edition_ids/character_ids if they contain slugs (need UUID resolution)
  const cleaned = data.map((d) => ({
    slug: d.slug,
    title: d.title,
    question: d.question,
    category: d.category,
    context: d.context,
    is_featured: d.is_featured || false,
    status: d.status || "active",
  }));

  const inserted = await supabasePost("debates", cleaned);
  console.log(`  ✓ ${inserted.length || cleaned.length} debates`);
}

// ──────────────────────────────────────────────
// 4. Apply Infinity Themes to Editions
// ──────────────────────────────────────────────
async function seedInfinityThemes() {
  console.log("\n💎 Applying infinity themes to editions...");
  const raw = loadJSON("data/infinity_themes.json");

  // Handle both object {slug: themes[]} and array [{slug, themes}] formats
  const data = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([slug, themes]) => ({ slug, themes }));

  let updated = 0;
  let notFound = 0;

  for (const entry of data) {
    const slug = entry.slug || entry.edition_slug;
    const themes = entry.themes || entry.infinity_themes;

    if (!slug || !themes || themes.length === 0) continue;

    // Use Supabase PATCH with filter
    const filter = `slug=eq.${encodeURIComponent(slug)}`;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/collected_editions?${filter}`, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ infinity_themes: themes }),
    });

    if (res.ok) {
      const result = await res.json();
      if (result.length > 0) {
        updated++;
      } else {
        notFound++;
        console.log(`  ⚠ Edition not found: ${slug}`);
      }
    } else {
      console.log(`  ⚠ Failed to update: ${slug}`);
    }
  }

  console.log(`  ✓ ${updated} editions updated with themes (${notFound} not found)`);
}

// ──────────────────────────────────────────────
// Run all
// ──────────────────────────────────────────────
async function main() {
  console.log("🚀 Seeding Tier 7 & Tier 9 data...");
  console.log(`  Target: ${SUPABASE_URL}`);

  await seedMCUContent();
  await seedMCUMappings();
  await seedDebates();
  await seedInfinityThemes();

  console.log("\n✅ Done!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

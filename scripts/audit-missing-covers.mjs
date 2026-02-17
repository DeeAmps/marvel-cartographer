#!/usr/bin/env node

/**
 * Audit missing covers in Supabase DB.
 * Queries collected_editions where cover_image_url is null or empty.
 *
 * Usage: node scripts/audit-missing-covers.mjs
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
};

async function supabaseGet(path) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });
  if (!res.ok) {
    console.error(`ERROR: ${res.status} ${await res.text()}`);
    return [];
  }
  return res.json();
}

async function main() {
  console.log("Auditing missing covers in Supabase...\n");

  // Get total count
  const allRes = await fetch(
    `${SUPABASE_URL}/rest/v1/collected_editions?select=id&limit=1`,
    { headers: { ...headers, Prefer: "count=exact" } }
  );
  const totalCount = parseInt(allRes.headers.get("content-range")?.split("/")[1] || "0");

  // Fetch all editions missing covers (paginate in case >1000)
  let missing = [];
  let offset = 0;
  const PAGE = 1000;
  while (true) {
    const batch = await supabaseGet(
      `collected_editions?select=id,slug,title,format,print_status,importance,isbn,release_date,cover_image_url` +
      `&or=(cover_image_url.is.null,cover_image_url.eq.)` +
      `&order=title&offset=${offset}&limit=${PAGE}`
    );
    missing.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`Total editions in DB: ${totalCount}`);
  console.log(`Missing covers: ${missing.length}`);
  console.log(`Coverage: ${(((totalCount - missing.length) / totalCount) * 100).toFixed(1)}%\n`);

  // Breakdown by format
  const byFormat = {};
  for (const e of missing) {
    byFormat[e.format] = (byFormat[e.format] || 0) + 1;
  }
  console.log("── By Format ──");
  for (const [fmt, count] of Object.entries(byFormat).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${fmt}: ${count}`);
  }

  // Breakdown by print status
  const byStatus = {};
  for (const e of missing) {
    byStatus[e.print_status] = (byStatus[e.print_status] || 0) + 1;
  }
  console.log("\n── By Print Status ──");
  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count}`);
  }

  // Breakdown by importance
  const byImportance = {};
  for (const e of missing) {
    byImportance[e.importance] = (byImportance[e.importance] || 0) + 1;
  }
  console.log("\n── By Importance ──");
  for (const [imp, count] of Object.entries(byImportance).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${imp}: ${count}`);
  }

  // Has ISBN vs no ISBN
  const withIsbn = missing.filter((e) => e.isbn && e.isbn.trim()).length;
  const noIsbn = missing.length - withIsbn;
  console.log("\n── ISBN Status ──");
  console.log(`  With ISBN (recoverable): ${withIsbn}`);
  console.log(`  Without ISBN (harder): ${noIsbn}`);

  // Release year distribution
  const byYear = {};
  for (const e of missing) {
    const year = e.release_date ? e.release_date.slice(0, 4) : "unknown";
    byYear[year] = (byYear[year] || 0) + 1;
  }
  console.log("\n── By Release Year ──");
  for (const [year, count] of Object.entries(byYear).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${year}: ${count}`);
  }

  // List all missing editions
  console.log("\n── All Missing Editions ──");
  for (const e of missing) {
    const isbn = e.isbn ? `ISBN: ${e.isbn}` : "no ISBN";
    const date = e.release_date || "no date";
    console.log(`  [${e.format}] ${e.title} (${e.print_status}, ${e.importance}, ${isbn}, ${date})`);
  }
}

main().catch(console.error);

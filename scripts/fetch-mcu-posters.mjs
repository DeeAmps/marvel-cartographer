#!/usr/bin/env node

/**
 * Fetch MCU poster images from TMDB and update Supabase.
 *
 * Usage: node scripts/fetch-mcu-posters.mjs
 * Requires: TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env
 */

import { readFileSync, writeFileSync } from "fs";

// ── Load .env ──────────────────────────────────────────────
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

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!TMDB_API_KEY) {
  console.error("Missing TMDB_API_KEY in .env");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p/w500"; // 500px wide posters

const supaHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

// ── TMDB search helpers ────────────────────────────────────

// Manual title overrides for tricky searches
const TITLE_OVERRIDES = {
  "iron-man": { query: "Iron Man", year: 2008, type: "movie" },
  "incredible-hulk": { query: "The Incredible Hulk", year: 2008, type: "movie" },
  "avengers": { query: "The Avengers", year: 2012, type: "movie" },
  "avengers-age-of-ultron": { query: "Avengers: Age of Ultron", year: 2015, type: "movie" },
  "avengers-infinity-war": { query: "Avengers: Infinity War", year: 2018, type: "movie" },
  "avengers-endgame": { query: "Avengers: Endgame", year: 2019, type: "movie" },
  "captain-america-tfa": { query: "Captain America: The First Avenger", year: 2011, type: "movie" },
  "captain-america-winter-soldier": { query: "Captain America: The Winter Soldier", year: 2014, type: "movie" },
  "captain-america-civil-war": { query: "Captain America: Civil War", year: 2016, type: "movie" },
  "captain-america-brave-new-world": { query: "Captain America: Brave New World", year: 2025, type: "movie" },
  "spider-man-homecoming": { query: "Spider-Man: Homecoming", year: 2017, type: "movie" },
  "spider-man-far-from-home": { query: "Spider-Man: Far From Home", year: 2019, type: "movie" },
  "spider-man-no-way-home": { query: "Spider-Man: No Way Home", year: 2021, type: "movie" },
  "thor-dark-world": { query: "Thor: The Dark World", year: 2013, type: "movie" },
  "thor-ragnarok": { query: "Thor: Ragnarok", year: 2017, type: "movie" },
  "thor-love-and-thunder": { query: "Thor: Love and Thunder", year: 2022, type: "movie" },
  "ant-man-quantumania": { query: "Ant-Man and the Wasp: Quantumania", year: 2023, type: "movie" },
  "doctor-strange-mom": { query: "Doctor Strange in the Multiverse of Madness", year: 2022, type: "movie" },
  "black-panther-wakanda-forever": { query: "Black Panther: Wakanda Forever", year: 2022, type: "movie" },
  "fantastic-four-first-steps": { query: "The Fantastic Four: First Steps", year: 2025, type: "movie" },
  "thunderbolts-asterisk": { query: "Thunderbolts*", year: 2025, type: "movie" },
  "deadpool-and-wolverine": { query: "Deadpool & Wolverine", year: 2024, type: "movie" },
  "guardians-of-the-galaxy": { query: "Guardians of the Galaxy", year: 2014, type: "movie" },
  "guardians-of-the-galaxy-vol-2": { query: "Guardians of the Galaxy Vol. 2", year: 2017, type: "movie" },
  "guardians-of-the-galaxy-vol-3": { query: "Guardians of the Galaxy Vol. 3", year: 2023, type: "movie" },
  "guardians-holiday-special": { query: "The Guardians of the Galaxy Holiday Special", year: 2022, type: "tv" },
  "wandavision": { query: "WandaVision", year: 2021, type: "tv" },
  "falcon-and-winter-soldier": { query: "The Falcon and the Winter Soldier", year: 2021, type: "tv" },
  "loki-s1": { query: "Loki", year: 2021, type: "tv" },
  "loki-s2": { query: "Loki", year: 2021, type: "tv" },
  "what-if-s1": { query: "What If...?", year: 2021, type: "tv" },
  "what-if-s2": { query: "What If...?", year: 2021, type: "tv" },
  "what-if-s3": { query: "What If...?", year: 2021, type: "tv" },
  "hawkeye": { query: "Hawkeye", year: 2021, type: "tv" },
  "moon-knight": { query: "Moon Knight", year: 2022, type: "tv" },
  "ms-marvel": { query: "Ms. Marvel", year: 2022, type: "tv" },
  "she-hulk": { query: "She-Hulk: Attorney at Law", year: 2022, type: "tv" },
  "secret-invasion": { query: "Secret Invasion", year: 2023, type: "tv" },
  "echo": { query: "Echo", year: 2024, type: "tv" },
  "agatha-all-along": { query: "Agatha All Along", year: 2024, type: "tv" },
  "werewolf-by-night": { query: "Werewolf by Night", year: 2022, type: "tv" },
  "daredevil-born-again": { query: "Daredevil: Born Again", year: 2025, type: "tv" },
  "ironheart": { query: "Ironheart", year: 2025, type: "tv" },
  "wonder-man": { query: "Wonder Man", year: 2025, type: "tv" },
  "marvel-zombies": { query: "Marvel Zombies", year: 2025, type: "tv" },
  "eyes-of-wakanda": { query: "Eyes of Wakanda", year: 2024, type: "tv" },
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function searchTMDB(title, year, contentType) {
  // Determine search type: movie or tv
  const mediaType = contentType === "movie" ? "movie" : "tv";
  const yearParam = mediaType === "movie" ? "year" : "first_air_date_year";

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: title,
    [yearParam]: String(year),
  });

  const url = `${TMDB_BASE}/search/${mediaType}?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    console.error(`  TMDB search failed: ${res.status} ${await res.text()}`);
    return null;
  }

  const data = await res.json();
  if (data.results && data.results.length > 0) {
    return data.results[0];
  }

  // Retry without year if no results
  const params2 = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: title,
  });

  const res2 = await fetch(`${TMDB_BASE}/search/${mediaType}?${params2}`);
  if (!res2.ok) return null;

  const data2 = await res2.json();
  return data2.results?.[0] ?? null;
}

async function getPosterURL(slug, entry) {
  const override = TITLE_OVERRIDES[slug];
  const title = override?.query ?? entry.title;
  const year = override?.year ?? (entry.release_date ? new Date(entry.release_date).getFullYear() : null);
  const type = override?.type ?? (entry.content_type === "movie" ? "movie" : "tv");

  const result = await searchTMDB(title, year, type === "movie" ? "movie" : "series");

  if (result?.poster_path) {
    return `${TMDB_IMG}${result.poster_path}`;
  }

  return null;
}

// ── Supabase update ────────────────────────────────────────

async function updatePosterURL(slug, posterUrl) {
  const filter = `slug=eq.${encodeURIComponent(slug)}`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mcu_content?${filter}`, {
    method: "PATCH",
    headers: supaHeaders,
    body: JSON.stringify({ poster_url: posterUrl }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`  Supabase update failed for ${slug}: ${res.status} ${text}`);
    return false;
  }

  const result = await res.json();
  return result.length > 0;
}

// ── Also update the local JSON file ───────────────────────

// (local JSON update done in main)

// ── Main ──────────────────────────────────────────────────

async function main() {
  console.log("🎬 Fetching MCU poster images from TMDB...\n");

  const data = JSON.parse(readFileSync("data/mcu_content.json", "utf-8"));
  const results = {};
  let found = 0;
  let notFound = 0;

  for (const entry of data) {
    // Rate limit: TMDB allows ~40 req/10s
    await sleep(300);

    const posterUrl = await getPosterURL(entry.slug, entry);

    if (posterUrl) {
      console.log(`  ✓ ${entry.title} → ${posterUrl}`);
      const updated = await updatePosterURL(entry.slug, posterUrl);
      if (updated) {
        results[entry.slug] = posterUrl;
        found++;
      } else {
        console.log(`    ⚠ DB update failed, but poster found`);
        results[entry.slug] = posterUrl;
        found++;
      }
    } else {
      console.log(`  ✗ ${entry.title} — not found on TMDB`);
      notFound++;
    }
  }

  // Update local JSON file
  const localData = JSON.parse(readFileSync("data/mcu_content.json", "utf-8"));
  for (const [slug, url] of Object.entries(results)) {
    const entry = localData.find((e) => e.slug === slug);
    if (entry) entry.poster_url = url;
  }

  writeFileSync("data/mcu_content.json", JSON.stringify(localData, null, 4) + "\n");
  console.log(`\n💾 Updated data/mcu_content.json`);

  console.log(`\n✅ Done! ${found} posters found, ${notFound} not found.`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

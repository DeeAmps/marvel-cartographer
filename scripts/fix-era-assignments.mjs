#!/usr/bin/env node
/**
 * Fix era_slug misassignments in collected_editions.json
 * Based on comprehensive audit of content publication dates vs assigned eras.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = join(__dirname, "..", "web", "data", "collected_editions.json");

const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Map of slug -> correct era_slug
const fixes = {
  // ============================================================
  // all-new-all-different → dawn-of-krakoa (2018-launch runs that ran into 2019+)
  // ============================================================
  "ff-slott-omnibus-v1": "dawn-of-krakoa",
  "avengers-aaron-omnibus-v1": "dawn-of-krakoa",
  "asm-nick-spencer-omnibus-v1": "dawn-of-krakoa",
  "immortal-hulk-omnibus": "dawn-of-krakoa",
  "venom-cates-omnibus": "dawn-of-krakoa",
  "venom-ewing-ram-v": "dawn-of-krakoa",
  "strange-mackay-2022": "dawn-of-krakoa",
  "iron-man-cantwell-complete": "dawn-of-krakoa",
  "shang-chi-yang-2021": "dawn-of-krakoa",
  "darkhold-omega-2021": "dawn-of-krakoa",
  "alien-pkj": "dawn-of-krakoa",
  "death-of-doctor-strange": "dawn-of-krakoa",
  "death-of-wolverine-complete": "hickman-saga",
  "new-warriors-2014": "hickman-saga",

  // ============================================================
  // current-ongoings → blood-hunt-doom (2024 content)
  // ============================================================
  "ultimate-spider-man-hickman-v1": "blood-hunt-doom",
  "ultimate-spider-man-hickman-v2": "blood-hunt-doom",
  "ultimates-camp-v1": "blood-hunt-doom",
  "ultimate-universe-2024-omnibus-v1": "blood-hunt-doom",
  "ultimate-universe-omnibus-v2": "blood-hunt-doom",
  "x-men-mackay-2024": "blood-hunt-doom",
  "uncanny-x-men-simone-2024": "blood-hunt-doom",
  "x-force-thorne-2024": "blood-hunt-doom",
  "x-factor-russell-2024": "blood-hunt-doom",
  "dazzler-loo-2024": "blood-hunt-doom",
  "psylocke-2024": "blood-hunt-doom",
  "sentinels-2024": "blood-hunt-doom",
  "storm-solo-2024": "blood-hunt-doom",
  "black-panther-2024": "blood-hunt-doom",
  "spectacular-spider-man-2024": "blood-hunt-doom",
  "dark-x-men-foxe-2024": "blood-hunt-doom",

  // ============================================================
  // current-ongoings → dawn-of-krakoa (2023 content)
  // ============================================================
  "ultimate-invasion": "dawn-of-krakoa",

  // ============================================================
  // current-ongoings → all-new-all-different (2017-2018 content)
  // ============================================================
  "moon-knight-legacy-the-tpb": "all-new-all-different",

  // ============================================================
  // blood-hunt-doom → dawn-of-krakoa (2022-2023 content)
  // ============================================================
  "carnage-ram-v-2023": "dawn-of-krakoa",
  "miles-morales-ziglar": "dawn-of-krakoa",
  "doctor-strange-mackay-2023": "dawn-of-krakoa",
  "ghost-rider-percy-2022": "dawn-of-krakoa",
  "punisher-aaron-2022": "dawn-of-krakoa",
  "captain-marvel-alyssa-wong": "dawn-of-krakoa",
  "thor-gronbekk": "dawn-of-krakoa",
  "timeless-mackay": "dawn-of-krakoa",
  "dark-web-zeb-wells": "dawn-of-krakoa",
  "gang-war": "dawn-of-krakoa",
  "ff-ryan-north-v2": "dawn-of-krakoa",
  "asm-zeb-wells-v2": "dawn-of-krakoa",
  "avengers-mackay-v2": "dawn-of-krakoa",
  "cap-symbol-of-truth": "dawn-of-krakoa",
  "spider-boy-slott": "dawn-of-krakoa",
  "gold-goblin-cantwell": "dawn-of-krakoa",
  "asm-zeb-wells-v3": "dawn-of-krakoa",
  "predator-vs-wolverine": "dawn-of-krakoa",
  "spine-tingling-spider-man": "dawn-of-krakoa",
  "avengers-inc-mackay": "dawn-of-krakoa",

  // ============================================================
  // heroes-reborn-return → marvel-knights-ultimate (1999-2003 content)
  // ============================================================
  "thunderbolts-busiek-omnibus-v2": "marvel-knights-ultimate",
  "peter-parker-spider-man-mackie": "marvel-knights-ultimate",
  "gambit-omnibus": "marvel-knights-ultimate",
  "spider-girl-may-parker-v1": "marvel-knights-ultimate",
  "avengers-busiek-perez-v1": "marvel-knights-ultimate",
  "cap-waid": "marvel-knights-ultimate",

  // ============================================================
  // rise-of-x-men → event-age (1987+ content)
  // ============================================================
  "silver-surfer-omnibus-v3-englehart": "event-age",
  "cloak-and-dagger-omnibus": "event-age",

  // ============================================================
  // rise-of-x-men → bronze-age (pre-1980 content)
  // ============================================================
  "spectacular-spider-man-omnibus-v1": "bronze-age",

  // ============================================================
  // event-age → speculation-crash (1993-1996 content)
  // ============================================================
  "dd-man-without-fear": "speculation-crash",
  "deadpool-beginnings": "speculation-crash",

  // ============================================================
  // birth-of-marvel → the-expansion (1966+ content)
  // ============================================================
  "steranko-is-revolutionary-king-size-hc": "the-expansion",

  // ============================================================
  // dawn-of-krakoa → all-new-all-different (pre-2019 content)
  // ============================================================
  "cap-sam-wilson-tp-cc-v02": "all-new-all-different",
  "howard-the-duck-by-zdarsky-quinones-hc-quinones-cover-omnibus": "all-new-all-different",

  // ============================================================
  // Metron-imported data fixes
  // ============================================================
  "ff-by-jonathan-hickman-hc-davis-cover-variant-omnibus-v1": "hickman-saga",
  "ff-by-jonathan-hickman-hc-camuncoli-cover-omnibus-v2": "hickman-saga",
  "cap-by-jack-kirby-hc-omnibus": "bronze-age",
  "x-statix-the-tpb-v2": "marvel-knights-ultimate",

  // event-age → rise-of-x-men (pre-1985 content)
  "cap-dawns-early-light-epic": "rise-of-x-men",

  // marvel-knights-ultimate → event-age (late 80s/early 90s content)
  "cap-the-bloodstone-hunt-tpb": "event-age",
  "thor-tp-thor-war-epic": "event-age",
  "wolverine-weapon-x-gallery-edition-hc": "event-age",

  // speculation-crash → event-age (pre-1992 content)
  "excalibur-hc-omnibus-v2": "event-age",

  // heroes-reborn-return → speculation-crash (1995-1997 content)
  "untold-tales-of-spider-man": "speculation-crash",
  "untold-tales-of-spider-man-v2": "speculation-crash",
};

let fixCount = 0;
let notFound = [];

for (const edition of editions) {
  if (fixes[edition.slug]) {
    const oldEra = edition.era_slug;
    const newEra = fixes[edition.slug];
    if (oldEra !== newEra) {
      edition.era_slug = newEra;
      fixCount++;
      console.log(`  ${edition.slug}: ${oldEra} → ${newEra}`);
    }
  }
}

// Check for slugs in fixes that weren't found in the data
for (const slug of Object.keys(fixes)) {
  if (!editions.find((e) => e.slug === slug)) {
    notFound.push(slug);
  }
}

writeFileSync(editionsPath, JSON.stringify(editions, null, 2) + "\n");

console.log(`\nFixed ${fixCount} editions.`);
if (notFound.length > 0) {
  console.log(`\nWARNING: ${notFound.length} slugs not found in data:`);
  for (const slug of notFound) {
    console.log(`  - ${slug}`);
  }
}

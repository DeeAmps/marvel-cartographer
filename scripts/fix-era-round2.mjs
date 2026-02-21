import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

const fixes = {
  // Hickman FF/Avengers/Secret Wars → hickman-saga
  "ff-by-hickman-tp-cc-v03": "hickman-saga",
  "ff-by-jonathan-hickman-the-tp-v4": "hickman-saga",
  "avengers-by-jonathan-hickman-the-tp-v5": "hickman-saga",
  "secret-wars-by-jonathan-hickman-omnibus": "hickman-saga",
  "secret-wars-by-jonathan-hickman-alex-ross-issue-zero-cover-omnibus": "hickman-saga",

  // Ultimate Spider-Man Hickman v3 → blood-hunt-doom (2024 content)
  "ultimate-spider-man-by-jonathan-hickman-family-business-tp-v3": "blood-hunt-doom",

  // Suspects found in dawn-of-krakoa that don't belong
  // Taskmaster (2002) + (2010) + (2020) — mixed era, but 2/3 of content is pre-Krakoa
  // Leaving as-is since the 2020 series anchors it

  // Miles Morales Omnibus V1: Ultimate Comics Spider-Man (2011) → bendis-avengers
  "miles-morales-spider-man-hc-andrews-cover-omnibus-v1": "bendis-avengers",

  // Uncanny X-Force by Remender (2010) #1-35 → bendis-avengers (published 2010-2012)
  "uncanny-x-force-by-rick-remender-hc-omnibus": "bendis-avengers",
};

let fixCount = 0;
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

writeFileSync(editionsPath, JSON.stringify(editions, null, 2) + "\n");
console.log(`\nFixed ${fixCount} editions.`);

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Round 3: Fix rise-of-x-men (1975-1985) misassignments
const fixes = {
  // → bronze-age (1970-1980) — content predates rise-of-x-men
  "guardians-of-the-galaxy-quest-for-the-shield-epic": "bronze-age", // Avengers/GotG 1975-79 + GotG (1990) #1-6

  // → event-age (1985-1992)
  "wolverine-hc-omnibus-v01": "event-age",                        // Wolverine (1988) #1-23 + earlier appearances
  "wolverine-blood-and-claws-epic": "event-age",                   // Wolverine #31-44 (1990-91)
  "new-warriors-classic-hc-bagley-omnibus-v01": "event-age",       // New Warriors (1990) #1-26
  "dd-born-again-gallery-edition-hc": "event-age",                // DD #226-233 (1986)
  "dd-born-again-marvel-prem": "event-age",                        // DD #226-233 (1986)
  "x-men-mutant-massacre-prelude-omnibus": "event-age",           // UXM #194-209 (1985-86) + Longshot + Nightcrawler
  "captain-marvel-the-saga-of-monica-rambeau-tpb": "event-age",   // Avengers + CM (1989-94)
  "ff-the-more-things-change-epic": "event-age",                   // FF #308-320 (1987-88)
  "spec-sm-by-dematteis-buscema-omnibus": "event-age",            // SSM #178-216 (1991-94)
  "spec-sm-by-dematteis-buscema-sal-buscema-rhino-cover-omnibus": "event-age", // Same

  // → speculation-crash (1992-1996)
  "deadpool-hc-hey-its-deadpool-marvel-select": "speculation-crash", // Deadpool (1993-97)
  "hulk-future-imperfect-epic": "speculation-crash",               // Hulk #407-419 (1993-94) + Future Imperfect
  "wolverine-gambit-victims-gallery-edition-hc-2": "speculation-crash", // W/G Victims (1995)

  // → marvel-knights-ultimate (1998-2004) — published in 2000
  "x-men-the-hidden-years-hc-omnibus": "marvel-knights-ultimate",  // X-Men: Hidden Years (2000) #1-22
  "x-men-the-hidden-years-hc-byrne-pin-up-cover-omnibus": "marvel-knights-ultimate", // Same
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
    } else {
      console.log(`  ${edition.slug}: already ${newEra} (skipped)`);
    }
  }
}

writeFileSync(editionsPath, JSON.stringify(editions, null, 2) + "\n");
console.log(`\nFixed ${fixCount} editions in rise-of-x-men.`);

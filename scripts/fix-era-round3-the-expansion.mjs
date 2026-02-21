import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Round 3: Fix the-expansion (1966-1970) misassignments
const fixes = {
  // → bronze-age (1970-1980)
  "doctor-strange-omnibus-v2": "bronze-age",                     // DS #169-183 + Marvel Premiere + DS (1974) #1-18
  "mmw-howard-the-duck-hc-v01": "bronze-age",                    // Howard the Duck (1976) #1-14
  "thor-the-eternals-saga-epic": "bronze-age",                   // Thor #281-302 (1979-80)
  "conan-the-barbarian-the-original-marvel-years-epic-2-hawks-from-the-sea-hc": "bronze-age", // Conan (1970) #14-26 (1972)
  "warlock-by-jim-starlin-gallery-edition-hc": "bronze-age",     // Warlock #9-15 + ST #178-181 (1975-77)
  "adventure-into-fear-hc-omnibus": "bronze-age",                // Fear #1-31 (1970-75)
  "cap-hc-coello-cvr-omnibus-v3": "bronze-age",                  // Cap (1968) #149-192 (1972-76)

  // → rise-of-x-men (1975-1985)
  "ux-hc-byrne-omnibus-v02": "rise-of-x-men",                    // UXM #132-153 (1980-82)
  "ux-hc-romita-jr-omnibus-v04": "rise-of-x-men",                // UXM #176-193 (1984-85)
  "x-men-the-fate-of-the-phoenix-epic-v7": "rise-of-x-men",     // X-Men #129-143 (1980)
  "the-death-of-captain-marvel-gallery-edition-hc": "rise-of-x-men", // CM death (1982)
  "moon-knight-hc-alex-ross-cover-omnibus-v2": "rise-of-x-men",  // Moon Knight (1980) #21-38 (1982-84)
  "marvel-the-avengers-hc-v22": "rise-of-x-men",                 // Avengers #227-235 (1983)
  "marvel-the-avengers-hc-variant-edition-v22": "rise-of-x-men", // Same content

  // → event-age (1985-1992)
  "infinity-gauntlet-hc-omnibus": "event-age",                    // Silver Surfer (1987) + IG (1991)
  "x-men-mutant-genesis-epic": "event-age",                       // X-Men (1991) #1-3, X-Factor #65-70
  "dd-last-rites-tpb": "event-age",                               // DD #283-300 (1990-91)
  "cap-the-captain-epic": "event-age",                             // Cap #333-350 (1987-89)
  "asm-round-robin-tpb": "event-age",                             // ASM #351-360 (1991)
  "marvel-the-amazing-spider-man-mmw-v27": "event-age",           // ASM #279-288 (1986-87)

  // → speculation-crash (1992-1996)
  "asm-invasion-of-the-spider-slayers-tpb": "speculation-crash",  // ASM #368-377 (1992)
  "asm-the-hero-killers-tpb": "speculation-crash",                // ASM #361-367 (1992)
  "spider-man-by-michelinie-bagley-hc-omnibus-v1": "speculation-crash", // ASM #351-375 (1991-93)
  "spider-man-by-michelinie-bagley-hc-bagley-spider-man-vs-venom-carnage-cover-omnibus-v1": "speculation-crash", // Same
  "hulk-by-peter-david-hc-adam-kubert-cover-omnibus-v4": "speculation-crash", // Hulk #436-467 (1996-97)
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
console.log(`\nFixed ${fixCount} editions in the-expansion.`);

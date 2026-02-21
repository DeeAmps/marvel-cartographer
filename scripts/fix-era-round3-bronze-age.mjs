import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Round 3: Fix bronze-age (1970-1980) misassignments
const fixes = {
  // → rise-of-x-men (1975-1985)
  "ux-hc-omnibus-v03": "rise-of-x-men",                          // UXM #154-175 (1982-83)
  "x-men-the-brood-saga-tpb": "rise-of-x-men",                   // UXM #154-167 (1982)
  "cloak-and-dagger-hc-omnibus-v01": "rise-of-x-men",            // C&D (1983) + SSM appearances
  "avengers-court-martial-epic": "rise-of-x-men",                 // Avengers #210-226 (1981-82)
  "avengers-seasons-of-the-witch-epic": "rise-of-x-men",          // Avengers #227-237 (1983)
  "marvel-the-avengers-hc-v24": "rise-of-x-men",                  // Avengers #246-254 (1984)
  "marvel-captain-america-mmw-v17": "rise-of-x-men",              // Cap #281-289 (1983)
  "marvel-captain-america-mmw-v17-2": "rise-of-x-men",            // Cap #281-289 (1983) variant
  "marvel-the-incredible-hulk-mmw-v19": "rise-of-x-men",          // Hulk #280-291 (1983)
  "marvel-the-incredible-hulk-mmw-v19-2": "rise-of-x-men",        // Hulk #280-291 (1983) variant
  "mmw-dazzler-hc-v02-2": "rise-of-x-men",                        // Dazzler #14-25 (1982)

  // → event-age (1985-1992)
  "cap-streets-of-poison-epic": "event-age",                       // Cap #372-386 (1990-91)
  "ff-into-the-time-stream-tpb": "event-age",                     // FF #334-346 (1989-90)
  "marvel-the-amazing-spider-man-hc-v25": "event-age",             // ASM #263-270 (1985)
  "marvel-the-amazing-spider-man-hc-variant-v25": "event-age",     // Same variant
  "marvel-the-uncanny-x-men-mmw-v17": "event-age",                // UXM #244-255 (1989)
  "marvel-the-uncanny-x-men-mmw-v17-2": "event-age",              // Same variant
  "marvel-the-amazing-spider-man-variant-mmw-v27": "event-age",   // ASM #279-288 (1986-87)
  "solomon-kane-original-marvel-years-hc-omnibus": "event-age",   // Solomon Kane (1985) #1-6
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
console.log(`\nFixed ${fixCount} editions in bronze-age.`);

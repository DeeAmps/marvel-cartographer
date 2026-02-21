import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Round 3: Fix birth-of-marvel (1961-1966) misassignments
// These editions are currently in birth-of-marvel but contain content from later eras
const fixes = {
  // → the-expansion (1966-1970)
  "x-men-the-sentinels-live-epic": "the-expansion",               // X-Men #46-66 (1968-70)
  "silver-surfer-john-buscema-thor-cover-omnibus-v1": "the-expansion", // Silver Surfer (1968) #1-18
  "marvel-the-silver-surfer-mmw-v1": "the-expansion",              // Silver Surfer (1968) #1-6
  "marvel-the-silver-surfer-mmw-v1-2": "the-expansion",            // Silver Surfer (1968) #1-6 (variant)
  "namor-the-sub-mariner-omnibus-v1": "the-expansion",             // Sub-Mariner (1968) + FF appearances
  "namor-the-sub-mariner-gene-colan-cover-omnibus-v1": "the-expansion", // Same content
  "loki-nc-kirby-cover-omnibus-v1": "the-expansion",               // JIM #111-123 + Thor #153-181 (1965-69)
  "loki-hc-brooks-cover-omnibus-v1": "the-expansion",              // Same content
  "ff-the-mystery-of-the-black-panther-tpb": "the-expansion",     // FF #52-67 (1966-67)
  "asm-spider-man-no-more-tpb": "the-expansion",                  // ASM #39-52 (1966-67)
  "asm-the-secret-of-the-petrified-tablet-tpb": "the-expansion",  // ASM #68-85 (1969)

  // → bronze-age (1970-1980)
  "the-fantastic-four-hc-kirby-cover-omnibus-v4": "bronze-age",    // FF #94-125 (1970-72)
  "ff-battle-of-the-behemouths-epic": "bronze-age",                // FF #105-125 (1970-72)
  "ff-four-no-more-epic": "bronze-age",                            // FF #192-214 (1978-80)
  "mmw-ghost-rider-hc-v02": "bronze-age",                         // Ghost Rider (1973) #6-20
  "mmw-ghost-rider-hc-ed-297-v02": "bronze-age",                  // Ghost Rider (1973) #6-20 (variant)

  // → rise-of-x-men (1975-1985)
  "mmw-fantastic-four-hc-v22": "rise-of-x-men",                   // FF #241-250 (1982)
  "mmw-amazing-spider-man-hc-v22": "rise-of-x-men",               // ASM #224-237 (1981-82)
  "asm-spider-man-or-spider-clone-tpb": "rise-of-x-men",          // ASM #143-164 (1975-77)
  "ff-the-possession-of-franklin-richards-epic": "rise-of-x-men", // FF #215-231 (1980-81)
  "asm-spider-man-threat-or-menace-epic": "rise-of-x-men",        // ASM #207-223 (1980-81)

  // → event-age (1985-1992)
  "x-men-by-chris-claremont-jim-lee-hc-omnibus-v2": "event-age",  // UXM #273-280 + X-Men (1991) #1-11
  "spider-man-the-wedding-album-gallery-edition-hc": "event-age", // ASM #290-292 (1987)
  "marvel-the-amazing-spider-man-hc-variant-v24": "event-age",     // ASM #252-262 (1984-85)
  "asm-assassin-nation-tp": "event-age",                           // ASM #311-325 (1989)

  // → speculation-crash (1992-1996)
  "spider-man-ben-reilly-hc-omnibus-v02": "speculation-crash",     // Ben Reilly (1996-97)

  // → bendis-avengers (2004-2012)
  // NOTE: This edition has WRONG issues_collected data (shows ASM #68-85 instead of Wolverine content)
  "wolverine-the-return-of-weapon-x-tpb": "bendis-avengers",      // Wolverine (2003) #20-32 (2004-05)
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
console.log(`\nFixed ${fixCount} editions in birth-of-marvel.`);

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const editionsPath = resolve(__dirname, "..", "web", "data", "collected_editions.json");
const editions = JSON.parse(readFileSync(editionsPath, "utf-8"));

// Round 3: Fix remaining eras (5-14) misassignments
const fixes = {
  // === FROM speculation-crash ===
  "power-pack-classic-brigman-cover-hc-omnibus-v2": "event-age",     // PP #37-64 (1988-91)
  "black-widow-hawkeye-broken-arrow-tp": "blood-hunt-doom",           // BW&H (2024) #1-4

  // === FROM heroes-reborn-return ===
  "giant-size-x-men-tribute-to-wein-cockrum-tp": "dawn-of-krakoa",   // Published 2020
  "iron-man-armor-wars-omnibus": "event-age",                         // IM (1968) #219-266 (1987-90)
  "star-wars-legends-tales-of-the-jedi-hc-omnibus": "speculation-crash", // TOTJ 1993-95
  "star-wars-legends-the-rebellion-epic-v6": "speculation-crash",     // Shadows of Empire 1996

  // === FROM marvel-knights-ultimate ===
  "asm-straczynski-hc-omnibus-v02": "bendis-avengers",               // ASM (1999) #515-545 (2005-07)
  "miracleman-the-original-epic-tp": "event-age",                     // Miracleman (1985-89 content)
  "wolverine-old-man-logan-marvel-prem": "bendis-avengers",           // Wolverine #66-72 (2008-09)

  // === FROM bendis-avengers ===
  "savage-avengers-by-gerry-duggan-hc-deodato-jr-cover-omnibus": "dawn-of-krakoa", // SA (2019-21)
  "loki-god-of-stories-hc-omnibus": "hickman-saga",                   // Agent of Asgard (2014-15) primary
  "loki-god-of-stories-hc-frank-cho-cover-omnibus": "hickman-saga",   // Same
  "star-wars-legends-the-original-marvel-years-tpb-v6": "event-age",  // SW (1977) #89-107 (1984-86)

  // === FROM hickman-saga ===
  "thanos-infinity-saga-hc-omnibus": "all-new-all-different",         // Thanos (2016-18) primary
  "ghost-rider-robbie-reyes-tp-cc": "all-new-all-different",          // All-New GR (2014) + GR (2016)
  "thunderbolts-the-saga-of-the-winter-soldier-cc": "bendis-avengers", // Cap (2004) #6-14 primary
  "thunderbolts-the-saga-of-yelena-belova-cc": "dawn-of-krakoa",     // BW + Widowmakers (2020) + WG (2021)

  // === FROM dawn-of-krakoa ===
  "golden-age-marvel-comics-hc-omnibus-v02": "birth-of-marvel",       // Marvel Mystery Comics (1939)
  "superior-spider-man-hc-quesada-cover-omnibus-v1": "hickman-saga",  // Superior SM (2013-14)
  "infamous-iron-man-by-bendis-maleev-tp": "all-new-all-different",   // Infamous IM (2016-17)
  "venom-modern-era-agent-venom-tpb": "bendis-avengers",             // Venom (2011) #1-16
  "cap-the-trial-of-captain-america-hc-mcniven-cover-omnibus": "bendis-avengers", // Cap (2005) #602-619 (2010-11)
  "thor-modern-era-the-world-eaters-epic": "bendis-avengers",        // Thor (2007) #615-621 (2010-11)
  "spider-man-deadpool-modern-era-road-trip-epic": "all-new-all-different", // SM/DP (2016-19)

  // === FROM blood-hunt-doom ===
  "ff-ryan-north-v3": "dawn-of-krakoa",                               // FF (2022) #13-18 (pub 2023)
  "asm-zeb-wells-v4": "dawn-of-krakoa",                               // ASM (2022) #32-43 (pub 2023)
  "asm-beyond-hc-arthur-adams-first-issue-cover-omnibus": "dawn-of-krakoa", // ASM (2018) #75-93 (pub 2022)
  "venom-by-al-ewing-venom-war-tp-v8": "dawn-of-krakoa",             // Venom (2021) #35-39 (pub 2023)
  "ff-by-ryan-north-aliens-ghosts-and-alternate-earths-tp-v5": "dawn-of-krakoa", // FF (2022) #23-27 (pub 2024)
  "miles-morales-spider-man-by-cody-ziglar-webs-of-wakanda-tp-v6": "dawn-of-krakoa", // MM (2022) #25-30

  // === FROM current-ongoings ===
  "thor-by-matt-fraction-hc-coipel-cover-omnibus": "bendis-avengers", // Thor (2007-2011)
  "jane-foster-the-saga-of-valkyrie-tpb": "dawn-of-krakoa",          // Mighty Thor + Valkyrie (2019)
  "dr-strange-by-donny-cates-tpb": "all-new-all-different",          // DS (2017) #381-390
  "loki-modern-era-journey-into-mystery-tpb": "bendis-avengers",     // JIM (2011) #622-636
  "captain-marvel-by-margaret-stohl-tpb": "all-new-all-different",    // Mighty CM (2017)
  "spider-man-by-joe-kelly-omnibus": "bendis-avengers",              // ASM (1999) #575-625 (2008-10)
  "dd-mayor-fisk-tp": "all-new-all-different",                        // DD (2017) #595-600
  "marvel-age-treasury-edition-ohc": "dawn-of-krakoa",               // Marvel Age (2023) #1000
  "asm-by-zeb-wells-dead-wrong-tp-v12": "blood-hunt-doom",           // ASM (2022) #55-60 (pub 2024)
  "ff-solve-everything-marvel-prem": "hickman-saga",                   // FF (1998) #570-588 (Hickman 2009-11)
  "asm-the-8-deaths-of-spider-man-tp": "blood-hunt-doom",            // ASM (2022) #61-70 (pub 2024)
  "owud-avengers-tie-in": "blood-hunt-doom",                          // OWUD event (2024-25)
  "owud-spider-man-tie-in": "blood-hunt-doom",                        // OWUD event (2024-25)
  "uncanny-x-men-simone-v2": "blood-hunt-doom",                       // UXM (2024) #7-12
  "wolverine-ahmed-v2": "blood-hunt-doom",                             // Wolverine (2024) #7-12
};

let fixCount = 0;
const byEra = {};
for (const edition of editions) {
  if (fixes[edition.slug]) {
    const oldEra = edition.era_slug;
    const newEra = fixes[edition.slug];
    if (oldEra !== newEra) {
      edition.era_slug = newEra;
      fixCount++;
      byEra[oldEra] = (byEra[oldEra] || 0) + 1;
      console.log(`  ${edition.slug}: ${oldEra} → ${newEra}`);
    } else {
      console.log(`  ${edition.slug}: already ${newEra} (skipped)`);
    }
  }
}

writeFileSync(editionsPath, JSON.stringify(editions, null, 2) + "\n");
console.log(`\nFixed ${fixCount} editions across remaining eras.`);
console.log("By source era:", JSON.stringify(byEra, null, 2));

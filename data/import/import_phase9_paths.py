#!/usr/bin/env python3
"""Phase 9: Build new reading paths for Star Wars, Conan, and supplementary Marvel series.

Follows the pattern from build_epic_paths.py — curated hardcoded lists with
validation against the edition slug set.

Adds ~16 new paths. Does NOT duplicate existing paths (checks existing slugs).
"""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
PATHS_PATH = WEB_DATA_DIR / "reading_paths.json"

with open(EDITIONS_PATH) as f:
    editions = json.load(f)
slug_set = {e["slug"] for e in editions}

with open(PATHS_PATH) as f:
    existing_paths = json.load(f)
existing_path_slugs = {p["slug"] for p in existing_paths}

new_paths = []
skipped = 0


def make_path(slug, name, category, path_type, difficulty, description, entries, sections=None):
    global skipped
    if slug in existing_path_slugs:
        print(f"  SKIP (exists): {slug}")
        skipped += 1
        return

    valid_entries = []
    for e in entries:
        if e["edition_slug"] in slug_set:
            valid_entries.append(e)
        else:
            print(f"  WARN: {e['edition_slug']} not found, skipping from {slug}")

    if not valid_entries:
        print(f"  SKIP (no valid entries): {slug}")
        skipped += 1
        return

    path = {
        "slug": slug,
        "name": name,
        "category": category,
        "path_type": path_type,
        "difficulty": difficulty,
        "description": description,
        "estimated_issues": sum(1 for _ in valid_entries) * 25,  # rough estimate
        "entries": valid_entries,
    }
    if sections:
        path["sections"] = sections

    new_paths.append(path)
    print(f"  ADDED: {slug} ({len(valid_entries)} entries)")


def entry(pos, slug, note="", optional=False):
    e = {"position": pos, "edition_slug": slug, "is_optional": optional}
    if note:
        e["note"] = note
    return e


# ============================================================
# STAR WARS: Canon (Marvel 2015+)
# ============================================================

make_path(
    "star-wars-canon-main-series", "Star Wars: Marvel Canon Main Series",
    "franchise", "curated", "intermediate",
    "The main Star Wars comic series published by Marvel from 2015 onward, set between Episodes IV and V (and later V and VI). Follow the core storyline through Jason Aaron's run, then Gillen & Pak's continuation.",
    [
        entry(1, "star-wars-by-jason-aaron-hc-cassaday-cover-omnibus", "Jason Aaron's run — Skywalker Strikes through Rebel Jail"),
        entry(2, "star-wars-by-gillen-pak-hc-omnibus", "Gillen & Pak continue the main series"),
    ]
)

make_path(
    "star-wars-darth-vader-complete", "Star Wars: Darth Vader Complete",
    "character", "curated", "intermediate",
    "Every major Darth Vader-focused comic series from Marvel. Three distinct runs by three writers, each exploring different periods of Vader's story.",
    [
        entry(1, "star-wars-darth-vader-by-gillen-larroca-hc-andrews-cover-omnibus", "Gillen/Larroca — set between Episodes IV-V"),
        entry(2, "star-wars-darth-vader-dark-lord-sith-hc-v02", "Charles Soule — Vader's early days after Ep. III", True),
        entry(3, "star-wars-darth-vader-by-charles-soule-hc-deodato-cover-omnibus", "Charles Soule — Dark Lord of the Sith complete"),
        entry(4, "star-wars-darth-vader-pak", "Greg Pak — set between Episodes V-VI"),
        entry(5, "star-wars-darth-vader-black-white-red-tp", "Anthology — short stories by various creators", True),
    ]
)

make_path(
    "star-wars-doctor-aphra-complete", "Star Wars: Doctor Aphra Complete",
    "character", "curated", "intermediate",
    "Doctor Aphra — Marvel's breakout original Star Wars character. An amoral archaeologist who debuted in Darth Vader, then got her own series. Two complete runs.",
    [
        entry(1, "star-wars-darth-vader-by-gillen-larroca-hc-andrews-cover-omnibus", "Aphra's debut in Vader by Gillen"),
        entry(2, "star-wars-doctor-aphra-hc-omnibus-v01", "Aphra's solo series Vol. 1"),
        entry(3, "star-wars-doctor-aphra-hc-omnibus-v2", "Aphra's solo series Vol. 2"),
        entry(4, "star-wars-doctor-aphra-friends-and-enemies-omnibus", "Aphra Vol. 2 series — Friends and Enemies"),
    ]
)

make_path(
    "star-wars-canon-crossovers", "Star Wars: Marvel Canon Crossover Events",
    "franchise", "curated", "advanced",
    "The major Marvel Star Wars crossover events that span multiple series. War of the Bounty Hunters and Crimson Reign connect the main series, Vader, Aphra, and Bounty Hunters.",
    [
        entry(1, "star-wars-war-of-the-bounty-hunters-hc-yu-cover-omnibus", "War of the Bounty Hunters — the hunt for Han Solo"),
        entry(2, "star-wars-crimson-reign-omnibus", "Crimson Reign — Qi'ra's shadow war"),
    ]
)

make_path(
    "star-wars-high-republic", "Star Wars: The High Republic",
    "franchise", "curated", "intermediate",
    "The High Republic era (hundreds of years before the films). A new era of Star Wars storytelling with original characters and threats. Three phases.",
    [
        entry(1, "star-wars-the-high-republic-phase-i-hc-omnibus", "Phase I — Light of the Jedi era"),
        entry(2, "star-wars-the-high-republic-phase-ii-quest-of-the-jedi-omnibus", "Phase II — Quest of the Jedi"),
        entry(3, "star-wars-the-high-republic-phase-iii-the-hunted-tp-v2", "Phase III — The Hunted", True),
        entry(4, "star-wars-the-high-republic-fear-of-the-jedi-tp", "Fear of the Jedi", True),
    ]
)

# ============================================================
# STAR WARS: Legends
# ============================================================

make_path(
    "star-wars-legends-tales-of-the-jedi", "Star Wars Legends: Tales of the Jedi",
    "franchise", "curated", "intermediate",
    "The earliest era of Star Wars Legends comics — set thousands of years before the films. Ancient Sith, early Jedi, and the Great Hyperspace War.",
    [
        entry(1, "star-wars-legends-tales-of-the-jedi-hc-omnibus", "Tales of the Jedi Omnibus — the complete collection"),
        entry(2, "star-wars-legends-tales-of-the-jedi-tpb-v2", "Epic Collection Vol. 2 — continuation"),
        entry(3, "star-wars-legends-tales-of-the-jedi-tpb-v3", "Epic Collection Vol. 3 — conclusion"),
    ]
)

make_path(
    "star-wars-legends-old-republic", "Star Wars Legends: The Old Republic",
    "franchise", "curated", "intermediate",
    "The Old Republic era — set during the events of the Knights of the Old Republic games. Zayne Carrick's adventure from fugitive Padawan to galactic hero.",
    [
        entry(1, "star-wars-legends-the-old-republic-omnibus-v1", "Old Republic Omnibus Vol. 1"),
        entry(2, "star-wars-legends-the-old-republic-omnibus-v2", "Old Republic Omnibus Vol. 2"),
    ]
)

make_path(
    "star-wars-legends-prequel-era", "Star Wars Legends: Prequel Era",
    "franchise", "curated", "advanced",
    "Star Wars Legends comics set during the prequel film era — Rise of the Sith, The Menace Revealed, and The Clone Wars. Fills in gaps around Episodes I-III.",
    [
        entry(1, "star-wars-legends-rise-of-the-sith-hc-bachs-cover-omnibus", "Rise of the Sith Omnibus"),
        entry(2, "star-wars-legends-the-menace-revealed-tpb-v3", "The Menace Revealed Vol. 3"),
        entry(3, "star-wars-legends-the-menace-revealed-tpb-v4", "The Menace Revealed Vol. 4"),
        entry(4, "star-wars-legends-the-clone-wars-tpb-v4", "The Clone Wars Vol. 4"),
        entry(5, "star-wars-jedi-knights-guardians-of-the-republic-tp-v1", "Jedi Knights — Republic era", True),
    ]
)

make_path(
    "star-wars-legends-empire-rebellion", "Star Wars Legends: Empire & Rebellion",
    "franchise", "curated", "advanced",
    "Star Wars Legends comics set during the original trilogy era. The Empire and Rebellion Epic Collections cover stories set between and around Episodes IV-VI.",
    [
        entry(1, "star-wars-legends-the-empire-hc-sanda-cover-omnibus-v1", "The Empire Omnibus Vol. 1"),
        entry(2, "star-wars-legends-the-empire-omnibus-v2", "The Empire Omnibus Vol. 2"),
        entry(3, "star-wars-legends-the-empire-omnibus-v3", "The Empire Omnibus Vol. 3"),
        entry(4, "star-wars-legends-the-rebellion-hc-fleming-cover-omnibus-v1", "The Rebellion Omnibus Vol. 1"),
        entry(5, "star-wars-legends-the-rebellion-hc-omnibus-v2", "The Rebellion Omnibus Vol. 2"),
        entry(6, "star-wars-legends-the-rebellion-omnibus-v3", "The Rebellion Omnibus Vol. 3"),
    ]
)

make_path(
    "star-wars-legends-new-republic", "Star Wars Legends: The New Republic",
    "franchise", "curated", "advanced",
    "Star Wars Legends comics set after Return of the Jedi. The New Republic, Thrawn's campaign, the New Jedi Order era. Includes the beloved Thrawn Trilogy adaptation.",
    [
        entry(1, "star-wars-legends-the-new-republic-hc-lauffray-cover-omnibus-v1", "The New Republic Omnibus Vol. 1"),
        entry(2, "star-wars-legends-the-new-republic-hc-omnibus-v2", "The New Republic Omnibus Vol. 2"),
        entry(3, "star-wars-legends-the-thrawn-trilogy-tpb", "The Thrawn Trilogy adaptation"),
    ]
)

make_path(
    "star-wars-legends-original-marvel", "Star Wars Legends: The Original Marvel Years",
    "franchise", "curated", "intermediate",
    "Marvel's original Star Wars comics (1977-1986) — the very first Star Wars comics, published alongside the original trilogy. A fascinating time capsule.",
    [
        entry(1, "star-wars-legends-the-original-marvel-years-tp-epic-v5", "Original Marvel Years Epic Vol. 5"),
        entry(2, "star-wars-legends-the-original-marvel-years-tpb-v6", "Original Marvel Years Epic Vol. 6"),
        entry(3, "star-wars-legends-the-original-marvel-years-droids-ewoks-epic", "Droids & Ewoks — spinoff series", True),
    ]
)

# ============================================================
# CONAN
# ============================================================

make_path(
    "conan-barbarian-original-marvel", "Conan the Barbarian: Original Marvel Years",
    "franchise", "curated", "completionist",
    "Marvel's original Conan the Barbarian series (1970-1993) collected in massive omnibuses. Roy Thomas and Barry Windsor-Smith's legendary run that brought Robert E. Howard's creation to comics.",
    [
        entry(1, "conan-barbarian-omnibus-v1", "Vol. 1 — Roy Thomas & Barry Windsor-Smith define Conan in comics"),
        entry(2, "conan-barbarian-omnibus-v2", "Vol. 2 — The saga continues"),
        entry(3, "conan-barbarian-orig-marvel-yrs-hc-omnibus-v04", "Vol. 4 — Later issues"),
        entry(4, "conan-the-barbarian-the-original-marvel-years-hc-buscema-cover-omnibus-v6", "Vol. 6 — John Buscema era"),
        entry(5, "conan-the-barbarian-the-original-marvel-years-hc-isherwood-cover-omnibus-v8", "Vol. 8 — Late run"),
    ]
)

make_path(
    "savage-sword-conan-complete", "Savage Sword of Conan: Complete",
    "franchise", "curated", "completionist",
    "Marvel's black-and-white Savage Sword of Conan magazine (1974-1995) — more mature, unbound by Comics Code restrictions. Grittier, bloodier Conan stories.",
    [
        entry(1, "savage-sword-conan-orig-marvel-yrs-hc-omnibus-v04", "Vol. 4"),
        entry(2, "savage-sword-of-conan-the-original-marvel-years-hc-asrar-cover-omnibus-v5", "Vol. 5"),
        entry(3, "savage-sword-of-conan-the-original-marvel-years-hc-jusko-cover-omnibus-v6", "Vol. 6"),
        entry(4, "savage-sword-of-conan-the-original-marvel-years-hc-larkin-cover-omnibus-v7", "Vol. 7"),
        entry(5, "savage-sword-of-conan-the-original-marvel-years-hc-klein-cover-omnibus-v8", "Vol. 8"),
    ]
)

make_path(
    "conan-complete-reading-order", "Conan: Complete Marvel Reading Order",
    "franchise", "curated", "advanced",
    "All Marvel Conan comics in a suggested reading order — from the original 1970s Marvel years through the 2019 revival. Combines the main Barbarian series, Savage Sword magazine, King Conan, and modern runs.",
    [
        entry(1, "conan-barbarian-omnibus-v1", "Original Marvel Years — the beginning"),
        entry(2, "conan-barbarian-omnibus-v2", "Original Marvel Years Vol. 2"),
        entry(3, "conan-the-barbarian-the-original-marvel-years-epic-2-hawks-from-the-sea-hc", "Epic: Hawks from the Sea", True),
        entry(4, "conan-the-barbarian-the-curse-of-the-golden-skull-epic", "Epic: Curse of the Golden Skull", True),
        entry(5, "conan-the-barbarian-the-original-marvel-years-queen-of-the-black-coast-tpb", "Epic: Queen of the Black Coast", True),
        entry(6, "conan-chronicles-the-song-of-belit-tpb-epic", "Chronicles: Song of Belit"),
        entry(7, "conan-shadows-over-kush-tp", "Epic: Shadows Over Kush"),
        entry(8, "conan-the-king-the-original-marvel-years-hc-andrews-cover-omnibus-v1", "King Conan Omnibus Vol. 1"),
        entry(9, "king-conan-chronicles-phantoms-and-phoenixes-tpb", "King Conan Chronicles"),
        entry(10, "conan-the-barbarian-by-kurt-busiek-hc-omnibus", "Busiek's Dark Horse-era revival at Marvel"),
        entry(11, "conan-the-barbarian-by-aaron-asrar-hc", "Aaron & Asrar — 2019 Marvel revival"),
        entry(12, "conan-chronicles-blood-in-his-wake-tpb", "Chronicles: Blood in His Wake"),
    ]
)

# ============================================================
# STAR WARS: Additional Canon Paths
# ============================================================

make_path(
    "star-wars-modern-era-epics", "Star Wars: Modern Era Epic Collections",
    "franchise", "curated", "intermediate",
    "Budget-friendly way to read Marvel's canon Star Wars comics through Epic Collections — more affordable than the omnibuses.",
    [
        entry(1, "star-wars-modern-era-star-wars-tpb-v1", "Modern Era: Star Wars Vol. 1"),
        entry(2, "star-wars-modern-era-yodas-secret-war-epic", "Yoda's Secret War"),
        entry(3, "star-wars-darth-vader-modern-era-vader-down-epic", "Vader Down crossover era", True),
        entry(4, "star-wars-darth-vader-modern-era-shadows-and-secrets-epic", "Vader: Shadows and Secrets", True),
        entry(5, "star-wars-kanan-modern-era-the-last-padawan-epic", "Kanan: The Last Padawan", True),
    ]
)

make_path(
    "star-wars-ages-anthology", "Star Wars: Ages Anthology Series",
    "franchise", "curated", "beginner",
    "Three anthology hardcovers covering the three eras of the Skywalker saga. Short character-focused stories — a great intro to Star Wars comics.",
    [
        entry(1, "star-wars-age-of-rebellion-hc", "Age of Rebellion — original trilogy era characters"),
        entry(2, "star-wars-age-of-resistance-hc", "Age of Resistance — sequel trilogy era characters"),
    ]
)

# ============================================================
# Write output
# ============================================================

print(f"\n{'=' * 60}")
print(f"RESULTS")
print(f"{'=' * 60}")
print(f"New paths created: {len(new_paths)}")
print(f"Skipped (already exist or empty): {skipped}")

# Merge into reading_paths.json
merged = existing_paths + new_paths
with open(PATHS_PATH, "w") as f:
    json.dump(merged, f, indent=2)
print(f"Total paths: {len(merged)}")
print(f"Saved: {PATHS_PATH}")

# Also save just the new paths for reference
output_path = SCRIPT_DIR / "phase9_new_paths.json"
with open(output_path, "w") as f:
    json.dump(new_paths, f, indent=2)
print(f"New paths saved: {output_path}")

# Summary
print(f"\nNew path list:")
for p in new_paths:
    print(f"  {p['slug']}: {p['name']} ({len(p['entries'])} entries)")

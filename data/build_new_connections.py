#!/usr/bin/env python3
"""Generate connections for new Epic Collection and Premier Collection editions.
Adds leads_to connections between sequential volumes and parallel/collected_in links to omnibuses."""
import json
import re
import uuid

# Load editions
with open("archive/collected_editions.json", "r") as f:
    editions = json.load(f)

# Load existing connections
with open("archive/connections.json", "r") as f:
    existing_connections = json.load(f)

slug_map = {e["slug"]: e for e in editions}
existing_conn_set = set()
for c in existing_connections:
    key = (c["source_slug"], c["target_slug"], c["connection_type"])
    existing_conn_set.add(key)

new_connections = []

def add_conn(source_slug, target_slug, conn_type, strength, confidence, desc=""):
    key = (source_slug, target_slug, conn_type)
    if key in existing_conn_set:
        return
    if source_slug not in slug_map or target_slug not in slug_map:
        return
    existing_conn_set.add(key)
    new_connections.append({
        "source_type": "edition",
        "source_slug": source_slug,
        "target_type": "edition",
        "target_slug": target_slug,
        "connection_type": conn_type,
        "strength": strength,
        "confidence": confidence,
        "interpretation": "official",
        "description": desc
    })

# ============================================================
# Sequential leads_to connections within Epic Collection series
# ============================================================

# Define series patterns and their sequential volumes
epic_series = {
    "asm-epic-v": list(range(3, 29)),  # vol 3-28
    "avengers-epic-v": [2, 3, 5, 6, 8, 9, 10, 11, 13, 17, 18, 19, 20, 21, 22, 23, 25, 26],
    "awc-epic-v": list(range(1, 8)),
    "cap-epic-v": [1, 3, 4, 5, 6, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22],
    "dd-epic-v": [2, 3, 4, 5, 6, 7, 12, 14, 15, 16, 17, 18, 19, 20, 21],
    "deadpool-epic-v": list(range(1, 6)),
    "defenders-epic-v": [1, 2, 6, 7, 8, 9],
    "ds-epic-v": [1, 2, 3, 4, 5, 8, 9, 10, 11, 13],
    "excalibur-epic-v": [1, 2, 3, 4, 5, 8, 9],
    "ff-epic-v": [4, 5, 6, 7, 8, 9, 10, 11, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    "hulk-epic-v": [2, 3, 4, 5, 6, 7, 8, 9, 13, 19, 20, 21, 22, 24],
    "iron-man-epic-v": [1, 2, 3, 4, 5, 6, 10, 11, 13, 14, 15, 16, 17, 18, 20, 21, 22],
    "mk-epic-v": [1, 3, 4, 5, 7],
    "new-mutants-epic-v": list(range(1, 9)),
    "punisher-epic-v": [2, 3, 4, 5, 7],
    "ss-epic-v": [1, 3, 4, 5, 6, 7, 8, 9, 13, 14],
    "thor-epic-v": [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 23, 24],
    "wolverine-epic-v": [1, 2, 3, 6, 7, 8, 9, 12, 13, 14, 15],
    "x-factor-epic-v": [1, 3, 4, 7, 8, 9, 10],
    "x-force-epic-v": [1, 2, 3, 4, 7, 8],
    "xm-epic-v": [2, 3, 4, 9, 10, 12, 17, 19, 20, 21, 22, 23],
}

# Find actual slugs for each series prefix
for prefix, volumes in epic_series.items():
    # Find all matching slugs
    matching = {}
    for slug in slug_map:
        if slug.startswith(prefix):
            # Extract volume number
            remainder = slug[len(prefix):]
            parts = remainder.split("-", 1)
            try:
                vol = int(parts[0])
                matching[vol] = slug
            except ValueError:
                pass

    # Create sequential leads_to connections
    for i in range(len(volumes) - 1):
        src_vol = volumes[i]
        tgt_vol = volumes[i + 1]
        if src_vol in matching and tgt_vol in matching:
            add_conn(matching[src_vol], matching[tgt_vol], "leads_to", 8, 95,
                f"Sequential volume in the same Epic Collection series")

# ============================================================
# Connect Epic Collections to their corresponding Omnibuses
# ============================================================
epic_to_omnibus = {
    # ASM epics -> ASM omnibuses
    "asm-epic-v3-spider-man-no-more": "asm-omnibus-v2",
    "asm-epic-v4-goblin-lives": "asm-omnibus-v2",
    "asm-epic-v5-petrified-tablet": "asm-omnibus-v3",
    "asm-epic-v6-death-captain-stacy": "asm-omnibus-v3",
    "asm-epic-v7-goblins-last-stand": "asm-omnibus-v3",
    "asm-epic-v8-man-wolf": "asm-omnibus-v4",
    "asm-epic-v17-kravens-last-hunt": "asm-michelinie-mcfarlane-omnibus",
    "asm-epic-v18-venom": "asm-michelinie-mcfarlane-omnibus",
    # FF epics -> FF omnibuses
    "ff-epic-v4-the-mystery-of-the-black-panther": "ff-omnibus-v2",
    "ff-epic-v5-the-name-is-doom": "ff-omnibus-v3",
    "ff-epic-v6-at-war-with-atlantis": "ff-omnibus-v3",
    # Thor epics -> Thor omnibuses (Simonson is separate)
    "thor-epic-v2-when-titans-clash": "thor-omnibus-v1",
    "thor-epic-v3-the-wrath-of-odin": "thor-omnibus-v1",
    # Cap epics -> Cap omnibuses
    "cap-epic-v14-the-captain": "cap-gruenwald-omnibus-v1",
    "cap-modern-epic-winter-soldier": "cap-brubaker-v1",
    "cap-modern-epic-death-dream": "cap-brubaker-v2",
    # Iron Man epics
    "iron-man-epic-v13-stark-wars": "iron-man-michelinie-layton-omnibus",
    # X-Men epics -> X-Men omnibuses
    "xm-epic-v9-the-brood-saga": "uxm-claremont-omnibus-v3",
    "xm-epic-v10-god-loves-man-kills": "uxm-claremont-omnibus-v3",
    "xm-epic-v17-dissolution-and-rebirth": "uxm-claremont-omnibus-v4",
    "xm-epic-v19-mutant-genesis": "xm-1991-omnibus-v1",
    # New Mutants epics
    "new-mutants-epic-v2-the-demon-bear-saga": "new-mutants-omnibus-v1",
    # Wolverine epics
    "wolverine-epic-v1-madripoor-nights": "wolverine-omnibus-v1",
    "wolverine-epic-v3-blood-and-claws": "wolverine-omnibus-v1",
    # DD epics -> DD omnibuses
    "dd-epic-v6-watch-out-for-bullseye": "dd-miller-companion-omnibus",
    "dd-modern-epic-underboss": "dd-bendis-maleev-v1",
    "dd-modern-epic-out": "dd-bendis-maleev-v1",
    # Silver Surfer -> Infinity Gauntlet
    "ss-epic-v5-return-of-thanos": "infinity-gauntlet-omnibus",
    "ss-epic-v6-thanos-quest": "infinity-gauntlet-omnibus",
    # Modern era
    "new-avengers-epic-v1-assembled": "new-avengers-omnibus-v1",
    "gotg-modern-epic-v1": "gotg-dna-omnibus",
    "gotg-modern-epic-v2": "gotg-dna-omnibus",
    "nxm-epic-e-is-extinction": "nxm-morrison-omnibus",
}

for epic_slug, omni_slug in epic_to_omnibus.items():
    if epic_slug in slug_map and omni_slug in slug_map:
        add_conn(epic_slug, omni_slug, "collected_in", 5, 90,
            "Budget alternative — these issues also appear in the omnibus edition")

# ============================================================
# Connect Premier Collections to their source material
# ============================================================
premier_links = {
    "premier-dd-born-again": "dd-miller-omnibus",
    "premier-cap-winter-soldier": "cap-brubaker-v1",
    "premier-ff-solve-everything": "ff-hickman-omnibus-v1",
    "premier-civil-war": "civil-war",
    "premier-hawkeye": "hawkeye-fraction-aja",
    "premier-planet-hulk": "planet-hulk",
    "premier-punisher-welcome-back": "punisher-ennis-omnibus",
}

for premier_slug, related_slug in premier_links.items():
    if premier_slug in slug_map and related_slug in slug_map:
        add_conn(premier_slug, related_slug, "collected_in", 5, 95,
            "Budget pocket-size alternative to the full edition")

# ============================================================
# Key cross-series connections
# ============================================================
cross_series = [
    # New Mutants -> X-Force
    ("new-mutants-epic-v8-the-end-of-the-beginning", "x-force-epic-v1-under-the-gun", "leads_to", 9, 95, "New Mutants become X-Force"),
    # Defenders -> X-Factor
    ("defenders-epic-v9-end-of-all-songs", "x-factor-epic-v1-genesis-and-apocalypse", "leads_to", 7, 85, "Angel, Beast, Iceman move from Defenders to X-Factor"),
    # Iron Fist -> Power Man & Iron Fist
    ("iron-fist-epic-v1-fury", "pmif-epic-v1-heroes-for-hire", "leads_to", 8, 95, "Iron Fist joins Luke Cage as Heroes for Hire"),
    # Luke Cage -> Power Man & Iron Fist
    ("luke-cage-epic-v2-fire-this-time", "pmif-epic-v1-heroes-for-hire", "leads_to", 8, 95, "Luke Cage meets Iron Fist"),
    # Ghost Rider -> Silver Surfer cosmic
    ("ghost-rider-epic-v1-hell-on-wheels", "ghost-rider-epic-v2-salvation-run", "leads_to", 8, 95, "Sequential Ghost Rider"),
    # Silver Surfer -> Infinity Gauntlet
    ("ss-epic-v6-thanos-quest", "infinity-gauntlet-omnibus", "prerequisite", 10, 95, "Thanos Quest leads directly into Infinity Gauntlet"),
    # Warlock -> Infinity Gauntlet
    ("warlock-by-starlin", "ss-epic-v5-return-of-thanos", "prerequisite", 9, 90, "Warlock sets up Thanos's return"),
    # X-Factor -> X-Men
    ("x-factor-epic-v3-angel-of-death", "xm-epic-v17-dissolution-and-rebirth", "ties_into", 6, 80, "X-Factor and X-Men stories intertwine"),
    # Thunderbolts launch
    ("tbolts-epic-v1-justice-like-lightning", "tbolts-epic-v2-wanted-dead-alive", "leads_to", 9, 95, "Sequential Thunderbolts"),
    # Ultimate Universe launches
    ("ult-spider-man-epic-v1", "ult-xm-epic-v1", "parallel", 5, 90, "Ultimate Universe contemporaries"),
    ("ult-spider-man-epic-v1", "ult-ff-epic-v1", "parallel", 5, 90, "Ultimate Universe contemporaries"),
    ("ult-spider-man-epic-v1", "ultimates-epic-v1", "parallel", 5, 90, "Ultimate Universe contemporaries"),
    # Miles follows Ultimate Spider-Man
    ("ult-spider-man-epic-v1", "miles-morales-epic-v1", "leads_to", 7, 85, "Miles becomes Spider-Man after Ultimate Peter's death"),
    # Modern DD chain
    ("dd-modern-epic-underboss", "dd-modern-epic-out", "leads_to", 9, 95, "Sequential Bendis/Maleev DD"),
    ("dd-modern-epic-out", "dd-modern-epic-king-hells-kitchen", "leads_to", 9, 95, "Sequential Bendis/Maleev DD"),
    ("dd-modern-epic-king-hells-kitchen", "dd-modern-epic-cell-block-d", "leads_to", 8, 90, "Brubaker picks up from Bendis"),
    # New Avengers chain
    ("new-avengers-epic-v1-assembled", "new-avengers-epic-v2-civil-war", "leads_to", 9, 95, "Sequential New Avengers"),
    ("new-avengers-epic-v2-civil-war", "dark-avengers-epic", "leads_to", 7, 85, "Dark Reign follows Civil War/Secret Invasion"),
    # Loki chain
    ("loki-epic-v1-journey-into-mystery", "loki-epic-v2-everything-burns", "leads_to", 9, 95, "Sequential Gillen Loki"),
    # GotG chain
    ("annihilation-epic", "gotg-modern-epic-v1", "leads_to", 8, 90, "Annihilation leads to Guardians formation"),
    ("gotg-modern-epic-v1", "gotg-modern-epic-v2", "leads_to", 9, 95, "Sequential GotG"),
    # Iron Man modern chain
    ("im-modern-epic-worlds-most-wanted", "im-modern-epic-stark-disassembled", "leads_to", 9, 95, "Sequential Fraction Iron Man"),
    # Astonishing X-Men chain
    ("astonishing-xm-epic-v1-gifted", "astonishing-xm-epic-v2-unstoppable", "leads_to", 9, 95, "Sequential Whedon/Cassaday X-Men"),
    # Cap modern chain
    ("cap-modern-epic-winter-soldier", "cap-modern-epic-death-dream", "leads_to", 9, 95, "Sequential Brubaker Cap"),
]

for src, tgt, ctype, strength, confidence, desc in cross_series:
    add_conn(src, tgt, ctype, strength, confidence, desc)

# Merge and write
merged = existing_connections + new_connections
print(f"Existing connections: {len(existing_connections)}")
print(f"New connections: {len(new_connections)}")
print(f"Total connections: {len(merged)}")

# Connection type distribution of new
types = {}
for c in new_connections:
    t = c["connection_type"]
    types[t] = types.get(t, 0) + 1
print(f"\nNew connections by type:")
for t, count in sorted(types.items(), key=lambda x: x[1], reverse=True):
    print(f"  {t}: {count}")

with open("archive/connections.json", "w") as f:
    json.dump(merged, f, indent=4)

print(f"\nSuccessfully wrote {len(merged)} connections to archive/connections.json")

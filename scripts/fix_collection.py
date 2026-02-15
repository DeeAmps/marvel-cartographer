#!/usr/bin/env python3
"""
Fix the collection sync — correct mismatched editions, add missing ones,
and rebuild the user_collections table for Daniel.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
USER_ID = "485f592f-dee8-4332-ab53-8aaa0170ac32"

# ── EXPLICIT SLUG MAPPING ───────────────────────────────────────────
# Each item in Daniel's collection mapped to exact DB slug
COLLECTION_SLUGS = [
    # ── Spider-Man ──
    "asm-epic-kravens-last-hunt",                          # Amazing Spider-Man Epic Collection: Kraven's Last Hunt
    "ultimate-spider-man-omnibus-v1",                       # Ultimate Spider-Man Omnibus Vol. 1
    "spider-man-stern-omnibus",                             # Spider-Man By Roger Stern Omnibus
    "spider-verse-spider-geddon-omnibus",                   # Spider-Verse/Spider-Geddon Omnibus
    "asm-omnibus-v1",                                       # Amazing Spider-Man Omnibus 1
    "spider-man-death-of-stacys",                           # Spider-Man: Death of the Stacys
    # Miles Morales: Spider-Man Omnibus Vol. 1 → NEEDS ADDING
    "spider-man-deadpool-bromantic",                        # Spider-Man/Deadpool: Isn't It Bromantic
    "spider-gwen-ghost-spider-epic",                        # Spider-Gwen: Ghost-Spider Modern Era Epic Collection
    "ultimate-spider-man-hickman-v1",                       # Ultimate Spider-Man By Jonathan Hickman Vol. 1
    "ultimate-spider-man-hickman-v2",                       # Ultimate Spider-Man By Jonathan Hickman Vol. 2

    # ── X-Men ──
    "xm-dark-phoenix-saga",                                 # X-Men: Dark Phoenix Saga
    "xm-epic-v10-god-loves-man-kills",                      # X-Men: God Loves, Man Kills
    "house-of-x-powers-of-x",                               # House Of X/Powers Of X
    "fall-of-house-of-x",                                   # Fall Of The House Of X
    "house-of-m",                                           # House Of M Ultimate Edition
    "nxm-morrison-omnibus",                                 # New X-Men Omnibus
    "uxm-claremont-omnibus-v1",                             # Uncanny X-Men Omnibus Vol. 1
    "uxm-claremont-omnibus-v2",                             # Uncanny X-Men Omnibus Vol. 2
    "uxm-claremont-omnibus-v3",                             # Uncanny X-Men Omnibus Vol. 3
    "axm-whedon-omnibus",                                   # Astonishing X-Men By Whedon & Cassaday Omnibus
    "xm-age-of-apocalypse-omnibus",                         # X-Men: Age of Apocalypse Omnibus
    "xm-epic-v5-second-genesis",                            # X-Men Epic Collection: Second Genesis
    "uxf-remender-omnibus",                                 # Uncanny X-Force By Rick Remender Omnibus
    "all-new-xmen-bendis-omnibus",                          # All-New X-Men By Brian Michael Bendis Omnibus
    "xm-mutant-massacre-omnibus",                           # X-Men: Mutant Massacre Omnibus
    "xm-mutant-massacre-prelude",                           # X-Men: Mutant Massacre Prelude Omnibus
    "all-new-wolverine-tom-taylor-omnibus",                 # All-New Wolverine Omnibus By Tom Taylor
    "xm-onslaught-omnibus",                                 # X-Men/Avengers Onslaught Omnibus
    "house-of-m-omnibus",                                   # House of M Omnibus
    "avengers-vs-xmen",                                     # Avengers Vs. X-Men
    "inferno-hickman",                                      # Inferno

    # ── Avengers ──
    "avengers-hickman-omnibus-v1",                          # Avengers By Hickman Omnibus Vol. 1
    "avengers-hickman-omnibus-v2",                          # Avengers By Hickman Omnibus Vol. 2
    "avengers-busiek-perez-v1",                             # Avengers By Busiek & Perez Omnibus Vol. 1
    "avengers-busiek-perez-v2",                             # Avengers By Busiek & Perez Omnibus Vol. 2
    "new-avengers-omnibus-v1",                              # New Avengers Omnibus Vol. 1
    "avengers-disassembled",                                # Avengers Disassembled
    "avengers-kree-skrull-war",                             # Avengers: The Kree-Skrull War
    "avengers-kang-dynasty-omnibus",                        # Avengers: The Kang Dynasty Omnibus
    "avengers-undersiege-epic",                             # Avengers Epic Collection: Under Siege
    "new-avengers-illuminati",                              # New Avengers: Illuminati

    # ── Fantastic Four ──
    "ff-epic-v3-coming-of-galactus",                        # FF Epic Collection: Coming of Galactus
    "ff-hickman-omnibus-v1",                                # FF By Hickman Omnibus Vol. 1 (also covers Complete Collection Vol. 1)
    "ff-hickman-omnibus-v1",                                # FF By Hickman Omnibus Vol. 1 [New Printing] (explicit duplicate - same book)
    "ff-waid-wieringo-omnibus",                             # FF By Waid & Wieringo Omnibus
    "ff-omnibus-v2",                                        # Fantastic Four Omnibus Vol. 2
    "ff-omnibus-v1",                                        # Fantastic Four Omnibus Vol. 1
    "ff-hickman-omnibus-v2",                                # FF By Hickman Complete Collection Vol. 3/4 → maps to Omnibus Vol. 2
    "premier-ff-solve-everything",                          # FF: Solve Everything
    "ult-ff-epic-v1",                                       # Ultimate Fantastic Four Omnibus Vol. 1

    # ── Deadpool ──
    "deadpool-bad-blood",                                   # Deadpool: Bad Blood
    "deadpool-badder-blood",                                # Deadpool: Badder Blood
    "deadpool-kills-marvel-universe",                       # Deadpool Kills the Marvel Universe
    "deadpool-posehn-duggan-omnibus",                       # Deadpool by Posehn & Duggan Omnibus
    "deadpool-beginnings-omnibus",                          # Deadpool Beginnings
    "cable-deadpool-omnibus",                               # Deadpool & Cable Omnibus
    "deadpool-epic-mission-improbable",                     # Deadpool Epic Collection: Mission Improbable
    "gwenpool-omnibus",                                     # Gwenpool Omnibus

    # ── Daredevil ──
    "dd-born-again",                                        # Daredevil: Born Again
    "dd-epic-man-without-fear",                             # Daredevil: The Man Without Fear
    "dd-epic-touch-of-typhoid",                             # DD Epic Collection: A Touch Of Typhoid
    "dd-bendis-maleev-v1",                                  # DD By Bendis & Maleev Omnibus Vol. 1
    "dd-bendis-maleev-v2",                                  # DD By Bendis & Maleev Omnibus Vol. 2
    "dd-miller-omnibus-companion",                          # DD By Frank Miller Omnibus Companion
    "dd-shadowland-omnibus",                                # DD: Shadowland Omnibus
    "dd-zdarsky-omnibus-v1",                                # DD By Chip Zdarsky Omnibus Vol. 1
    "dd-zdarsky-omnibus-v2",                                # DD By Chip Zdarsky Omnibus Vol. 2

    # ── Moon Knight ──
    "moon-knight-lemire",                                   # Moon Knight By Lemire & Smallwood
    "moon-knight-epic-shadows-of-moon",                     # Moon Knight Epic Collection: Shadows Of The Moon
    "moon-knight-mackay-omnibus",                           # Moon Knight By Jed MacKay Omnibus

    # ── Hulk ──
    "planet-hulk",                                          # Hulk: Planet Hulk Omnibus
    "world-war-hulk",                                       # Hulk: World War Hulk Omnibus
    "immortal-hulk-omnibus",                                # Immortal Hulk Omnibus

    # ── Thor ──
    "thor-simonson-omnibus",                                # Thor By Walter Simonson Omnibus (both entries)
    "thor-aaron-god-of-thunder",                            # Thor By Jason Aaron Omnibus Vol. 1 → God of Thunder
    "mighty-thor-aaron-omnibus",                            # Thor By Jason Aaron Omnibus Vol. 2 → Mighty Thor
    "thor-cates-omnibus",                                   # Thor By Cates & Klein Omnibus

    # ── Captain America ──
    "cap-return-winter-soldier-omnibus",                    # Captain America: Return Of The Winter Soldier Omnibus
    "cap-omnibus-v1",                                       # Captain America Omnibus Vol. 1
    "cap-epic-dawns-early-light",                           # Captain America Epic Collection: Dawn's Early Light
    "premier-cap-winter-soldier",                           # Captain America: The Winter Soldier [Marvel Premier Collection]

    # ── Black Panther ──
    "bp-hudlin-omnibus",                                    # Black Panther By Reginald Hudlin Omnibus
    "black-panther-coates",                                 # Black Panther: A Nation Under Our Feet

    # ── Hawkeye ──
    "hawkeye-fraction-omnibus",                             # Hawkeye By Fraction & Aja Omnibus

    # ── Ms. Marvel ──
    "ms-marvel-omnibus-v1",                                 # Ms. Marvel Omnibus: Volume 1

    # ── Sentry ──
    "sentry-jenkins-complete",                              # The Sentry

    # ── Iron Fist ──
    "immortal-iron-fist-omnibus",                           # Immortal Iron Fist & The Immortal Weapons Omnibus

    # ── Iron Man ──
    "iron-man-demon-in-a-bottle",                           # Iron Man: Demon in a Bottle
    "invincible-iron-man-fraction-v1",                      # Invincible Iron Man Vol. 1: The Five Nightmares
    "invincible-iron-man-fraction-v2",                      # Invincible Iron Man Vol. 2: World's Most Wanted
    "superior-iron-man",                                    # Superior Iron Man 1: Infamous
    "superior-iron-man-v2",                                 # Superior Iron Man 2: Stark Contrast

    # ── Captain Marvel ──
    # "The Life and Death of Captain Marvel" → NEEDS ADDING

    # ── Cosmic Events ──
    "infinity-gauntlet-omnibus",                            # Infinity Gauntlet
    "ss-epic-v7-the-infinity-gauntlet",                     # Silver Surfer Epic Collection: Thanos Quest
    "secret-wars-1984-omnibus",                             # Secret Wars (1984)
    "secret-wars-2015-omnibus",                             # Secret Wars By Jonathan Hickman Omnibus
    "secret-wars-battleworld",                              # Secret Wars: Battleworld Omnibus Vol. 1
    "secret-wars-ii",                                       # Secret Wars II
    "infinity-hickman",                                     # Infinity (by Hickman)
    "infinity-war-omnibus",                                 # Infinity War
    "infinity-crusade-omnibus",                             # Infinity Crusade (covers both Vol. 1 & 2)
    "annihilation-conquest-omnibus",                        # Annihilation: Conquest Omnibus
    "annihilation-omnibus",                                 # Annihilation Omnibus
    "king-in-black",                                        # King In Black Omnibus
    "silver-surfer-rebirth-of-thanos",                      # Silver Surfer: Rebirth of Thanos
    "silver-surfer-requiem",                                # Silver Surfer - Requiem

    # ── Marvel Events ──
    "civil-war",                                            # Civil War
    "civil-war-ii",                                         # Civil War II
    "siege",                                                # Siege
    "war-of-the-realms",                                    # War Of The Realms Omnibus
    "secret-invasion",                                      # Secret Invasion
    # "Secret Invasion Omnibus" → NEEDS ADDING
    "original-sin",                                         # Original Sin
    "dark-ages",                                            # Dark Ages
    "blood-hunt",                                           # Blood Hunt
    "devils-reign-omnibus",                                 # Devil's Reign Omnibus
    "judgment-day",                                         # Judgment Day Omnibus
    "fear-itself",                                          # Fear Itself
    "age-of-ultron",                                        # Age of Ultron

    # ── Heroes Reborn ──
    "heroes-reborn-americas-mightiest",                     # Heroes Reborn: America's Mightiest Heroes Omnibus
    "heroes-reborn-omnibus",                                # Heroes Reborn Omnibus (2019)
    "heroes-reborn-return-omnibus",                         # Heroes Reborn The Return Omnibus

    # ── Ultimate Universe ──
    "ultimate-invasion",                                    # Ultimate Invasion
    "ultimate-marvel-hickman-omnibus",                      # Ultimate Marvel By Jonathan Hickman Omnibus
    "ultimatum",                                            # Ultimatum
    "ultimates-millar-hitch-omnibus",                       # Ultimates By Millar & Hitch Omnibus
    "ultimates-deniz-camp-v1",                              # Ultimates By Deniz Camp Vol. 1
    "ultimate-comics-doomsday",                             # Ultimate Comics Doomsday

    # ── Punisher ──
    "punisher-max-ennis-omnibus-v1",                        # Punisher Max By Garth Ennis Omnibus Vol. 1
    "punisher-remender-omnibus",                            # Punisher By Rick Remender Omnibus
    "premier-punisher-welcome-back",                        # Punisher: Welcome Back, Frank

    # ── Venom ──
    "venom-cates-omnibus",                                  # Venom/Venomnibus By Cates & Stegman

    # ── Doctor Strange ──
    "doctor-strange-englehart-brunner",                     # Doctor Strange: Master Of The Mystic Arts Omnibus Vol. 1

    # ── Doctor Doom ──
    "doctor-doom-books-of-doom",                            # Doctor Doom: Books Of Doom

    # ── Ghost Rider ──
    "ghost-rider-danny-ketch-omnibus-v1",                   # Ghost Rider: Danny Ketch Omnibus Vol. 1
    "ghost-rider-aaron-omnibus",                            # Ghost Rider By Jason Aaron Omnibus
    "cosmic-ghost-rider-cates",                             # Cosmic Ghost Rider By Donny Cates

    # ── Wolverine ──
    "wolverine-aaron-omnibus-v1",                           # Wolverine By Jason Aaron Omnibus Vol. 1
    "wolverine-claremont-miller",                           # Wolverine by Claremont & Miller
    "wolverine-weapon-x-origin",                            # Wolverine: Weapon X

    # ── Elektra ──
    "elektra-assassin",                                     # Elektra: Assassin

    # ── Guardians ──
    "guardians-bendis-omnibus-v1",                          # Guardians Of The Galaxy By Bendis Omnibus Vol. 1
    "guardians-cates",                                      # Guardians Of The Galaxy By Donny Cates

    # ── Other ──
    "squadron-supreme",                                     # Squadron Supreme
    "eternals-gillen",                                      # Eternals By Kieron Gillen
    "inhumans-jenkins-lee",                                 # Inhumans
    "kang-conqueror-only-myself",                           # Kang The Conqueror: Only Myself Left To Conquer
    "kang-saga",                                            # Kang: The Saga Of The Once And Future Conqueror
    "secret-warriors-omnibus",                              # Secret Warriors Omnibus
    "thanos-wins-cates",                                    # Thanos Wins By Donny Cates
    "thanos-god-quarry",                                    # Thanos Vol. 2: The God Quarry
    "thunderbolts-ultimate-collection",                     # Thunderbolts Ultimate Collection
    "dark-avengers-epic",                                   # Dark Avengers: Osborn's Reign
    "marvels",                                              # Marvels
    "history-of-marvel-universe",                           # History Of The Marvel Universe
]

# ── EDITIONS TO ADD TO DB ───────────────────────────────────────────
NEW_EDITIONS = [
    {
        "slug": "miles-morales-spider-man-omnibus-v1",
        "title": "Miles Morales: Spider-Man Omnibus Vol. 1",
        "format": "omnibus",
        "issues_collected": "Ultimate Comics Spider-Man #1-28, Ultimate Comics Spider-Man (2011) #1-12, Spider-Men #1-5",
        "issue_count": 45,
        "print_status": "in_print",
        "importance": "essential",
        "era_slug": "bendis-avengers",
        "synopsis": "The complete origin and early adventures of Miles Morales as Spider-Man in the Ultimate Universe. After Peter Parker's death, Brooklyn teen Miles Morales is bitten by a stolen Oscorp spider and takes up the Spider-Man mantle. Features Miles' first encounters with the Scorpion, Venom, and the original Spider-Man in the landmark Spider-Men crossover.",
        "connection_notes": "Prerequisite: Ultimate Spider-Man (Peter Parker era). Leads to: Miles Morales joins 616 in Secret Wars (2015). Parallel: Ultimate Comics Ultimates.",
        "creators": [
            {"name": "Brian Michael Bendis", "role": "writer"},
            {"name": "Sara Pichelli", "role": "artist"},
            {"name": "David Marquez", "role": "artist"}
        ]
    },
    {
        "slug": "life-and-death-of-captain-marvel",
        "title": "The Life and Death of Captain Marvel",
        "format": "trade_paperback",
        "issues_collected": "Iron Man #55, Captain Marvel #25-34, Marvel Feature #12, Marvel Spotlight #1-2, Avengers Annual #7, Marvel Two-In-One Annual #2, Marvel Graphic Novel #1",
        "issue_count": 16,
        "print_status": "in_print",
        "importance": "essential",
        "era_slug": "bronze-age",
        "synopsis": "The complete saga of Mar-Vell, the original Captain Marvel. Covers his transformation from Kree spy to Earth's protector, the legendary Thanos War (with Jim Starlin's cosmic masterwork), and the groundbreaking Marvel Graphic Novel #1: The Death of Captain Marvel — the first major superhero to die of cancer, not in battle.",
        "connection_notes": "Essential Thanos reading — Thanos first appears in Iron Man #55 collected here. Prerequisite for: Infinity Gauntlet, Avengers cosmic stories. Jim Starlin's Thanos saga starts here before Warlock.",
        "creators": [
            {"name": "Jim Starlin", "role": "writer"},
            {"name": "Jim Starlin", "role": "artist"},
            {"name": "Al Milgrom", "role": "artist"}
        ]
    },
    {
        "slug": "secret-invasion-omnibus",
        "title": "Secret Invasion Omnibus",
        "format": "omnibus",
        "issues_collected": "Secret Invasion #1-8, New Avengers #38-47, Mighty Avengers #12-20, Secret Invasion: Who Do You Trust?, plus tie-ins",
        "issue_count": 40,
        "print_status": "in_print",
        "importance": "essential",
        "era_slug": "bendis-avengers",
        "synopsis": "The complete Secret Invasion event in omnibus format. The Skrulls have been infiltrating Earth for years, replacing heroes and world leaders. Trust is shattered as the Avengers discover the invasion and fight back. Norman Osborn kills the Skrull Queen on live TV, launching Dark Reign.",
        "connection_notes": "Prerequisite: New Avengers Omnibus Vol. 1, Civil War. Leads to: Dark Reign, Dark Avengers. The omnibus collects all core series plus essential tie-ins.",
        "creators": [
            {"name": "Brian Michael Bendis", "role": "writer"},
            {"name": "Leinil Francis Yu", "role": "artist"}
        ]
    },
    {
        "slug": "thor-aaron-omnibus-v1",
        "title": "Thor by Jason Aaron Omnibus Vol. 1",
        "format": "omnibus",
        "issues_collected": "Thor: God of Thunder #1-25, Thor (2014) #1-8, Thor Annual #1",
        "issue_count": 35,
        "print_status": "in_print",
        "importance": "essential",
        "era_slug": "hickman-saga",
        "synopsis": "Jason Aaron's epic Thor saga begins. Gorr the God Butcher — a being who has murdered gods across millennia — hunts Thor across three timelines: young Viking Thor, present-day Avenger Thor, and ancient King Thor. Jane Foster is diagnosed with cancer and eventually lifts Mjolnir to become the Mighty Thor. The God Butcher, Godbomb, and The Goddess of Thunder arcs.",
        "connection_notes": "Leads to: Thor by Aaron Omnibus Vol. 2 (Mighty Thor). Parallel: Hickman's Avengers. Part of Aaron's complete Thor epic concluding in War of the Realms.",
        "creators": [
            {"name": "Jason Aaron", "role": "writer"},
            {"name": "Esad Ribic", "role": "artist"},
            {"name": "Russell Dauterman", "role": "artist"}
        ]
    },
    {
        "slug": "thor-aaron-omnibus-v2",
        "title": "Thor by Jason Aaron Omnibus Vol. 2",
        "format": "omnibus",
        "issues_collected": "Mighty Thor #1-23, Mighty Thor: At the Gates of Valhalla #1, Unworthy Thor #1-5",
        "issue_count": 30,
        "print_status": "in_print",
        "importance": "essential",
        "era_slug": "all-new-all-different",
        "synopsis": "Jane Foster IS Thor. Despite her cancer worsening every time she transforms, Jane continues to fight as the Goddess of Thunder. Malekith's War of the Realms builds. The Unworthy Thor — Odinson without Mjolnir — seeks redemption. The Mangog attacks Asgard. Jane makes the ultimate sacrifice.",
        "connection_notes": "Prerequisite: Thor by Aaron Omnibus Vol. 1. Leads to: War of the Realms. The conclusion of the Jane Foster Thor era.",
        "creators": [
            {"name": "Jason Aaron", "role": "writer"},
            {"name": "Russell Dauterman", "role": "artist"},
            {"name": "Olivier Coipel", "role": "artist"}
        ]
    },
]


def supabase_request(method, path, body=None, extra_headers=None):
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        print(f"  HTTP {e.code}: {err_body[:300]}")
        return None


def main():
    print("=" * 60)
    print("COLLECTION FIX — Correcting mismatched editions")
    print("=" * 60)

    # ── Step 1: Get era slug→id map ─────────────────────────────
    print("\n[1] Fetching eras...")
    eras = supabase_request("GET", "eras?select=id,slug")
    era_map = {e["slug"]: e["id"] for e in eras} if eras else {}
    print(f"    Eras: {len(era_map)}")

    # ── Step 2: Add missing editions to DB ──────────────────────
    print("\n[2] Adding missing editions to database...")
    for new_ed in NEW_EDITIONS:
        # Check if already exists
        existing = supabase_request(
            "GET", f"collected_editions?slug=eq.{new_ed['slug']}&select=id"
        )
        if existing and len(existing) > 0:
            print(f"    Already exists: {new_ed['title']}")
            continue

        era_id = era_map.get(new_ed.get("era_slug"))
        row = {
            "slug": new_ed["slug"],
            "title": new_ed["title"],
            "format": new_ed["format"],
            "issues_collected": new_ed.get("issues_collected", ""),
            "issue_count": new_ed.get("issue_count"),
            "print_status": new_ed.get("print_status", "in_print"),
            "importance": new_ed.get("importance", "recommended"),
            "era_id": era_id,
            "synopsis": new_ed.get("synopsis", ""),
            "connection_notes": new_ed.get("connection_notes", ""),
        }
        result = supabase_request("POST", "collected_editions", row)
        if result:
            print(f"    ✓ Added: {new_ed['title']}")
        else:
            print(f"    ✗ Failed: {new_ed['title']}")
        time.sleep(0.5)

    # ── Step 3: Get all edition slug→id from DB ─────────────────
    print("\n[3] Fetching all editions from DB...")
    all_editions = []
    offset = 0
    while True:
        batch = supabase_request(
            "GET",
            f"collected_editions?select=id,slug&order=slug.asc&offset={offset}&limit=1000"
        )
        if not batch:
            break
        all_editions.extend(batch)
        if len(batch) < 1000:
            break
        offset += 1000
    slug_to_id = {e["slug"]: e["id"] for e in all_editions}
    print(f"    Total editions: {len(slug_to_id)}")

    # ── Step 4: Clear existing collection for this user ─────────
    print("\n[4] Clearing existing collection entries...")
    result = supabase_request(
        "DELETE",
        f"user_collections?user_id=eq.{USER_ID}",
    )
    print("    Cleared.")

    # ── Step 5: Insert corrected collection ─────────────────────
    print("\n[5] Inserting corrected collection...")

    # Add the new edition slugs
    collection_slugs = COLLECTION_SLUGS + [
        "miles-morales-spider-man-omnibus-v1",
        "life-and-death-of-captain-marvel",
        "secret-invasion-omnibus",
        "thor-aaron-omnibus-v1",
        "thor-aaron-omnibus-v2",
    ]

    # Deduplicate
    seen = set()
    unique_slugs = []
    for s in collection_slugs:
        if s not in seen:
            seen.add(s)
            unique_slugs.append(s)

    inserted = 0
    not_found = []
    for slug in unique_slugs:
        ed_id = slug_to_id.get(slug)
        if not ed_id:
            not_found.append(slug)
            continue

        result = supabase_request("POST", "user_collections", {
            "user_id": USER_ID,
            "edition_id": ed_id,
            "status": "owned",
        })
        if result:
            inserted += 1
        else:
            print(f"    ✗ Failed to insert: {slug}")
        time.sleep(0.1)

    # ── Step 6: Summary ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("COLLECTION FIX COMPLETE")
    print("=" * 60)
    print(f"  Unique slugs:     {len(unique_slugs)}")
    print(f"  Inserted:         {inserted}")
    print(f"  Not found in DB:  {len(not_found)}")
    if not_found:
        print(f"\n  ⚠ SLUGS NOT FOUND:")
        for s in not_found:
            print(f"    - {s}")


if __name__ == "__main__":
    main()

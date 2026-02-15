#!/usr/bin/env python3
"""
Sync Daniel's personal comic collection to the user_collections table.
Uses the service role key to bypass RLS and look up the user by email.
"""

import json
import os
import sys
import urllib.request
import urllib.parse

# ── Config ──────────────────────────────────────────────────────────
SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
USER_EMAIL = "danyelamps.db@gmail.com"

# ── My Collection (title as listed → best-match search terms) ───────
# Each entry: (display_title, [search_keywords])
MY_COLLECTION = [
    # ── Spider-Man ──
    ("Amazing Spider-Man Epic Collection: Kraven's Last Hunt [New Printing]", ["kraven", "last hunt", "epic"]),
    ("Ultimate Spider-Man Omnibus Vol. 1 [New Printing]", ["ultimate spider-man omnibus vol. 1"]),
    ("Spider-Man By Roger Stern Omnibus [New Printing]", ["roger stern"]),
    ("Spider-Verse/Spider-Geddon Omnibus", ["spider-verse", "spider-geddon"]),
    ("Amazing Spider-Man Omnibus 1", ["amazing spider-man omnibus vol. 1"]),
    ("Spider-Man: Death of the Stacys", ["death of the stacys"]),
    ("Miles Morales: Spider-Man Omnibus Vol. 1", ["miles morales", "omnibus vol. 1"]),
    ("Spider-Man/Deadpool Modern Era Epic Collection: Isn't It Bromantic", ["spider-man/deadpool", "bromantic"]),
    ("Spider-Gwen: Ghost-Spider Modern Era Epic Collection: Edge of Spider-Verse", ["spider-gwen", "ghost-spider"]),
    ("Ultimate Spider-Man By Jonathan Hickman Vol. 1: Married With Children", ["ultimate spider-man", "hickman", "vol. 1", "married"]),
    ("Ultimate Spider-Man By Jonathan Hickman Vol. 2: The Paper", ["ultimate spider-man", "hickman", "vol. 2", "paper"]),

    # ── X-Men ──
    ("X-Men: Dark Phoenix Saga [New Printing 2]", ["dark phoenix saga"]),
    ("X-Men: God Loves, Man Kills [New Printing]", ["god loves", "man kills"]),
    ("House Of X/Powers Of X", ["house of x", "powers of x"]),
    ("Fall Of The House Of X/Rise Of The Powers Of X", ["fall of the house of x", "rise of the powers"]),
    ("House Of M Ultimate Edition", ["house of m"]),
    ("New X-Men Omnibus [New Printing 3]", ["new x-men omnibus", "morrison"]),
    ("The Uncanny X-Men Omnibus Vol. 1", ["uncanny x-men omnibus vol. 1"]),
    ("The Uncanny X-Men Omnibus Vol. 2", ["uncanny x-men omnibus vol. 2"]),
    ("The Uncanny X-Men Omnibus Vol. 3 [New Printing]", ["uncanny x-men omnibus vol. 3"]),
    ("Astonishing X-Men By Whedon & Cassaday Omnibus [New Printing]", ["astonishing x-men", "whedon"]),
    ("X-Men The Age of Apocalypse Omnibus", ["age of apocalypse omnibus"]),
    ("X-Men Epic Collection: Second Genesis [New Printing]", ["second genesis", "epic"]),
    ("Uncanny X-Force By Rick Remender Omnibus", ["uncanny x-force", "remender"]),
    ("All-New X-Men By Brian Michael Bendis Omnibus", ["all-new x-men", "bendis"]),
    ("X-Men: Mutant Massacre Omnibus [New Printing]", ["mutant massacre omnibus"]),
    ("X-Men: Mutant Massacre Prelude Omnibus", ["mutant massacre prelude"]),
    ("All-New Wolverine Omnibus By Tom Taylor", ["all-new wolverine", "tom taylor"]),
    ("X-Men/Avengers Onslaught Omnibus", ["onslaught omnibus"]),
    ("House of M Omnibus Bendis", ["house of m omnibus"]),
    ("Avengers Vs. X-Men [New Printing]", ["avengers vs. x-men"]),
    ("Inferno", ["inferno"]),

    # ── Avengers ──
    ("Avengers By Jonathan Hickman Omnibus Vol. 1 [New Printing]", ["avengers", "hickman", "omnibus vol. 1"]),
    ("Avengers By Jonathan Hickman Omnibus Vol. 2 [New Printing]", ["avengers", "hickman", "omnibus vol. 2"]),
    ("Avengers By Busiek & Perez Omnibus Vol. 1 [New Printing]", ["avengers", "busiek", "perez", "vol. 1"]),
    ("Avengers By Busiek & Perez Omnibus Vol. 2", ["avengers", "busiek", "perez", "vol. 2"]),
    ("New Avengers Omnibus Vol. 1", ["new avengers omnibus vol. 1"]),
    ("Avengers Disassembled", ["avengers disassembled"]),
    ("Avengers: The Kree-Skrull War", ["kree-skrull war"]),
    ("Avengers: The Kang Dynasty Omnibus", ["kang dynasty"]),
    ("Avengers Epic Collection: Under Siege", ["under siege"]),
    ("New Avengers: Illuminati", ["illuminati"]),

    # ── Fantastic Four ──
    ("Fantastic Four Epic Collection: The Coming Of Galactus [New Printing 2]", ["coming of galactus", "epic"]),
    ("Fantastic Four By Jonathan Hickman: The Complete Collection Vol. 1", ["fantastic four", "hickman", "complete collection vol. 1"]),
    ("Fantastic Four By Jonathan Hickman Omnibus Vol. 1 [New Printing]", ["fantastic four", "hickman", "omnibus vol. 1"]),
    ("Fantastic Four By Waid & Wieringo Omnibus", ["waid", "wieringo"]),
    ("The Fantastic Four Omnibus 2", ["fantastic four omnibus vol. 2"]),
    ("The Fantastic Four Omnibus Vol. 1", ["fantastic four omnibus vol. 1"]),
    ("Fantastic Four By Jonathan Hickman: The Complete Collection Vol. 3", ["fantastic four", "hickman", "complete collection vol. 3"]),
    ("Fantastic Four By Jonathan Hickman: The Complete Collection Vol. 4", ["fantastic four", "hickman", "complete collection vol. 4"]),
    ("Fantastic Four: Solve Everything [Marvel Premier Collection]", ["solve everything"]),
    ("Ultimate Fantastic Four Omnibus Vol. 1", ["ultimate fantastic four"]),

    # ── Deadpool ──
    ("Deadpool: Bad Blood", ["deadpool", "bad blood"]),
    ("Deadpool: Badder Blood", ["deadpool", "badder blood"]),
    ("Deadpool Kills the Marvel Universe", ["deadpool kills"]),
    ("Deadpool by Posehn & Duggan Omnibus", ["deadpool", "posehn", "duggan"]),
    ("Deadpool Beginnings", ["deadpool beginnings"]),
    ("Deadpool & Cable Omnibus [New Printing]", ["deadpool", "cable omnibus"]),
    ("Deadpool Epic Collection: Mission Improbable", ["deadpool", "mission improbable"]),
    ("Gwenpool Omnibus", ["gwenpool omnibus"]),

    # ── Daredevil ──
    ("Daredevil: Born Again", ["daredevil", "born again"]),
    ("Daredevil: The Man Without Fear", ["man without fear"]),
    ("Daredevil Epic Collection: A Touch Of Typhoid [New Printing]", ["touch of typhoid"]),
    ("Daredevil By Bendis & Maleev Omnibus Vol. 1", ["daredevil", "bendis", "maleev", "vol. 1"]),
    ("Daredevil By Bendis & Maleev Omnibus Vol. 2", ["daredevil", "bendis", "maleev", "vol. 2"]),
    ("Daredevil By Frank Miller Omnibus Companion [New Printing 2]", ["daredevil", "frank miller", "companion"]),
    ("Daredevil: Shadowland Omnibus", ["shadowland"]),
    ("Daredevil By Chip Zdarsky Omnibus Vol. 1", ["daredevil", "zdarsky", "vol. 1"]),
    ("Daredevil By Chip Zdarsky Omnibus Vol. 2", ["daredevil", "zdarsky", "vol. 2"]),

    # ── Moon Knight ──
    ("Moon Knight By Lemire & Smallwood: The Complete Collection", ["moon knight", "lemire"]),
    ("Moon Knight Epic Collection: Shadows Of The Moon [New Printing]", ["moon knight", "shadows of the moon"]),
    ("Moon Knight By Jed MacKay Omnibus", ["moon knight", "mackay"]),

    # ── Hulk ──
    ("Hulk: Planet Hulk Omnibus [New Printing]", ["planet hulk"]),
    ("Hulk: World War Hulk Omnibus [New Printing]", ["world war hulk"]),
    ("Immortal Hulk Omnibus", ["immortal hulk"]),

    # ── Thor ──
    ("Thor By Walter Simonson Omnibus", ["thor", "simonson", "omnibus"]),
    ("The Mighty Thor by Walter Simonson 1", ["mighty thor", "simonson"]),
    ("Thor By Jason Aaron Omnibus Vol. 1", ["thor", "jason aaron", "vol. 1"]),
    ("Thor By Jason Aaron Omnibus Vol. 2", ["thor", "jason aaron", "vol. 2"]),
    ("Thor By Cates & Klein Omnibus", ["thor", "cates", "klein"]),

    # ── Captain America ──
    ("Captain America: Return Of The Winter Soldier Omnibus [New Printing]", ["return of the winter soldier"]),
    ("Captain America Omnibus Vol. 1", ["captain america omnibus vol. 1"]),
    ("Captain America Epic Collection: Dawn's Early Light", ["dawn's early light"]),
    ("Captain America: The Winter Soldier [Marvel Premier Collection]", ["winter soldier", "premier"]),

    # ── Black Panther ──
    ("Black Panther By Reginald Hudlin Omnibus", ["black panther", "hudlin"]),
    ("Black Panther: A Nation Under Our Feet", ["nation under our feet"]),

    # ── Hawkeye ──
    ("Hawkeye By Fraction & Aja Omnibus [New Printing]", ["hawkeye", "fraction"]),

    # ── Ms. Marvel ──
    ("Ms. Marvel Omnibus: Volume 1", ["ms. marvel omnibus"]),

    # ── Sentry ──
    ("The Sentry [New Printing 2]", ["sentry"]),

    # ── Iron Fist ──
    ("Immortal Iron Fist & The Immortal Weapons Omnibus", ["immortal iron fist"]),

    # ── Iron Man ──
    ("Iron Man: Demon in a Bottle", ["demon in a bottle"]),
    ("Invincible Iron Man Vol. 1: The Five Nightmares", ["five nightmares"]),
    ("Invincible Iron Man Vol. 2: World's Most Wanted Book 1", ["world's most wanted"]),
    ("Superior Iron Man 1: Infamous", ["superior iron man", "infamous"]),
    ("Superior Iron Man 2: Stark Contrast", ["superior iron man", "stark contrast"]),

    # ── Captain Marvel ──
    ("The Life and Death of Captain Marvel", ["life and death of captain marvel"]),

    # ── Cosmic Events ──
    ("Infinity Gauntlet", ["infinity gauntlet"]),
    ("Silver Surfer Epic Collection: Thanos Quest", ["thanos quest"]),
    ("Secret Wars", ["secret wars 1984"]),
    ("Secret Wars By Jonathan Hickman Omnibus", ["secret wars", "hickman", "omnibus"]),
    ("Secret Wars: Battleworld Omnibus Vol. 1", ["battleworld"]),
    ("Secret Wars II [New Printing]", ["secret wars ii"]),
    ("Infinity", ["infinity", "hickman"]),
    ("Infinity War", ["infinity war"]),
    ("Infinity Crusade Vol. 1", ["infinity crusade", "vol. 1"]),
    ("Infinity Crusade Vol. 2", ["infinity crusade", "vol. 2"]),
    ("Annihilation: Conquest Omnibus", ["annihilation conquest"]),
    ("Annihilation Omnibus [New Printing 3]", ["annihilation omnibus"]),
    ("King In Black Omnibus", ["king in black"]),
    ("Silver Surfer: Rebirth of Thanos [New Printing]", ["rebirth of thanos"]),
    ("Silver Surfer - Requiem", ["silver surfer requiem"]),

    # ── Marvel Events ──
    ("Civil War", ["civil war"]),
    ("Civil War II", ["civil war ii"]),
    ("Siege", ["siege"]),
    ("War Of The Realms Omnibus [New Printing]", ["war of the realms"]),
    ("Secret Invasion", ["secret invasion"]),
    ("Secret Invasion Omnibus", ["secret invasion omnibus"]),
    ("Original Sin", ["original sin"]),
    ("Dark Ages", ["dark ages"]),
    ("Blood Hunt", ["blood hunt"]),
    ("Devil's Reign Omnibus", ["devil's reign"]),
    ("Judgment Day Omnibus", ["judgment day"]),
    ("Fear Itself", ["fear itself"]),
    ("Age of Ultron (Hardcover)", ["age of ultron"]),

    # ── Heroes Reborn ──
    ("Heroes Reborn: America's Mightiest Heroes Omnibus", ["heroes reborn", "america's mightiest"]),
    ("Heroes Reborn Omnibus (2019)", ["heroes reborn omnibus"]),
    ("Heroes Reborn The Return Omnibus", ["heroes reborn", "return"]),

    # ── Ultimate Universe ──
    ("Ultimate Invasion", ["ultimate invasion"]),
    ("Ultimate Marvel By Jonathan Hickman Omnibus", ["ultimate marvel", "hickman"]),
    ("Ultimatum Premium Hardcover", ["ultimatum"]),
    ("Ultimates By Millar & Hitch Omnibus [New Printing 2]", ["ultimates", "millar", "hitch"]),
    ("Ultimates By Deniz Camp Vol. 1: Fix The World", ["ultimates", "deniz camp"]),
    ("Ultimate Comics Doomsday", ["ultimate comics doomsday"]),

    # ── Punisher ──
    ("Punisher Max By Garth Ennis Omnibus Vol. 1", ["punisher max", "ennis"]),
    ("Punisher By Rick Remender Omnibus", ["punisher", "remender"]),
    ("Punisher: Welcome Back, Frank [New Printing 2]", ["welcome back", "frank"]),

    # ── Venom ──
    ("Venom/Venomnibus By Cates & Stegman", ["venom", "cates", "stegman"]),

    # ── Doctor Strange ──
    ("Doctor Strange: Master Of The Mystic Arts Omnibus Vol. 1", ["master of the mystic arts"]),

    # ── Doctor Doom ──
    ("Doctor Doom: Books Of Doom", ["books of doom"]),

    # ── Ghost Rider ──
    ("Ghost Rider: Danny Ketch Omnibus Vol. 1", ["ghost rider", "danny ketch"]),
    ("Ghost Rider By Jason Aaron Omnibus [New Printing]", ["ghost rider", "jason aaron"]),
    ("Cosmic Ghost Rider By Donny Cates", ["cosmic ghost rider"]),

    # ── Wolverine ──
    ("Wolverine By Jason Aaron Omnibus Vol. 1", ["wolverine", "jason aaron"]),
    ("Wolverine by Claremont & Miller", ["wolverine", "claremont", "miller"]),
    ("Wolverine: Weapon X [New Printing 2]", ["wolverine", "weapon x"]),

    # ── Elektra ──
    ("Elektra: Assassin", ["elektra", "assassin"]),

    # ── Guardians ──
    ("Guardians Of The Galaxy By Brian Michael Bendis Omnibus Vol. 1", ["guardians", "bendis"]),
    ("Guardians Of The Galaxy By Donny Cates", ["guardians", "donny cates"]),

    # ── Other ──
    ("Squadron Supreme", ["squadron supreme"]),
    ("Eternals By Kieron Gillen", ["eternals", "gillen"]),
    ("Inhumans", ["inhumans"]),
    ("Kang The Conqueror: Only Myself Left To Conquer", ["kang", "conqueror", "only myself"]),
    ("Kang: The Saga Of The Once And Future Conqueror", ["kang", "saga", "once and future"]),
    ("Secret Warriors Omnibus [New Printing]", ["secret warriors"]),
    ("Thanos Wins By Donny Cates", ["thanos wins"]),
    ("Thanos Vol. 2: The God Quarry", ["god quarry"]),
    ("Thunderbolts Ultimate Collection", ["thunderbolts ultimate"]),
    ("Dark Avengers Modern Era Epic Collection: Osborn's Reign", ["dark avengers", "osborn"]),
    ("Marvels: The Remastered Edition", ["marvels"]),
    ("History Of The Marvel Universe", ["history of the marvel universe"]),
]


def supabase_request(method, path, body=None, extra_headers=None):
    """Make a request to the Supabase REST API using the service role key."""
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


def supabase_admin_request(method, path, body=None):
    """Make a request to Supabase Admin API (auth endpoints)."""
    url = f"{SUPABASE_URL}/auth/v1/{path}"
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method, headers=headers)

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8") if e.fp else ""
        print(f"  Auth HTTP {e.code}: {err_body[:300]}")
        return None


def normalize(text):
    """Normalize a title for fuzzy matching."""
    return (
        text.lower()
        .replace("[new printing]", "")
        .replace("[new printing 2]", "")
        .replace("[new printing 3]", "")
        .replace("(new printing)", "")
        .replace("(hardcover)", "")
        .replace("(marvel premiere classic)", "")
        .replace("[marvel premier collection]", "")
        .replace("marvel premier collection", "")
        .replace("the ", "")
        .replace(":", "")
        .replace("-", " ")
        .replace("&", "and")
        .replace(",", "")
        .replace("'", "")
        .replace("'", "")
        .replace(".", "")
        .replace("(", "")
        .replace(")", "")
        .strip()
    )


def score_match(edition_title, search_keywords):
    """Score how well an edition title matches the search keywords."""
    norm_title = normalize(edition_title)
    score = 0
    for kw in search_keywords:
        kw_norm = normalize(kw)
        if kw_norm in norm_title:
            score += len(kw_norm)  # longer keyword matches = higher score
    return score


def main():
    print("=" * 60)
    print("MARVEL CARTOGRAPHER — Collection Sync")
    print(f"User: {USER_EMAIL}")
    print("=" * 60)

    # ── Step 1: Find or create the user ─────────────────────────
    print("\n[1] Looking up user by email...")
    users_resp = supabase_admin_request(
        "GET", f"admin/users?page=1&per_page=50"
    )

    user_id = None
    if users_resp and "users" in users_resp:
        for u in users_resp["users"]:
            if u.get("email") == USER_EMAIL:
                user_id = u["id"]
                print(f"    Found user: {user_id}")
                break

    if not user_id:
        print(f"    User not found. Creating account for {USER_EMAIL}...")
        create_resp = supabase_admin_request("POST", "admin/users", {
            "email": USER_EMAIL,
            "email_confirm": True,
            "user_metadata": {"display_name": "Daniel"},
        })
        if create_resp and "id" in create_resp:
            user_id = create_resp["id"]
            print(f"    Created user: {user_id}")
        else:
            print("    ERROR: Could not create user. Exiting.")
            sys.exit(1)

    # ── Step 2: Fetch all editions from DB ──────────────────────
    print("\n[2] Fetching all collected editions from Supabase...")
    all_editions = []
    offset = 0
    limit = 1000
    while True:
        batch = supabase_request(
            "GET",
            f"collected_editions?select=id,slug,title&order=title.asc&offset={offset}&limit={limit}"
        )
        if not batch:
            break
        all_editions.extend(batch)
        if len(batch) < limit:
            break
        offset += limit

    print(f"    Total editions in DB: {len(all_editions)}")

    # ── Step 3: Fetch existing collection entries ───────────────
    print("\n[3] Fetching existing collection entries...")
    existing = supabase_request(
        "GET",
        f"user_collections?user_id=eq.{user_id}&select=edition_id"
    )
    existing_edition_ids = set()
    if existing:
        existing_edition_ids = {e["edition_id"] for e in existing}
    print(f"    Already in collection: {len(existing_edition_ids)}")

    # ── Step 4: Match collection items to DB editions ───────────
    print("\n[4] Matching collection items to database editions...")

    matched = []
    unmatched = []

    for display_title, keywords in MY_COLLECTION:
        best_score = 0
        best_edition = None

        for ed in all_editions:
            s = score_match(ed["title"], keywords)
            if s > best_score:
                best_score = s
                best_edition = ed

        if best_edition and best_score > 0:
            matched.append((display_title, best_edition, best_score))
        else:
            unmatched.append(display_title)

    print(f"    Matched: {len(matched)}")
    print(f"    Unmatched: {len(unmatched)}")

    if unmatched:
        print("\n    ⚠ UNMATCHED TITLES:")
        for t in unmatched:
            print(f"      - {t}")

    # ── Step 5: Insert into user_collections ────────────────────
    print("\n[5] Inserting collection entries...")

    inserted = 0
    skipped = 0
    failed = 0

    for display_title, edition, score in matched:
        if edition["id"] in existing_edition_ids:
            skipped += 1
            continue

        result = supabase_request("POST", "user_collections", {
            "user_id": user_id,
            "edition_id": edition["id"],
            "status": "owned",
            "notes": f"Imported from personal collection list",
        })

        if result:
            inserted += 1
            existing_edition_ids.add(edition["id"])
            print(f"    ✓ {display_title}")
            print(f"      → {edition['title']} ({edition['slug']})")
        else:
            failed += 1
            print(f"    ✗ FAILED: {display_title} → {edition['title']}")

    # ── Step 6: Summary ─────────────────────────────────────────
    print("\n" + "=" * 60)
    print("COLLECTION SYNC COMPLETE")
    print("=" * 60)
    print(f"  Total in your list: {len(MY_COLLECTION)}")
    print(f"  Matched to DB:      {len(matched)}")
    print(f"  Newly inserted:     {inserted}")
    print(f"  Already existed:    {skipped}")
    print(f"  Failed:             {failed}")
    print(f"  Unmatched:          {len(unmatched)}")
    print(f"\n  Total in collection: {len(existing_edition_ids)}")

    # ── Step 7: Show matched editions for verification ──────────
    print("\n" + "=" * 60)
    print("MATCH DETAILS (verify these are correct)")
    print("=" * 60)
    for display_title, edition, score in sorted(matched, key=lambda x: x[0]):
        marker = "  " if edition["id"] in existing_edition_ids else "NEW"
        print(f"  [{marker}] {display_title}")
        print(f"       → {edition['title']} (score: {score})")


if __name__ == "__main__":
    main()

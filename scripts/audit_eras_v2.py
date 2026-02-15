#!/usr/bin/env python3
"""
Comprehensive era assignment audit v2 for Marvel Cartographer.
Improved: better pattern matching, handles Epic Collections by series+issue era,
fixes false positives from v1.
"""

import json
import os
import re
import sys
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}

ERAS = [
    {"id": "eb1a7d39-e8d3-41f1-9ec2-74e2ec3d3be6", "slug": "birth-of-marvel", "number": 1, "year_start": 1961, "year_end": 1966},
    {"id": "a9fe2453-0328-4e72-88ac-01d5cbdef337", "slug": "the-expansion", "number": 2, "year_start": 1966, "year_end": 1970},
    {"id": "70d862f6-720f-46f0-ac11-b3171abd44c6", "slug": "bronze-age", "number": 3, "year_start": 1970, "year_end": 1980},
    {"id": "49fd3e6f-0cd3-48f5-abbe-7c90e59acfa6", "slug": "rise-of-x-men", "number": 4, "year_start": 1975, "year_end": 1985},
    {"id": "93f0e7e8-0cc2-4f06-9090-6ad14520bece", "slug": "event-age", "number": 5, "year_start": 1985, "year_end": 1992},
    {"id": "f9559f37-f08a-4eec-a19d-8d63123d19d3", "slug": "speculation-crash", "number": 6, "year_start": 1992, "year_end": 1996},
    {"id": "2b73f22c-6333-4928-97ba-78477e5acffe", "slug": "heroes-reborn-return", "number": 7, "year_start": 1996, "year_end": 1998},
    {"id": "f8924169-4590-4ef4-88e4-c9713a1540ab", "slug": "marvel-knights-ultimate", "number": 8, "year_start": 1998, "year_end": 2004},
    {"id": "dfdb0620-290e-42c7-876a-cf3fec5001b3", "slug": "bendis-avengers", "number": 9, "year_start": 2004, "year_end": 2012},
    {"id": "fe75c870-3888-4405-9c8a-1f0341f19339", "slug": "hickman-saga", "number": 10, "year_start": 2009, "year_end": 2016},
    {"id": "e8879226-9a97-4fdb-a2d8-484a3579385d", "slug": "all-new-all-different", "number": 11, "year_start": 2015, "year_end": 2018},
    {"id": "ef8c9832-e06d-4028-ae89-a2bb5eb13e1c", "slug": "dawn-of-krakoa", "number": 12, "year_start": 2019, "year_end": 2024},
    {"id": "93f854fe-cd0a-4070-9a30-1f671374200e", "slug": "blood-hunt-doom", "number": 13, "year_start": 2024, "year_end": 2025},
    {"id": "c4bffdc6-c943-432e-9b61-6b51387076bb", "slug": "current-ongoings", "number": 14, "year_start": 2025, "year_end": 2026},
]

ERA_BY_ID = {e["id"]: e for e in ERAS}
ERA_BY_SLUG = {e["slug"]: e for e in ERAS}


def supabase_get(path):
    all_data = []
    offset = 0
    page_size = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/{path}"
        sep = "&" if "?" in url else "?"
        url += f"{sep}offset={offset}&limit={page_size}"
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode())
        if not data:
            break
        all_data.extend(data)
        if len(data) < page_size:
            break
        offset += page_size
    return all_data


# ============================================================
# EXPLICIT SLUG -> ERA MAPPING (highest priority, manually verified)
# For editions where automatic detection fails or is ambiguous.
# ============================================================

EXPLICIT_ERA_MAP = {
    # Infinity trilogy — all event-age (1991-1993)
    "infinity-gauntlet-omnibus": "event-age",
    "infinity-war-omnibus": "event-age",
    "infinity-crusade-omnibus": "event-age",
    "infinity-war-crusade": "event-age",
    "infinity-war-crusade-omnibus": "event-age",

    # Infinity by Hickman (2013) — hickman-saga
    "infinity": "hickman-saga",
    "infinity-by-hickman": "hickman-saga",

    # Infinity Wars by Duggan (2018) — all-new-all-different
    "infinity-wars-by-gerry-duggan": "all-new-all-different",
    "infinity-wars-duggan": "all-new-all-different",

    # Infamous Iron Man (2016-2018) — all-new-all-different
    "infamous-iron-man": "all-new-all-different",

    # Ms. Marvel by Wilson started 2014 but bulk is ANAD era
    "ms-marvel-by-g-willow-wilson": "all-new-all-different",
    "ms-marvel-omnibus-v1-kamala-khan": "all-new-all-different",

    # Secret Wars (1984) — rise-of-x-men
    "secret-wars-1984-omnibus": "rise-of-x-men",
    "secret-wars-1984": "rise-of-x-men",

    # Secret Wars II (1985) — event-age
    "secret-wars-ii": "event-age",

    # Secret Wars (2015) — hickman-saga
    "secret-wars-2015-omnibus": "hickman-saga",
    "secret-wars-battleworld-v1": "hickman-saga",

    # Captain America: White (published 2015, set in WWII, Loeb/Sale)
    "captain-america-white": "hickman-saga",

    # Original Sin (2014) — hickman-saga
    "original-sin": "hickman-saga",
    "original-sin-companion": "hickman-saga",

    # Death of Wolverine (2014) — hickman-saga
    "death-of-wolverine-complete": "hickman-saga",
    "death-of-wolverine": "hickman-saga",

    # Spider-Verse (2014) — hickman-saga
    "spider-verse": "hickman-saga",
    "spider-verse-spider-geddon": "all-new-all-different",

    # Marvels (1994) — speculation-crash
    "marvels": "speculation-crash",
    "marvels-eye-of-the-camera": "bendis-avengers",

    # ASM Omnibus Vol 2 — expansion era (issues 39-67ish, 1966-1969)
    "asm-omnibus-v2": "the-expansion",

    # Phoenix by Stephanie Phillips (2024) — blood-hunt-doom (From the Ashes)
    "phoenix-2024": "blood-hunt-doom",

    # Forge (2024) — blood-hunt-doom
    "forge-2024": "blood-hunt-doom",

    # NYX (2024) — blood-hunt-doom
    "nyx-2024": "blood-hunt-doom",

    # Timeless by Jed MacKay — dawn-of-krakoa
    "timeless-jed-mackay": "dawn-of-krakoa",

    # Ultimate Invasion (2023) — dawn-of-krakoa era launch
    "ultimate-invasion": "dawn-of-krakoa",

    # Ultimate Universe by Hickman Omnibus — current-ongoings
    "ultimate-universe-hickman-omnibus": "current-ongoings",
    "ultimate-universe-hickman-omnibus-v2": "current-ongoings",

    # Amazing Spider-Man by Zeb Wells (started 2022) — dawn-of-krakoa
    "amazing-spider-man-by-zeb-wells": "dawn-of-krakoa",
    "amazing-spider-man-by-zeb-wells-v2": "dawn-of-krakoa",
    "amazing-spider-man-by-zeb-wells-v3": "dawn-of-krakoa",
    "amazing-spider-man-by-zeb-wells-v4": "dawn-of-krakoa",
    "asm-gang-war": "dawn-of-krakoa",
    "gold-goblin": "dawn-of-krakoa",
    "dark-web": "dawn-of-krakoa",
    "spider-boy-dan-slott": "dawn-of-krakoa",
    "spine-tingling-spider-man": "dawn-of-krakoa",
    "spider-man-shadow-green-goblin": "dawn-of-krakoa",

    # Carnage by Ram V (2023) — dawn-of-krakoa
    "carnage-by-ram-v-2023": "dawn-of-krakoa",
    "carnage-ram-v": "dawn-of-krakoa",

    # Doctor Strange by Jed MacKay (2023) — dawn-of-krakoa
    "doctor-strange-jed-mackay-2023": "dawn-of-krakoa",

    # Ghost Rider by Benjamin Percy (2022) — dawn-of-krakoa
    "ghost-rider-benjamin-percy": "dawn-of-krakoa",
    "ghost-rider-percy-2022": "dawn-of-krakoa",

    # Punisher by Jason Aaron (2022) — dawn-of-krakoa
    "punisher-by-jason-aaron-2022": "dawn-of-krakoa",
    "punisher-jason-aaron": "dawn-of-krakoa",

    # Scarlet Witch by Orlando Vol. 2 (2023) — dawn-of-krakoa
    "scarlet-witch-orlando-v2": "dawn-of-krakoa",

    # Miles Morales by Ziglar (started 2022) — dawn-of-krakoa
    "miles-morales-spider-man-by-cody-ziglar": "dawn-of-krakoa",

    # Predator titles (2023-2024)
    "predator-vs-wolverine": "dawn-of-krakoa",
    "predator-the-last-hunt": "dawn-of-krakoa",

    # Wolverine: Blood Hunt — blood-hunt-doom
    "wolverine-blood-hunt": "blood-hunt-doom",

    # Thor by Gronbekk — dawn-of-krakoa
    "thor-gronbekk": "dawn-of-krakoa",

    # Luke Cage by David Walker (2016-2017) — all-new-all-different
    "luke-cage-by-david-walker": "all-new-all-different",
    "luke-cage-david-walker": "all-new-all-different",

    # Bucky Barnes: Winter Soldier (2014-2015) — hickman-saga
    "bucky-barnes-the-winter-soldier": "hickman-saga",

    # Avengers: Rage of Ultron (2015) — hickman-saga
    "avengers-rage-of-ultron": "hickman-saga",

    # Doctor Strange: Infinity War EC — event-age
    "doctor-strange-ec-infinity-war": "event-age",

    # Daredevil: Born Again — rise-of-x-men (1986)
    "daredevil-born-again": "rise-of-x-men",

    # Gambit Classic Omnibus — speculation-crash (1990s)
    "gambit-omnibus": "speculation-crash",
    "gambit-classic-omnibus": "speculation-crash",

    # X-Factor Original Vol. 1 — event-age (1986-1989)
    "x-factor-original-omnibus": "event-age",

    # Daredevil by Ann Nocenti — event-age (1986-1991)
    "daredevil-nocenti-omnibus": "event-age",

    # Captain America by Gruenwald — event-age (started 1985)
    "captain-america-gruenwald-omnibus-v1": "event-age",

    # West Coast Avengers Vol. 2 — event-age (1987-1989)
    "west-coast-avengers-omnibus-v2": "event-age",

    # Silver Surfer Omnibus Vol. 3 — event-age (1987-1989)
    "silver-surfer-omnibus-v3": "event-age",

    # New Warriors Classic — event-age (1989-1993)
    "new-warriors-classic-omnibus-v1": "event-age",

    # Moon Knight Compendium — spans multiple eras, best in rise-of-x-men
    "moon-knight-compendium": "rise-of-x-men",

    # Cloak and Dagger — rise-of-x-men
    "cloak-and-dagger-omnibus": "rise-of-x-men",

    # ROM Spaceknight — rise-of-x-men
    "rom-spaceknight-omnibus-v1": "rise-of-x-men",

    # Uncanny X-Men Omnibus Vol 5 (Claremont) — event-age (1986-1988)
    "uxm-claremont-omnibus-v5": "event-age",

    # X-Men: Schism (2011) — hickman-saga
    "x-men-schism": "hickman-saga",

    # Scarlet Witch by Orlando (started 2023) vol 1 — dawn-of-krakoa
    "scarlet-witch-by-steve-orlando": "dawn-of-krakoa",

    # Immortal Thor by Ewing (started 2023) — dawn-of-krakoa
    "immortal-thor-ewing-v1": "dawn-of-krakoa",
    "immortal-thor-ewing-v2": "dawn-of-krakoa",

    # Avengers Inc by MacKay (2023) — dawn-of-krakoa
    "avengers-inc-jed-mackay": "dawn-of-krakoa",

    # Captain America: Symbol of Truth (2022) — dawn-of-krakoa
    "cap-symbol-of-truth": "dawn-of-krakoa",

    # Captain Marvel by Alyssa Wong (2023-2024) — dawn-of-krakoa
    "captain-marvel-alyssa-wong": "dawn-of-krakoa",

    # Daredevil: Gang War (2024) — dawn-of-krakoa
    "daredevil-gang-war": "dawn-of-krakoa",

    # Deadpool by Cody Ziglar (2024) — blood-hunt-doom
    "deadpool-cody-ziglar": "blood-hunt-doom",

    # Luke Cage: City of Fire (2023) — dawn-of-krakoa
    "luke-cage-city-of-fire": "dawn-of-krakoa",

    # Nova by Loveness (2024) — blood-hunt-doom
    "nova-loveness-2024": "blood-hunt-doom",

    # Wolverine: Revenge (2024) — blood-hunt-doom
    "wolverine-revenge": "blood-hunt-doom",

    # Venom War (2024) — blood-hunt-doom
    "venom-war": "blood-hunt-doom",

    # FF by Ryan North Vol 2-3 (2023-2024) — dawn-of-krakoa
    "ff-ryan-north-v2": "dawn-of-krakoa",
    "ff-ryan-north-v3": "dawn-of-krakoa",
    "fantastic-four-ryan-north-v2": "dawn-of-krakoa",
    "fantastic-four-ryan-north-v3": "dawn-of-krakoa",
    "fantastic-four-full-circle-ii": "dawn-of-krakoa",
}


# ============================================================
# SERIES ERA DATABASE: Map series name + issue ranges to eras
# This handles Epic Collections, Masterworks, Compendiums
# ============================================================

# Series publication year ranges (approximate)
SERIES_YEARS = {
    "fantastic four": [
        (1, 30, 1961, 1964, "birth-of-marvel"),
        (31, 60, 1964, 1966, "birth-of-marvel"),
        (61, 102, 1967, 1970, "the-expansion"),
        (103, 150, 1970, 1974, "bronze-age"),
        (151, 200, 1974, 1978, "bronze-age"),
        (201, 250, 1979, 1982, "rise-of-x-men"),
        (232, 293, 1981, 1986, "rise-of-x-men"),  # Byrne
        (294, 350, 1986, 1990, "event-age"),
        (351, 416, 1990, 1996, "event-age"),
    ],
    "amazing spider-man": [
        (1, 38, 1963, 1966, "birth-of-marvel"),
        (39, 67, 1966, 1968, "the-expansion"),
        (68, 100, 1969, 1971, "bronze-age"),
        (101, 150, 1971, 1975, "bronze-age"),
        (151, 200, 1976, 1980, "bronze-age"),
        (201, 252, 1980, 1984, "rise-of-x-men"),
        (253, 300, 1984, 1988, "event-age"),
        (301, 350, 1988, 1991, "event-age"),
        (351, 406, 1991, 1996, "speculation-crash"),
        (407, 441, 1996, 1998, "heroes-reborn-return"),
    ],
    "uncanny x-men": [
        (1, 66, 1963, 1970, "birth-of-marvel"),
        (94, 131, 1975, 1980, "rise-of-x-men"),
        (132, 175, 1980, 1983, "rise-of-x-men"),
        (176, 224, 1983, 1987, "rise-of-x-men"),
        (225, 280, 1987, 1991, "event-age"),
        (281, 330, 1991, 1996, "speculation-crash"),
    ],
    "avengers": [
        (1, 30, 1963, 1966, "birth-of-marvel"),
        (31, 62, 1966, 1969, "the-expansion"),
        (63, 100, 1969, 1972, "bronze-age"),
        (101, 150, 1972, 1976, "bronze-age"),
        (151, 200, 1977, 1980, "bronze-age"),
        (201, 250, 1980, 1984, "rise-of-x-men"),
        (251, 300, 1985, 1989, "event-age"),
        (301, 350, 1989, 1992, "event-age"),
        (351, 402, 1992, 1996, "speculation-crash"),
    ],
    "thor": [
        (126, 179, 1966, 1970, "the-expansion"),
        (180, 250, 1970, 1976, "bronze-age"),
        (251, 300, 1976, 1980, "bronze-age"),
        (301, 350, 1980, 1984, "rise-of-x-men"),
        (337, 382, 1983, 1987, "rise-of-x-men"),  # Simonson
        (383, 432, 1987, 1991, "event-age"),
        (433, 502, 1991, 1996, "speculation-crash"),
    ],
    "captain america": [
        (100, 150, 1968, 1972, "bronze-age"),
        (151, 200, 1972, 1976, "bronze-age"),
        (201, 250, 1976, 1980, "bronze-age"),
        (251, 300, 1980, 1984, "rise-of-x-men"),
        (301, 350, 1985, 1989, "event-age"),
        (351, 410, 1989, 1993, "event-age"),
        (411, 454, 1993, 1996, "speculation-crash"),
    ],
    "iron man": [
        (1, 30, 1968, 1970, "the-expansion"),
        (31, 80, 1970, 1975, "bronze-age"),
        (81, 150, 1976, 1981, "bronze-age"),
        (151, 200, 1981, 1985, "rise-of-x-men"),
        (201, 250, 1986, 1989, "event-age"),
        (251, 300, 1990, 1994, "event-age"),
        (301, 332, 1994, 1996, "speculation-crash"),
    ],
    "incredible hulk": [
        (1, 6, 1962, 1963, "birth-of-marvel"),
        (102, 150, 1968, 1972, "bronze-age"),
        (151, 200, 1972, 1976, "bronze-age"),
        (201, 250, 1976, 1980, "bronze-age"),
        (251, 300, 1981, 1984, "rise-of-x-men"),
        (301, 350, 1985, 1988, "event-age"),
        (351, 400, 1989, 1993, "event-age"),
        (401, 450, 1993, 1997, "speculation-crash"),
    ],
    "daredevil": [
        (1, 30, 1964, 1967, "birth-of-marvel"),
        (31, 60, 1967, 1969, "the-expansion"),
        (61, 100, 1970, 1973, "bronze-age"),
        (101, 150, 1973, 1978, "bronze-age"),
        (158, 191, 1979, 1983, "rise-of-x-men"),  # Miller
        (192, 233, 1983, 1986, "rise-of-x-men"),
        (226, 282, 1986, 1990, "event-age"),  # Nocenti starts ~226
        (283, 350, 1990, 1996, "event-age"),
        (351, 380, 1996, 1998, "heroes-reborn-return"),
    ],
    "doctor strange": [
        (110, 183, 1963, 1969, "birth-of-marvel"),
        (1, 30, 1974, 1978, "bronze-age"),
        (31, 81, 1978, 1987, "rise-of-x-men"),
    ],
    "silver surfer": [
        (1, 18, 1968, 1970, "the-expansion"),
        (1, 30, 1987, 1989, "event-age"),  # Vol 3
        (31, 60, 1989, 1991, "event-age"),
        (61, 100, 1991, 1995, "event-age"),
    ],
    "wolverine": [
        (1, 30, 1988, 1990, "event-age"),
        (31, 60, 1990, 1993, "event-age"),
        (61, 100, 1993, 1996, "speculation-crash"),
    ],
    "punisher": [
        (1, 30, 1987, 1989, "event-age"),
        (31, 60, 1990, 1992, "event-age"),
        (61, 104, 1992, 1995, "speculation-crash"),
    ],
    "moon knight": [
        (1, 30, 1980, 1983, "rise-of-x-men"),
        (31, 38, 1983, 1984, "rise-of-x-men"),
    ],
    "new mutants": [
        (1, 30, 1983, 1985, "rise-of-x-men"),
        (31, 60, 1985, 1988, "event-age"),
        (61, 100, 1988, 1991, "event-age"),
    ],
    "x-factor": [
        (1, 30, 1986, 1988, "event-age"),
        (31, 60, 1988, 1991, "event-age"),
        (61, 100, 1991, 1994, "event-age"),
        (71, 149, 1991, 1998, "speculation-crash"),  # Peter David run
    ],
    "x-force": [
        (1, 30, 1991, 1994, "event-age"),
        (31, 60, 1994, 1996, "speculation-crash"),
        (61, 100, 1996, 2000, "heroes-reborn-return"),
    ],
    "excalibur": [
        (1, 30, 1988, 1990, "event-age"),
        (31, 67, 1990, 1993, "event-age"),
        (68, 125, 1993, 1998, "speculation-crash"),
    ],
    "ghost rider": [
        (1, 20, 1973, 1976, "bronze-age"),
        (1, 30, 1990, 1993, "event-age"),  # Danny Ketch
    ],
}


def extract_year_from_title(title):
    """Extract a 4-digit year from title in parens or after 'by' context."""
    patterns = [
        r'\((\d{4})\)',
        r'\((\d{4})\s*[-–]',
        r'[-–]\s*(\d{4})\)',
        r'\((\d{4})\s+[-–]',
    ]
    for pattern in patterns:
        match = re.search(pattern, title)
        if match:
            year = int(match.group(1))
            if 1960 <= year <= 2026:
                return year
    return None


def extract_issue_numbers(issues_collected):
    """Try to extract series name and issue numbers from issues_collected."""
    if not issues_collected:
        return []
    # Match patterns like "FF #1-30" or "Avengers #100-150"
    results = []
    patterns = [
        r'(?:^|,\s*)([A-Za-z\s\-\.\']+?)\s*#(\d+)\s*[-–]\s*(\d+)',
        r'(?:^|,\s*)([A-Za-z\s\-\.\']+?)\s*#(\d+)',
    ]
    for pattern in patterns:
        for match in re.finditer(pattern, issues_collected):
            series = match.group(1).strip().lower()
            start = int(match.group(2))
            end = int(match.group(3)) if len(match.groups()) > 2 else start
            results.append((series, start, end))
    return results


def series_issue_to_era(series_name, start_issue, end_issue):
    """Look up era based on series + issue range."""
    sn = series_name.lower().strip()

    # Normalize series names
    name_map = {
        "ff": "fantastic four",
        "asm": "amazing spider-man",
        "uxm": "uncanny x-men",
        "astonishing x-men": "uncanny x-men",
        "cap": "captain america",
        "im": "iron man",
        "dd": "daredevil",
        "hulk": "incredible hulk",
        "thor": "thor",
        "mighty thor": "thor",
        "journey into mystery": "thor",
        "tales of suspense": "iron man",
        "tales to astonish": "incredible hulk",
        "strange tales": "doctor strange",
    }

    for key, val in name_map.items():
        if key in sn:
            sn = val
            break

    if sn not in SERIES_YEARS:
        return None

    mid_issue = (start_issue + end_issue) // 2
    for iss_start, iss_end, year_start, year_end, era_slug in SERIES_YEARS[sn]:
        if iss_start <= mid_issue <= iss_end:
            return era_slug

    return None


# ============================================================
# TITLE/CREATOR -> ERA MAPPING (pattern-based)
# ============================================================

TITLE_ERA_PATTERNS = [
    # Format: (pattern, era_slug, priority)
    # Higher priority = more specific match

    # Specific modern runs with year in title
    (r"by.*zeb wells", "dawn-of-krakoa", 10),
    (r"by.*chip zdarsky", "dawn-of-krakoa", 8),
    (r"by.*donny cates.*(?:venom|thor|hulk)", "dawn-of-krakoa", 8),
    (r"by.*al ewing.*(?:venom|immortal|defenders|ultimates)", "dawn-of-krakoa", 7),
    (r"by.*jed mackay.*(?:moon knight|black cat|avengers|doctor strange)", "dawn-of-krakoa", 8),
    (r"war of the realms", "dawn-of-krakoa", 10),
    (r"king in black", "dawn-of-krakoa", 10),
    (r"empyre", "dawn-of-krakoa", 10),
    (r"absolute carnage", "dawn-of-krakoa", 10),
    (r"devil.*s reign", "dawn-of-krakoa", 10),
    (r"blood hunt", "blood-hunt-doom", 10),
    (r"one world under doom", "blood-hunt-doom", 10),
    (r"from the ashes", "blood-hunt-doom", 10),
    (r"armageddon", "current-ongoings", 10),

    # Classic runs
    (r"by.*stan lee.*jack kirby", "birth-of-marvel", 10),
    (r"by.*stan lee.*steve ditko", "birth-of-marvel", 10),
    (r"by.*jim starlin.*warlock", "bronze-age", 10),
    (r"by.*chris claremont.*byrne", "rise-of-x-men", 10),
    (r"by.*john byrne.*fantastic", "rise-of-x-men", 10),
    (r"by.*walt simonson.*thor", "rise-of-x-men", 10),
    (r"by.*frank miller.*daredevil", "rise-of-x-men", 10),

    # Specific events/crossovers
    (r"civil war ii", "all-new-all-different", 10),
    (r"civil war(?!\s*ii)", "bendis-avengers", 9),
    (r"house of m(?!\s*/)", "bendis-avengers", 10),
    (r"secret invasion", "bendis-avengers", 10),
    (r"dark reign", "bendis-avengers", 9),
    (r"siege\b", "bendis-avengers", 8),
    (r"avengers disassembled", "bendis-avengers", 10),
    (r"secret empire(?!\s*companion)", "all-new-all-different", 10),
    (r"secret empire companion", "all-new-all-different", 10),
    (r"fear itself", "hickman-saga", 10),
    (r"age of ultron(?!\s*complete)", "hickman-saga", 10),
    (r"original sin", "hickman-saga", 10),
    (r"axis\b", "hickman-saga", 9),
    (r"a\.x\.e\.", "dawn-of-krakoa", 10),
    (r"judgment day", "dawn-of-krakoa", 10),
    (r"sins of sinister", "dawn-of-krakoa", 10),
    (r"x of swords", "dawn-of-krakoa", 10),
    (r"fall of the house of x", "dawn-of-krakoa", 10),
    (r"rise of the powers of x", "dawn-of-krakoa", 10),
    (r"house of x.*powers of x", "dawn-of-krakoa", 10),
    (r"dawn of x", "dawn-of-krakoa", 10),
    (r"onslaught", "speculation-crash", 10),
    (r"age of apocalypse", "speculation-crash", 10),
    (r"clone saga", "speculation-crash", 10),
    (r"fatal attractions", "speculation-crash", 10),
    (r"heroes reborn", "heroes-reborn-return", 10),
    (r"heroes return", "heroes-reborn-return", 10),
    (r"kree.skrull war", "bronze-age", 10),
    (r"korvac saga", "bronze-age", 10),
    (r"galactus trilogy", "birth-of-marvel", 10),
    (r"dark phoenix", "rise-of-x-men", 10),
    (r"mutant massacre", "event-age", 10),
    (r"inferno omnibus", "event-age", 10),
    (r"x-tinction agenda", "event-age", 10),
    (r"muir island saga", "event-age", 10),
    (r"phalanx covenant", "speculation-crash", 10),
]


def match_title_pattern(title):
    """Match title against known patterns."""
    title_lower = title.lower()
    best_match = None
    best_priority = -1

    for pattern, era_slug, priority in TITLE_ERA_PATTERNS:
        if re.search(pattern, title_lower) and priority > best_priority:
            best_match = era_slug
            best_priority = priority

    return best_match


def determine_era(edition):
    """Multi-pass era determination."""
    title = edition.get("title", "")
    slug = edition.get("slug", "")
    issues = edition.get("issues_collected", "")
    synopsis = edition.get("synopsis", "") or ""

    # Pass 1: Explicit slug map (highest confidence)
    if slug in EXPLICIT_ERA_MAP:
        return EXPLICIT_ERA_MAP[slug], "explicit"

    # Also try partial slug matching for explicit map
    for map_slug, map_era in EXPLICIT_ERA_MAP.items():
        if map_slug in slug or slug in map_slug:
            # Only use if it's a close match (avoid substring collisions)
            if len(map_slug) > 10 and (map_slug in slug or slug in map_slug):
                return map_era, "explicit_partial"

    # Pass 2: Title pattern matching
    pattern_era = match_title_pattern(title)
    if pattern_era:
        return pattern_era, "title_pattern"

    # Pass 3: Year extraction from title
    year = extract_year_from_title(title)
    if year:
        return year_to_era(year, title, slug, synopsis), "title_year"

    # Pass 4: Issue range analysis for Epic Collections/Masterworks/Omnibuses
    if issues:
        issue_ranges = extract_issue_numbers(issues)
        for series, start, end in issue_ranges:
            era = series_issue_to_era(series, start, end)
            if era:
                return era, "issue_range"

    # Pass 5: Synopsis year extraction
    if synopsis:
        year = extract_year_from_title(f"({synopsis[:200]})")
        if year and 1961 <= year <= 2026:
            return year_to_era(year, title, slug, synopsis), "synopsis_year"

    return None, "no_signal"


def year_to_era(year, title, slug, synopsis):
    """Convert a publication year to the best era, handling overlaps."""
    title_lower = title.lower()
    slug_lower = slug.lower()
    text = f"{title_lower} {slug_lower}"

    # Handle overlapping eras with thematic logic

    # 1975-1980: Bronze Age vs Rise of X-Men
    if 1975 <= year <= 1979:
        is_xmen_related = any(kw in text for kw in [
            "x-men", "x-force", "new mutants", "wolverine", "claremont",
            "phoenix", "nightcrawler", "storm", "kitty", "colossus",
        ])
        if is_xmen_related:
            return "rise-of-x-men"
        return "bronze-age"

    # 1980-1985: Rise of X-Men era dominates
    if 1980 <= year <= 1985:
        return "rise-of-x-men"

    # 2009-2011: Bendis Avengers vs Hickman Saga
    if 2009 <= year <= 2011:
        is_hickman = any(kw in text for kw in [
            "hickman", "ff by", "fantastic four by jonathan",
            "s.h.i.e.l.d.", "secret warriors",
        ])
        is_hickman_era = any(kw in text for kw in [
            "daredevil by mark waid", "hawkeye by fraction",
            "fear itself", "schism", "children's crusade",
        ])
        if is_hickman or is_hickman_era:
            return "hickman-saga"
        return "bendis-avengers"

    # 2012-2014: Hickman Saga
    if 2012 <= year <= 2014:
        return "hickman-saga"

    # 2015-2016: Hickman Saga end vs ANAD start
    if 2015 <= year <= 2016:
        is_hickman = any(kw in text for kw in [
            "secret wars", "battleworld", "hickman",
        ])
        if is_hickman:
            return "hickman-saga"
        return "all-new-all-different"

    # 2018-2019: ANAD vs Krakoa
    if year == 2018:
        return "all-new-all-different"
    if year == 2019:
        is_anad = any(kw in text for kw in [
            "war of the realms",  # This is actually krakoa era transition
        ])
        return "dawn-of-krakoa"

    # 2024: Krakoa end vs Blood Hunt
    if year == 2024:
        is_blood_hunt = any(kw in text for kw in [
            "blood hunt", "doom", "from the ashes", "exceptional",
            "ultimate black panther", "ultimate x-men",
            "venom war", "deadpool by cody",
        ])
        is_krakoa = any(kw in text for kw in [
            "fall of", "rise of the powers", "krakoa", "before the fall",
            "x-men: fall", "dead x-men",
        ])
        if is_krakoa:
            return "dawn-of-krakoa"
        if is_blood_hunt:
            return "blood-hunt-doom"
        return "blood-hunt-doom"  # Default 2024 to blood-hunt-doom

    # Simple year mapping for non-overlapping ranges
    if year <= 1966:
        return "birth-of-marvel"
    elif year <= 1970:
        return "the-expansion"
    elif year <= 1974:
        return "bronze-age"
    elif year <= 1985:
        return "rise-of-x-men"
    elif year <= 1992:
        return "event-age"
    elif year <= 1996:
        return "speculation-crash"
    elif year <= 1998:
        return "heroes-reborn-return"
    elif year <= 2004:
        return "marvel-knights-ultimate"
    elif year <= 2008:
        return "bendis-avengers"
    elif year <= 2016:
        return "hickman-saga"
    elif year <= 2018:
        return "all-new-all-different"
    elif year <= 2023:
        return "dawn-of-krakoa"
    elif year <= 2025:
        return "blood-hunt-doom"
    else:
        return "current-ongoings"


def main():
    print("=" * 80)
    print("MARVEL CARTOGRAPHER — ERA ASSIGNMENT AUDIT v2")
    print("=" * 80)

    print("\nFetching all editions from Supabase...")
    editions = supabase_get("editions_full?select=id,slug,title,era_id,era_slug,era_name,issues_collected,synopsis,connection_notes")
    print(f"Found {len(editions)} editions")

    changes = []
    no_signal = []
    confirmed_correct = []

    for ed in editions:
        current_era_id = ed.get("era_id")
        current_era_slug = ed.get("era_slug", "")
        current_era = ERA_BY_SLUG.get(current_era_slug, ERA_BY_ID.get(current_era_id, {}))

        correct_era_slug, method = determine_era(ed)

        if correct_era_slug is None:
            no_signal.append(ed)
            continue

        # Convert slug to ID
        correct_era = ERA_BY_SLUG.get(correct_era_slug, {})
        correct_era_id = correct_era.get("id")

        if not correct_era_id:
            no_signal.append(ed)
            continue

        if correct_era_id != current_era_id:
            changes.append({
                "id": ed["id"],
                "slug": ed["slug"],
                "title": ed["title"],
                "current_era": current_era.get("slug", "unknown"),
                "correct_era": correct_era_slug,
                "correct_era_id": correct_era_id,
                "method": method,
            })
        else:
            confirmed_correct.append({
                "slug": ed["slug"],
                "title": ed["title"],
                "era": current_era.get("slug", "unknown"),
            })

    # Report
    print(f"\n{'=' * 80}")
    print(f"AUDIT RESULTS v2")
    print(f"{'=' * 80}")
    print(f"Total editions:     {len(editions)}")
    print(f"Confirmed correct:  {len(confirmed_correct)}")
    print(f"Need changes:       {len(changes)}")
    print(f"No signal (manual): {len(no_signal)}")

    if changes:
        print(f"\n{'=' * 80}")
        print(f"PROPOSED CHANGES ({len(changes)})")
        print(f"{'=' * 80}")

        by_move = {}
        for c in changes:
            key = f"{c['current_era']} -> {c['correct_era']}"
            by_move.setdefault(key, []).append(c)

        for move, items in sorted(by_move.items()):
            print(f"\n--- {move} ({len(items)} editions) ---")
            for item in sorted(items, key=lambda x: x["title"]):
                print(f"  [{item['method']:16s}] {item['title']}")

    if no_signal:
        print(f"\n{'=' * 80}")
        print(f"NO SIGNAL ({len(no_signal)})")
        print(f"{'=' * 80}")
        for ed in sorted(no_signal, key=lambda x: x.get("era_slug", "") + x["title"])[:80]:
            current_era = ERA_BY_SLUG.get(ed.get("era_slug", ""), ERA_BY_ID.get(ed.get("era_id"), {}))
            print(f"  [{current_era.get('slug', 'unknown'):25s}] {ed['title']}")
        if len(no_signal) > 80:
            print(f"  ... and {len(no_signal) - 80} more")

    # Write results
    output = {
        "total_editions": len(editions),
        "confirmed_correct": len(confirmed_correct),
        "changes_needed": len(changes),
        "no_signal": len(no_signal),
        "changes": changes,
        "no_signal_editions": [{"slug": e["slug"], "title": e["title"], "current_era": ERA_BY_SLUG.get(e.get("era_slug", ""), {}).get("slug", "unknown")} for e in no_signal],
    }

    with open("/Users/danielbennin/Desktop/Marvel Complete/marvel-cartographer/scripts/audit_results_v2.json", "w") as f:
        json.dump(output, f, indent=2)

    print(f"\nResults written to scripts/audit_results_v2.json")

    # Generate SQL update statements
    if changes:
        sql_lines = []
        for c in changes:
            sql_lines.append(
                f"UPDATE collected_editions SET era_id = '{c['correct_era_id']}' WHERE id = '{c['id']}'; -- {c['title']}: {c['current_era']} -> {c['correct_era']}"
            )
        sql_path = "/Users/danielbennin/Desktop/Marvel Complete/marvel-cartographer/scripts/fix_eras.sql"
        with open(sql_path, "w") as f:
            f.write("-- Era assignment fixes generated by audit_eras_v2.py\n")
            f.write(f"-- {len(changes)} changes\n\n")
            f.write("BEGIN;\n\n")
            for line in sql_lines:
                f.write(line + "\n")
            f.write("\nCOMMIT;\n")
        print(f"SQL written to {sql_path}")

    return output


if __name__ == "__main__":
    main()

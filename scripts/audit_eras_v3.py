#!/usr/bin/env python3
"""
Era Audit v3 - Focused per-era review.
Queries each era and flags titles that look out of place based on publication year,
series name, and known run data.
"""

import json
import os
import re
import sys
import urllib.request
import urllib.parse

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Era year ranges
ERA_YEARS = {
    "birth-of-marvel":       (1961, 1966),
    "the-expansion":         (1966, 1970),
    "bronze-age":            (1970, 1980),
    "rise-of-x-men":         (1975, 1985),
    "event-age":             (1985, 1992),
    "speculation-crash":     (1992, 1996),
    "heroes-reborn-return":  (1996, 1998),
    "marvel-knights-ultimate":(1998, 2004),
    "bendis-avengers":       (2004, 2012),
    "hickman-saga":          (2009, 2015),
    "all-new-all-different": (2015, 2018),
    "dawn-of-krakoa":        (2019, 2024),
    "blood-hunt-doom":       (2024, 2025),
    "current-ongoings":      (2025, 2026),
}

ERA_IDS = {
    "birth-of-marvel":        "eb1a7d39-e8d3-41f1-9ec2-74e2ec3d3be6",
    "the-expansion":          "a9fe2453-0328-4e72-88ac-01d5cbdef337",
    "bronze-age":             "70d862f6-720f-46f0-ac11-b3171abd44c6",
    "rise-of-x-men":          "49fd3e6f-0cd3-48f5-abbe-7c90e59acfa6",
    "event-age":              "93f0e7e8-0cc2-4f06-9090-6ad14520bece",
    "speculation-crash":      "f9559f37-f08a-4eec-a19d-8d63123d19d3",
    "heroes-reborn-return":   "2b73f22c-6333-4928-97ba-78477e5acffe",
    "marvel-knights-ultimate": "f8924169-4590-4ef4-88e4-c9713a1540ab",
    "bendis-avengers":        "dfdb0620-290e-42c7-876a-cf3fec5001b3",
    "hickman-saga":           "fe75c870-3888-4405-9c8a-1f0341f19339",
    "all-new-all-different":  "e8879226-9a97-4fdb-a2d8-484a3579385d",
    "dawn-of-krakoa":         "ef8c9832-e06d-4028-ae89-a2bb5eb13e1c",
    "blood-hunt-doom":        "93f854fe-cd0a-4070-9a30-1f671374200e",
    "current-ongoings":       "c4bffdc6-c943-432e-9b61-6b51387076bb",
}

def fetch_all_editions():
    """Fetch all editions with their era info."""
    all_editions = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/editions_full?select=id,title,slug,era_slug,era_name,issues_collected,release_date,print_status,importance&order=title&offset={offset}&limit={limit}"
        req = urllib.request.Request(url)
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            if not data:
                break
            all_editions.extend(data)
            if len(data) < limit:
                break
            offset += limit
    return all_editions

def extract_year_from_title(title):
    """Extract publication year from title like 'X-Men (2019)' or 'Vol. 1 (2020)'."""
    # Match years in parentheses
    years = re.findall(r'\((\d{4})\)', title)
    if years:
        return [int(y) for y in years]
    return []

def extract_year_from_release_date(rd):
    """Extract year from release_date field."""
    if rd and len(rd) >= 4:
        try:
            return int(rd[:4])
        except:
            pass
    return None

def year_to_best_era(year):
    """Given a publication year, what era should it be in?"""
    if year <= 1965:
        return "birth-of-marvel"
    elif year <= 1969:
        return "the-expansion"
    elif year <= 1974:
        return "bronze-age"
    elif year <= 1984:
        # Overlap: bronze-age (1970-1980) and rise-of-x-men (1975-1985)
        if year <= 1979:
            return None  # ambiguous
        return "rise-of-x-men"
    elif year <= 1991:
        return "event-age"
    elif year <= 1995:
        return "speculation-crash"
    elif year <= 1997:
        return "heroes-reborn-return"
    elif year <= 2003:
        return "marvel-knights-ultimate"
    elif year <= 2008:
        return "bendis-avengers"
    elif year <= 2014:
        # Overlap: bendis-avengers (2004-2012) and hickman-saga (2009-2015)
        if year <= 2011:
            return None  # ambiguous
        return "hickman-saga"
    elif year <= 2018:
        return "all-new-all-different"
    elif year <= 2023:
        return "dawn-of-krakoa"
    elif year <= 2025:
        # 2024: could be dawn-of-krakoa or blood-hunt-doom
        if year == 2024:
            return None  # ambiguous
        return "blood-hunt-doom"
    else:
        return "current-ongoings"

def is_reprint_format(title):
    """Check if this is a reprint collection (omnibus, epic collection, etc.)
    which collects OLD material but was published recently."""
    lower = title.lower()
    reprint_keywords = [
        'omnibus', 'epic collection', 'masterworks', 'complete collection',
        'by stan lee', 'by jack kirby', 'by chris claremont', 'by john byrne',
        'by jim starlin', 'by roger stern', 'by walt simonson', 'by frank miller',
        'by peter david', 'by mark gruenwald', 'by tom defalco', 'by ann nocenti',
        'by louise simonson', 'by j.m. dematteis', 'by gerry conway',
        'by steve englehart', 'by steve gerber', 'by don mcgregor',
        'by doug moench', 'by bill mantlo', 'by marv wolfman',
    ]
    for kw in reprint_keywords:
        if kw in lower:
            return True
    return False

def check_edition_era(edition, current_era):
    """Check if an edition seems misplaced in its current era.
    Returns (suggested_era, confidence, reason) or None if looks fine."""
    title = edition['title']
    slug = edition.get('slug', '')
    issues = edition.get('issues_collected', '') or ''
    release_date = edition.get('release_date')
    lower_title = title.lower()

    era_start, era_end = ERA_YEARS.get(current_era, (0, 9999))

    # Skip: reprints of old material are tricky - they belong in the era of the ORIGINAL content
    # not the reprint publication date. This is actually correct behavior.
    # The issue is when NON-reprint modern titles are in old eras, or old content is in new eras.

    # Extract title years
    title_years = extract_year_from_title(title)
    release_year = extract_year_from_release_date(release_date)

    # For reprints/collections, the title year indicates the original content era
    is_reprint = is_reprint_format(title)

    issues_lower = issues.lower() if issues else ''

    problems = []

    # RULE 1: If title has a year that's way outside the era range, flag it
    # But only for non-reprint formats where the year indicates original publication
    for ty in title_years:
        if is_reprint:
            # For reprints, the title year = original content year, should match era
            if ty < era_start - 3 or ty > era_end + 3:
                problems.append(f"Reprint year {ty} outside era {current_era} ({era_start}-{era_end})")
        else:
            # For original series, the title year = publication year
            if ty < era_start - 1 or ty > era_end + 1:
                best = year_to_best_era(ty)
                if best and best != current_era:
                    problems.append(f"Series year {ty} suggests {best}, not {current_era}")

    # RULE 2: Specific series that are definitively tied to certain eras
    # These are high-confidence manual checks
    SERIES_ERA_MAP = {
        # Dawn of Krakoa X-titles (2019-2024)
        'house of x': 'dawn-of-krakoa',
        'powers of x': 'dawn-of-krakoa',
        'x of swords': 'dawn-of-krakoa',
        'reign of x': 'dawn-of-krakoa',
        'trial of magneto': 'dawn-of-krakoa',
        'inferno (2021)': 'dawn-of-krakoa',
        'immortal x-men': 'dawn-of-krakoa',
        'sins of sinister': 'dawn-of-krakoa',
        'fall of x': 'dawn-of-krakoa',
        'fall of the house of x': 'dawn-of-krakoa',
        'rise of the powers of x': 'dawn-of-krakoa',
        'hellfire gala': 'dawn-of-krakoa',
        'x-men (2019)': 'dawn-of-krakoa',
        'x-men (2021)': 'dawn-of-krakoa',
        'marauders (2019)': 'dawn-of-krakoa',
        'excalibur (2019)': 'dawn-of-krakoa',
        'new mutants (2019)': 'dawn-of-krakoa',
        'x-force (2019)': 'dawn-of-krakoa',
        'wolverine (2020)': 'dawn-of-krakoa',
        'cable (2020)': 'dawn-of-krakoa',
        'hellions': 'dawn-of-krakoa',
        'way of x': 'dawn-of-krakoa',
        's.w.o.r.d.': 'dawn-of-krakoa',
        'sword (2020)': 'dawn-of-krakoa',
        'x-men: destiny of x': 'dawn-of-krakoa',

        # Blood Hunt / Doom era (2024-2025)
        'blood hunt': 'blood-hunt-doom',
        'one world under doom': 'blood-hunt-doom',
        'doctor doom (2024)': 'blood-hunt-doom',

        # ANAD era (2015-2018)
        'secret wars (2015)': 'hickman-saga',  # technically caps hickman
        'all-new all-different': 'all-new-all-different',
        'civil war ii': 'all-new-all-different',
        'secret empire (2017)': 'all-new-all-different',
        'inhumans vs. x-men': 'all-new-all-different',
        'champions (2016)': 'all-new-all-different',
        'immortal hulk': 'all-new-all-different',
        'venom by donny cates': 'all-new-all-different',

        # Bendis Avengers era
        'civil war': 'bendis-avengers',
        'house of m': 'bendis-avengers',
        'secret invasion': 'bendis-avengers',
        'dark reign': 'bendis-avengers',
        'siege': 'bendis-avengers',
        'avengers disassembled': 'bendis-avengers',
        'annihilation': 'bendis-avengers',
        'annihilation: conquest': 'bendis-avengers',

        # Hickman saga
        'avengers by jonathan hickman': 'hickman-saga',
        'new avengers by jonathan hickman': 'hickman-saga',
        'ff by jonathan hickman': 'hickman-saga',
        'fantastic four by jonathan hickman': 'hickman-saga',
        'secret wars (2015)': 'hickman-saga',
    }

    for pattern, expected_era in SERIES_ERA_MAP.items():
        if pattern in lower_title and current_era != expected_era:
            # Make sure this isn't a false match
            problems.append(f"'{pattern}' in title suggests {expected_era}, not {current_era}")

    # RULE 3: "Current ongoings" should only have 2025-2026 titles
    if current_era == 'current-ongoings':
        has_recent_year = any(y >= 2025 for y in title_years)
        if release_year and release_year < 2025 and not has_recent_year:
            problems.append(f"Release year {release_year} too old for current-ongoings")

    # RULE 4: Blood Hunt era should only have 2024-2025 titles
    if current_era == 'blood-hunt-doom':
        has_2024_year = any(y >= 2024 for y in title_years)
        if title_years and not has_2024_year:
            max_year = max(title_years) if title_years else 0
            if max_year < 2024 and not is_reprint:
                problems.append(f"Title year {max_year} too old for blood-hunt-doom")

    if problems:
        return problems
    return None


def main():
    print("Fetching all editions...")
    editions = fetch_all_editions()
    print(f"Got {len(editions)} editions")

    # Group by era
    by_era = {}
    for ed in editions:
        era = ed.get('era_slug', 'unknown')
        if era not in by_era:
            by_era[era] = []
        by_era[era].append(ed)

    print("\n=== ERA DISTRIBUTION ===")
    for era_slug in ERA_YEARS:
        count = len(by_era.get(era_slug, []))
        print(f"  {era_slug}: {count}")

    print("\n=== FLAGGED EDITIONS (potentially misplaced) ===\n")

    all_flags = []
    for era_slug in ERA_YEARS:
        era_editions = by_era.get(era_slug, [])
        flags = []
        for ed in era_editions:
            problems = check_edition_era(ed, era_slug)
            if problems:
                flags.append((ed, problems))

        if flags:
            print(f"\n--- {era_slug} ({len(flags)} flagged of {len(era_editions)}) ---")
            for ed, problems in flags:
                title = ed['title']
                print(f"  [{ed['id'][:8]}] {title}")
                for p in problems:
                    print(f"    -> {p}")
                all_flags.append((ed, era_slug, problems))

    print(f"\n\nTotal flagged: {len(all_flags)}")

    # Now let's also just dump the full list per era for the most problematic ones
    # so we can manually review
    problem_eras = ['blood-hunt-doom', 'current-ongoings', 'rise-of-x-men', 'birth-of-marvel', 'the-expansion']

    print("\n\n=== FULL LISTINGS FOR REVIEW ===")
    for era_slug in problem_eras:
        era_editions = by_era.get(era_slug, [])
        era_editions.sort(key=lambda e: e.get('title', ''))
        print(f"\n--- {era_slug} ({ERA_YEARS[era_slug][0]}-{ERA_YEARS[era_slug][1]}) - {len(era_editions)} editions ---")
        for ed in era_editions:
            title = ed['title']
            years = extract_year_from_title(title)
            rd = ed.get('release_date', '')
            yr_str = f" years={years}" if years else ""
            rd_str = f" rel={rd}" if rd else ""
            print(f"  {title}{yr_str}{rd_str}")

if __name__ == "__main__":
    main()

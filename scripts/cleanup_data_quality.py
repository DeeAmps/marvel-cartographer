#!/usr/bin/env python3
"""
Data Quality Cleanup Script for Marvel Cartographer
Addresses remaining issues from the correction report:
1. Remove non-Marvel content (Star Wars, Conan, etc.)
2. Remove cover variant duplicates
3. Fix era misassignments (conservative: only explicit series refs)
4. Clean dangling references in connections and reading paths
"""

import json
import re
import os
from collections import defaultdict
from datetime import datetime

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB_DATA = os.path.join(BASE, "web", "data")

EDITIONS_FILE = os.path.join(WEB_DATA, "collected_editions.json")
CONNECTIONS_FILE = os.path.join(WEB_DATA, "connections.json")
READING_PATHS_FILE = os.path.join(WEB_DATA, "reading_paths.json")


# =============================================================================
# STEP 1: Non-Marvel content identification
# =============================================================================

def is_star_wars(entry):
    t = entry.get("title", "").lower()
    s = entry.get("slug", "").lower()
    return "star wars" in t or "star-wars" in s or s.startswith("journey-to-star-wars")


def is_conan_family(entry):
    t = entry.get("title", "").lower()
    s = entry.get("slug", "").lower()
    patterns = ["conan", "kull", "solomon kane", "solomon-kane"]
    if "red sonja" in t or "red-sonja" in s:
        return True
    for p in patterns:
        if p in t or p.replace(" ", "-") in s:
            return True
    return False


def is_alien_franchise(entry):
    t = entry.get("title", "").lower()
    s = entry.get("slug", "").lower()
    # Exclude Marvel content with "alien" in title
    marvel_exclusions = [
        "alien reality", "alien nation", "aliens, ghosts",
        "alien symbiote", "alien costume", "alien legion"
    ]
    for exc in marvel_exclusions:
        if exc in t:
            return False
    if s.startswith("alien-") or s.startswith("aliens-"):
        return True
    return False


def is_predator_franchise(entry):
    t = entry.get("title", "").lower()
    s = entry.get("slug", "").lower()
    if "predator" in t or "predator" in s:
        if "predator x" in t:
            return False
        return True
    return False


def is_other_licensed(entry):
    t = entry.get("title", "").lower()
    s = entry.get("slug", "").lower()
    if "league of legends" in t or "league-of-legends" in s:
        return True
    if "planet of the apes" in t or "planet-of-the-apes" in s:
        return True
    if "warhammer" in t or "warhammer" in s:
        return True
    if "disney kingdoms" in t or "disney-kingdoms" in s:
        return True
    # Halo - careful not to match "bachalo"
    if s.startswith("halo-") or t.startswith("halo:") or t.startswith("halo "):
        return True
    # Tron - careful not to match "ultron"
    if s == "tron-download-tp" or (s.startswith("tron-") and "ultron" not in s):
        return True
    return False


def classify_non_marvel(entry):
    if is_star_wars(entry):
        return "star_wars"
    if is_conan_family(entry):
        return "conan_family"
    if is_alien_franchise(entry):
        return "alien_franchise"
    if is_predator_franchise(entry):
        return "predator"
    if is_other_licensed(entry):
        return "other_licensed"
    return None


# =============================================================================
# STEP 2: Cover variant duplicate identification
# =============================================================================

def has_variant_marker(slug, title):
    """Check if entry has explicit variant/cover markers in slug or title."""
    s = slug.lower()
    t = title.lower()
    # Don't flag "the-variants" comic series
    if s == "the-variants":
        return False
    slug_markers = [
        "-cover-omnibus", "-cvr-omnibus", "-dm-v-", "-dm-omnibus",
        "-variant-edition", "-variant-cover", "-variant-omnibus",
    ]
    title_markers = [
        "variant edition", "variant cover", "dm cover",
        "direct market", "book market",
    ]
    for m in slug_markers:
        if m in s:
            return True
    for m in title_markers:
        if m in t:
            return True
    # Masterworks with -variant- in slug
    if "-variant" in s and ("mmw" in s or "masterwork" in t):
        return True
    return False


def normalize_slug_for_dedup(slug):
    """Normalize a slug to find its base edition (strip cover artist names)."""
    s = slug
    # Remove cover artist patterns before "omnibus"
    # e.g., "-artist-name-cover-omnibus" -> "-hc-omnibus"
    s = re.sub(r'-[a-z]+-[a-z]+-[a-z]+-cover-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-[a-z]+-[a-z]+-cover-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-[a-z]+-cover-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-[a-z]+-[a-z]+-[a-z]+-cvr-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-[a-z]+-[a-z]+-cvr-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-[a-z]+-cvr-omnibus', '-hc-omnibus', s)
    # DM variants
    s = re.sub(r'-dm-v-omnibus', '-hc-omnibus', s)
    s = re.sub(r'-dm-omnibus', '-hc-omnibus', s)
    # Variant edition/cover
    s = re.sub(r'-variant-edition', '', s)
    s = re.sub(r'-variant-cover', '', s)
    s = re.sub(r'-variant$', '', s)
    # Clean up double-hc artifacts
    s = s.replace('-hc-hc-', '-hc-')
    return s


def find_cover_variants(editions):
    """Find cover variant duplicates. Returns set of slugs to remove."""
    remove_slugs = set()

    # Strategy 1: Group by normalized slug and flag those with variant markers
    groups = defaultdict(list)
    for e in editions:
        norm = normalize_slug_for_dedup(e["slug"])
        groups[norm].append(e)

    for norm_slug, group in groups.items():
        if len(group) < 2:
            continue
        variant_entries = [e for e in group if has_variant_marker(e["slug"], e.get("title", ""))]
        for e in variant_entries:
            remove_slugs.add(e["slug"])

    # Strategy 2: Among entries sharing exact issues_collected, remove variants
    issues_to_entries = defaultdict(list)
    for e in editions:
        ic = e.get("issues_collected", "").strip()
        if ic and len(ic) > 15:
            issues_to_entries[ic].append(e)

    for ic, group in issues_to_entries.items():
        if len(group) < 2:
            continue
        for e in group:
            if has_variant_marker(e["slug"], e.get("title", "")):
                remove_slugs.add(e["slug"])

    return remove_slugs


# =============================================================================
# STEP 3: Era misassignment fixes (CONSERVATIVE)
# =============================================================================

# Only match on explicit series references in issues_collected with year tags
# Format: "Series Name (year)" in issues_collected -> correct era
SERIES_YEAR_ERA = [
    # Golden/Atlas Age -> birth-of-marvel
    (r"sub-mariner comics", "birth-of-marvel"),
    (r"captain america comics", "birth-of-marvel"),
    (r"all.?winners|all select|young allies|marvel mystery", "birth-of-marvel"),
    (r"namora \(194", "birth-of-marvel"),
    (r"human torch \(194", "birth-of-marvel"),

    # Silver Age (1961-1966) - only with explicit (1961)-(1966) year tags
    (r"fantastic four \(1961\)", "birth-of-marvel"),
    (r"amazing spider-man \(1963\)", "birth-of-marvel"),
    (r"avengers \(1963\)", "birth-of-marvel"),
    (r"x-men \(1963\)", "birth-of-marvel"),
    (r"journey into mystery \(1952\)", "birth-of-marvel"),
    (r"tales of suspense \(1959\)", "birth-of-marvel"),
    (r"tales to astonish \(1959\)", "birth-of-marvel"),
    (r"strange tales \(1951\)", "birth-of-marvel"),
    (r"incredible hulk \(1962\)", "birth-of-marvel"),

    # Late Silver Age (1966-1970)
    (r"silver surfer \(1968\)", "the-expansion"),
    (r"captain america \(1968\)", "the-expansion"),
    (r"iron man \(1968\)", "the-expansion"),
    (r"sub-mariner \(1968\)", "the-expansion"),
    (r"doctor strange \(1968\)", "the-expansion"),
    (r"nick fury.+agent.+shield \(196", "the-expansion"),
    (r"marvel tales \(1964\)", "the-expansion"),

    # Bronze Age (1970-1980)
    (r"hero for hire", "bronze-age"),
    (r"power man \(", "bronze-age"),
    (r"power man #", "bronze-age"),
    (r"iron fist \(1975\)", "bronze-age"),
    (r"tomb of dracula \(197", "bronze-age"),
    (r"werewolf by night \(197", "bronze-age"),
    (r"ghost rider \(1973\)", "bronze-age"),
    (r"man-thing \(197", "bronze-age"),
    (r"jungle action", "bronze-age"),
    (r"marvel premiere", "bronze-age"),
    (r"marvel spotlight \(197", "bronze-age"),
    (r"marvel team-up \(197", "bronze-age"),
    (r"marvel two-in-one \(197", "bronze-age"),
    (r"defenders \(1972\)", "bronze-age"),
    (r"howard the duck \(1976\)", "bronze-age"),
    (r"master of kung fu", "bronze-age"),
    (r"omega the unknown \(197", "bronze-age"),
    (r"warlock \(1972\)", "bronze-age"),
    (r"captain marvel \(1968\)", "bronze-age"),
    (r"daredevil \(1964\)", "bronze-age"),
    (r"thor \(1966\)", "bronze-age"),
    (r"spider-woman \(1978\)", "bronze-age"),
    (r"ms\. marvel \(1977\)", "bronze-age"),
    (r"black panther \(1977\)", "bronze-age"),
    (r"nova \(1976\)", "bronze-age"),
    (r"inhumans \(1975\)", "bronze-age"),
    (r"amazing adventures \(197", "bronze-age"),

    # Rise of X-Men (1975-1985) - only explicit old UXM references
    (r"uncanny x-men \(1963\) #(9[4-9]|[1-2]\d\d)", "rise-of-x-men"),
    (r"new mutants \(1983\)", "rise-of-x-men"),
    (r"alpha flight \(1983\)", "rise-of-x-men"),
    (r"dazzler \(1981\)", "rise-of-x-men"),
    (r"micronauts \(197", "rise-of-x-men"),
    (r"rom \(197|rom \(198", "rise-of-x-men"),
    (r"marvel super heroes secret wars \(1984\)", "rise-of-x-men"),
    (r"giant.size x-men \(1975\)", "rise-of-x-men"),

    # Event Age (1985-1992)
    (r"x-factor \(1986\)", "event-age"),
    (r"new warriors \(1990\)", "event-age"),
    (r"excalibur \(1988\)", "event-age"),
    (r"wolverine \(1988\)", "event-age"),
    (r"punisher \(1987\)", "event-age"),
    (r"infinity gauntlet \(1991\)", "event-age"),

    # Heroes Reborn (1996-1998)
    (r"thunderbolts \(1997\)", "heroes-reborn-return"),

    # Marvel Knights / Ultimate (1998-2004)
    (r"daredevil \(1998\)", "marvel-knights-ultimate"),
    (r"fantastic four \(1998\)", "marvel-knights-ultimate"),
    (r"black panther \(1998\)", "marvel-knights-ultimate"),
    (r"amazing spider-man \(1999\)", "marvel-knights-ultimate"),
    (r"ultimate spider-man \(2000\)", "marvel-knights-ultimate"),
    (r"ultimate x-men \(2001\)", "marvel-knights-ultimate"),
    (r"ultimates \(2002\)", "marvel-knights-ultimate"),
    (r"alias \(2001\)", "marvel-knights-ultimate"),
    (r"new x-men \(2001\)", "marvel-knights-ultimate"),

    # Bendis Avengers (2004-2012)
    (r"new avengers \(2004\)", "bendis-avengers"),
    (r"new avengers \(2005\)", "bendis-avengers"),
    (r"mighty avengers \(2007\)", "bendis-avengers"),
    (r"dark avengers \(2009\)", "bendis-avengers"),
    (r"young avengers \(2005\)", "bendis-avengers"),
    (r"astonishing x-men \(2004\)", "bendis-avengers"),

    # Hickman Saga (2009-2015)
    (r"fantastic four \(2009\)", "hickman-saga"),
    (r"ff \(2011\)", "hickman-saga"),
    (r"avengers \(2012\)", "hickman-saga"),
    (r"new avengers \(2013\)", "hickman-saga"),
    (r"secret wars \(2015\)", "hickman-saga"),
]

# Title-based patterns ONLY for clearly-labeled reprint collections
TITLE_ERA_PATTERNS = [
    # "Original Marvel Years" omnibuses of classic content
    (r"timely.s", "birth-of-marvel"),
    (r"golden age captain america", "birth-of-marvel"),
    (r"golden age marvel comics", "birth-of-marvel"),
    (r"golden age human torch", "birth-of-marvel"),
    (r"golden age sub-mariner", "birth-of-marvel"),
    (r"atlas era", "birth-of-marvel"),
]

# Modern eras that might contain misplaced classic content
MODERN_ERAS = {
    "all-new-all-different", "dawn-of-krakoa", "blood-hunt-doom", "current-ongoings"
}


def detect_correct_era(entry):
    """Determine correct narrative era from issues_collected. Returns None if no change needed."""
    issues = entry.get("issues_collected", "").lower()
    title = entry.get("title", "").lower()

    # Check issues_collected against series patterns
    if issues:
        for pattern, era in SERIES_YEAR_ERA:
            if re.search(pattern, issues, re.IGNORECASE):
                return era

    # Check title patterns (only for clearly labeled reprints)
    for pattern, era in TITLE_ERA_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return era

    # Masterworks volumes - check issues_collected for classic series
    if "masterworks" in title or "mmw" in entry.get("slug", ""):
        if issues:
            for pattern, era in SERIES_YEAR_ERA:
                if re.search(pattern, issues, re.IGNORECASE):
                    return era

    return None


def fix_era_misassignments(editions):
    """Fix editions in modern eras that should be in classic eras. Conservative approach."""
    fixes = []
    for e in editions:
        current_era = e.get("era_slug", "")
        if current_era not in MODERN_ERAS:
            continue

        correct_era = detect_correct_era(e)
        if correct_era and correct_era != current_era:
            old_era = e["era_slug"]
            e["era_slug"] = correct_era
            fixes.append({
                "slug": e["slug"],
                "title": e.get("title", ""),
                "old_era": old_era,
                "new_era": correct_era,
            })

    return fixes


# =============================================================================
# STEP 4: Clean dangling references
# =============================================================================

def clean_connections(connections, valid_slugs):
    removed = []
    cleaned = []
    for c in connections:
        src = c.get("source_slug", "")
        tgt = c.get("target_slug", "")
        src_type = c.get("source_type", "")
        tgt_type = c.get("target_type", "")
        src_ok = src_type != "edition" or src in valid_slugs
        tgt_ok = tgt_type != "edition" or tgt in valid_slugs
        if src_ok and tgt_ok:
            cleaned.append(c)
        else:
            removed.append(c)
    return cleaned, removed


def clean_reading_paths(paths, valid_slugs):
    removed_entries = 0
    for path in paths:
        entries = path.get("entries", [])
        original_count = len(entries)
        path["entries"] = [
            e for e in entries if e.get("edition_slug", "") in valid_slugs
        ]
        removed_entries += original_count - len(path["entries"])
        for i, entry in enumerate(path["entries"]):
            entry["position"] = i + 1
    return removed_entries


# =============================================================================
# STEP 5: Fix duplicate slugs
# =============================================================================

def dedup_slugs(editions):
    """Remove exact duplicate slug entries, keeping the first occurrence."""
    seen = set()
    deduped = []
    removed = 0
    for e in editions:
        slug = e["slug"]
        if slug in seen:
            removed += 1
        else:
            seen.add(slug)
            deduped.append(e)
    return deduped, removed


# =============================================================================
# MAIN
# =============================================================================

def main():
    print("=" * 70)
    print("MARVEL CARTOGRAPHER DATA QUALITY CLEANUP")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    with open(EDITIONS_FILE, "r") as f:
        editions = json.load(f)
    with open(CONNECTIONS_FILE, "r") as f:
        connections = json.load(f)
    with open(READING_PATHS_FILE, "r") as f:
        reading_paths = json.load(f)

    orig_count = len(editions)
    orig_conn = len(connections)
    print(f"\nLoaded: {orig_count} editions, {orig_conn} connections, {len(reading_paths)} paths")

    # --- STEP 1: Remove non-Marvel content ---
    print("\n" + "-" * 70)
    print("STEP 1: Removing non-Marvel content")
    print("-" * 70)

    non_marvel_slugs = set()
    by_cat = defaultdict(list)
    for e in editions:
        cat = classify_non_marvel(e)
        if cat:
            non_marvel_slugs.add(e["slug"])
            by_cat[cat].append(e["slug"])

    for cat, slugs in sorted(by_cat.items()):
        print(f"  {cat}: {len(slugs)}")
    print(f"  TOTAL: {len(non_marvel_slugs)}")

    editions = [e for e in editions if e["slug"] not in non_marvel_slugs]
    print(f"  Remaining: {len(editions)}")

    # --- STEP 2: Remove cover variant duplicates ---
    print("\n" + "-" * 70)
    print("STEP 2: Removing cover variant duplicates")
    print("-" * 70)

    variant_slugs = find_cover_variants(editions)
    print(f"  Found {len(variant_slugs)} variants to remove")
    for s in sorted(variant_slugs)[:15]:
        print(f"    - {s}")
    if len(variant_slugs) > 15:
        print(f"    ... and {len(variant_slugs) - 15} more")

    editions = [e for e in editions if e["slug"] not in variant_slugs]
    print(f"  Remaining: {len(editions)}")

    # --- Dedup exact duplicate slugs ---
    editions, dedup_count = dedup_slugs(editions)
    if dedup_count:
        print(f"  Removed {dedup_count} exact duplicate slugs")
        print(f"  Remaining: {len(editions)}")

    # --- STEP 3: Fix era misassignments ---
    print("\n" + "-" * 70)
    print("STEP 3: Fixing era misassignments (conservative)")
    print("-" * 70)

    era_fixes = fix_era_misassignments(editions)
    print(f"  Fixed {len(era_fixes)} era misassignments:")
    for fix in era_fixes:
        print(f"    {fix['slug']}: {fix['old_era']} -> {fix['new_era']}")

    # --- STEP 4: Clean dangling references ---
    print("\n" + "-" * 70)
    print("STEP 4: Cleaning dangling references")
    print("-" * 70)

    valid_slugs = {e["slug"] for e in editions}

    connections, removed_conns = clean_connections(connections, valid_slugs)
    print(f"  Removed {len(removed_conns)} dangling connections")

    removed_path_entries = clean_reading_paths(reading_paths, valid_slugs)
    print(f"  Removed {removed_path_entries} dangling reading path entries")

    # --- Save ---
    print("\n" + "-" * 70)
    print("SAVING")
    print("-" * 70)

    with open(EDITIONS_FILE, "w") as f:
        json.dump(editions, f, indent=2, ensure_ascii=False)
    print(f"  {len(editions)} editions")

    with open(CONNECTIONS_FILE, "w") as f:
        json.dump(connections, f, indent=2, ensure_ascii=False)
    print(f"  {len(connections)} connections")

    with open(READING_PATHS_FILE, "w") as f:
        json.dump(reading_paths, f, indent=2, ensure_ascii=False)
    print(f"  {len(reading_paths)} reading paths")

    # --- Summary ---
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    total_removed = orig_count - len(editions)
    print(f"  Editions:    {orig_count} -> {len(editions)} (-{total_removed})")
    print(f"    Non-Marvel:      -{len(non_marvel_slugs)}")
    print(f"    Cover variants:  -{len(variant_slugs)}")
    print(f"    Exact dupes:     -{dedup_count}")
    print(f"    Era fixes:       {len(era_fixes)} reassigned")
    print(f"  Connections: {orig_conn} -> {len(connections)} (-{len(removed_conns)})")
    print(f"  Path entries removed: {removed_path_entries}")

    # Era distribution
    print("\n  Era distribution:")
    era_counts = defaultdict(int)
    for e in editions:
        era_counts[e.get("era_slug", "unknown")] += 1
    for era, count in sorted(era_counts.items(), key=lambda x: -x[1]):
        print(f"    {era}: {count}")

    # Format distribution
    print("\n  Format distribution:")
    fmt_counts = defaultdict(int)
    for e in editions:
        fmt_counts[e.get("format", "unknown")] += 1
    for fmt, count in sorted(fmt_counts.items(), key=lambda x: -x[1]):
        print(f"    {fmt}: {count}")

    # --- Verification ---
    print("\n" + "-" * 70)
    print("VERIFICATION")
    print("-" * 70)

    # Duplicate slugs
    slug_counts = defaultdict(int)
    for e in editions:
        slug_counts[e["slug"]] += 1
    dupes = {s: c for s, c in slug_counts.items() if c > 1}
    if dupes:
        print(f"  WARNING: {len(dupes)} duplicate slugs!")
        for s, c in dupes.items():
            print(f"    {s}: {c}x")
    else:
        print("  OK: No duplicate slugs")

    # Dangling connections
    dangling = sum(1 for c in connections
                   if (c.get("source_type") == "edition" and c.get("source_slug") not in valid_slugs)
                   or (c.get("target_type") == "edition" and c.get("target_slug") not in valid_slugs))
    print(f"  {'OK: No' if dangling == 0 else f'WARNING: {dangling}'} dangling connection refs")

    # Dangling path refs
    dangling_paths = sum(1 for p in reading_paths
                         for e in p.get("entries", [])
                         if e.get("edition_slug") not in valid_slugs)
    print(f"  {'OK: No' if dangling_paths == 0 else f'WARNING: {dangling_paths}'} dangling path refs")

    # Valid eras
    valid_eras = {
        "birth-of-marvel", "the-expansion", "bronze-age", "rise-of-x-men",
        "event-age", "speculation-crash", "heroes-reborn-return",
        "marvel-knights-ultimate", "bendis-avengers", "hickman-saga",
        "all-new-all-different", "dawn-of-krakoa", "blood-hunt-doom",
        "current-ongoings"
    }
    bad_eras = [e for e in editions if e.get("era_slug") not in valid_eras]
    if bad_eras:
        print(f"  WARNING: {len(bad_eras)} editions with invalid era_slug")
    else:
        print("  OK: All era_slug values valid")

    # Check no Star Wars/Conan snuck through
    remaining_non_marvel = [e for e in editions if classify_non_marvel(e)]
    if remaining_non_marvel:
        print(f"  WARNING: {len(remaining_non_marvel)} non-Marvel entries remain!")
    else:
        print("  OK: No non-Marvel content remains")

    print("\nDone!")


if __name__ == "__main__":
    main()

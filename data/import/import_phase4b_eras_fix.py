#!/usr/bin/env python3
"""Phase 4b: Fix era assignments by estimating actual publication years from issue numbers.

The original Phase 4 used the series launch year (e.g., 1963 from "X-Men (1963)")
as the content year, which misassigns editions collecting high-numbered issues.
Example: "Avengers (1963) #300" was tagged birth-of-marvel instead of event-age.

Fix: pub_year ≈ series_launch_year + (issue_number / issues_per_year)
Uses median publication year across all issues in the edition.
"""

import json
import re
import statistics
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

ENRICHED_PATH = SCRIPT_DIR / "phase5_enriched.json"
EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
ERAS_PATH = WEB_DATA_DIR / "eras.json"
OUTPUT_CORRECTIONS = SCRIPT_DIR / "phase4b_era_corrections.json"

# Matches: Series Name (YEAR) #NUM or Series Name (YEAR) #NUM-NUM
SERIES_ISSUE_PATTERN = re.compile(
    r"([A-Z][A-Za-z\s\-\':,&.]+?)\s*\((\d{4})\)\s*#(\d+)(?:\s*[-–]\s*(\d+))?"
)

# Matches: SERIES NAME #NUM (no year, like "GIANT-SIZE INVADERS #1")
BARE_ISSUE_PATTERN = re.compile(
    r"([A-Z][A-Za-z\s\-\':,&.]+?)\s*#(\d+)(?:\s*[-–]\s*(\d+))?"
)

# Matches: Annual (YEAR) #NUM or ANNUAL #NUM
ANNUAL_PATTERN = re.compile(r"ANNUAL\s*(?:\((\d{4})\)\s*)?#?(\d+)", re.IGNORECASE)

# Known series cadences (issues per year) for major long-running titles
# Most Marvel monthlies are ~12/year. Some were bi-monthly or bi-weekly.
SERIES_CADENCE = {
    "amazing spider-man": 12,
    "avengers": 12,
    "fantastic four": 12,
    "uncanny x-men": 12,
    "x-men": 12,
    "thor": 12,
    "iron man": 12,
    "captain america": 12,
    "daredevil": 12,
    "incredible hulk": 12,
    "defenders": 12,
    "tales to astonish": 12,
    "tales of suspense": 12,
    "journey into mystery": 12,
    "strange tales": 12,
    "marvel team-up": 12,
    "peter parker, the spectacular spider-man": 12,
    "the spectacular spider-man": 12,
    "web of spider-man": 12,
    "new mutants": 12,
    "x-factor": 12,
    "west coast avengers": 12,
    "wolverine": 12,
    "ghost rider": 12,
    "moon knight": 12,
    "silver surfer": 12,
    "punisher": 12,
    "conan the barbarian": 12,
    "savage sword of conan": 10,  # magazine, slightly less frequent
    "nova": 12,
    "spider-man": 12,
    "venom": 12,
    "new warriors": 12,
    "thunderbolts": 12,
    "fear": 8,  # bi-monthly
    "marvel premiere": 8,
    "marvel feature": 8,
    "sub-mariner": 12,
}
DEFAULT_CADENCE = 12


def load_eras():
    with open(ERAS_PATH) as f:
        return json.load(f)


def estimate_pub_years(issues_collected: str) -> list[float]:
    """Estimate publication years for all issues referenced in the collected field."""
    years = []

    for match in SERIES_ISSUE_PATTERN.finditer(issues_collected):
        series_name = match.group(1).strip()
        launch_year = int(match.group(2))
        issue_start = int(match.group(3))
        issue_end = int(match.group(4)) if match.group(4) else issue_start

        # Look up cadence
        series_lower = series_name.lower().strip()
        cadence = DEFAULT_CADENCE
        for key, cad in SERIES_CADENCE.items():
            if key in series_lower or series_lower in key:
                cadence = cad
                break

        # For newer volumes (launch year > 2000), issue numbers are low,
        # so launch_year + issue/cadence ≈ launch_year, which is correct
        mid_issue = (issue_start + issue_end) / 2
        est_year = launch_year + mid_issue / cadence

        # Sanity check: don't go before launch year or beyond 2026
        est_year = max(launch_year, min(est_year, 2026))
        years.append(est_year)

    # Also handle annuals with years
    for match in ANNUAL_PATTERN.finditer(issues_collected):
        if match.group(1):
            years.append(float(match.group(1)))

    return years


def find_best_era(year: float, eras: list[dict]) -> str:
    """Find the best matching era for a given year."""
    candidates = []
    for era in eras:
        if era["year_start"] <= year <= era["year_end"]:
            midpoint = (era["year_start"] + era["year_end"]) / 2
            distance = abs(year - midpoint)
            candidates.append((distance, era))

    if candidates:
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]["slug"]

    # No exact match — find closest era
    closest = min(eras, key=lambda e: min(
        abs(year - e["year_start"]),
        abs(year - e["year_end"])
    ))
    return closest["slug"]


def fix_era(entry: dict, eras: list[dict]) -> tuple[str, str, float | None]:
    """Return (old_era, new_era, estimated_year) for an edition."""
    old_era = entry.get("era_slug", "")
    collects = entry.get("issues_collected", "")

    pub_years = estimate_pub_years(collects)

    if pub_years:
        # Use median publication year
        median_year = statistics.median(pub_years)
        new_era = find_best_era(median_year, eras)
        return old_era, new_era, median_year

    # Fallback: use release_date if available
    release = entry.get("release_date", "")
    if release:
        try:
            year = int(release[:4])
            # Release date is for the collected edition, not the content.
            # For reprints, this would put them in the wrong era.
            # Only use release date for editions that seem like new content
            # (check if the title suggests it's a modern run)
            new_era = find_best_era(year, eras)
            # BUT: if the old era was assigned and seems reasonable, keep it
            # since release date for reprints (omnibuses, masterworks) is misleading
            return old_era, old_era, None  # Keep original when we can't determine content year
        except (ValueError, IndexError):
            pass

    return old_era, old_era, None


def run():
    print("Phase 4b: Fix Era Assignments")
    print("=" * 60)

    eras = load_eras()
    print(f"Loaded {len(eras)} eras")

    # Load both the enriched data and the web data
    with open(ENRICHED_PATH) as f:
        enriched = json.load(f)
    print(f"Loaded {len(enriched)} enriched editions")

    with open(EDITIONS_PATH) as f:
        web_editions = json.load(f)
    print(f"Loaded {len(web_editions)} web editions")

    # Process enriched editions (the new imports)
    corrections = []
    changed = 0
    unchanged = 0

    for entry in enriched:
        old_era, new_era, est_year = fix_era(entry, eras)
        if old_era != new_era:
            corrections.append({
                "slug": entry["slug"],
                "title": entry["title"],
                "issues_collected": entry.get("issues_collected", "")[:120],
                "old_era": old_era,
                "new_era": new_era,
                "estimated_year": round(est_year, 1) if est_year else None,
            })
            entry["era_slug"] = new_era
            changed += 1
        else:
            unchanged += 1

    print(f"\nEnriched editions: {changed} changed, {unchanged} unchanged")

    # Update web editions too (find matching slugs)
    enriched_map = {e["slug"]: e["era_slug"] for e in enriched}
    web_changed = 0
    for ed in web_editions:
        if ed["slug"] in enriched_map:
            new_era = enriched_map[ed["slug"]]
            if ed.get("era_slug") != new_era:
                ed["era_slug"] = new_era
                web_changed += 1

    print(f"Web editions updated: {web_changed}")

    # Show era distribution after fix
    era_counts = {}
    for e in enriched:
        era = e.get("era_slug", "?")
        era_counts[era] = era_counts.get(era, 0) + 1

    print(f"\nNew era distribution (enriched only):")
    for era in eras:
        count = era_counts.get(era["slug"], 0)
        if count:
            print(f"  {era['name']}: {count}")

    # Full distribution across all web editions
    full_counts = {}
    for e in web_editions:
        era = e.get("era_slug", "?")
        full_counts[era] = full_counts.get(era, 0) + 1

    print(f"\nFull era distribution (all {len(web_editions)} editions):")
    for era in eras:
        count = full_counts.get(era["slug"], 0)
        if count:
            print(f"  {era['name']}: {count}")

    # Save corrections report
    with open(OUTPUT_CORRECTIONS, "w") as f:
        json.dump(corrections, f, indent=2)
    print(f"\nCorrections report: {OUTPUT_CORRECTIONS} ({len(corrections)} changes)")

    # Save updated enriched data
    with open(ENRICHED_PATH, "w") as f:
        json.dump(enriched, f, indent=2)
    print(f"Updated: {ENRICHED_PATH}")

    # Save updated web editions
    with open(EDITIONS_PATH, "w") as f:
        json.dump(web_editions, f, indent=2)
    print(f"Updated: {EDITIONS_PATH}")

    # Show some example corrections
    print(f"\nSample corrections (first 15):")
    for c in corrections[:15]:
        print(f"  {c['slug']}")
        print(f"    {c['old_era']} → {c['new_era']} (est. {c['estimated_year']})")
        print(f"    Issues: {c['issues_collected']}")


if __name__ == "__main__":
    run()

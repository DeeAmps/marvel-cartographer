#!/usr/bin/env python3
"""Phase 4: Assign eras to new editions based on content years and release dates."""

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

INPUT_PATH = SCRIPT_DIR / "phase2_cleaned.json"
ERAS_PATH = WEB_DATA_DIR / "eras.json"
OUTPUT_PATH = INPUT_PATH  # Updates in-place

# Extract year from series references like "X-Men (1963)" or "(2019)"
YEAR_PATTERN = re.compile(r"\((\d{4})\)")


def load_eras() -> list[dict]:
    with open(ERAS_PATH) as f:
        return json.load(f)


def extract_content_years(collects: str) -> list[int]:
    """Extract all years from the Collects field."""
    return [int(y) for y in YEAR_PATTERN.findall(collects) if 1940 <= int(y) <= 2030]


def find_best_era(year: int, eras: list[dict]) -> str:
    """Find the best matching era for a given content year."""
    candidates = []
    for era in eras:
        if era["year_start"] <= year <= era["year_end"]:
            # Score by distance from era midpoint
            midpoint = (era["year_start"] + era["year_end"]) / 2
            distance = abs(year - midpoint)
            candidates.append((distance, era))

    if candidates:
        # Pick era whose midpoint is closest
        candidates.sort(key=lambda x: x[0])
        return candidates[0][1]["slug"]

    # No exact match — find closest era
    closest = min(eras, key=lambda e: min(
        abs(year - e["year_start"]),
        abs(year - e["year_end"])
    ))
    return closest["slug"]


def run():
    print("Phase 4: Assign Eras")
    print("=" * 50)

    with open(INPUT_PATH) as f:
        entries = json.load(f)

    eras = load_eras()
    print(f"Loaded {len(eras)} eras")
    print(f"Processing {len(entries)} entries")

    assigned_by_content = 0
    assigned_by_release = 0
    assigned_fallback = 0
    era_counts = {}

    for entry in entries:
        collects = entry.get("issues_collected", "")
        years = extract_content_years(collects)

        if years:
            # Use earliest content year
            earliest_year = min(years)
            era_slug = find_best_era(earliest_year, eras)
            assigned_by_content += 1
        elif entry.get("release_date"):
            # Fallback to release date year
            try:
                year = int(entry["release_date"][:4])
                era_slug = find_best_era(year, eras)
                assigned_by_release += 1
            except (ValueError, IndexError):
                era_slug = "current-ongoings"
                assigned_fallback += 1
        else:
            era_slug = "current-ongoings"
            assigned_fallback += 1

        entry["era_slug"] = era_slug
        era_counts[era_slug] = era_counts.get(era_slug, 0) + 1

    print(f"\nAssignment method:")
    print(f"  By content year: {assigned_by_content}")
    print(f"  By release date: {assigned_by_release}")
    print(f"  Fallback: {assigned_fallback}")

    print(f"\nEra distribution:")
    for era in eras:
        count = era_counts.get(era["slug"], 0)
        if count:
            print(f"  {era['name']}: {count}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(entries, f, indent=2)
    print(f"\nSaved: {OUTPUT_PATH}")

    return entries


if __name__ == "__main__":
    run()

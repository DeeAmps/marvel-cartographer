#!/usr/bin/env python3
"""Phase 3: Parse 'Collects' field into structured edition_issues entries."""

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
INPUT_PATH = SCRIPT_DIR / "phase2_cleaned.json"
OUTPUT_PATH = SCRIPT_DIR / "phase3_edition_issues.json"

# Pattern: "Series Name (Year) #N-M" or "Series Name (Year) #N, N2-N3, ..."
SERIES_YEAR_HASH_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9\s\-\'\.\!\&\:\,]+?)"  # Series name
    r"\s*\((\d{4})\)"                              # (Year)
    r"\s*#([\d\s,\-]+)"                             # #numbers (ranges, commas)
)

# Pattern: "Series Name (Year) N-M" (year but no hash)
SERIES_YEAR_NOHASH_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9\s\-\'\.\!\&\:\,]+?)"  # Series name
    r"\s*\((\d{4})\)"                              # (Year)
    r"\s+([\d\s,\-]+)"                              # numbers (ranges, commas)
)

# Pattern: "Series Name #N-M" (hash but no year)
SERIES_HASH_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9\s\-\'\.\!\&\:\,]+?)"  # Series name
    r"\s*#([\d\s,\-]+)"                             # #numbers
)

# Annual pattern
ANNUAL_PATTERN = re.compile(
    r"([A-Za-z][A-Za-z0-9\s\-\'\.\!\&\:\,]+?)"
    r"\s*(?:\((\d{4})\))?"
    r"\s*Annual\s*#?(\d+)"
    r"(?:\s*-\s*(\d+))?"
)

# "material from" partial issues — skip these
MATERIAL_FROM = re.compile(r"material\s+from", re.IGNORECASE)


def expand_number_list(numbers_str: str) -> list[int]:
    """Expand a comma/hyphen number string like '64, 69-70, 81-82' into individual numbers."""
    results = []
    # Split on commas first
    parts = re.split(r"\s*,\s*", numbers_str.strip())
    for part in parts:
        part = part.strip()
        if not part:
            continue
        # Check for range
        range_match = re.match(r"(\d+)\s*-\s*(\d+)", part)
        if range_match:
            start, end = int(range_match.group(1)), int(range_match.group(2))
            if end >= start and (end - start) < 500:  # Sanity check
                results.extend(range(start, end + 1))
        else:
            # Single number
            num_match = re.match(r"(\d+)", part)
            if num_match:
                results.append(int(num_match.group(1)))
    return results


def parse_collects(collects_str: str, edition_slug: str) -> list[dict]:
    """Parse a 'Collects' string into structured issue entries."""
    if not collects_str or not collects_str.strip():
        return []

    issues = []

    # Split on semicolons and " and " at top level
    segments = re.split(r"\s*;\s*|\s+and\s+", collects_str)

    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue

        # Skip "material from" partial entries
        if MATERIAL_FROM.search(segment):
            continue

        # Try annual pattern first
        annual_matches = list(ANNUAL_PATTERN.finditer(segment))
        for m in annual_matches:
            series = m.group(1).strip()
            year = m.group(2) or ""
            start = int(m.group(3))
            end = int(m.group(4)) if m.group(4) else start

            series_name = f"{series} ({year})" if year else series
            for num in range(start, end + 1):
                issues.append({
                    "edition_slug": edition_slug,
                    "series_name": series_name,
                    "issue_number": num,
                    "is_annual": True,
                })

        # Remove annual portions from segment before parsing regular issues
        segment_no_annuals = ANNUAL_PATTERN.sub("", segment).strip()
        if not segment_no_annuals:
            continue

        parsed = False

        # Try "Series (Year) #numbers" pattern
        m = SERIES_YEAR_HASH_PATTERN.search(segment_no_annuals)
        if m:
            series = m.group(1).strip()
            year = m.group(2)
            numbers = expand_number_list(m.group(3))
            series_name = f"{series} ({year})"
            for num in numbers:
                issues.append({
                    "edition_slug": edition_slug,
                    "series_name": series_name,
                    "issue_number": num,
                    "is_annual": False,
                })
            parsed = True

        # Try "Series (Year) numbers" (no hash)
        if not parsed:
            m = SERIES_YEAR_NOHASH_PATTERN.search(segment_no_annuals)
            if m:
                series = m.group(1).strip()
                year = m.group(2)
                numbers = expand_number_list(m.group(3))
                if numbers:  # Only if we got valid numbers
                    series_name = f"{series} ({year})"
                    for num in numbers:
                        issues.append({
                            "edition_slug": edition_slug,
                            "series_name": series_name,
                            "issue_number": num,
                            "is_annual": False,
                        })
                    parsed = True

        # Try "Series #numbers" (no year)
        if not parsed:
            m = SERIES_HASH_PATTERN.search(segment_no_annuals)
            if m:
                series = m.group(1).strip()
                numbers = expand_number_list(m.group(2))
                for num in numbers:
                    issues.append({
                        "edition_slug": edition_slug,
                        "series_name": series,
                        "issue_number": num,
                        "is_annual": False,
                    })
                parsed = True

        # Last resort: "SERIES NAME N-M, N2-M2" (no year, no hash)
        if not parsed:
            # Match series name followed by number ranges
            m = re.match(
                r"([A-Za-z][A-Za-z0-9\s\-\'\.\!\&\:]+?)\s+([\d][\d\s,\-\.]+)",
                segment_no_annuals
            )
            if m:
                series = m.group(1).strip().rstrip(",")
                numbers = expand_number_list(m.group(2))
                if numbers and len(series) > 2:
                    for num in numbers:
                        issues.append({
                            "edition_slug": edition_slug,
                            "series_name": series,
                            "issue_number": num,
                            "is_annual": False,
                        })
                    parsed = True

    return issues


def run():
    print("Phase 3: Parse 'Collects' into Edition Issues")
    print("=" * 50)

    with open(INPUT_PATH) as f:
        entries = json.load(f)

    all_issues = []
    parsed_count = 0
    unparsed = []

    for entry in entries:
        collects = entry.get("issues_collected", "")
        slug = entry["slug"]
        issues = parse_collects(collects, slug)

        if issues:
            all_issues.extend(issues)
            parsed_count += 1
        elif collects.strip():
            unparsed.append({
                "slug": slug,
                "title": entry["title"],
                "collects": collects,
            })

    print(f"Editions processed: {len(entries)}")
    print(f"Editions with parsed issues: {parsed_count}")
    print(f"Editions with unparseable collects: {len(unparsed)}")
    print(f"Total issue entries generated: {len(all_issues)}")

    if unparsed:
        print(f"\nFirst 10 unparseable entries:")
        for u in unparsed[:10]:
            print(f"  {u['slug']}: {u['collects'][:80]}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_issues, f, indent=2)
    print(f"\nSaved: {OUTPUT_PATH}")

    # Save unparsed log
    unparsed_path = SCRIPT_DIR / "phase3_unparsed.json"
    with open(unparsed_path, "w") as f:
        json.dump(unparsed, f, indent=2)
    print(f"Saved: {unparsed_path}")

    return all_issues


if __name__ == "__main__":
    run()

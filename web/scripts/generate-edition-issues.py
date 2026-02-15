#!/usr/bin/env python3
"""
Parse issues_collected strings from collected_editions.json and generate
individual issue entries for edition_issues.json.

Handles formats like:
  - "Fantastic Four #1-30, Annual #1"
  - "Amazing Spider-Man (1999) #30-58, #500-514"
  - "Iron Man #120-128"
  - "Thor (2007) #1-12, #600-603, Giant-Size Finale"
  - "Spider-Man Unlimited #1-2, Web of Spider-Man #101-103, Amazing Spider-Man #378-380"
  - "Marvel Graphic Novel #4, New Mutants #1-34, Annual #1"
  - "X Lives of Wolverine #1-5, X Deaths of Wolverine #1-5"
"""

import json
import re
import sys
from pathlib import Path

def parse_issues_collected(text: str, edition_slug: str) -> list[dict]:
    """Parse an issues_collected string into individual issue entries."""
    results = []

    # Clean up the string
    text = text.strip()
    if not text or '#' not in text:
        return results

    # Remove parenthetical year info for cleaner parsing, but keep for series name
    # e.g., "Amazing Spider-Man (1999) #30-58" -> series="Amazing Spider-Man (1999)"

    # Split by comma, but be smart about it
    # We need to handle: "Series #1-5, #10-15" (same series) vs "Series A #1-5, Series B #1-5" (diff series)
    segments = split_segments(text)

    current_series = None

    for seg in segments:
        seg = seg.strip()
        if not seg:
            continue

        # Check if this segment starts a new series or continues the current one
        # A segment like "#10-15" continues the current series
        # A segment like "New Mutants #1-34" starts a new series

        # Check for Annual pattern: "Annual #1-3" or "Annuals #1-3"
        annual_match = re.match(r'^Annuals?\s*#(\d+)(?:\s*-\s*(\d+))?', seg, re.IGNORECASE)
        if annual_match and current_series:
            start = int(annual_match.group(1))
            end = int(annual_match.group(2)) if annual_match.group(2) else start
            for n in range(start, end + 1):
                results.append({
                    "edition_slug": edition_slug,
                    "series_name": current_series,
                    "issue_number": n,
                    "is_annual": True
                })
            continue

        # Check for "Giant-Size X" pattern (single issues, not ranges)
        giant_match = re.match(r'^(Giant-Size\s+[\w\s\-&\']+)\s*#(\d+)(?:\s*-\s*(\d+))?', seg, re.IGNORECASE)
        if giant_match:
            series = giant_match.group(1).strip()
            start = int(giant_match.group(2))
            end = int(giant_match.group(3)) if giant_match.group(3) else start
            current_series = series
            for n in range(start, end + 1):
                results.append({
                    "edition_slug": edition_slug,
                    "series_name": series,
                    "issue_number": n,
                    "is_annual": False
                })
            continue

        # Check for continuation: "#10-15" or "#10"
        cont_match = re.match(r'^#(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?$', seg.strip())
        if cont_match and current_series:
            start = parse_issue_num(cont_match.group(1))
            end = parse_issue_num(cont_match.group(2)) if cont_match.group(2) else start
            if start is not None and end is not None:
                for n in gen_range(start, end):
                    results.append({
                        "edition_slug": edition_slug,
                        "series_name": current_series,
                        "issue_number": n,
                        "is_annual": False
                    })
            continue

        # Check for "Series Name #X-Y" pattern
        # Series name can include: letters, numbers, spaces, hyphens, colons, apostrophes, parenthetical years
        series_match = re.match(
            r'^(.+?)\s*#(\d+(?:\.\d+)?)(?:\s*-\s*(\d+(?:\.\d+)?))?(?:\s*$)',
            seg.strip()
        )
        if series_match:
            series = series_match.group(1).strip()
            # Clean trailing "and" or similar
            series = re.sub(r'\s+and\s*$', '', series, flags=re.IGNORECASE)
            start = parse_issue_num(series_match.group(2))
            end = parse_issue_num(series_match.group(3)) if series_match.group(3) else start

            if start is not None and end is not None and series:
                current_series = series
                for n in gen_range(start, end):
                    results.append({
                        "edition_slug": edition_slug,
                        "series_name": series,
                        "issue_number": n,
                        "is_annual": False
                    })
            continue

        # Check for "Series Name Annual #X-Y"
        series_annual_match = re.match(
            r'^(.+?)\s+Annuals?\s*#(\d+)(?:\s*-\s*(\d+))?',
            seg.strip(),
            re.IGNORECASE
        )
        if series_annual_match:
            series = series_annual_match.group(1).strip()
            start = int(series_annual_match.group(2))
            end = int(series_annual_match.group(3)) if series_annual_match.group(3) else start
            current_series = series
            for n in range(start, end + 1):
                results.append({
                    "edition_slug": edition_slug,
                    "series_name": series,
                    "issue_number": n,
                    "is_annual": True
                })
            continue

    return results


def split_segments(text: str) -> list[str]:
    """Split issues_collected by commas and semicolons, preserving parenthetical content."""
    # Split on comma or semicolon, but not inside parentheses
    segments = []
    depth = 0
    current = ""
    for ch in text:
        if ch == '(':
            depth += 1
            current += ch
        elif ch == ')':
            depth -= 1
            current += ch
        elif (ch == ',' or ch == ';') and depth == 0:
            segments.append(current.strip())
            current = ""
        else:
            current += ch
    if current.strip():
        segments.append(current.strip())
    return segments


def parse_issue_num(s: str) -> int | None:
    """Parse an issue number, handling decimals like 5.1"""
    if s is None:
        return None
    try:
        f = float(s)
        return int(f)  # Truncate .1 variants to whole number
    except ValueError:
        return None


def gen_range(start: int, end: int) -> range:
    """Generate a range, handling cases where end < start (renumbering)."""
    if end >= start:
        return range(start, end + 1)
    else:
        # This can happen with renumbered series, just return start
        return range(start, start + 1)


def main():
    base = Path(__file__).parent.parent / "data"

    with open(base / "collected_editions.json") as f:
        editions = json.load(f)

    with open(base / "edition_issues.json") as f:
        existing = json.load(f)

    existing_slugs = set(e["edition_slug"] for e in existing)

    new_entries = []
    skipped = []

    for ed in editions:
        if ed["slug"] in existing_slugs:
            continue

        entries = parse_issues_collected(ed["issues_collected"], ed["slug"])
        if entries:
            new_entries.extend(entries)
        else:
            skipped.append((ed["slug"], ed["issues_collected"]))

    # Merge with existing
    all_entries = existing + new_entries

    # Deduplicate
    seen = set()
    deduped = []
    for entry in all_entries:
        key = (entry["edition_slug"], entry["series_name"], entry["issue_number"], entry["is_annual"])
        if key not in seen:
            seen.add(key)
            deduped.append(entry)

    # Sort by edition_slug, then series, then issue number
    deduped.sort(key=lambda e: (e["edition_slug"], e["series_name"], e["is_annual"], e["issue_number"]))

    with open(base / "edition_issues.json", "w") as f:
        json.dump(deduped, f, indent=4)

    print(f"Existing entries: {len(existing)}")
    print(f"New entries generated: {len(new_entries)}")
    print(f"Total after dedup: {len(deduped)}")
    print(f"Editions newly mapped: {len(set(e['edition_slug'] for e in new_entries))}")
    print(f"Editions skipped (unparseable): {len(skipped)}")

    if skipped:
        print(f"\nSkipped editions:")
        for slug, ic in skipped:
            print(f"  {slug}: {ic}")


if __name__ == "__main__":
    main()

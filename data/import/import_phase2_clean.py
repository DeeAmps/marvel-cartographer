#!/usr/bin/env python3
"""Phase 2: Clean titles, map formats, generate slugs, parse dates/prices."""

import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

INPUT_PATH = SCRIPT_DIR / "phase1_parsed.json"
EXISTING_PATH = WEB_DATA_DIR / "collected_editions.json"
OUTPUT_PATH = SCRIPT_DIR / "phase2_cleaned.json"

# Format mapping from archive format strings to DB enum values
FORMAT_MAP = {
    "Omnibus": "omnibus",
    "TPB": "trade_paperback",
    "SHC": "hardcover",
    "OHC": "oversized_hardcover",
    "Epic Collection TPB": "epic_collection",
    "Masterworks SHC": "masterworks",
    "Masterworks TPB": "masterworks",
    "Complete Collection TPB": "complete_collection",
    "Premier Collection Digest TPB": "premier_collection",
    "Digest": "trade_paperback",
    "Treasury": "oversized_hardcover",
    "Library": "hardcover",
    "Archive": "hardcover",
    "Gallery": "hardcover",
    "Custom": "hardcover",
    "Box Set TPB": "trade_paperback",
}

# Title keywords for format inference when Format is empty
FORMAT_TITLE_HINTS = [
    ("omnibus", "omnibus"),
    ("epic collection", "epic_collection"),
    ("masterworks", "masterworks"),
    ("complete collection", "complete_collection"),
    ("premier collection", "premier_collection"),
    ("compendium", "compendium"),
    (" ohc", "oversized_hardcover"),
    (" hc", "hardcover"),
    (" tp", "trade_paperback"),
    (" tpb", "trade_paperback"),
]

# Variant cover suffixes to strip
VARIANT_SUFFIXES = [
    r"\s*\(DM Only\)",
    r"\s*DM Only",
    r"\s*DM Var(?:iant)?",
    r"\s*DM Cover",
    r"\s*DM Exclusive",
    r"\s*Direct Market(?: Variant)?",
    r"\s*New Ptg(?:\s*\(Reprint\))?",
    r"\s*\(Reprint\)",
    r"\s*Reprint",
    r"\s*\[.*?\]$",  # Bracketed cover artist names at end
    r"\s*\(New Printing\)",
    r"\s*New Printing",
]


def clean_title(title: str) -> str:
    """Strip variant cover suffixes and normalize volume notation."""
    cleaned = title.strip()
    for pattern in VARIANT_SUFFIXES:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE).strip()
    # Normalize volume notation
    cleaned = re.sub(r"\bVolume\s+", "Vol. ", cleaned)
    cleaned = re.sub(r"\bVol\s+(\d)", r"Vol. \1", cleaned)
    # Clean up double spaces
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()
    return cleaned


def map_format(archive_format: str, title: str) -> str:
    """Map archive format string to DB enum value."""
    fmt = archive_format.strip()
    if fmt and fmt in FORMAT_MAP:
        return FORMAT_MAP[fmt]

    # Infer from title
    title_lower = title.lower()
    for keyword, db_format in FORMAT_TITLE_HINTS:
        if keyword in title_lower:
            return db_format

    # Default fallback
    return "hardcover"


def generate_slug(title: str, fmt: str) -> str:
    """Generate a URL-friendly slug from title."""
    slug = title.lower()

    # Common abbreviations
    abbreviations = {
        "fantastic four": "ff",
        "amazing spider-man": "asm",
        "spectacular spider-man": "spec-sm",
        "uncanny x-men": "ux",
        "incredible hulk": "hulk",
        "invincible iron man": "iim",
        "captain america": "cap",
        "mighty thor": "thor",
        "avengers": "avengers",
        "daredevil": "dd",
        "doctor strange": "dr-strange",
    }
    for full, abbr in abbreviations.items():
        if slug.startswith(full):
            slug = slug.replace(full, abbr, 1)

    # Remove format suffixes from slug
    for suffix in ["omnibus", "epic collection", "masterworks",
                    "complete collection", "premier collection",
                    "oversized hardcover", "hardcover", "trade paperback"]:
        slug = slug.replace(suffix, "")

    # Format abbreviation
    fmt_abbr = {
        "omnibus": "omnibus",
        "epic_collection": "epic",
        "masterworks": "mmw",
        "trade_paperback": "tp",
        "hardcover": "hc",
        "oversized_hardcover": "ohc",
        "complete_collection": "cc",
        "compendium": "comp",
        "premier_collection": "prem",
    }

    # Extract volume number
    vol_match = re.search(r"vol\.?\s*(\d+)", slug)
    vol_num = vol_match.group(1) if vol_match else ""

    # Clean slug
    slug = re.sub(r"vol\.?\s*\d+", "", slug)
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"\s+", "-", slug.strip())
    slug = re.sub(r"-{2,}", "-", slug)
    slug = slug.strip("-")

    # Add format abbreviation
    fmt_suffix = fmt_abbr.get(fmt, "")
    if fmt_suffix and fmt_suffix not in slug:
        slug = f"{slug}-{fmt_suffix}" if slug else fmt_suffix

    # Add volume number
    if vol_num:
        slug = f"{slug}-v{vol_num}"

    # Final cleanup
    slug = re.sub(r"-{2,}", "-", slug).strip("-")

    return slug if slug else "unknown-edition"


def parse_date(date_str: str) -> str | None:
    """Parse DD/MM/YYYY to YYYY-MM-DD."""
    if not date_str or not date_str.strip():
        return None
    parts = date_str.strip().split("/")
    if len(parts) == 3:
        day, month, year = parts
        try:
            return f"{int(year):04d}-{int(month):02d}-{int(day):02d}"
        except ValueError:
            return None
    return None


def parse_price(price_str: str) -> float | None:
    """Parse '$75.00' to 75.0."""
    if not price_str:
        return None
    cleaned = price_str.replace("$", "").replace(",", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return None


def deduplicate_slugs(entries: list[dict], existing_slugs: set[str]) -> list[dict]:
    """Ensure all slugs are unique across new and existing entries."""
    all_slugs = set(existing_slugs)
    for entry in entries:
        slug = entry["slug"]
        if slug in all_slugs:
            # Add numeric suffix
            i = 2
            while f"{slug}-{i}" in all_slugs:
                i += 1
            entry["slug"] = f"{slug}-{i}"
        all_slugs.add(entry["slug"])
    return entries


def run():
    print("Phase 2: Clean Titles & Map Formats")
    print("=" * 50)

    with open(INPUT_PATH) as f:
        entries = json.load(f)
    with open(EXISTING_PATH) as f:
        existing = json.load(f)

    existing_slugs = {e["slug"] for e in existing}
    print(f"Input entries: {len(entries)}")
    print(f"Existing slugs: {len(existing_slugs)}")

    cleaned = []
    format_stats = {}
    format_inferred_count = 0

    for entry in entries:
        title = clean_title(entry["Title"])
        fmt = map_format(entry.get("Format", ""), title)
        slug = generate_slug(title, fmt)

        if not entry.get("Format"):
            format_inferred_count += 1

        format_stats[fmt] = format_stats.get(fmt, 0) + 1

        cleaned_entry = {
            "slug": slug,
            "title": title,
            "format": fmt,
            "issues_collected": entry.get("Collects", ""),
            "isbn": entry.get("ISBN", "").strip() or None,
            "cover_price": parse_price(entry.get("Price", "")),
            "release_date": parse_date(entry.get("Release", "")),
            "diamond_code": entry.get("Code", "").strip() or None,
            "print_status": "check_availability",
            "importance": "supplemental",  # Default, Phase 5 will override
            "synopsis": "",  # Phase 5 will fill
            "connection_notes": "",
            "cover_image_url": None,
            "era_slug": None,  # Phase 4 will fill
            "creators": [],
        }

        # Carry over variant codes if present
        if entry.get("variant_codes"):
            cleaned_entry["variant_codes"] = entry["variant_codes"]

        cleaned.append(cleaned_entry)

    # Deduplicate slugs
    cleaned = deduplicate_slugs(cleaned, existing_slugs)

    print(f"\nFormat distribution:")
    for fmt, count in sorted(format_stats.items(), key=lambda x: -x[1]):
        print(f"  {fmt}: {count}")
    print(f"Formats inferred from title: {format_inferred_count}")

    # Check for any remaining slug collisions (should be 0)
    all_slugs = [e["slug"] for e in cleaned]
    dupes = [s for s, c in __import__("collections").Counter(all_slugs).items() if c > 1]
    if dupes:
        print(f"WARNING: {len(dupes)} slug collisions remain: {dupes[:5]}")
    else:
        print("No slug collisions detected.")

    print(f"\nCleaned entries: {len(cleaned)}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(cleaned, f, indent=2)
    print(f"Saved: {OUTPUT_PATH}")

    return cleaned


if __name__ == "__main__":
    run()

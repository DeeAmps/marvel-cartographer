#!/usr/bin/env python3
"""Phase 8: Merge new editions into existing data files and validate."""

import json
import os
import shutil
from collections import Counter
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent
WEB_DATA_DIR = DATA_DIR.parent / "web" / "data"
ARCHIVE_DIR = DATA_DIR / "archive"

# Input files (from pipeline)
NEW_EDITIONS_PATH = SCRIPT_DIR / "phase5_enriched.json"
NEW_ISSUES_PATH = SCRIPT_DIR / "phase3_edition_issues.json"
NEW_CONNECTIONS_PATH = SCRIPT_DIR / "phase6_connections.json"
ISBN_BACKFILL_PATH = SCRIPT_DIR / "phase1_isbn_backfill.json"

# Existing data files
EXISTING_EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
EXISTING_ISSUES_PATH = WEB_DATA_DIR / "edition_issues.json"
EXISTING_CONNECTIONS_PATH = WEB_DATA_DIR / "connections.json"

# Output
REPORT_PATH = SCRIPT_DIR / "phase8_merge_report.json"

# Valid enum values
VALID_FORMATS = {
    "omnibus", "epic_collection", "trade_paperback", "hardcover",
    "masterworks", "compendium", "complete_collection", "oversized_hardcover",
    "premier_collection"
}
VALID_IMPORTANCE = {"essential", "recommended", "supplemental", "completionist"}
VALID_PRINT_STATUS = {
    "in_print", "out_of_print", "upcoming", "digital_only", "ongoing", "check_availability"
}


def validate_editions(editions: list[dict]) -> list[str]:
    """Validate all editions have required fields."""
    errors = []
    for i, ed in enumerate(editions):
        slug = ed.get("slug", f"[index {i}]")
        if not ed.get("slug"):
            errors.append(f"{slug}: missing slug")
        if not ed.get("title"):
            errors.append(f"{slug}: missing title")
        if not ed.get("format"):
            errors.append(f"{slug}: missing format")
        elif ed["format"] not in VALID_FORMATS:
            errors.append(f"{slug}: invalid format '{ed['format']}'")
        if not ed.get("issues_collected"):
            errors.append(f"{slug}: missing issues_collected")
        if not ed.get("era_slug"):
            errors.append(f"{slug}: missing era_slug")
        if not ed.get("synopsis"):
            errors.append(f"{slug}: missing synopsis")
        if ed.get("importance") and ed["importance"] not in VALID_IMPORTANCE:
            errors.append(f"{slug}: invalid importance '{ed['importance']}'")
        if ed.get("print_status") and ed["print_status"] not in VALID_PRINT_STATUS:
            errors.append(f"{slug}: invalid print_status '{ed['print_status']}'")
    return errors


def check_duplicate_slugs(editions: list[dict]) -> list[str]:
    """Check for duplicate slugs."""
    slugs = [e["slug"] for e in editions]
    counts = Counter(slugs)
    return [f"Duplicate slug: {slug} ({count}x)" for slug, count in counts.items() if count > 1]


def validate_connections(connections: list[dict], valid_slugs: set[str]) -> list[str]:
    """Validate all connection slugs exist."""
    errors = []
    for c in connections:
        if c["source_slug"] not in valid_slugs:
            errors.append(f"Connection source slug not found: {c['source_slug']}")
        if c["target_slug"] not in valid_slugs:
            errors.append(f"Connection target slug not found: {c['target_slug']}")
    return errors


def apply_isbn_backfill(editions: list[dict], backfills: list[dict]) -> int:
    """Apply ISBN and other backfills to existing editions."""
    slug_map = {e["slug"]: e for e in editions}
    count = 0
    for bf in backfills:
        slug = bf.get("slug")
        if slug and slug in slug_map:
            ed = slug_map[slug]
            if bf.get("isbn") and not ed.get("isbn"):
                ed["isbn"] = bf["isbn"]
                count += 1
            if bf.get("cover_price") and not ed.get("cover_price"):
                ed["cover_price"] = bf["cover_price"]
                count += 1
            if bf.get("diamond_code"):
                ed["diamond_code"] = bf["diamond_code"]
                count += 1
    return count


def run():
    print("Phase 8: Merge & Validate")
    print("=" * 50)

    report = {}

    # Load all data
    with open(EXISTING_EDITIONS_PATH) as f:
        existing_editions = json.load(f)
    with open(NEW_EDITIONS_PATH) as f:
        new_editions = json.load(f)

    print(f"Existing editions: {len(existing_editions)}")
    print(f"New editions: {len(new_editions)}")

    # Load connections
    with open(EXISTING_CONNECTIONS_PATH) as f:
        existing_connections = json.load(f)
    if NEW_CONNECTIONS_PATH.exists():
        with open(NEW_CONNECTIONS_PATH) as f:
            new_connections = json.load(f)
    else:
        new_connections = []

    # Load issues
    with open(EXISTING_ISSUES_PATH) as f:
        existing_issues = json.load(f)
    if NEW_ISSUES_PATH.exists():
        with open(NEW_ISSUES_PATH) as f:
            new_issues = json.load(f)
    else:
        new_issues = []

    # Load backfills
    if ISBN_BACKFILL_PATH.exists():
        with open(ISBN_BACKFILL_PATH) as f:
            backfills = json.load(f)
    else:
        backfills = []

    # Step 1: Validate new editions
    print("\n--- Validation ---")
    edition_errors = validate_editions(new_editions)
    if edition_errors:
        print(f"Edition validation errors: {len(edition_errors)}")
        for err in edition_errors[:10]:
            print(f"  {err}")
        if len(edition_errors) > 10:
            print(f"  ... and {len(edition_errors) - 10} more")
    else:
        print("Edition validation: PASSED")

    # Step 2: Apply ISBN backfills to existing editions
    backfill_count = apply_isbn_backfill(existing_editions, backfills)
    print(f"ISBN backfills applied: {backfill_count}")

    # Step 3: Merge editions
    merged_editions = existing_editions + new_editions
    slug_errors = check_duplicate_slugs(merged_editions)
    if slug_errors:
        print(f"Slug collision errors: {len(slug_errors)}")
        for err in slug_errors[:5]:
            print(f"  {err}")
    else:
        print("Slug uniqueness: PASSED")

    # Step 4: Validate connections
    all_slugs = {e["slug"] for e in merged_editions}
    merged_connections = existing_connections + new_connections
    conn_errors = validate_connections(merged_connections, all_slugs)
    if conn_errors:
        # Remove invalid connections instead of failing
        valid_connections = [
            c for c in merged_connections
            if c["source_slug"] in all_slugs and c["target_slug"] in all_slugs
        ]
        removed = len(merged_connections) - len(valid_connections)
        print(f"Removed {removed} connections with invalid slugs")
        merged_connections = valid_connections
    else:
        print("Connection validation: PASSED")

    # Step 5: Merge issues
    merged_issues = existing_issues + new_issues

    # Step 6: Save merged files
    print("\n--- Saving ---")

    with open(EXISTING_EDITIONS_PATH, "w") as f:
        json.dump(merged_editions, f, indent=2)
    print(f"Saved: {EXISTING_EDITIONS_PATH} ({len(merged_editions)} editions)")

    with open(EXISTING_CONNECTIONS_PATH, "w") as f:
        json.dump(merged_connections, f, indent=2)
    print(f"Saved: {EXISTING_CONNECTIONS_PATH} ({len(merged_connections)} connections)")

    with open(EXISTING_ISSUES_PATH, "w") as f:
        json.dump(merged_issues, f, indent=2)
    print(f"Saved: {EXISTING_ISSUES_PATH} ({len(merged_issues)} issues)")

    # Step 7: Copy to archive directory
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copy2(EXISTING_EDITIONS_PATH, ARCHIVE_DIR / "collected_editions.json")
    shutil.copy2(EXISTING_CONNECTIONS_PATH, ARCHIVE_DIR / "connections.json")
    print(f"Copied to archive: {ARCHIVE_DIR}")

    # Report
    report = {
        "existing_editions": len(existing_editions),
        "new_editions": len(new_editions),
        "merged_editions": len(merged_editions),
        "existing_connections": len(existing_connections),
        "new_connections": len(new_connections),
        "merged_connections": len(merged_connections),
        "existing_issues": len(existing_issues),
        "new_issues": len(new_issues),
        "merged_issues": len(merged_issues),
        "isbn_backfills_applied": backfill_count,
        "edition_validation_errors": len(edition_errors),
        "slug_collision_errors": len(slug_errors),
        "connection_validation_errors": len(conn_errors),
        "status": "SUCCESS" if not slug_errors else "WARNINGS",
    }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved report: {REPORT_PATH}")
    print(f"\nFinal counts:")
    print(f"  Editions: {len(existing_editions)} → {len(merged_editions)}")
    print(f"  Connections: {len(existing_connections)} → {len(merged_connections)}")
    print(f"  Issues: {len(existing_issues)} → {len(merged_issues)}")
    print(f"\nStatus: {report['status']}")

    return report


if __name__ == "__main__":
    run()

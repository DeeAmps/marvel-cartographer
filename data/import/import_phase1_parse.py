#!/usr/bin/env python3
"""Phase 1: Parse & Deduplicate archive editions against existing data."""

import json
import os
import sys
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
DATA_DIR = SCRIPT_DIR.parent
WEB_DATA_DIR = DATA_DIR.parent / "web" / "data"

ARCHIVE_PATH = DATA_DIR / "marvel_collected_editions_archive.json"
EXISTING_PATH = WEB_DATA_DIR / "collected_editions.json"

OUTPUT_PARSED = SCRIPT_DIR / "phase1_parsed.json"
OUTPUT_REPORT = SCRIPT_DIR / "phase1_report.json"
OUTPUT_ISBN_BACKFILL = SCRIPT_DIR / "phase1_isbn_backfill.json"
OUTPUT_STAR_WARS = SCRIPT_DIR / "phase1_star_wars.json"
OUTPUT_CONAN = SCRIPT_DIR / "phase1_conan.json"

FUZZY_THRESHOLD = 0.85


def normalize_title_for_matching(title: str) -> str:
    """Normalize title for fuzzy matching."""
    t = title.lower().strip()
    # Remove common suffixes
    for suffix in [" hc", " tp", " tpb", " shc", " ohc", " dm var", " dm only",
                   " new ptg", " (reprint)", " reprint", " dm variant",
                   " dm cover", " direct market"]:
        t = t.replace(suffix, "")
    # Normalize volume
    t = t.replace("volume ", "vol. ").replace("vol ", "vol. ")
    return t.strip()


def merge_variant_covers(entries: list[dict]) -> list[dict]:
    """Merge entries sharing the same ISBN (variant covers)."""
    isbn_groups: dict[str, list[dict]] = {}
    no_isbn = []

    for entry in entries:
        isbn = entry.get("ISBN", "").strip()
        if isbn:
            isbn_groups.setdefault(isbn, []).append(entry)
        else:
            no_isbn.append(entry)

    merged = []
    variant_merge_count = 0

    for isbn, group in isbn_groups.items():
        if len(group) == 1:
            merged.append(group[0])
            continue

        # Pick the cleanest title (shortest, no "DM", no "Var")
        variant_merge_count += len(group) - 1
        best = min(group, key=lambda e: (
            "dm" in e["Title"].lower(),
            "var" in e["Title"].lower(),
            len(e["Title"])
        ))
        # Collect all Diamond codes
        codes = list({e["Code"] for e in group if e.get("Code")})
        best = dict(best)
        best["variant_codes"] = codes
        merged.append(best)

    merged.extend(no_isbn)
    return merged, variant_merge_count


def filter_non_marvel(entries: list[dict]) -> tuple[list[dict], list[dict], list[dict]]:
    """Separate Star Wars, Conan, and Marvel entries."""
    marvel = []
    star_wars = []
    conan = []

    for entry in entries:
        title_lower = entry["Title"].lower()
        if "star wars" in title_lower:
            star_wars.append(entry)
        elif "conan" in title_lower:
            conan.append(entry)
        else:
            marvel.append(entry)

    return marvel, star_wars, conan


def isbn_dedup(archive_entries: list[dict], existing_editions: list[dict]) -> tuple[list[dict], list[dict]]:
    """Remove archive entries whose ISBN already exists in existing data.
    Returns (new_entries, isbn_backfill_updates)."""
    existing_isbn_map = {}
    for ed in existing_editions:
        isbn = (ed.get("isbn") or "").strip()
        if isbn:
            existing_isbn_map[isbn] = ed

    new_entries = []
    backfill_updates = []

    for entry in archive_entries:
        isbn = entry.get("ISBN", "").strip()
        if isbn and isbn in existing_isbn_map:
            existing_ed = existing_isbn_map[isbn]
            update = {"slug": existing_ed["slug"]}
            changed = False
            # Backfill missing fields
            if not existing_ed.get("cover_price") and entry.get("Price"):
                price_str = entry["Price"].replace("$", "").replace(",", "").strip()
                try:
                    update["cover_price"] = float(price_str)
                    changed = True
                except ValueError:
                    pass
            if entry.get("Code"):
                update["diamond_code"] = entry["Code"]
                changed = True
            if changed:
                backfill_updates.append(update)
        else:
            new_entries.append(entry)

    return new_entries, backfill_updates


def fuzzy_title_match(archive_entries: list[dict], existing_editions: list[dict]) -> tuple[list[dict], list[dict]]:
    """Match ISBN-less existing editions against archive titles to backfill ISBNs.
    Returns (updated_archive_entries, fuzzy_matches_log)."""
    # Build list of existing editions without ISBN
    no_isbn_existing = [e for e in existing_editions if not e.get("isbn")]
    existing_normed = [(normalize_title_for_matching(e["title"]), e) for e in no_isbn_existing]

    archive_isbn_map = {}
    for entry in archive_entries:
        isbn = entry.get("ISBN", "").strip()
        if isbn:
            normed = normalize_title_for_matching(entry["Title"])
            archive_isbn_map[normed] = entry

    fuzzy_matches = []
    matched_archive_titles = set()

    for ex_normed, ex_ed in existing_normed:
        best_ratio = 0
        best_archive_title = None
        best_archive_entry = None

        for arch_normed, arch_entry in archive_isbn_map.items():
            if arch_normed in matched_archive_titles:
                continue
            ratio = SequenceMatcher(None, ex_normed, arch_normed).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                best_archive_title = arch_normed
                best_archive_entry = arch_entry

        if best_ratio >= FUZZY_THRESHOLD and best_archive_entry:
            matched_archive_titles.add(best_archive_title)
            fuzzy_matches.append({
                "existing_slug": ex_ed["slug"],
                "existing_title": ex_ed["title"],
                "archive_title": best_archive_entry["Title"],
                "archive_isbn": best_archive_entry.get("ISBN", ""),
                "match_ratio": round(best_ratio, 4),
            })

    return fuzzy_matches


def run():
    print("Phase 1: Parse & Deduplicate")
    print("=" * 50)

    # Load data
    with open(ARCHIVE_PATH) as f:
        archive = json.load(f)
    with open(EXISTING_PATH) as f:
        existing = json.load(f)

    print(f"Archive entries loaded: {len(archive)}")
    print(f"Existing editions loaded: {len(existing)}")

    # Step 1: Merge variant covers
    merged, variant_count = merge_variant_covers(archive)
    print(f"After variant merge: {len(merged)} entries ({variant_count} variants collapsed)")

    # Step 2: Categorize (but keep all entries)
    marvel, star_wars, conan = filter_non_marvel(merged)
    print(f"Marvel entries: {len(marvel)}")
    print(f"Star Wars entries: {len(star_wars)}")
    print(f"Conan entries: {len(conan)}")
    all_entries = marvel + star_wars + conan
    print(f"Total (all included): {len(all_entries)}")

    # Step 3: ISBN dedup
    new_entries, isbn_backfill = isbn_dedup(all_entries, existing)
    isbn_dedup_count = len(marvel) - len(new_entries)
    print(f"ISBN duplicates removed: {isbn_dedup_count}")
    print(f"ISBN backfill updates: {len(isbn_backfill)}")

    # Step 4: Fuzzy title match for ISBN backfill
    fuzzy_matches = fuzzy_title_match(new_entries, existing)
    print(f"Fuzzy title matches (ISBN backfill): {len(fuzzy_matches)}")

    # Remove fuzzy-matched entries from new_entries (they're already in existing)
    fuzzy_matched_isbns = {m["archive_isbn"] for m in fuzzy_matches if m["archive_isbn"]}
    before_fuzzy = len(new_entries)
    new_entries = [e for e in new_entries if e.get("ISBN", "") not in fuzzy_matched_isbns or not e.get("ISBN")]
    fuzzy_removed = before_fuzzy - len(new_entries)
    print(f"Fuzzy-matched entries removed: {fuzzy_removed}")

    print(f"\nFinal new entries for import: {len(new_entries)}")

    # Save outputs
    with open(OUTPUT_PARSED, "w") as f:
        json.dump(new_entries, f, indent=2)
    print(f"Saved: {OUTPUT_PARSED}")

    with open(OUTPUT_ISBN_BACKFILL, "w") as f:
        # Combine ISBN backfills and fuzzy match backfills
        all_backfills = isbn_backfill + [
            {"slug": m["existing_slug"], "isbn": m["archive_isbn"]}
            for m in fuzzy_matches if m["archive_isbn"]
        ]
        json.dump(all_backfills, f, indent=2)
    print(f"Saved: {OUTPUT_ISBN_BACKFILL}")

    with open(OUTPUT_STAR_WARS, "w") as f:
        json.dump(star_wars, f, indent=2)
    with open(OUTPUT_CONAN, "w") as f:
        json.dump(conan, f, indent=2)
    print(f"Saved: Star Wars ({len(star_wars)}) and Conan ({len(conan)}) exclusions")

    # Report
    report = {
        "archive_total": len(archive),
        "existing_total": len(existing),
        "variant_merges": variant_count,
        "after_variant_merge": len(merged),
        "star_wars_excluded": len(star_wars),
        "conan_excluded": len(conan),
        "marvel_entries": len(marvel),
        "isbn_duplicates_removed": isbn_dedup_count,
        "isbn_backfill_updates": len(isbn_backfill),
        "fuzzy_matches": len(fuzzy_matches),
        "fuzzy_removed": fuzzy_removed,
        "final_new_entries": len(new_entries),
        "fuzzy_match_details": fuzzy_matches[:20],  # First 20 for review
    }
    with open(OUTPUT_REPORT, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Saved: {OUTPUT_REPORT}")

    return new_entries


if __name__ == "__main__":
    run()

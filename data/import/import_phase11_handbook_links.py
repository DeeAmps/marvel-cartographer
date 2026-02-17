#!/usr/bin/env python3
"""Phase 11: Link existing handbook entries to new editions (no API calls).

Programmatically matches handbook entries to editions by slug/title/synopsis overlap.
Also updates related_event_slugs by matching events to handbook entries.

Usage:
  python3 import_phase11_handbook_links.py              # Full run
  python3 import_phase11_handbook_links.py --dry-run     # Report changes without writing
"""

import argparse
import json
import re
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

HANDBOOK_PATH = WEB_DATA_DIR / "handbook_entries.json"
EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
EVENTS_PATH = WEB_DATA_DIR / "events.json"
CHARACTERS_PATH = WEB_DATA_DIR / "characters.json"

REPORT_PATH = SCRIPT_DIR / "phase11_report.json"

MAX_RELATED_EDITIONS = 20
MAX_RELATED_EVENTS = 10


def normalize(text: str) -> str:
    """Normalize text for matching: lowercase, strip punctuation."""
    return re.sub(r'[^a-z0-9\s]', '', text.lower()).strip()


def build_edition_index(editions: list[dict]) -> dict:
    """Build lookup structures for editions."""
    return {
        "by_slug": {ed["slug"]: ed for ed in editions},
        "all": editions,
    }


def extract_handbook_keywords(entry: dict) -> list[str]:
    """Extract matching keywords from a handbook entry."""
    keywords = []

    # Entry name (most important)
    name = entry.get("name", "")
    # Strip parenthetical clarifications like "Doctor Doom (Victor Von Doom)"
    clean_name = re.sub(r'\s*\([^)]*\)', '', name).strip()
    if clean_name:
        keywords.append(clean_name.lower())

    # Also add the name without "the" prefix
    if clean_name.lower().startswith("the "):
        keywords.append(clean_name[4:].lower())

    # Slug as keyword (e.g., "doctor-doom" → "doctor doom")
    slug = entry.get("slug", "")
    if slug:
        keywords.append(slug.replace("-", " "))

    # Tags
    for tag in entry.get("tags", []):
        if len(tag) > 3:  # skip very short tags
            keywords.append(tag.replace("-", " "))

    # Related handbook slugs converted to names
    for hs in entry.get("related_handbook_slugs", []):
        if len(hs) > 3:
            keywords.append(hs.replace("-", " "))

    return keywords


def match_edition_to_handbook(edition: dict, keywords: list[str],
                               entry_slug: str, entry_type: str) -> bool:
    """Check if an edition matches a handbook entry's keywords.
    Uses conservative matching to avoid false positives.
    """
    ed_slug = edition.get("slug", "")
    ed_title = edition.get("title", "").lower()
    ed_synopsis = (edition.get("synopsis", "") or "").lower()

    # Strategy 1: Edition slug contains the handbook slug
    # e.g. "wolverine-omnibus-v1" matches "wolverine" handbook entry
    entry_slug_clean = entry_slug.replace("-", " ")
    ed_slug_clean = ed_slug.replace("-", " ")
    if len(entry_slug_clean) > 3 and entry_slug_clean in ed_slug_clean:
        return True

    # Strategy 2: Edition title contains the handbook entry name (primary keyword)
    primary_keyword = keywords[0] if keywords else ""
    if len(primary_keyword) > 3 and primary_keyword in ed_title:
        # Avoid false positives: "spider" matching "spider-man" and "spider-woman"
        # Only match if it's a whole word boundary
        pattern = r'\b' + re.escape(primary_keyword) + r'\b'
        if re.search(pattern, ed_title):
            return True

    # Strategy 3: For character entries, check synopsis for exact name mention
    if entry_type == "character" and primary_keyword and len(primary_keyword) > 4:
        pattern = r'\b' + re.escape(primary_keyword) + r'\b'
        if re.search(pattern, ed_synopsis):
            return True

    return False


def match_event_to_handbook(event: dict, entry: dict) -> bool:
    """Check if an event matches a handbook entry."""
    event_name = event.get("name", "").lower()
    event_slug = event.get("slug", "")
    event_tags = [t.lower() for t in event.get("tags", [])]

    entry_name = re.sub(r'\s*\([^)]*\)', '', entry.get("name", "")).strip().lower()
    entry_slug = entry.get("slug", "")
    entry_tags = [t.lower() for t in entry.get("tags", [])]

    # Event tags mention the handbook entry
    if entry_slug in event_tags:
        return True

    # Handbook tags mention the event
    event_slug_clean = event_slug.replace("-", " ")
    for tag in entry_tags:
        tag_clean = tag.replace("-", " ")
        if len(tag_clean) > 3 and tag_clean in event_slug_clean:
            return True
        if len(event_slug_clean) > 3 and event_slug_clean in tag_clean:
            return True

    # Event name mentions the handbook entry name
    if len(entry_name) > 3 and entry_name in event_name:
        return True

    # Handbook name mentions the event
    if len(event_name) > 4:
        pattern = r'\b' + re.escape(event_name) + r'\b'
        entry_desc = (entry.get("description", "") or "").lower()
        if re.search(pattern, entry_desc):
            return True

    return False


def run():
    parser = argparse.ArgumentParser(description="Phase 11: Link handbook entries to editions")
    parser.add_argument("--dry-run", action="store_true", help="Report without writing")
    args = parser.parse_args()

    print("Phase 11: Link Existing Handbook Entries to New Editions")
    print("=" * 60)

    # Load data
    with open(HANDBOOK_PATH) as f:
        handbook = json.load(f)
    print(f"Loaded {len(handbook)} handbook entries")

    with open(EDITIONS_PATH) as f:
        editions = json.load(f)
    print(f"Loaded {len(editions)} editions")

    with open(EVENTS_PATH) as f:
        events = json.load(f)
    print(f"Loaded {len(events)} events")

    edition_index = build_edition_index(editions)
    all_edition_slugs = {ed["slug"] for ed in editions}
    all_event_slugs = {ev["slug"] for ev in events}

    # Track changes
    total_new_edition_links = 0
    total_new_event_links = 0
    entries_updated = 0
    entries_unchanged = 0

    print("\nMatching handbook entries to editions...")

    for entry in handbook:
        entry_slug = entry.get("slug", "")
        entry_type = entry.get("entry_type", "")
        existing_edition_slugs = set(entry.get("related_edition_slugs", []))
        existing_event_slugs = set(entry.get("related_event_slugs", []))

        keywords = extract_handbook_keywords(entry)
        if not keywords:
            entries_unchanged += 1
            continue

        # Match editions
        new_edition_slugs = set()
        for ed in editions:
            ed_slug = ed["slug"]
            if ed_slug in existing_edition_slugs:
                continue
            if match_edition_to_handbook(ed, keywords, entry_slug, entry_type):
                new_edition_slugs.add(ed_slug)

        # Match events
        new_event_slugs = set()
        for ev in events:
            ev_slug = ev["slug"]
            if ev_slug in existing_event_slugs:
                continue
            if match_event_to_handbook(ev, entry):
                new_event_slugs.add(ev_slug)

        # Apply changes (respecting caps)
        changed = False

        if new_edition_slugs:
            combined = list(existing_edition_slugs | new_edition_slugs)
            # Cap at MAX_RELATED_EDITIONS, keeping existing ones first
            if len(combined) > MAX_RELATED_EDITIONS:
                # Keep all existing, fill remaining with new
                remaining = MAX_RELATED_EDITIONS - len(existing_edition_slugs)
                new_to_add = list(new_edition_slugs)[:max(0, remaining)]
                combined = list(existing_edition_slugs) + new_to_add
            entry["related_edition_slugs"] = combined
            total_new_edition_links += len(new_edition_slugs)
            changed = True

        if new_event_slugs:
            combined = list(existing_event_slugs | new_event_slugs)
            if len(combined) > MAX_RELATED_EVENTS:
                remaining = MAX_RELATED_EVENTS - len(existing_event_slugs)
                new_to_add = list(new_event_slugs)[:max(0, remaining)]
                combined = list(existing_event_slugs) + new_to_add
            entry["related_event_slugs"] = combined
            total_new_event_links += len(new_event_slugs)
            changed = True

        if changed:
            entries_updated += 1
        else:
            entries_unchanged += 1

    # Validate: remove any edition slugs that don't exist in our data
    invalid_removed = 0
    for entry in handbook:
        valid = [s for s in entry.get("related_edition_slugs", []) if s in all_edition_slugs]
        removed = len(entry.get("related_edition_slugs", [])) - len(valid)
        if removed > 0:
            entry["related_edition_slugs"] = valid
            invalid_removed += removed

        valid_events = [s for s in entry.get("related_event_slugs", []) if s in all_event_slugs]
        removed_events = len(entry.get("related_event_slugs", [])) - len(valid_events)
        if removed_events > 0:
            entry["related_event_slugs"] = valid_events
            invalid_removed += removed_events

    # Calculate coverage stats
    all_referenced_editions = set()
    all_referenced_events = set()
    for entry in handbook:
        all_referenced_editions.update(entry.get("related_edition_slugs", []))
        all_referenced_events.update(entry.get("related_event_slugs", []))

    edition_coverage = len(all_referenced_editions) / len(editions) * 100 if editions else 0
    event_coverage = len(all_referenced_events) / len(events) * 100 if events else 0

    # Report
    report = {
        "handbook_entries": len(handbook),
        "entries_updated": entries_updated,
        "entries_unchanged": entries_unchanged,
        "new_edition_links": total_new_edition_links,
        "new_event_links": total_new_event_links,
        "invalid_slugs_removed": invalid_removed,
        "edition_coverage_pct": round(edition_coverage, 1),
        "event_coverage_pct": round(event_coverage, 1),
        "editions_referenced": len(all_referenced_editions),
        "editions_total": len(editions),
        "events_referenced": len(all_referenced_events),
        "events_total": len(events),
    }

    with open(REPORT_PATH, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n{'=' * 60}")
    print("PHASE 11 RESULTS")
    print("=" * 60)
    print(f"  Entries updated: {entries_updated}")
    print(f"  Entries unchanged: {entries_unchanged}")
    print(f"  New edition links added: {total_new_edition_links}")
    print(f"  New event links added: {total_new_event_links}")
    print(f"  Invalid slugs removed: {invalid_removed}")
    print(f"  Edition coverage: {len(all_referenced_editions)}/{len(editions)} ({edition_coverage:.1f}%)")
    print(f"  Event coverage: {len(all_referenced_events)}/{len(events)} ({event_coverage:.1f}%)")

    if args.dry_run:
        print(f"\n  DRY RUN — no files written. Report saved to {REPORT_PATH}")
        return

    # Write updated handbook
    with open(HANDBOOK_PATH, "w") as f:
        json.dump(handbook, f, indent=2)
    print(f"\n  Updated {HANDBOOK_PATH}")
    print(f"  Report saved to {REPORT_PATH}")


if __name__ == "__main__":
    run()

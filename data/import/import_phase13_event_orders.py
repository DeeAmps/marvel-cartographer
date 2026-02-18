#!/usr/bin/env python3
"""
Phase 13: Generate reading orders for all events.

For each event without an edition-level reading order, find matching editions
and create ordered event_editions entries. Every event should have at least
one edition in its reading order.
"""

import json
import re
import os

WEB_DATA = os.path.join(os.path.dirname(__file__), "..", "..", "web", "data")


def load(name):
    with open(os.path.join(WEB_DATA, name)) as f:
        return json.load(f)


def save(name, data):
    with open(os.path.join(WEB_DATA, name), "w") as f:
        json.dump(data, f, indent=2)
    print(f"Saved {name}")


# ============================================================
# Manual mappings for tricky events
# ============================================================
# Format: event_slug -> [(edition_slug, is_core, reading_order), ...]
MANUAL_MAPPINGS = {
    "coming-of-galactus": [
        ("ff-omnibus-v1", True, 1),
    ],
    "the-thanos-war": [
        ("captain-marvel-starlin", False, 1),
        ("warlock-by-starlin", True, 2),
    ],
    "the-korvac-saga": [
        ("avengers-korvac-saga", True, 1),
    ],
    "the-avengers-defenders-war": [
        ("avengers-defenders-war", True, 1),
    ],
    "the-secret-empire-1974": [
        ("cap-epic-coming-of-falcon", True, 1),
    ],
    "dark-reign": [
        ("dark-avengers-complete", True, 1),
        ("dark-reign-hawkeye", False, 2),
        ("thunderbolts-dark-reign-tpb", False, 3),
    ],
    "infinity-hickman": [
        ("avengers-hickman-omnibus-v1", False, 1),
        ("infinity-hickman", True, 2),
    ],
    "heroes-reborn-event": [
        ("heroes-reborn-1996-omnibus", True, 1),
    ],
    "heroes-return-event": [
        ("iron-man-heroes-return-busiek", False, 1),
        ("cap-heroes-return-tp-cc-v01", False, 2),
    ],
    "ultimatum-event": [
        ("ultimatum", True, 1),
    ],
    "spider-verse-event": [
        ("spider-verse", True, 1),
    ],
    "fall-of-x-event": [
        ("xmen-fall-of-x", True, 1),
        ("fall-of-x-vol-1", True, 2),
    ],
    "from-the-ashes-event": [
        ("x-men-from-the-ashes", True, 1),
        ("x-men-from-ashes-v2", True, 2),
    ],
    "death-of-x-event": [
        ("inhumans-vs-x-men", True, 1),
    ],
    "maximum-security-event": [
        ("avengers-epic-earths-mightiest", True, 1),
    ],
}


def find_editions_for_event(event, editions, edition_by_slug):
    """Find editions matching an event using multiple strategies."""
    slug = event["slug"]
    name = event["name"]
    tags = set(t.lower() for t in event.get("tags", []))
    era = event.get("era_slug", "")

    # Clean slug: remove -event suffix for matching
    clean_slug = re.sub(r"-event$", "", slug)
    clean_slug = re.sub(r"-\d{4}$", "", clean_slug)  # remove year suffix

    name_lower = name.lower()
    # Remove parenthetical years from name
    name_clean = re.sub(r"\s*\(\d{4}\)\s*", "", name_lower).strip()
    # Also remove common prefixes
    name_clean = re.sub(r"^(the |a\.x\.e\.\:\s*)", "", name_clean)

    matches = []
    seen_slugs = set()

    for ed in editions:
        ed_slug = ed["slug"]
        if ed_slug in seen_slugs:
            continue

        ed_title = ed["title"].lower()
        ed_synopsis = (ed.get("synopsis") or "").lower()

        score = 0
        is_core = False

        # Strategy 1: Edition slug starts with or equals the clean event slug
        if ed_slug == clean_slug or ed_slug.startswith(clean_slug + "-"):
            score = 100
            # Core if it's an exact match, omnibus, or main volume
            if ed_slug == clean_slug or "omnibus" in ed_slug or ed_slug == clean_slug + "-tp":
                is_core = True
            elif "companion" in ed_slug or "prelude" in ed_slug or "prologue" in ed_slug:
                is_core = False
            else:
                is_core = True

        # Strategy 2: Full event name appears in edition title (word boundary)
        elif len(name_clean) > 4 and re.search(r'\b' + re.escape(name_clean) + r'\b', ed_title):
            score = 80
            is_core = "companion" not in ed_slug and "prelude" not in ed_slug

        # Strategy 3: Clean slug contained in edition slug (less precise)
        elif len(clean_slug) > 6 and clean_slug in ed_slug:
            score = 60
            is_core = False

        if score > 0:
            seen_slugs.add(ed_slug)
            matches.append({
                "slug": ed_slug,
                "title": ed["title"],
                "score": score,
                "is_core": is_core,
                "format": ed.get("format", ""),
                "importance": ed.get("importance", ""),
                "release_date": ed.get("release_date", ""),
            })

    # Sort: core first, then by score desc, then by release date
    matches.sort(key=lambda m: (-int(m["is_core"]), -m["score"], m.get("release_date") or "9999"))

    return matches


def deduplicate_formats(matches):
    """If we have both omnibus and TPB of the same thing, prefer omnibus."""
    # Group by base title
    seen_bases = {}
    result = []
    for m in matches:
        base = re.sub(r"-(omnibus|tp|tpb|hc|complete|companion).*$", "", m["slug"])
        # For omnibus format variants (different covers), keep only the first
        if "omnibus" in m["slug"] and "cover" in m["slug"]:
            cover_base = re.sub(r"-\w+-cover-omnibus$", "-omnibus", m["slug"])
            if cover_base in seen_bases:
                continue
            seen_bases[cover_base] = True

        if base in seen_bases:
            # Already have this base — skip unless this is core and the other wasn't
            existing = seen_bases[base]
            if m["is_core"] and not existing["is_core"]:
                result = [r for r in result if r["slug"] != existing["slug"]]
                result.append(m)
                seen_bases[base] = m
            continue

        seen_bases[base] = m
        result.append(m)

    return result


def main():
    print("Phase 13: Generate Event Reading Orders")
    print("=" * 55)

    events = load("events.json")
    editions = load("collected_editions.json")
    existing_ee = load("event_editions.json")

    edition_by_slug = {e["slug"]: e for e in editions}
    edition_slugs = set(e["slug"] for e in editions)
    covered = set(e["event_slug"] for e in existing_ee)
    missing = [e for e in events if e["slug"] not in covered]

    print(f"Total events: {len(events)}")
    print(f"Already covered: {len(covered)}")
    print(f"Missing reading orders: {len(missing)}")
    print()

    new_entries = []
    no_match = []

    for evt in missing:
        slug = evt["slug"]

        # Check manual mappings first
        if slug in MANUAL_MAPPINGS:
            for ed_slug, is_core, order in MANUAL_MAPPINGS[slug]:
                if ed_slug in edition_slugs:
                    new_entries.append({
                        "event_slug": slug,
                        "edition_slug": ed_slug,
                        "is_core": is_core,
                        "reading_order": order,
                    })
                else:
                    print(f"  WARNING: Manual mapping {ed_slug} not found in editions")
            continue

        # Auto-match
        matches = find_editions_for_event(evt, editions, edition_by_slug)
        matches = deduplicate_formats(matches)

        if not matches:
            no_match.append(evt)
            continue

        # Create reading order entries
        # Core editions first, then tie-ins, capped at 6 per event
        core = [m for m in matches if m["is_core"]]
        tieins = [m for m in matches if not m["is_core"]]

        order = 0
        for m in core[:4]:
            order += 1
            new_entries.append({
                "event_slug": slug,
                "edition_slug": m["slug"],
                "is_core": True,
                "reading_order": order,
            })
        for m in tieins[:3]:
            order += 1
            new_entries.append({
                "event_slug": slug,
                "edition_slug": m["slug"],
                "is_core": False,
                "reading_order": order,
            })

    # Report
    print(f"New reading order entries: {len(new_entries)}")
    events_with_new = set(e["event_slug"] for e in new_entries)
    print(f"Events now covered: {len(events_with_new)}")

    if no_match:
        print(f"\nEvents with NO edition matches ({len(no_match)}):")
        for evt in no_match:
            print(f"  {evt['slug']:45s} {evt['name']}")

    # Merge and save
    all_ee = existing_ee + new_entries
    save("event_editions.json", all_ee)

    # Also save the new entries separately for review
    report_path = os.path.join(os.path.dirname(__file__), "phase13_new_event_editions.json")
    with open(report_path, "w") as f:
        json.dump(new_entries, f, indent=2)
    print(f"\nNew entries saved to phase13_new_event_editions.json")

    # Final coverage
    total_covered = len(covered | events_with_new)
    print(f"\n{'=' * 55}")
    print(f"FINAL COVERAGE: {total_covered}/{len(events)} events ({100*total_covered/len(events):.0f}%)")
    print(f"Total event_editions entries: {len(all_ee)}")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Merge new data from /tmp into existing data files.
Run after all generation agents complete.
"""
import json
import os
import sys

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")

def load_json(filepath):
    """Load JSON file, return empty list if not found."""
    try:
        with open(filepath, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"  SKIP: {filepath} not found")
        return []
    except json.JSONDecodeError as e:
        print(f"  ERROR: {filepath} invalid JSON: {e}")
        return []

def save_json(filepath, data):
    """Save JSON with nice formatting."""
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"  SAVED: {filepath} ({len(data)} entries)")

def merge_by_slug(existing, new_entries, label=""):
    """Merge new entries into existing, deduplicating by slug."""
    existing_slugs = {item["slug"] for item in existing}
    added = 0
    skipped = 0
    for entry in new_entries:
        if entry.get("slug") in existing_slugs:
            skipped += 1
        else:
            existing.append(entry)
            existing_slugs.add(entry["slug"])
            added += 1
    print(f"  {label}: +{added} new, {skipped} duplicates skipped")
    return existing

def main():
    print("=" * 60)
    print("MARVEL CARTOGRAPHER DATA MERGE")
    print("=" * 60)

    # 1. Merge collected editions
    print("\n--- Collected Editions ---")
    editions = load_json(os.path.join(DATA_DIR, "collected_editions.json"))
    print(f"  Existing: {len(editions)}")

    for group in ["editions_group1.json", "editions_group2.json",
                   "editions_group3.json", "editions_group4.json"]:
        new = load_json(os.path.join("/tmp", group))
        if new:
            editions = merge_by_slug(editions, new, group)

    save_json(os.path.join(DATA_DIR, "collected_editions.json"), editions)

    # 2. Merge characters
    print("\n--- Characters ---")
    characters = load_json(os.path.join(DATA_DIR, "characters.json"))
    print(f"  Existing: {len(characters)}")
    new_chars = load_json("/tmp/characters_new.json")
    if new_chars:
        characters = merge_by_slug(characters, new_chars, "characters_new.json")
    save_json(os.path.join(DATA_DIR, "characters.json"), characters)

    # 3. Merge creators
    print("\n--- Creators ---")
    creators = load_json(os.path.join(DATA_DIR, "creators.json"))
    print(f"  Existing: {len(creators)}")
    new_creators = load_json("/tmp/creators_new.json")
    if new_creators:
        creators = merge_by_slug(creators, new_creators, "creators_new.json")
    save_json(os.path.join(DATA_DIR, "creators.json"), creators)

    # 4. Merge story arcs
    print("\n--- Story Arcs ---")
    arcs = load_json(os.path.join(DATA_DIR, "story_arcs.json"))
    print(f"  Existing: {len(arcs)}")
    new_arcs = load_json("/tmp/story_arcs_new.json")
    if new_arcs:
        arcs = merge_by_slug(arcs, new_arcs, "story_arcs_new.json")
    save_json(os.path.join(DATA_DIR, "story_arcs.json"), arcs)

    # 5. Merge events
    print("\n--- Events ---")
    events = load_json(os.path.join(DATA_DIR, "events.json"))
    print(f"  Existing: {len(events)}")
    new_events = load_json("/tmp/events_new.json")
    if new_events:
        events = merge_by_slug(events, new_events, "events_new.json")
    save_json(os.path.join(DATA_DIR, "events.json"), events)

    # 6. Merge issues
    print("\n--- Key Issues ---")
    issues = load_json(os.path.join(DATA_DIR, "issues.json"))
    print(f"  Existing: {len(issues)}")
    new_issues = load_json("/tmp/issues_new.json")
    if new_issues:
        issues = merge_by_slug(issues, new_issues, "issues_new.json")
    save_json(os.path.join(DATA_DIR, "issues.json"), issues)

    # 7. Merge connections (if generated)
    print("\n--- Connections ---")
    connections = load_json(os.path.join(DATA_DIR, "connections.json"))
    print(f"  Existing: {len(connections)}")
    new_conns = load_json("/tmp/connections_new.json")
    if new_conns:
        # Deduplicate connections by source+target+type
        existing_keys = set()
        for c in connections:
            key = f"{c['source_slug']}|{c['target_slug']}|{c['connection_type']}"
            existing_keys.add(key)
        added = 0
        for c in new_conns:
            key = f"{c['source_slug']}|{c['target_slug']}|{c['connection_type']}"
            if key not in existing_keys:
                connections.append(c)
                existing_keys.add(key)
                added += 1
        print(f"  connections_new.json: +{added} new")
    save_json(os.path.join(DATA_DIR, "connections.json"), connections)

    # 8. Merge reading paths
    print("\n--- Reading Paths ---")
    paths = load_json(os.path.join(DATA_DIR, "reading_paths.json"))
    print(f"  Existing: {len(paths)}")
    new_paths = load_json("/tmp/reading_paths_new.json")
    if new_paths:
        paths = merge_by_slug(paths, new_paths, "reading_paths_new.json")
    save_json(os.path.join(DATA_DIR, "reading_paths.json"), paths)

    # 9. Merge continuity conflicts
    print("\n--- Continuity Conflicts ---")
    conflicts = load_json(os.path.join(DATA_DIR, "continuity_conflicts.json"))
    print(f"  Existing: {len(conflicts)}")
    new_conflicts = load_json("/tmp/continuity_conflicts_new.json")
    if new_conflicts:
        conflicts = merge_by_slug(conflicts, new_conflicts, "continuity_conflicts_new.json")
    save_json(os.path.join(DATA_DIR, "continuity_conflicts.json"), conflicts)

    # Summary
    print("\n" + "=" * 60)
    print("FINAL COUNTS:")
    print(f"  Collected Editions: {len(editions)}")
    print(f"  Characters:         {len(characters)}")
    print(f"  Creators:           {len(creators)}")
    print(f"  Story Arcs:         {len(arcs)}")
    print(f"  Events:             {len(events)}")
    print(f"  Key Issues:         {len(issues)}")
    print(f"  Connections:        {len(connections)}")
    print(f"  Reading Paths:      {len(paths)}")
    print(f"  Conflicts:          {len(conflicts)}")
    print("=" * 60)

if __name__ == "__main__":
    main()

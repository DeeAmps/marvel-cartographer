#!/usr/bin/env python3
"""Push supplemental data to Supabase: new characters, updated handbook entries,
and edition_characters junction entries.

Requires: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY environment variables.

Usage:
  python3 import_push_supplements.py              # Full push
  python3 import_push_supplements.py --dry-run     # Report without pushing
  python3 import_push_supplements.py --characters   # Only push characters
  python3 import_push_supplements.py --handbook     # Only push handbook
  python3 import_push_supplements.py --junctions    # Only push edition_characters
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

CHARACTERS_PATH = WEB_DATA_DIR / "characters.json"
HANDBOOK_PATH = WEB_DATA_DIR / "handbook_entries.json"
EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
NEW_CHARACTERS_PATH = SCRIPT_DIR / "phase10_new_characters.json"
NEW_HANDBOOK_PATH = SCRIPT_DIR / "phase12_new_handbook.json"

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

BATCH_SIZE = 50


def supabase_request(method, path, data=None, headers_extra=None):
    """Make a request to Supabase REST API."""
    url = f"{SUPABASE_URL}/rest/v1/{path}"
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("apikey", SUPABASE_KEY)
    req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation")
    if headers_extra:
        for k, v in headers_extra.items():
            req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"  HTTP {e.code}: {error_body[:500]}")
        return None
    except Exception as e:
        print(f"  Request error: {e}")
        return None


def supabase_upsert(path, data, on_conflict="slug"):
    """Upsert data (INSERT with conflict resolution)."""
    headers = {
        "Prefer": "return=representation,resolution=merge-duplicates",
    }
    url_path = f"{path}?on_conflict={on_conflict}"
    return supabase_request("POST", url_path, data, headers)


def fetch_all(table, select="*"):
    """Fetch all rows from a table (paginated)."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}?select={select}&offset={offset}&limit={limit}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            }
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                rows = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"  Fetch error for {table}: {e}")
            break
        all_rows.extend(rows)
        if len(rows) < limit:
            break
        offset += limit
    return all_rows


def get_table_count(table):
    """Get count of rows in a table."""
    try:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{table}?select=count",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Prefer": "count=exact",
                "Range": "0-0",
            }
        )
        resp = urllib.request.urlopen(req)
        content_range = resp.headers.get("Content-Range", "")
        if "/" in content_range:
            return int(content_range.split("/")[1])
    except Exception:
        pass
    return -1


def find_character_edition_ids(character: dict, editions: list[dict],
                                edition_slug_to_id: dict) -> list[str]:
    """Find edition UUIDs that feature this character (by slug + alias matching)."""
    import re as _re
    char_slug = character["slug"]
    search_slugs = [char_slug]
    for alias in character.get("aliases", []):
        alias_clean = _re.sub(r'\s*\([^)]*\)', '', alias).strip()
        alias_slug = _re.sub(r'[^a-z0-9\s-]', '', alias_clean.lower())
        alias_slug = _re.sub(r'\s+', '-', alias_slug).strip('-')
        if len(alias_slug) > 3 and alias_slug not in search_slugs:
            search_slugs.append(alias_slug)

    matching_ids = []
    seen = set()
    for ed in editions:
        ed_slug = ed["slug"]
        for ss in search_slugs:
            if ss in ed_slug:
                ed_id = edition_slug_to_id.get(ed_slug)
                if ed_id and ed_id not in seen:
                    matching_ids.append(ed_id)
                    seen.add(ed_id)
                break
    return matching_ids


def run():
    parser = argparse.ArgumentParser(description="Push supplement data to Supabase")
    parser.add_argument("--dry-run", action="store_true", help="Report without pushing")
    parser.add_argument("--characters", action="store_true", help="Only push characters")
    parser.add_argument("--handbook", action="store_true", help="Only push handbook")
    parser.add_argument("--junctions", action="store_true", help="Only push edition_characters")
    args = parser.parse_args()

    # If no specific flags, do everything
    do_all = not (args.characters or args.handbook or args.junctions)

    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    print("=" * 60)
    print("PUSH SUPPLEMENTS TO SUPABASE")
    print("=" * 60)

    if args.dry_run:
        print("  ** DRY RUN MODE — no data will be pushed **\n")

    # ============================================================
    # Step 0: Fetch current Supabase state
    # ============================================================
    print("Step 0: Fetch current Supabase state")
    print("-" * 40)

    db_characters = fetch_all("characters", "id,slug")
    char_slug_to_id = {c["slug"]: c["id"] for c in db_characters}
    print(f"  DB characters: {len(db_characters)}")

    db_editions = fetch_all("collected_editions", "id,slug")
    edition_slug_to_id = {e["slug"]: e["id"] for e in db_editions}
    print(f"  DB editions: {len(db_editions)}")

    db_handbook = fetch_all("handbook_entries", "id,slug")
    handbook_slug_to_id = {h["slug"]: h["id"] for h in db_handbook}
    print(f"  DB handbook_entries: {len(db_handbook)}")

    # Try to get existing edition_characters
    db_edition_chars = fetch_all("edition_characters", "edition_id,character_id")
    existing_ec_keys = {(ec["edition_id"], ec["character_id"]) for ec in db_edition_chars}
    print(f"  DB edition_characters: {len(db_edition_chars)}")

    # Load JSON data
    with open(CHARACTERS_PATH) as f:
        all_characters = json.load(f)

    with open(EDITIONS_PATH) as f:
        all_editions = json.load(f)

    with open(HANDBOOK_PATH) as f:
        all_handbook = json.load(f)

    # ============================================================
    # Step 1: INSERT new characters
    # ============================================================
    if do_all or args.characters:
        print(f"\nStep 1: INSERT new characters")
        print("-" * 40)

        new_chars = [c for c in all_characters if c["slug"] not in char_slug_to_id]
        print(f"  New characters to insert: {len(new_chars)}")

        if not args.dry_run and new_chars:
            inserted_chars = 0
            for batch_start in range(0, len(new_chars), BATCH_SIZE):
                batch = new_chars[batch_start:batch_start + BATCH_SIZE]
                rows = []
                for c in batch:
                    rows.append({
                        "slug": c["slug"],
                        "name": c["name"],
                        "aliases": c.get("aliases", []),
                        "first_appearance_issue": c.get("first_appearance_issue"),
                        "universe": c.get("universe", "Earth-616"),
                        "teams": c.get("teams", []),
                        "description": c.get("description"),
                    })

                result = supabase_upsert("characters", rows, "slug")
                if result:
                    inserted_chars += len(result)
                    # Update slug→id mapping
                    for r in result:
                        char_slug_to_id[r["slug"]] = r["id"]
                    print(f"    Batch {batch_start // BATCH_SIZE + 1}: {len(result)} inserted")
                else:
                    # Try individually
                    for row in rows:
                        r = supabase_upsert("characters", [row], "slug")
                        if r and len(r) > 0:
                            inserted_chars += 1
                            char_slug_to_id[r[0]["slug"]] = r[0]["id"]

            print(f"  Inserted: {inserted_chars}")
        elif args.dry_run:
            print(f"  Would insert: {len(new_chars)}")

    # ============================================================
    # Step 2: UPSERT handbook entries
    # ============================================================
    if do_all or args.handbook:
        print(f"\nStep 2: UPSERT handbook entries")
        print("-" * 40)

        # All handbook entries — upsert handles both new and updated
        print(f"  Total handbook entries to upsert: {len(all_handbook)}")

        if not args.dry_run:
            upserted_handbook = 0
            for batch_start in range(0, len(all_handbook), BATCH_SIZE):
                batch = all_handbook[batch_start:batch_start + BATCH_SIZE]
                rows = []
                for h in batch:
                    row = {
                        "slug": h["slug"],
                        "entry_type": h.get("entry_type", "character"),
                        "name": h["name"],
                        "core_concept": h.get("core_concept", ""),
                        "canon_confidence": h.get("canon_confidence", 80),
                        "description": h.get("description", ""),
                        "tags": h.get("tags", []),
                        "source_citations": h.get("source_citations", []),
                        "related_edition_slugs": h.get("related_edition_slugs", []),
                        "related_event_slugs": h.get("related_event_slugs", []),
                        "related_conflict_slugs": h.get("related_conflict_slugs", []),
                        "related_handbook_slugs": h.get("related_handbook_slugs", []),
                        "status_by_era": json.dumps(h.get("status_by_era", [])),
                        "retcon_history": json.dumps(h.get("retcon_history", [])),
                        "data": json.dumps(h.get("data", {})),
                    }
                    rows.append(row)

                result = supabase_upsert("handbook_entries", rows, "slug")
                if result:
                    upserted_handbook += len(result)
                    batch_num = batch_start // BATCH_SIZE + 1
                    total_batches = (len(all_handbook) + BATCH_SIZE - 1) // BATCH_SIZE
                    if batch_num % 5 == 0 or batch_num == total_batches:
                        print(f"    Batch {batch_num}/{total_batches}: {upserted_handbook} total")
                else:
                    # Try individually on batch failure
                    for row in rows:
                        r = supabase_upsert("handbook_entries", [row], "slug")
                        if r:
                            upserted_handbook += 1

            print(f"  Upserted: {upserted_handbook}")
        else:
            new_handbook = [h for h in all_handbook if h["slug"] not in handbook_slug_to_id]
            print(f"  Would insert {len(new_handbook)} new + update {len(all_handbook) - len(new_handbook)} existing")

    # ============================================================
    # Step 3: INSERT edition_characters junction entries
    # ============================================================
    if do_all or args.junctions:
        print(f"\nStep 3: INSERT edition_characters junctions")
        print("-" * 40)

        # Build junction rows from character → edition matching
        junction_rows = []
        chars_linked = 0

        for char in all_characters:
            char_id = char_slug_to_id.get(char["slug"])
            if not char_id:
                continue

            # Find editions for this character
            ed_ids = find_character_edition_ids(char, all_editions, edition_slug_to_id)
            if ed_ids:
                chars_linked += 1

            for ed_id in ed_ids:
                key = (ed_id, char_id)
                if key not in existing_ec_keys:
                    junction_rows.append({
                        "edition_id": ed_id,
                        "character_id": char_id,
                    })
                    existing_ec_keys.add(key)

        print(f"  Characters with edition links: {chars_linked}")
        print(f"  New junction rows to insert: {len(junction_rows)}")

        if not args.dry_run and junction_rows:
            inserted_junctions = 0
            for batch_start in range(0, len(junction_rows), BATCH_SIZE):
                batch = junction_rows[batch_start:batch_start + BATCH_SIZE]
                result = supabase_request("POST", "edition_characters", batch)
                if result:
                    inserted_junctions += len(result)
                else:
                    # Try individually (some may conflict)
                    for row in batch:
                        r = supabase_request("POST", "edition_characters", row)
                        if r:
                            inserted_junctions += 1

            print(f"  Inserted: {inserted_junctions}")
        elif args.dry_run:
            print(f"  Would insert: {len(junction_rows)}")

    # ============================================================
    # Final Summary
    # ============================================================
    print(f"\n{'=' * 60}")
    print("PUSH SUPPLEMENTS COMPLETE")
    print("=" * 60)

    if not args.dry_run:
        print(f"\nFinal DB counts:")
        for table in ["characters", "handbook_entries", "edition_characters",
                       "collected_editions"]:
            count = get_table_count(table)
            print(f"  {table}: {count}")
    else:
        print("\n  (Dry run — no changes made)")


if __name__ == "__main__":
    run()

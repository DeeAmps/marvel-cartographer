#!/usr/bin/env python3
"""Push updates to Supabase: era fixes, new connections, new reading paths, cover/synopsis patches.

Unlike push_to_supabase.py (which only INSERTs), this script PATCHes existing records
and INSERTs new connections/paths incrementally.

Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY environment variables.
"""

import json
import os
import sys
import time
import urllib.request
import urllib.parse
import urllib.error
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
CONNECTIONS_PATH = WEB_DATA_DIR / "connections.json"
PATHS_PATH = WEB_DATA_DIR / "reading_paths.json"
ERAS_PATH = WEB_DATA_DIR / "eras.json"
ERA_CORRECTIONS_PATH = SCRIPT_DIR / "phase4b_era_corrections.json"
NEW_CONNECTIONS_PATH = SCRIPT_DIR / "phase6b_connections.json"
NEW_PATHS_PATH = SCRIPT_DIR / "phase9_new_paths.json"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
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


def run():
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)

    print("=" * 60)
    print("PUSH UPDATES TO SUPABASE")
    print("=" * 60)

    # ============================================================
    # Step 1: Fetch current Supabase state
    # ============================================================
    print("\nStep 1: Fetch current Supabase state")
    print("-" * 40)

    db_eras = fetch_all("eras", "id,slug")
    era_slug_to_id = {e["slug"]: e["id"] for e in db_eras}
    print(f"  DB eras: {len(db_eras)}")

    db_editions = fetch_all("collected_editions", "id,slug,era_id,cover_image_url,synopsis")
    edition_slug_to_id = {e["slug"]: e["id"] for e in db_editions}
    edition_slug_to_data = {e["slug"]: e for e in db_editions}
    print(f"  DB editions: {len(db_editions)}")

    db_connections = fetch_all("connections", "id,source_id,target_id,connection_type")
    existing_conn_keys = set()
    for c in db_connections:
        existing_conn_keys.add((c["source_id"], c["target_id"], c["connection_type"]))
    print(f"  DB connections: {len(db_connections)}")

    db_paths = fetch_all("reading_paths", "id,slug")
    path_slug_to_id = {p["slug"]: p["id"] for p in db_paths}
    print(f"  DB reading_paths: {len(db_paths)}")

    # ============================================================
    # Step 2: PATCH era assignments
    # ============================================================
    print("\nStep 2: PATCH era assignments")
    print("-" * 40)

    # Load all editions from JSON (they have corrected era_slugs after Phase 4b)
    with open(EDITIONS_PATH) as f:
        all_editions = json.load(f)

    era_patches = 0
    era_skipped = 0
    era_missing = 0

    for ed in all_editions:
        slug = ed["slug"]
        new_era_slug = ed.get("era_slug", "")
        new_era_id = era_slug_to_id.get(new_era_slug)

        if not new_era_id:
            continue

        db_ed = edition_slug_to_data.get(slug)
        if not db_ed:
            era_missing += 1
            continue

        # Only patch if era changed
        if db_ed.get("era_id") == new_era_id:
            era_skipped += 1
            continue

        ed_id = db_ed["id"]
        slug_encoded = urllib.parse.quote(ed_id)
        result = supabase_request("PATCH", f"collected_editions?id=eq.{ed_id}",
                                  {"era_id": new_era_id})
        if result is not None:
            era_patches += 1
        else:
            print(f"    FAILED: {slug}")

    print(f"  Patched: {era_patches}")
    print(f"  Skipped (unchanged): {era_skipped}")
    print(f"  Missing from DB: {era_missing}")

    # ============================================================
    # Step 3: INSERT new connections
    # ============================================================
    print("\nStep 3: INSERT new connections")
    print("-" * 40)

    # Try loading from Phase 6b output, fall back to full connections.json diff
    new_connections = []
    if NEW_CONNECTIONS_PATH.exists():
        with open(NEW_CONNECTIONS_PATH) as f:
            new_connections = json.load(f)
        print(f"  Loaded {len(new_connections)} connections from Phase 6b")
    else:
        print("  No Phase 6b output found, checking connections.json for new entries...")
        with open(CONNECTIONS_PATH) as f:
            all_connections = json.load(f)
        # Find connections not in DB
        for c in all_connections:
            src_id = edition_slug_to_id.get(c.get("source_slug", ""))
            tgt_id = edition_slug_to_id.get(c.get("target_slug", ""))
            if src_id and tgt_id:
                key = (src_id, tgt_id, c["connection_type"])
                if key not in existing_conn_keys:
                    new_connections.append(c)
        print(f"  Found {len(new_connections)} new connections from diff")

    # Build rows resolving slugs to UUIDs
    conn_rows = []
    conn_skipped = 0
    for c in new_connections:
        src_slug = c.get("source_slug", "")
        tgt_slug = c.get("target_slug", "")
        src_id = edition_slug_to_id.get(src_slug)
        tgt_id = edition_slug_to_id.get(tgt_slug)

        if not src_id or not tgt_id:
            conn_skipped += 1
            continue

        key = (src_id, tgt_id, c["connection_type"])
        if key in existing_conn_keys:
            continue
        existing_conn_keys.add(key)

        conn_rows.append({
            "source_type": c.get("source_type", "edition"),
            "source_id": src_id,
            "target_type": c.get("target_type", "edition"),
            "target_id": tgt_id,
            "connection_type": c["connection_type"],
            "strength": c.get("strength"),
            "confidence": c.get("confidence"),
            "interpretation": c.get("interpretation", "official"),
            "description": c.get("description", ""),
        })

    print(f"  Connection rows to insert: {len(conn_rows)}")
    print(f"  Skipped (missing slugs): {conn_skipped}")

    inserted_conns = 0
    for batch_start in range(0, len(conn_rows), BATCH_SIZE):
        batch = conn_rows[batch_start:batch_start + BATCH_SIZE]
        result = supabase_request("POST", "connections", batch)
        if result:
            inserted_conns += len(result)
            print(f"    Batch {batch_start // BATCH_SIZE + 1}: {len(result)} inserted")
        else:
            # Try individually on batch failure
            for row in batch:
                r = supabase_request("POST", "connections", row)
                if r:
                    inserted_conns += 1

    print(f"  Inserted: {inserted_conns}")

    # ============================================================
    # Step 4: INSERT new reading paths + entries
    # ============================================================
    print("\nStep 4: INSERT new reading paths + entries")
    print("-" * 40)

    new_paths = []
    if NEW_PATHS_PATH.exists():
        with open(NEW_PATHS_PATH) as f:
            new_paths = json.load(f)
        print(f"  Loaded {len(new_paths)} paths from Phase 9")
    else:
        with open(PATHS_PATH) as f:
            all_paths = json.load(f)
        new_paths = [p for p in all_paths if p["slug"] not in path_slug_to_id]
        print(f"  Found {len(new_paths)} new paths from diff")

    inserted_paths = 0
    inserted_entries = 0

    for path in new_paths:
        if path["slug"] in path_slug_to_id:
            continue

        path_row = {
            "slug": path["slug"],
            "name": path["name"],
            "path_type": path.get("path_type", "curated"),
            "difficulty": path.get("difficulty", "intermediate"),
            "description": path.get("description", ""),
        }
        result = supabase_request("POST", "reading_paths", path_row)
        if result and len(result) > 0:
            path_id = result[0]["id"]
            path_slug_to_id[path["slug"]] = path_id
            inserted_paths += 1

            # Insert entries
            entries = []
            for e in path.get("entries", []):
                ed_id = edition_slug_to_id.get(e.get("edition_slug"))
                if not ed_id:
                    print(f"    WARN: No edition for {e.get('edition_slug')} in path {path['slug']}")
                    continue
                entries.append({
                    "path_id": path_id,
                    "edition_id": ed_id,
                    "position": e["position"],
                    "note": e.get("note", ""),
                    "is_optional": e.get("is_optional", False),
                })

            if entries:
                r = supabase_request("POST", "reading_path_entries", entries)
                if r:
                    inserted_entries += len(r)
                    print(f"    Path '{path['slug']}': {len(r)} entries")
                else:
                    # Try individually
                    for entry in entries:
                        r2 = supabase_request("POST", "reading_path_entries", entry)
                        if r2:
                            inserted_entries += 1
        else:
            print(f"    FAILED path: {path['slug']}")

    print(f"  Inserted: {inserted_paths} paths, {inserted_entries} entries")

    # ============================================================
    # Step 5: PATCH cover images for editions missing them
    # ============================================================
    print("\nStep 5: PATCH missing cover images")
    print("-" * 40)

    updated_covers = 0
    for ed in all_editions:
        slug = ed["slug"]
        cover_url = ed.get("cover_image_url")
        if not cover_url:
            continue

        db_ed = edition_slug_to_data.get(slug)
        if not db_ed:
            continue

        # Only patch if DB edition has no cover
        if db_ed.get("cover_image_url"):
            continue

        ed_id = db_ed["id"]
        result = supabase_request("PATCH", f"collected_editions?id=eq.{ed_id}",
                                  {"cover_image_url": cover_url})
        if result is not None:
            updated_covers += 1

    print(f"  Patched cover images: {updated_covers}")

    # ============================================================
    # Step 6: PATCH synopses for editions with empty/short ones
    # ============================================================
    print("\nStep 6: PATCH synopses")
    print("-" * 40)

    updated_synopses = 0
    for ed in all_editions:
        slug = ed["slug"]
        synopsis = ed.get("synopsis", "")
        if len(synopsis) < 50:
            continue

        db_ed = edition_slug_to_data.get(slug)
        if not db_ed:
            continue

        # Only patch if DB synopsis is shorter than our version
        db_synopsis = db_ed.get("synopsis") or ""
        if len(db_synopsis) >= len(synopsis):
            continue

        ed_id = db_ed["id"]
        result = supabase_request("PATCH", f"collected_editions?id=eq.{ed_id}",
                                  {"synopsis": synopsis})
        if result is not None:
            updated_synopses += 1

    print(f"  Patched synopses: {updated_synopses}")

    # ============================================================
    # Final Summary
    # ============================================================
    print(f"\n{'=' * 60}")
    print("PUSH COMPLETE")
    print("=" * 60)

    print(f"\nSummary:")
    print(f"  Era assignments patched: {era_patches}")
    print(f"  Connections inserted: {inserted_conns}")
    print(f"  Reading paths inserted: {inserted_paths}")
    print(f"  Path entries inserted: {inserted_entries}")
    print(f"  Cover images patched: {updated_covers}")
    print(f"  Synopses patched: {updated_synopses}")

    # Verify final counts
    print(f"\nFinal DB counts:")
    for table in ["collected_editions", "connections", "reading_paths",
                   "reading_path_entries", "creators"]:
        count = get_table_count(table)
        print(f"  {table}: {count}")


if __name__ == "__main__":
    run()

#!/usr/bin/env python3
"""Push all JSON data to Supabase, upserting new editions, connections, and reading paths."""
import json
import os
import urllib.request
import urllib.parse
import urllib.error
import sys
import time

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

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
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode("utf-8")
        print(f"  HTTP {e.code}: {error_body[:500]}")
        return None

def fetch_all(table, select="*"):
    """Fetch all rows from a table (paginated)."""
    all_rows = []
    offset = 0
    limit = 1000
    while True:
        url = f"{table}?select={select}&offset={offset}&limit={limit}"
        req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/{url}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
            }
        )
        with urllib.request.urlopen(req) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        all_rows.extend(rows)
        if len(rows) < limit:
            break
        offset += limit
    return all_rows


def main():
    # ============================================================
    # Step 0: Run migration 013 (add premier_collection enum)
    # ============================================================
    print("=" * 60)
    print("STEP 0: Add premier_collection enum value")
    print("=" * 60)
    # Use RPC to run raw SQL
    sql = "SELECT unnest(enum_range(NULL::edition_format))::text AS val;"
    result = supabase_request("POST", "rpc/exec_sql", {"query": sql})
    if result is None:
        # Try via direct enum check
        print("  Checking enum via editions table...")
        # We'll just try inserting and see if it fails
        print("  Will attempt insert — if premier_collection enum missing, will error")

    # ============================================================
    # Step 1: Load JSON data
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 1: Load JSON data files")
    print("=" * 60)

    with open("archive/collected_editions.json") as f:
        all_editions = json.load(f)
    with open("archive/connections.json") as f:
        all_connections = json.load(f)
    with open("archive/reading_paths.json") as f:
        all_paths = json.load(f)
    with open("archive/eras.json") as f:
        all_eras = json.load(f)
    with open("archive/creators.json") as f:
        all_creators = json.load(f)
    with open("archive/retailers.json") as f:
        all_retailers = json.load(f)
    with open("archive/resources.json") as f:
        all_resources = json.load(f)
    with open("archive/continuity_conflicts.json") as f:
        all_conflicts = json.load(f)
    with open("archive/story_arcs.json") as f:
        all_arcs = json.load(f)
    with open("archive/events.json") as f:
        all_events = json.load(f)
    with open("archive/characters.json") as f:
        all_characters = json.load(f)

    print(f"  Editions: {len(all_editions)}")
    print(f"  Connections: {len(all_connections)}")
    print(f"  Reading Paths: {len(all_paths)}")
    print(f"  Eras: {len(all_eras)}")
    print(f"  Creators: {len(all_creators)}")
    print(f"  Characters: {len(all_characters)}")
    print(f"  Retailers: {len(all_retailers)}")
    print(f"  Resources: {len(all_resources)}")
    print(f"  Conflicts: {len(all_conflicts)}")
    print(f"  Arcs: {len(all_arcs)}")
    print(f"  Events: {len(all_events)}")

    # ============================================================
    # Step 2: Get existing data from Supabase (slug -> id maps)
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 2: Fetch existing Supabase data")
    print("=" * 60)

    db_eras = fetch_all("eras", "id,slug")
    era_slug_to_id = {e["slug"]: e["id"] for e in db_eras}
    print(f"  DB eras: {len(db_eras)}")

    db_editions = fetch_all("collected_editions", "id,slug")
    edition_slug_to_id = {e["slug"]: e["id"] for e in db_editions}
    print(f"  DB editions: {len(db_editions)}")

    db_creators = fetch_all("creators", "id,slug,name")
    creator_slug_to_id = {c["slug"]: c["id"] for c in db_creators}
    creator_name_to_id = {c["name"]: c["id"] for c in db_creators}
    print(f"  DB creators: {len(db_creators)}")

    db_paths = fetch_all("reading_paths", "id,slug")
    path_slug_to_id = {p["slug"]: p["id"] for p in db_paths}
    print(f"  DB reading_paths: {len(db_paths)}")

    db_connections = fetch_all("connections", "id,source_id,target_id,connection_type")
    existing_conn_keys = set()
    for c in db_connections:
        existing_conn_keys.add((c["source_id"], c["target_id"], c["connection_type"]))
    print(f"  DB connections: {len(db_connections)}")

    # ============================================================
    # Step 3: Insert new creators referenced by new editions
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 3: Upsert creators from editions")
    print("=" * 60)

    # Collect all unique creators from editions
    all_creator_names = set()
    for ed in all_editions:
        for cr in ed.get("creators", []):
            all_creator_names.add(cr["name"])

    # Find creators not in DB
    new_creators = []
    for name in all_creator_names:
        if name not in creator_name_to_id:
            slug = name.lower().replace(" ", "-").replace(".", "").replace("'", "")
            slug = slug.replace(",", "").replace("(", "").replace(")", "")
            if slug not in creator_slug_to_id:
                new_creators.append({
                    "slug": slug,
                    "name": name,
                    "roles": ["writer"]  # default, will be refined by edition_creators
                })

    if new_creators:
        print(f"  Inserting {len(new_creators)} new creators...")
        for batch_start in range(0, len(new_creators), BATCH_SIZE):
            batch = new_creators[batch_start:batch_start + BATCH_SIZE]
            result = supabase_request("POST", "creators", batch,
                                       {"Prefer": "return=representation,resolution=merge-duplicates"})
            if result:
                for r in result:
                    creator_slug_to_id[r["slug"]] = r["id"]
                    creator_name_to_id[r["name"]] = r["id"]
                print(f"    Batch {batch_start // BATCH_SIZE + 1}: {len(result)} inserted")
            else:
                # Try one by one
                for c in batch:
                    r = supabase_request("POST", "creators", c,
                                          {"Prefer": "return=representation,resolution=merge-duplicates"})
                    if r and len(r) > 0:
                        creator_slug_to_id[r[0]["slug"]] = r[0]["id"]
                        creator_name_to_id[r[0]["name"]] = r[0]["id"]
    else:
        print("  No new creators needed")

    # ============================================================
    # Step 4: Insert new editions
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 4: Insert new collected editions")
    print("=" * 60)

    new_editions = [e for e in all_editions if e["slug"] not in edition_slug_to_id]
    print(f"  New editions to insert: {len(new_editions)}")

    inserted_editions = 0
    failed_editions = []

    for batch_start in range(0, len(new_editions), BATCH_SIZE):
        batch = new_editions[batch_start:batch_start + BATCH_SIZE]
        rows = []
        for ed in batch:
            era_id = era_slug_to_id.get(ed.get("era_slug"))
            if not era_id:
                print(f"    WARN: No era_id for {ed['slug']} (era_slug={ed.get('era_slug')})")

            row = {
                "slug": ed["slug"],
                "title": ed["title"],
                "format": ed["format"],
                "issues_collected": ed.get("issues_collected", ""),
                "issue_count": ed.get("issue_count"),
                "page_count": ed.get("page_count"),
                "isbn": ed.get("isbn"),
                "cover_price": ed.get("cover_price"),
                "print_status": ed.get("print_status", "in_print"),
                "importance": ed.get("importance", "recommended"),
                "era_id": era_id,
                "synopsis": ed.get("synopsis", ""),
                "connection_notes": ed.get("connection_notes", ""),
                "cover_image_url": ed.get("cover_image_url"),
            }
            rows.append(row)

        result = supabase_request("POST", "collected_editions", rows)
        if result:
            for r in result:
                edition_slug_to_id[r["slug"]] = r["id"]
            inserted_editions += len(result)
            print(f"    Batch {batch_start // BATCH_SIZE + 1}: {len(result)} inserted")
        else:
            # Try one by one for this batch
            print(f"    Batch failed, trying individually...")
            for row in rows:
                r = supabase_request("POST", "collected_editions", row)
                if r and len(r) > 0:
                    edition_slug_to_id[r[0]["slug"]] = r[0]["id"]
                    inserted_editions += 1
                else:
                    failed_editions.append(row["slug"])
                    print(f"      FAILED: {row['slug']}")

    print(f"  Inserted: {inserted_editions}")
    if failed_editions:
        print(f"  Failed: {len(failed_editions)} - {failed_editions[:10]}")

    # ============================================================
    # Step 5: Insert edition_creators for new editions
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 5: Insert edition_creators for new editions")
    print("=" * 60)

    edition_creator_rows = []
    for ed in new_editions:
        ed_id = edition_slug_to_id.get(ed["slug"])
        if not ed_id:
            continue
        for cr in ed.get("creators", []):
            cr_id = creator_name_to_id.get(cr["name"])
            if cr_id:
                edition_creator_rows.append({
                    "edition_id": ed_id,
                    "creator_id": cr_id,
                    "role": cr.get("role", "writer")
                })

    print(f"  Edition-creator links to insert: {len(edition_creator_rows)}")
    inserted_ec = 0
    for batch_start in range(0, len(edition_creator_rows), BATCH_SIZE):
        batch = edition_creator_rows[batch_start:batch_start + BATCH_SIZE]
        result = supabase_request("POST", "edition_creators", batch,
                                   {"Prefer": "return=representation,resolution=merge-duplicates"})
        if result:
            inserted_ec += len(result)
        else:
            # Try individually
            for row in batch:
                r = supabase_request("POST", "edition_creators", row,
                                      {"Prefer": "return=representation,resolution=merge-duplicates"})
                if r:
                    inserted_ec += 1

    print(f"  Inserted: {inserted_ec}")

    # ============================================================
    # Step 6: Insert new connections
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 6: Insert new connections")
    print("=" * 60)

    # Build connection rows from JSON, resolving slugs to UUIDs
    conn_rows = []
    skipped_conns = 0
    for c in all_connections:
        src_slug = c.get("source_slug", "")
        tgt_slug = c.get("target_slug", "")
        src_id = edition_slug_to_id.get(src_slug)
        tgt_id = edition_slug_to_id.get(tgt_slug)

        if not src_id or not tgt_id:
            skipped_conns += 1
            continue

        # Skip if already in DB
        key = (src_id, tgt_id, c["connection_type"])
        if key in existing_conn_keys:
            continue

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
        existing_conn_keys.add(key)

    print(f"  New connections to insert: {len(conn_rows)}")
    print(f"  Skipped (missing slugs): {skipped_conns}")

    inserted_conns = 0
    for batch_start in range(0, len(conn_rows), BATCH_SIZE):
        batch = conn_rows[batch_start:batch_start + BATCH_SIZE]
        result = supabase_request("POST", "connections", batch)
        if result:
            inserted_conns += len(result)
            print(f"    Batch {batch_start // BATCH_SIZE + 1}: {len(result)} inserted")
        else:
            # Try individually
            for row in batch:
                r = supabase_request("POST", "connections", row)
                if r:
                    inserted_conns += 1

    print(f"  Inserted: {inserted_conns}")

    # ============================================================
    # Step 7: Insert new reading paths + entries
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 7: Insert new reading paths + entries")
    print("=" * 60)

    new_paths = [p for p in all_paths if p["slug"] not in path_slug_to_id]
    print(f"  New paths to insert: {len(new_paths)}")

    inserted_paths = 0
    inserted_entries = 0

    for path in new_paths:
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
            for entry in path.get("entries", []):
                ed_id = edition_slug_to_id.get(entry.get("edition_slug"))
                if not ed_id:
                    print(f"    WARN: No edition for {entry.get('edition_slug')} in path {path['slug']}")
                    continue
                entries.append({
                    "path_id": path_id,
                    "edition_id": ed_id,
                    "position": entry["position"],
                    "note": entry.get("note", ""),
                    "is_optional": entry.get("is_optional", False)
                })

            if entries:
                r = supabase_request("POST", "reading_path_entries", entries)
                if r:
                    inserted_entries += len(r)
                    print(f"    Path '{path['slug']}': {len(r)} entries")
                else:
                    # Try individually
                    for e in entries:
                        r2 = supabase_request("POST", "reading_path_entries", e)
                        if r2:
                            inserted_entries += 1
        else:
            print(f"    FAILED path: {path['slug']}")

    print(f"  Inserted: {inserted_paths} paths, {inserted_entries} entries")

    # ============================================================
    # Step 8: Update existing editions with new cover images
    # ============================================================
    print("\n" + "=" * 60)
    print("STEP 8: Update cover images for existing editions")
    print("=" * 60)

    # Find editions that exist in DB but may have null cover_image_url
    # and now have a cover in our JSON
    updated_covers = 0
    for ed in all_editions:
        if ed["slug"] in edition_slug_to_id and ed.get("cover_image_url"):
            ed_id = edition_slug_to_id[ed["slug"]]
            # Only update if it was one of the previously existing editions
            # (new editions already have covers from insert)
            if ed["slug"] not in [ne["slug"] for ne in new_editions]:
                # Patch the cover URL
                patch_url = f"collected_editions?id=eq.{ed_id}"
                result = supabase_request("PATCH", patch_url,
                                           {"cover_image_url": ed["cover_image_url"]})
                if result:
                    updated_covers += 1

    print(f"  Updated cover images: {updated_covers}")

    # ============================================================
    # Final Summary
    # ============================================================
    print("\n" + "=" * 60)
    print("PUSH COMPLETE")
    print("=" * 60)

    # Verify final counts
    final_editions = fetch_all("collected_editions", "count")
    final_connections = fetch_all("connections", "count")
    final_paths = fetch_all("reading_paths", "count")

    # Get counts via headers
    for table in ["collected_editions", "connections", "reading_paths", "reading_path_entries", "edition_creators", "creators"]:
        try:
            req = urllib.request.Request(
                f"{SUPABASE_URL}/rest/v1/{table}?select=count",
                headers={
                    "apikey": SUPABASE_KEY,
                    "Authorization": f"Bearer {SUPABASE_KEY}",
                    "Prefer": "count=exact",
                    "Range": "0-0"
                }
            )
            resp = urllib.request.urlopen(req)
            count = resp.headers.get("Content-Range", "unknown")
            print(f"  {table}: {count}")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")


if __name__ == "__main__":
    main()

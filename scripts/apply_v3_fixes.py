#!/usr/bin/env python3
"""Apply v3 era fixes."""

import json
import os
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

ERA_IDS = {
    "dawn-of-krakoa":         "ef8c9832-e06d-4028-ae89-a2bb5eb13e1c",
    "blood-hunt-doom":        "93f854fe-cd0a-4070-9a30-1f671374200e",
}

# Fixes: (edition_id_prefix, title, new_era_slug)
FIXES = [
    # all-new-all-different → dawn-of-krakoa
    ("fbbc1265", "Venom by Al Ewing & Ram V (2021)", "dawn-of-krakoa"),
    # Iron Man by Christopher Cantwell - need to find ID
    # Death of Doctor Strange - need to find ID
    # Hawkeye: Kate Bishop - need to find ID

    # dawn-of-krakoa → blood-hunt-doom
    # Wolverine by Saladin Ahmed Vol. 1 - need to find ID

    # current-ongoings → blood-hunt-doom
    # Avengers: Twilight, Spider-Man: Reign 2, Wolverine: Madripoor Knights,
    # X-Men by Jed MacKay (2024), Spectacular Spider-Man (2024)
]

def fetch_editions_by_title_search(search_terms):
    """Search for editions by title substring."""
    results = {}
    for term in search_terms:
        encoded = urllib.parse.quote(f"*{term}*")
        url = f"{SUPABASE_URL}/rest/v1/collected_editions?select=id,title,era_id&title=ilike.{encoded}"
        req = urllib.request.Request(url)
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
        import urllib.parse
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            for item in data:
                results[item['title']] = item
    return results

import urllib.parse

def find_edition(title_search):
    """Find edition by exact or partial title match."""
    encoded = urllib.parse.quote(f"*{title_search}*")
    url = f"{SUPABASE_URL}/rest/v1/collected_editions?select=id,title,era_id&title=ilike.{encoded}"
    req = urllib.request.Request(url)
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        return data

def update_era(edition_id, new_era_id, title):
    """Update an edition's era_id."""
    url = f"{SUPABASE_URL}/rest/v1/collected_editions?id=eq.{edition_id}"
    body = json.dumps({"era_id": new_era_id}).encode()
    req = urllib.request.Request(url, data=body, method='PATCH')
    req.add_header("apikey", SERVICE_KEY)
    req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=minimal")
    with urllib.request.urlopen(req) as resp:
        status = resp.status
        print(f"  {'OK' if status in (200, 204) else 'FAIL'} [{status}] {title}")

def main():
    # Find all editions we need to move
    searches = {
        # all-new-all-different → dawn-of-krakoa
        "Venom by Al Ewing": "dawn-of-krakoa",
        "Iron Man by Christopher Cantwell": "dawn-of-krakoa",
        "Death of Doctor Strange": "dawn-of-krakoa",
        "Hawkeye: Kate Bishop by Mariko Tamaki": "dawn-of-krakoa",

        # dawn-of-krakoa → blood-hunt-doom
        "Wolverine by Saladin Ahmed Vol. 1": "blood-hunt-doom",

        # current-ongoings → blood-hunt-doom
        "Avengers: Twilight": "blood-hunt-doom",
        "Spider-Man: Reign 2": "blood-hunt-doom",
        "Wolverine: Madripoor Knights": "blood-hunt-doom",
        "X-Men by Jed MacKay": "blood-hunt-doom",
        "Spectacular Spider-Man (2024)": "blood-hunt-doom",
    }

    all_fixes = []

    for search_term, target_era in searches.items():
        results = find_edition(search_term)
        if not results:
            print(f"WARNING: No match for '{search_term}'")
            continue

        target_era_id = ERA_IDS[target_era]

        for r in results:
            if r['era_id'] == target_era_id:
                print(f"SKIP (already correct): {r['title']}")
                continue

            # Special case: "X-Men by Jed MacKay" - only move the (2024) one, not any others
            if search_term == "X-Men by Jed MacKay" and "(2024)" not in r['title']:
                print(f"SKIP (not 2024): {r['title']}")
                continue

            # Special case: "Wolverine by Saladin Ahmed Vol. 1" - only move Vol. 1
            if search_term == "Wolverine by Saladin Ahmed Vol. 1" and "Vol. 2" in r['title']:
                print(f"SKIP (Vol. 2): {r['title']}")
                continue

            all_fixes.append((r['id'], r['title'], target_era, target_era_id))

    print(f"\n=== {len(all_fixes)} fixes to apply ===\n")
    for eid, title, era, era_id in all_fixes:
        print(f"  {title} → {era}")

    print("\nApplying fixes...")
    for eid, title, era, era_id in all_fixes:
        update_era(eid, era_id, title)

    print("\nDone!")

if __name__ == "__main__":
    main()

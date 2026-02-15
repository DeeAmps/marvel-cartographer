#!/usr/bin/env python3
"""Final verification of era distribution."""
import json
import os
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

def fetch_all():
    all_eds = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/editions_full?select=id,title,era_slug,issues_collected&order=title&offset={offset}&limit=1000"
        req = urllib.request.Request(url)
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            if not data:
                break
            all_eds.extend(data)
            if len(data) < 1000:
                break
            offset += 1000
    return all_eds

editions = fetch_all()
by_era = {}
for ed in editions:
    era = ed.get('era_slug', 'unknown')
    by_era.setdefault(era, []).append(ed)

print(f"Total editions: {len(editions)}\n")
print("=== FINAL ERA DISTRIBUTION ===")
eras_order = [
    "birth-of-marvel", "the-expansion", "bronze-age", "rise-of-x-men",
    "event-age", "speculation-crash", "heroes-reborn-return",
    "marvel-knights-ultimate", "bendis-avengers", "hickman-saga",
    "all-new-all-different", "dawn-of-krakoa", "blood-hunt-doom", "current-ongoings"
]
for era in eras_order:
    count = len(by_era.get(era, []))
    print(f"  {era:30s}: {count}")

# Spot check: blood-hunt-doom and current-ongoings
print("\n=== blood-hunt-doom ===")
for ed in sorted(by_era.get('blood-hunt-doom', []), key=lambda e: e['title']):
    print(f"  {ed['title']}")

print("\n=== current-ongoings ===")
for ed in sorted(by_era.get('current-ongoings', []), key=lambda e: e['title']):
    print(f"  {ed['title']}")

print("\n=== all-new-all-different (last 20) ===")
anad = sorted(by_era.get('all-new-all-different', []), key=lambda e: e['title'])
for ed in anad[-20:]:
    print(f"  {ed['title']}")

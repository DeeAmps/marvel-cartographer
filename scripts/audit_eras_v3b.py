#!/usr/bin/env python3
"""
Era Audit v3b - Dump remaining eras for manual review + apply fixes.
"""

import json
import os
import urllib.request

SUPABASE_URL = os.environ["SUPABASE_URL"]
SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

def fetch_all_editions():
    all_editions = []
    offset = 0
    limit = 1000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/editions_full?select=id,title,slug,era_slug,era_name,issues_collected,release_date,print_status,importance&order=title&offset={offset}&limit={limit}"
        req = urllib.request.Request(url)
        req.add_header("apikey", SERVICE_KEY)
        req.add_header("Authorization", f"Bearer {SERVICE_KEY}")
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            if not data:
                break
            all_editions.extend(data)
            if len(data) < limit:
                break
            offset += limit
    return all_editions

def main():
    editions = fetch_all_editions()

    by_era = {}
    for ed in editions:
        era = ed.get('era_slug', 'unknown')
        if era not in by_era:
            by_era[era] = []
        by_era[era].append(ed)

    # Dump eras not yet reviewed
    review_eras = [
        'bronze-age', 'event-age', 'speculation-crash',
        'heroes-reborn-return', 'marvel-knights-ultimate',
        'bendis-avengers', 'hickman-saga', 'all-new-all-different',
        'dawn-of-krakoa'
    ]

    for era_slug in review_eras:
        era_editions = sorted(by_era.get(era_slug, []), key=lambda e: e.get('title', ''))
        print(f"\n=== {era_slug} ({len(era_editions)} editions) ===")
        for ed in era_editions:
            title = ed['title']
            issues = ed.get('issues_collected', '') or ''
            rd = ed.get('release_date', '') or ''
            # Show abbreviated info
            print(f"  {title}  |  {issues[:60]}  |  {rd[:4] if rd else '----'}")

if __name__ == "__main__":
    main()

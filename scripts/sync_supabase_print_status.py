#!/usr/bin/env python3
"""Sync print status heuristics to Supabase-only editions (not in JSON)."""
import json, os, sys, urllib.request, urllib.error, time
from collections import Counter

# Force unbuffered output
sys.stdout.reconfigure(line_buffering=True)

# Load .env
env_path = os.path.join(os.path.dirname(__file__), '..', '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                os.environ.setdefault(key.strip(), value.strip())

SUPABASE_URL = os.environ.get('NEXT_PUBLIC_SUPABASE_URL', '')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', '')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: Missing Supabase credentials")
    sys.exit(1)

# Load JSON slugs
json_path = os.path.join(os.path.dirname(__file__), '..', 'web', 'data', 'collected_editions.json')
with open(json_path) as f:
    json_editions = json.load(f)
json_slugs = {ed['slug'] for ed in json_editions}
print(f"JSON editions: {len(json_slugs)}")

# Fetch ALL Supabase editions
print("Fetching Supabase editions...")
all_rows = []
offset = 0
while True:
    url = f'{SUPABASE_URL}/rest/v1/collected_editions?select=id,slug,title,format,print_status,isbn,release_date&offset={offset}&limit=1000'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    })
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode('utf-8'))
    all_rows.extend(rows)
    print(f"  Fetched {len(all_rows)} rows...")
    if len(rows) < 1000:
        break
    offset += 1000

# Filter to Supabase-only in_print
supabase_only = [r for r in all_rows if r['slug'] not in json_slugs and r['print_status'] == 'in_print']
print(f"\nSupabase-only in_print editions: {len(supabase_only)}")

CURRENT_YEAR = 2026
PERENNIAL_KEYWORDS = ['fantastic four', 'amazing spider-man', 'uncanny x-men',
    'avengers', 'incredible hulk', 'iron man', 'thor',
    'captain america', 'daredevil', 'x-men']

changes = []
for row in supabase_only:
    fmt = row.get('format', '')
    title = row.get('title', '').lower()
    isbn = row.get('isbn')
    release_date = row.get('release_date')
    new_status = None

    pub_year = None
    if release_date:
        try:
            pub_year = int(release_date[:4])
        except:
            pass
    if not pub_year:
        pub_year = 2022

    age = CURRENT_YEAR - pub_year

    if fmt == 'trade_paperback':
        if not isbn and not release_date:
            new_status = 'out_of_print'
        elif age >= 5:
            new_status = 'out_of_print'
        elif age >= 3:
            new_status = 'check_availability'
    elif fmt == 'omnibus':
        is_perennial = any(kw in title for kw in PERENNIAL_KEYWORDS)
        if is_perennial:
            if age >= 5:
                new_status = 'check_availability'
        else:
            if age >= 3:
                new_status = 'out_of_print'
            elif age >= 2:
                new_status = 'check_availability'
    elif fmt == 'hardcover':
        if age >= 3:
            new_status = 'out_of_print'
        elif age >= 2:
            new_status = 'check_availability'
    elif fmt == 'oversized_hardcover':
        if age >= 3:
            new_status = 'out_of_print'
    elif fmt == 'epic_collection':
        if not isbn and not release_date:
            new_status = 'check_availability'
        elif age >= 4:
            new_status = 'check_availability'
    elif fmt == 'masterworks':
        if age >= 4:
            new_status = 'out_of_print'
    elif fmt == 'complete_collection':
        if age >= 4:
            new_status = 'out_of_print'
    elif fmt == 'premier_collection':
        if age >= 3:
            new_status = 'out_of_print'
    elif fmt == 'compendium':
        if age >= 4:
            new_status = 'check_availability'

    if new_status and new_status != row['print_status']:
        changes.append((row['id'], row['slug'], row['print_status'], new_status))

status_changes = Counter(c[3] for c in changes)
print(f"\nChanges to apply: {len(changes)}")
for status, count in status_changes.most_common():
    print(f"  -> {status}: {count}")

print(f"\nApplying {len(changes)} changes to Supabase...")
updated = 0
failed = 0
for ed_id, slug, old_status, new_status in changes:
    patch_url = f'{SUPABASE_URL}/rest/v1/collected_editions?id=eq.{ed_id}'
    body = json.dumps({'print_status': new_status}).encode('utf-8')
    req = urllib.request.Request(patch_url, data=body, method='PATCH')
    req.add_header('apikey', SUPABASE_KEY)
    req.add_header('Authorization', f'Bearer {SUPABASE_KEY}')
    req.add_header('Content-Type', 'application/json')
    req.add_header('Prefer', 'return=minimal')
    try:
        urllib.request.urlopen(req)
        updated += 1
    except urllib.error.HTTPError as e:
        print(f'  FAILED: {slug} — HTTP {e.code}')
        failed += 1
    if updated % 200 == 0 and updated > 0:
        print(f'  ... updated {updated}/{len(changes)}')

print(f"\nDone! Updated: {updated}, Failed: {failed}")

# Final verification
print("\nVerifying final Supabase status breakdown...")
counts = Counter()
offset = 0
while True:
    url = f'{SUPABASE_URL}/rest/v1/collected_editions?select=print_status&offset={offset}&limit=1000'
    req = urllib.request.Request(url, headers={
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
    })
    with urllib.request.urlopen(req) as resp:
        rows = json.loads(resp.read().decode('utf-8'))
    for r in rows:
        counts[r['print_status']] += 1
    if len(rows) < 1000:
        break
    offset += 1000

print("Final Supabase breakdown:")
for status, count in counts.most_common():
    print(f"  {status}: {count}")
print(f"  TOTAL: {sum(counts.values())}")

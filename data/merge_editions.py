#!/usr/bin/env python3
"""Merge all new edition parts into the existing collected_editions.json."""
import json
import os

# Load existing
with open("archive/collected_editions.json", "r") as f:
    existing = json.load(f)

existing_slugs = {e["slug"] for e in existing}
print(f"Existing editions: {len(existing)}")
print(f"Existing slugs: {len(existing_slugs)}")

# Load all parts
new_editions = []
for part in ["/tmp/editions_part1.json", "/tmp/editions_part2.json", "/tmp/editions_part3.json", "/tmp/editions_part4.json"]:
    with open(part, "r") as f:
        data = json.load(f)
        new_editions.extend(data)
        print(f"  {part}: {len(data)} editions")

print(f"\nTotal new editions before dedup: {len(new_editions)}")

# Deduplicate against existing
added = []
skipped = []
seen_new_slugs = set()
for ed in new_editions:
    slug = ed["slug"]
    if slug in existing_slugs:
        skipped.append(slug)
    elif slug in seen_new_slugs:
        skipped.append(f"{slug} (dup in new)")
    else:
        added.append(ed)
        seen_new_slugs.add(slug)

print(f"Skipped (already exist): {len(skipped)}")
if skipped:
    for s in skipped[:10]:
        print(f"  - {s}")
    if len(skipped) > 10:
        print(f"  ... and {len(skipped) - 10} more")

print(f"New editions to add: {len(added)}")

# Format distribution of new editions
formats = {}
for ed in added:
    fmt = ed["format"]
    formats[fmt] = formats.get(fmt, 0) + 1
print(f"\nNew editions by format:")
for fmt, count in sorted(formats.items()):
    print(f"  {fmt}: {count}")

# Era distribution
eras = {}
for ed in added:
    era = ed["era_slug"]
    eras[era] = eras.get(era, 0) + 1
print(f"\nNew editions by era:")
for era, count in sorted(eras.items(), key=lambda x: x[1], reverse=True):
    print(f"  {era}: {count}")

# Merge and write
merged = existing + added
print(f"\nFinal total: {len(merged)} editions")

# Format distribution of ALL editions
all_formats = {}
for ed in merged:
    fmt = ed["format"]
    all_formats[fmt] = all_formats.get(fmt, 0) + 1
print(f"\nAll editions by format:")
for fmt, count in sorted(all_formats.items(), key=lambda x: x[1], reverse=True):
    print(f"  {fmt}: {count}")

with open("archive/collected_editions.json", "w") as f:
    json.dump(merged, f, indent=4)

print(f"\nSuccessfully wrote {len(merged)} editions to archive/collected_editions.json")

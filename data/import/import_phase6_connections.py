#!/usr/bin/env python3
"""Phase 6: Auto-generate connections between editions.

Generates:
1. Sequential leads_to connections within series
2. Cross-format collected_in connections (Epic → Omnibus overlap)
3. Cross-series parallel connections (shared crossover issues)
"""

import json
import re
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

INPUT_EDITIONS = SCRIPT_DIR / "phase5_enriched.json"
INPUT_ISSUES = SCRIPT_DIR / "phase3_edition_issues.json"
EXISTING_EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
EXISTING_CONNECTIONS_PATH = WEB_DATA_DIR / "connections.json"
OUTPUT_PATH = SCRIPT_DIR / "phase6_connections.json"

# Volume number extraction patterns
VOL_PATTERN = re.compile(r"vol\.?\s*(\d+)", re.IGNORECASE)


def extract_series_prefix(slug: str) -> str:
    """Extract the series prefix from a slug (everything before vol number or format suffix)."""
    # Remove format suffixes
    for suffix in ["-omnibus", "-epic", "-mmw", "-tp", "-hc", "-ohc", "-cc", "-comp", "-prem"]:
        slug = slug.replace(suffix, "")
    # Remove volume suffix
    slug = re.sub(r"-v\d+$", "", slug)
    return slug.strip("-")


def extract_vol_number(slug: str, title: str) -> int | None:
    """Extract volume number from slug or title."""
    # Try slug first
    m = re.search(r"-v(\d+)$", slug)
    if m:
        return int(m.group(1))
    # Try title
    m = VOL_PATTERN.search(title)
    if m:
        return int(m.group(1))
    return None


def build_sequential_connections(new_editions: list[dict], all_editions: list[dict]) -> list[dict]:
    """Build leads_to connections between sequential volumes in the same series."""
    connections = []

    # Group all editions by series prefix + format
    series_groups: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for ed in all_editions:
        prefix = extract_series_prefix(ed["slug"])
        fmt = ed["format"]
        vol = extract_vol_number(ed["slug"], ed["title"])
        if vol is not None:
            series_groups[(prefix, fmt)].append((vol, ed))

    new_slugs = {e["slug"] for e in new_editions}

    for (prefix, fmt), volumes in series_groups.items():
        volumes.sort(key=lambda x: x[0])
        for i in range(len(volumes) - 1):
            vol_a, ed_a = volumes[i]
            vol_b, ed_b = volumes[i + 1]

            # Only create connection if at least one endpoint is new
            if ed_a["slug"] not in new_slugs and ed_b["slug"] not in new_slugs:
                continue

            connections.append({
                "source_type": "edition",
                "source_slug": ed_a["slug"],
                "target_type": "edition",
                "target_slug": ed_b["slug"],
                "connection_type": "leads_to",
                "strength": 8,
                "confidence": 95,
                "interpretation": "official",
                "description": f"Sequential volume: {ed_a['title']} → {ed_b['title']}",
            })

    return connections


def build_collected_in_connections(new_editions: list[dict], edition_issues: list[dict]) -> list[dict]:
    """Build collected_in connections when an Epic Collection is a subset of an Omnibus."""
    connections = []

    # Build issue sets per edition
    issue_sets: dict[str, set[tuple[str, int]]] = defaultdict(set)
    slug_to_format: dict[str, str] = {}

    for issue in edition_issues:
        key = (issue["series_name"], issue["issue_number"])
        issue_sets[issue["edition_slug"]].add(key)

    # Load format info from both existing and new
    for ed in new_editions:
        slug_to_format[ed["slug"]] = ed["format"]

    new_slugs = {e["slug"] for e in new_editions}

    # Check for subset relationships
    slugs_with_issues = [s for s in issue_sets if len(issue_sets[s]) >= 3]

    for i, slug_a in enumerate(slugs_with_issues):
        fmt_a = slug_to_format.get(slug_a, "")
        issues_a = issue_sets[slug_a]
        if len(issues_a) < 3:
            continue

        for slug_b in slugs_with_issues[i + 1:]:
            fmt_b = slug_to_format.get(slug_b, "")
            issues_b = issue_sets[slug_b]

            # Only connect if at least one is new
            if slug_a not in new_slugs and slug_b not in new_slugs:
                continue

            # Check if one is subset of the other
            if issues_a < issues_b and fmt_b == "omnibus":
                # A is collected in B (omnibus)
                connections.append({
                    "source_type": "edition",
                    "source_slug": slug_a,
                    "target_type": "edition",
                    "target_slug": slug_b,
                    "connection_type": "collected_in",
                    "strength": 5,
                    "confidence": 90,
                    "interpretation": "official",
                    "description": f"{slug_a} issues are collected in omnibus {slug_b}",
                })
            elif issues_b < issues_a and fmt_a == "omnibus":
                connections.append({
                    "source_type": "edition",
                    "source_slug": slug_b,
                    "target_type": "edition",
                    "target_slug": slug_a,
                    "connection_type": "collected_in",
                    "strength": 5,
                    "confidence": 90,
                    "interpretation": "official",
                    "description": f"{slug_b} issues are collected in omnibus {slug_a}",
                })

    return connections


def build_parallel_connections(new_editions: list[dict], edition_issues: list[dict]) -> list[dict]:
    """Build parallel connections between editions sharing crossover issues."""
    connections = []

    # Build issue-to-editions map
    issue_to_editions: dict[tuple[str, int], list[str]] = defaultdict(list)
    for issue in edition_issues:
        key = (issue["series_name"], issue["issue_number"])
        issue_to_editions[key].append(issue["edition_slug"])

    new_slugs = {e["slug"] for e in new_editions}

    # Find pairs that share issues across different series
    seen_pairs = set()
    for editions in issue_to_editions.values():
        if len(editions) < 2:
            continue
        for i, slug_a in enumerate(editions):
            for slug_b in editions[i + 1:]:
                if slug_a == slug_b:
                    continue
                pair = tuple(sorted([slug_a, slug_b]))
                if pair in seen_pairs:
                    continue
                if slug_a not in new_slugs and slug_b not in new_slugs:
                    continue
                seen_pairs.add(pair)
                connections.append({
                    "source_type": "edition",
                    "source_slug": pair[0],
                    "target_type": "edition",
                    "target_slug": pair[1],
                    "connection_type": "parallel",
                    "strength": 6,
                    "confidence": 85,
                    "interpretation": "official",
                    "description": f"Shared crossover issues between {pair[0]} and {pair[1]}",
                })

    return connections


def run():
    print("Phase 6: Auto-Generate Connections")
    print("=" * 50)

    # Load data
    with open(INPUT_EDITIONS) as f:
        new_editions = json.load(f)
    with open(EXISTING_EDITIONS_PATH) as f:
        existing_editions = json.load(f)
    with open(EXISTING_CONNECTIONS_PATH) as f:
        existing_connections = json.load(f)
    with open(INPUT_ISSUES) as f:
        new_issues = json.load(f)

    # Also load existing issues for cross-reference
    existing_issues_path = WEB_DATA_DIR / "edition_issues.json"
    if existing_issues_path.exists():
        with open(existing_issues_path) as f:
            existing_issues = json.load(f)
    else:
        existing_issues = []

    all_editions = existing_editions + new_editions
    all_issues = existing_issues + new_issues

    # Build format map for all editions
    for ed in all_editions:
        pass  # slug_to_format handled in subfunctions

    # Existing connection dedup set
    existing_conn_set = set()
    for c in existing_connections:
        key = (c["source_slug"], c["target_slug"], c["connection_type"])
        existing_conn_set.add(key)

    print(f"New editions: {len(new_editions)}")
    print(f"Existing connections: {len(existing_connections)}")
    print(f"All issues for cross-ref: {len(all_issues)}")

    # Generate connections
    sequential = build_sequential_connections(new_editions, all_editions)
    print(f"Sequential (leads_to): {len(sequential)}")

    collected_in = build_collected_in_connections(new_editions, all_issues)
    print(f"Collected_in: {len(collected_in)}")

    parallel = build_parallel_connections(new_editions, all_issues)
    print(f"Parallel: {len(parallel)}")

    # Combine and dedup against existing
    all_new_connections = sequential + collected_in + parallel
    deduped = []
    for c in all_new_connections:
        key = (c["source_slug"], c["target_slug"], c["connection_type"])
        if key not in existing_conn_set:
            existing_conn_set.add(key)
            deduped.append(c)

    print(f"\nTotal new connections (after dedup): {len(deduped)}")

    # Validate: ensure all slugs exist
    all_slugs = {e["slug"] for e in all_editions}
    valid = []
    invalid_count = 0
    for c in deduped:
        if c["source_slug"] in all_slugs and c["target_slug"] in all_slugs:
            valid.append(c)
        else:
            invalid_count += 1

    if invalid_count:
        print(f"Removed {invalid_count} connections with invalid slugs")

    print(f"Valid new connections: {len(valid)}")

    with open(OUTPUT_PATH, "w") as f:
        json.dump(valid, f, indent=2)
    print(f"Saved: {OUTPUT_PATH}")

    return valid


if __name__ == "__main__":
    run()

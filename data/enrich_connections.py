#!/usr/bin/env python3
"""AI-assisted connection generation for orphaned editions.

Identifies editions with NO connections (no incoming or outgoing edges)
and uses Claude API to suggest connections based on title, era, creators,
and issue overlap. Validates all suggested target slugs exist in the dataset.

Writes output to a SEPARATE file for review — never mutates the original.

Requires ANTHROPIC_API_KEY environment variable.
Requires: pip install anthropic

Usage:
  python3 data/enrich_connections.py                    # Full run
  python3 data/enrich_connections.py --dry-run           # List orphans, no API calls
  python3 data/enrich_connections.py --limit 10          # Process first 10 orphans
  python3 data/enrich_connections.py --resume             # Resume from checkpoint
"""

import argparse
import json
import sys
import time
from collections import defaultdict
from pathlib import Path

from enrichment_config import (
    EDITIONS_PATH,
    CONNECTIONS_PATH,
    ERAS_PATH,
    ENRICHED_CONNECTIONS_PATH,
    CONNECTIONS_REPORT_PATH,
    CONNECTIONS_CHECKPOINT_PATH,
    API_DELAY_SECONDS,
    CONNECTIONS_SYSTEM_PROMPT,
    build_connections_prompt,
    get_api_key,
)

BATCH_SIZE = 10          # orphans per API call
CHECKPOINT_EVERY = 5     # batches between saves

# Valid connection types (for validation)
VALID_CONNECTION_TYPES = {
    "leads_to", "ties_into", "spin_off", "retcons", "references",
    "parallel", "collected_in", "prerequisite", "recommended_after",
}


# ============================================================
# DATA LOADING
# ============================================================
def load_data() -> dict:
    """Load editions, connections, and eras."""
    print("Loading data...")

    with open(EDITIONS_PATH) as f:
        editions = json.load(f)
    print(f"  Editions: {len(editions)}")

    with open(CONNECTIONS_PATH) as f:
        connections = json.load(f)
    print(f"  Connections: {len(connections)}")

    with open(ERAS_PATH) as f:
        eras = json.load(f)
    eras_by_slug = {e["slug"]: e for e in eras}
    print(f"  Eras: {len(eras)}")

    # Build slug sets and connection indexes
    all_slugs = {e["slug"] for e in editions}
    connected_slugs = set()
    for c in connections:
        connected_slugs.add(c["source_slug"])
        connected_slugs.add(c["target_slug"])

    editions_by_slug = {e["slug"]: e for e in editions}
    orphans = [e for e in editions if e["slug"] not in connected_slugs]

    print(f"  Connected editions: {len(connected_slugs)}")
    print(f"  Orphaned editions (no connections): {len(orphans)}")

    return {
        "editions": editions,
        "editions_by_slug": editions_by_slug,
        "connections": connections,
        "eras_by_slug": eras_by_slug,
        "all_slugs": all_slugs,
        "connected_slugs": connected_slugs,
        "orphans": orphans,
    }


# ============================================================
# API CALLS
# ============================================================
def call_claude_api(prompt: str, api_key: str) -> list[dict]:
    """Call Claude API and parse JSON response."""
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=CONNECTIONS_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Extract JSON from response (handle markdown code blocks)
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    return json.loads(content)


# ============================================================
# VALIDATION
# ============================================================
def validate_connections(
    raw_results: list[dict],
    all_slugs: set[str],
    existing_pairs: set[tuple],
) -> list[dict]:
    """Validate AI-suggested connections against the dataset.

    Returns list of valid connection dicts ready for connections.json format.
    """
    valid = []
    rejected = 0

    for entry in raw_results:
        source_slug = entry.get("source_slug", "")
        if source_slug not in all_slugs:
            rejected += 1
            continue

        for conn in entry.get("connections", []):
            target_slug = conn.get("target_slug", "")
            conn_type = conn.get("connection_type", "")

            # Validate target exists
            if target_slug not in all_slugs:
                rejected += 1
                continue

            # Validate connection type
            if conn_type not in VALID_CONNECTION_TYPES:
                rejected += 1
                continue

            # Skip self-connections
            if source_slug == target_slug:
                rejected += 1
                continue

            # Skip duplicates of existing connections
            pair = (source_slug, target_slug, conn_type)
            if pair in existing_pairs:
                rejected += 1
                continue

            # Validate strength and confidence ranges
            strength = conn.get("strength", 5)
            confidence = conn.get("confidence", 50)
            strength = max(1, min(10, int(strength)))
            confidence = max(0, min(100, int(confidence)))

            valid.append({
                "source_type": "edition",
                "source_slug": source_slug,
                "target_type": "edition",
                "target_slug": target_slug,
                "connection_type": conn_type,
                "strength": strength,
                "confidence": confidence,
                "description": conn.get("description", ""),
            })

            # Track to avoid duplicates within this batch
            existing_pairs.add(pair)

    return valid


# ============================================================
# REPORT
# ============================================================
def generate_report(
    new_connections: list[dict],
    orphan_count: int,
    editions_by_slug: dict,
    report_path: Path,
):
    """Generate a Markdown report of new connections."""
    lines = [
        "# Connection Enrichment Report",
        "",
        f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Orphaned editions processed: {orphan_count}",
        f"New connections generated: {len(new_connections)}",
        "",
        "---",
        "",
    ]

    # Group by source
    by_source = defaultdict(list)
    for c in new_connections:
        by_source[c["source_slug"]].append(c)

    for source_slug in sorted(by_source.keys()):
        conns = by_source[source_slug]
        source = editions_by_slug.get(source_slug, {})
        lines.append(f"## {source.get('title', source_slug)}")
        lines.append(f"**Slug:** `{source_slug}`")
        lines.append("")

        for c in conns:
            target = editions_by_slug.get(c["target_slug"], {})
            lines.append(
                f"- **{c['connection_type']}** → "
                f"`{c['target_slug']}` ({target.get('title', '?')}) "
                f"| strength: {c['strength']}, confidence: {c['confidence']}"
            )
            if c.get("description"):
                lines.append(f"  - {c['description']}")
        lines.append("")
        lines.append("---")
        lines.append("")

    with open(report_path, "w") as f:
        f.write("\n".join(lines))

    print(f"Report saved: {report_path}")


# ============================================================
# MAIN
# ============================================================
def main():
    parser = argparse.ArgumentParser(
        description="AI-assisted connection generation for orphaned Marvel Cartographer editions"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="List orphans only, no API calls"
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Process only first N orphaned editions"
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Resume from checkpoint"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("MARVEL CARTOGRAPHER — CONNECTION ENRICHMENT")
    print("=" * 60)
    print()

    data = load_data()
    orphans = data["orphans"]

    if args.dry_run:
        print(f"\n[DRY RUN] {len(orphans)} orphaned editions:")
        for o in orphans:
            era = data["eras_by_slug"].get(o.get("era_slug", ""), {})
            era_name = era.get("name", "Unknown era")
            print(f"  {o['slug']:<60} {o['format']:<20} {era_name}")
        return

    api_key = get_api_key()

    if args.limit:
        orphans = orphans[:args.limit]

    print(f"\nOrphans to process: {len(orphans)}")
    total_batches = (len(orphans) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Estimated API calls: {total_batches}")
    print()

    if not orphans:
        print("No orphaned editions to process!")
        return

    # Build existing connection pair set for dedup
    existing_pairs = set()
    for c in data["connections"]:
        existing_pairs.add((c["source_slug"], c["target_slug"], c["connection_type"]))

    # Handle resume
    start_index = 0
    all_new_connections = []
    if args.resume and CONNECTIONS_CHECKPOINT_PATH.exists():
        with open(CONNECTIONS_CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        all_new_connections = checkpoint["new_connections"]
        # Rebuild existing_pairs with checkpoint data
        for c in all_new_connections:
            existing_pairs.add((c["source_slug"], c["target_slug"], c["connection_type"]))
        print(f"Resuming from checkpoint: {start_index} already processed, {len(all_new_connections)} connections")

    batches_since_checkpoint = 0

    for batch_start in range(start_index, len(orphans), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(orphans))
        batch = orphans[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1

        slugs_str = ", ".join(e["slug"][:25] for e in batch)
        print(
            f"Batch {batch_num}/{total_batches} "
            f"(orphans {batch_start + 1}-{batch_end}): {slugs_str}...",
            end=" ",
            flush=True,
        )

        try:
            prompt = build_connections_prompt(
                batch, data["all_slugs"], data["connections"], data["eras_by_slug"]
            )
            raw_results = call_claude_api(prompt, api_key)

            validated = validate_connections(raw_results, data["all_slugs"], existing_pairs)
            all_new_connections.extend(validated)
            print(f"OK ({len(validated)} valid connections)")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e} — skipping batch")

        except Exception as e:
            print(f"API error: {e} — skipping batch")

        batches_since_checkpoint += 1

        # Checkpoint
        if batches_since_checkpoint >= CHECKPOINT_EVERY:
            checkpoint = {
                "processed_count": batch_end,
                "new_connections": all_new_connections,
            }
            with open(CONNECTIONS_CHECKPOINT_PATH, "w") as f:
                json.dump(checkpoint, f)
            print(f"  [Checkpoint saved: {batch_end}/{len(orphans)}]")
            batches_since_checkpoint = 0

        time.sleep(API_DELAY_SECONDS)

    # Merge new connections with existing
    merged = data["connections"] + all_new_connections

    with open(ENRICHED_CONNECTIONS_PATH, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"\nEnriched connections saved: {ENRICHED_CONNECTIONS_PATH}")
    print(f"Existing: {len(data['connections'])}, New: {len(all_new_connections)}, Total: {len(merged)}")

    # Generate report
    generate_report(
        all_new_connections,
        len(orphans),
        data["editions_by_slug"],
        CONNECTIONS_REPORT_PATH,
    )

    # Clean up checkpoint
    if CONNECTIONS_CHECKPOINT_PATH.exists():
        CONNECTIONS_CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")

    print("\nDone! Review the report, then merge approved changes:")
    print(f"  Report: {CONNECTIONS_REPORT_PATH}")
    print(f"  Enriched data: {ENRICHED_CONNECTIONS_PATH}")
    print(f"  To merge: cp {ENRICHED_CONNECTIONS_PATH} {CONNECTIONS_PATH}")


if __name__ == "__main__":
    main()

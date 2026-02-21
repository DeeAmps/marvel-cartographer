#!/usr/bin/env python3
"""AI-assisted batch enrichment for edition synopses and connection_notes.

Loads collected_editions.json, scores quality, and uses Claude API to
enrich thin synopses (<700 chars) with issue citations, thematic depth,
and editorial context. Writes enriched output to a SEPARATE file for
review — never mutates the original.

Requires ANTHROPIC_API_KEY environment variable.
Requires: pip install anthropic

Usage:
  python3 data/enrich_synopses.py                      # Full run
  python3 data/enrich_synopses.py --dry-run             # Score only, no API calls
  python3 data/enrich_synopses.py --dry-run --limit 10  # Score first 10
  python3 data/enrich_synopses.py --limit 5             # Enrich first 5 (test)
  python3 data/enrich_synopses.py --resume              # Resume from checkpoint
  python3 data/enrich_synopses.py --priority 1          # Only priority 1 (full rewrites)
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
    CHARACTERS_PATH,
    EVENTS_PATH,
    ERAS_PATH,
    ENRICHED_EDITIONS_PATH,
    ENRICHMENT_REPORT_PATH,
    SYNOPSIS_CHECKPOINT_PATH,
    BATCH_SIZE,
    CHECKPOINT_EVERY,
    API_DELAY_SECONDS,
    SYNOPSIS_SYSTEM_PROMPT,
    build_synopsis_prompt,
    get_api_key,
    score_synopsis_quality,
)


# ============================================================
# DATA LOADING
# ============================================================
def load_context() -> dict:
    """Load all context data needed for enrichment prompts."""
    print("Loading context data...")

    # Use enriched file if it exists (to continue from previous run)
    if ENRICHED_EDITIONS_PATH.exists():
        with open(ENRICHED_EDITIONS_PATH) as f:
            editions = json.load(f)
        print(f"  Editions: {len(editions)} (from enriched file)")
    else:
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

    with open(EVENTS_PATH) as f:
        events = json.load(f)
    print(f"  Events: {len(events)}")

    with open(CHARACTERS_PATH) as f:
        characters = json.load(f)
    print(f"  Characters: {len(characters)}")

    # Index connections by source and target slug
    connections_by_source = defaultdict(list)
    connections_by_target = defaultdict(list)
    for c in connections:
        connections_by_source[c["source_slug"]].append(c)
        connections_by_target[c["target_slug"]].append(c)

    return {
        "editions": editions,
        "connections": connections,
        "connections_by_source": dict(connections_by_source),
        "connections_by_target": dict(connections_by_target),
        "eras_by_slug": eras_by_slug,
        "events": events,
        "characters": characters,
    }


# ============================================================
# QUALITY ANALYSIS
# ============================================================
def analyze_quality(editions: list[dict]) -> dict:
    """Score all editions and return analysis summary."""
    results = []
    for edition in editions:
        synopsis = edition.get("synopsis", "")
        score_info = score_synopsis_quality(synopsis)
        results.append({
            "slug": edition["slug"],
            "title": edition["title"],
            **score_info,
        })

    # Summary by priority
    by_priority = defaultdict(list)
    for r in results:
        by_priority[r["priority"]].append(r)

    return {
        "results": results,
        "by_priority": dict(by_priority),
        "total": len(results),
        "needs_enrichment": sum(1 for r in results if r["priority"] > 0),
    }


def print_quality_summary(analysis: dict):
    """Print a summary of the quality analysis."""
    print("\n" + "=" * 60)
    print("SYNOPSIS QUALITY ANALYSIS")
    print("=" * 60)
    print(f"Total editions: {analysis['total']}")
    print(f"Need enrichment: {analysis['needs_enrichment']}")
    print()

    priority_labels = {
        0: "Good (skip)",
        1: "Full rewrite (<400 chars)",
        2: "Enhance (400-700 chars, no citations)",
        3: "Light polish (400-700 chars, has citations)",
    }
    for p in sorted(analysis["by_priority"].keys()):
        count = len(analysis["by_priority"][p])
        label = priority_labels.get(p, f"Priority {p}")
        print(f"  Priority {p} — {label}: {count}")

    # Show worst 10
    worst = sorted(analysis["results"], key=lambda r: r["score"])[:10]
    print(f"\nWorst 10 synopses:")
    for r in worst:
        print(f"  [{r['score']:3d}] {r['title'][:60]:<60} ({r['length']} chars, {r['citation_count']} citations)")


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
        system=SYNOPSIS_SYSTEM_PROMPT,
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
# ENRICHMENT
# ============================================================
def enrich_batch(batch: list[dict], context: dict, api_key: str) -> list[dict]:
    """Enrich a batch of editions via Claude API.

    Returns list of dicts with 'index', 'synopsis', 'connection_notes'.
    """
    prompt = build_synopsis_prompt(batch, context)
    return call_claude_api(prompt, api_key)


def apply_enrichment(edition: dict, result: dict) -> dict:
    """Apply enrichment result to an edition, returning modified copy."""
    enriched = dict(edition)
    new_synopsis = result.get("synopsis", "")
    new_notes = result.get("connection_notes", "")

    # Only apply if the new version is actually better
    if new_synopsis and len(new_synopsis) > len(edition.get("synopsis", "")):
        enriched["synopsis"] = new_synopsis
    elif new_synopsis:
        # New synopsis is shorter — keep it only if it has more citations
        from enrichment_config import ISSUE_CITATION_PATTERN
        old_citations = len(ISSUE_CITATION_PATTERN.findall(edition.get("synopsis", "")))
        new_citations = len(ISSUE_CITATION_PATTERN.findall(new_synopsis))
        if new_citations > old_citations:
            enriched["synopsis"] = new_synopsis

    if new_notes:
        enriched["connection_notes"] = new_notes

    return enriched


# ============================================================
# DIFF REPORT
# ============================================================
def generate_report(
    originals: list[dict],
    enriched_map: dict,
    report_path: Path,
):
    """Generate a Markdown diff report showing before/after for each enriched edition."""
    lines = [
        "# Synopsis Enrichment Report",
        "",
        f"Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"Editions enriched: {len(enriched_map)}",
        "",
        "---",
        "",
    ]

    slug_to_original = {e["slug"]: e for e in originals}

    for slug, enriched in sorted(enriched_map.items()):
        original = slug_to_original.get(slug, {})
        old_synopsis = original.get("synopsis", "")
        new_synopsis = enriched.get("synopsis", "")
        old_notes = original.get("connection_notes", "")
        new_notes = enriched.get("connection_notes", "")

        old_score = score_synopsis_quality(old_synopsis)
        new_score = score_synopsis_quality(new_synopsis)

        lines.append(f"## {enriched.get('title', slug)}")
        lines.append(f"**Slug:** `{slug}`")
        lines.append(
            f"**Quality:** {old_score['score']} → {new_score['score']} "
            f"| Length: {old_score['length']} → {new_score['length']} "
            f"| Citations: {old_score['citation_count']} → {new_score['citation_count']}"
        )
        lines.append("")

        if old_synopsis != new_synopsis:
            lines.append("### Synopsis")
            lines.append("**Before:**")
            lines.append(f"> {old_synopsis}")
            lines.append("")
            lines.append("**After:**")
            lines.append(f"> {new_synopsis}")
            lines.append("")

        if old_notes != new_notes:
            lines.append("### Connection Notes")
            lines.append("**Before:**")
            lines.append(f"> {old_notes}")
            lines.append("")
            lines.append("**After:**")
            lines.append(f"> {new_notes}")
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
        description="AI-assisted synopsis enrichment for Marvel Cartographer editions"
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Score quality only, no API calls"
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="Process only first N entries needing enrichment"
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Resume from checkpoint"
    )
    parser.add_argument(
        "--priority", type=int, default=0,
        help="Only process editions with this priority level (1, 2, or 3)"
    )
    args = parser.parse_args()

    print("=" * 60)
    print("MARVEL CARTOGRAPHER — SYNOPSIS ENRICHMENT")
    print("=" * 60)
    print()

    # Load all data
    context = load_context()
    editions = context["editions"]

    # Quality analysis
    analysis = analyze_quality(editions)
    print_quality_summary(analysis)

    if args.dry_run:
        print("\n[DRY RUN] No API calls made.")
        return

    # Get API key
    api_key = get_api_key()

    # Filter to editions needing enrichment
    needs_work = []
    for edition in editions:
        score_info = score_synopsis_quality(edition.get("synopsis", ""))
        if score_info["priority"] > 0:
            if args.priority == 0 or score_info["priority"] == args.priority:
                needs_work.append(edition)

    if args.limit:
        needs_work = needs_work[:args.limit]

    print(f"\nEditions to enrich: {len(needs_work)}")
    print(f"Batch size: {BATCH_SIZE}")
    total_batches = (len(needs_work) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Estimated API calls: {total_batches}")
    print()

    if not needs_work:
        print("Nothing to enrich!")
        return

    # Handle resume
    start_index = 0
    enriched_map = {}  # slug -> enriched edition
    if args.resume and SYNOPSIS_CHECKPOINT_PATH.exists():
        with open(SYNOPSIS_CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        enriched_map = checkpoint["enriched_map"]
        print(f"Resuming from checkpoint: {start_index} already processed")

    batches_since_checkpoint = 0

    for batch_start in range(start_index, len(needs_work), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(needs_work))
        batch = needs_work[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1

        slugs_str = ", ".join(e["slug"][:30] for e in batch)
        print(
            f"Batch {batch_num}/{total_batches} "
            f"(entries {batch_start + 1}-{batch_end}): {slugs_str}...",
            end=" ",
            flush=True,
        )

        try:
            results = enrich_batch(batch, context, api_key)

            applied = 0
            for i, edition in enumerate(batch):
                if i < len(results):
                    enriched = apply_enrichment(edition, results[i])
                    enriched_map[edition["slug"]] = enriched
                    applied += 1

            print(f"OK ({applied} enriched)")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e} — skipping batch")

        except Exception as e:
            print(f"API error: {e} — skipping batch")

        batches_since_checkpoint += 1

        # Checkpoint
        if batches_since_checkpoint >= CHECKPOINT_EVERY:
            checkpoint = {
                "processed_count": batch_end,
                "enriched_map": enriched_map,
            }
            with open(SYNOPSIS_CHECKPOINT_PATH, "w") as f:
                json.dump(checkpoint, f)
            print(f"  [Checkpoint saved: {batch_end}/{len(needs_work)}]")
            batches_since_checkpoint = 0

        # Rate limiting
        time.sleep(API_DELAY_SECONDS)

    # Build enriched output — full edition list with enrichments applied
    enriched_editions = []
    for edition in editions:
        if edition["slug"] in enriched_map:
            enriched_editions.append(enriched_map[edition["slug"]])
        else:
            enriched_editions.append(edition)

    # Save enriched output
    with open(ENRICHED_EDITIONS_PATH, "w") as f:
        json.dump(enriched_editions, f, indent=2)
    print(f"\nEnriched editions saved: {ENRICHED_EDITIONS_PATH}")
    print(f"Total enriched: {len(enriched_map)}")

    # Generate diff report (always compare against original, not enriched input)
    with open(EDITIONS_PATH) as f:
        originals = json.load(f)
    generate_report(originals, enriched_map, ENRICHMENT_REPORT_PATH)

    # Clean up checkpoint
    if SYNOPSIS_CHECKPOINT_PATH.exists():
        SYNOPSIS_CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")

    print("\nDone! Review the report, then merge approved changes:")
    print(f"  Report: {ENRICHMENT_REPORT_PATH}")
    print(f"  Enriched data: {ENRICHED_EDITIONS_PATH}")
    print(f"  To merge: cp {ENRICHED_EDITIONS_PATH} {EDITIONS_PATH}")


if __name__ == "__main__":
    main()

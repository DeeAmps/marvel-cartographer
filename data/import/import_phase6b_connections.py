#!/usr/bin/env python3
"""Phase 6b: AI-generate semantic connections between editions.

Uses Claude API to generate the missing connection types:
- recommended_after: "if you enjoyed X, read Y"
- ties_into: shared events/storylines across series
- prerequisite: must-read-first dependencies
- spin_off: character/series spin-offs

Sends batches of 15 editions with a full slug reference list.
Checkpointed every 10 batches. Safe to restart with --resume.

Usage:
  python3 import_phase6b_connections.py
  python3 import_phase6b_connections.py --resume
  python3 import_phase6b_connections.py --sample 30  # First 30 editions only
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
CONNECTIONS_PATH = WEB_DATA_DIR / "connections.json"
ENRICHED_PATH = SCRIPT_DIR / "phase5_enriched.json"
OUTPUT_PATH = SCRIPT_DIR / "phase6b_connections.json"
CHECKPOINT_PATH = SCRIPT_DIR / "phase6b_checkpoint.json"

BATCH_SIZE = 15
CHECKPOINT_EVERY = 10  # batches


SYSTEM_PROMPT = """You are a Marvel Comics chronology expert building a reading graph.
Given a batch of collected editions, identify semantic connections between them and to
other editions in the reference list.

Connection types to generate:
1. recommended_after (strength 6-7, confidence 80) — "if you enjoyed X, read Y next"
   - Same character continuing in a different series/format
   - Same creative team on a new project
   - Thematic successor (e.g., street-level → street-level)

2. ties_into (strength 5-7, confidence 85) — shared events/storylines
   - Crossover event tie-ins
   - Parallel storylines referencing each other
   - Shared supporting cast across series

3. prerequisite (strength 8-9, confidence 90) — must-read-first
   - Direct plot dependencies (cliffhanger continues in another title)
   - Character origin needed to understand a storyline
   - Event setup issues

4. spin_off (strength 7, confidence 90) — character/series spin-offs
   - Character leaves one series to star in another
   - New series launched from events in another

Rules:
- Only generate connections where you're confident the relationship exists
- source_slug is the edition you'd read FIRST, target_slug is what follows
- Both slugs MUST come from the reference list — never invent slugs
- Don't duplicate leads_to connections (those are handled by sequential volume detection)
- Focus on CROSS-SERIES connections, not sequential volumes of the same run
- For each batch edition, try to find 1-3 outgoing connections
- Keep descriptions under 80 characters"""


EXAMPLES = """
Examples of good connections:
- {source: "dd-miller-omnibus", target: "punisher-epic-v2-circle-of-blood", type: "spin_off", strength: 7, confidence: 90, desc: "Punisher breaks out as solo character from Miller's DD"}
- {source: "infinity-gauntlet-omnibus", target: "warlock-infinity-watch-omnibus", type: "recommended_after", strength: 7, confidence: 85, desc: "Warlock & Infinity Watch continues Gauntlet's cosmic story"}
- {source: "uxm-claremont-omnibus-v2", target: "new-mutants-omnibus-v1", type: "spin_off", strength: 7, confidence: 90, desc: "New Mutants spin out of Claremont's X-Men"}
- {source: "civil-war", target: "cap-brubaker-v2", type: "ties_into", strength: 8, confidence: 95, desc: "Civil War leads to Cap's assassination in Brubaker's run"}
- {source: "house-of-m", target: "decimation-x-men", type: "prerequisite", strength: 9, confidence: 95, desc: "House of M's 'No More Mutants' drives all post-Decimation X-books"}
"""


def build_reference_list(all_editions: list[dict]) -> str:
    """Build a compressed slug-only reference list to minimize token usage.

    The full slug|title|era format was ~260K chars (~65K tokens), exceeding
    rate limits. Slug-only is ~55K chars (~14K tokens).
    """
    return "\n".join(ed["slug"] for ed in all_editions)


def build_era_context(batch: list[dict], all_editions: list[dict]) -> str:
    """Build a focused context list of editions from same/adjacent eras.

    Instead of sending all 2778 slugs with titles, send detailed info only
    for the ~200-400 editions most likely to be connected to this batch.
    """
    # Get eras represented in this batch
    batch_eras = {ed.get("era_slug", "") for ed in batch}

    # Load era ordering
    era_order = [
        "birth-of-marvel", "the-expansion", "bronze-age", "rise-of-x-men",
        "event-age", "speculation-crash", "heroes-reborn-return",
        "marvel-knights-ultimate", "bendis-avengers", "hickman-saga",
        "all-new-all-different", "dawn-of-krakoa", "blood-hunt-doom",
        "current-ongoings"
    ]
    era_idx = {e: i for i, e in enumerate(era_order)}

    # Include adjacent eras (+/- 1)
    target_eras = set()
    for era in batch_eras:
        idx = era_idx.get(era, 7)
        for offset in [-1, 0, 1]:
            adj_idx = max(0, min(len(era_order) - 1, idx + offset))
            target_eras.add(era_order[adj_idx])

    # Build focused context: slug|title for editions in target eras
    lines = []
    for ed in all_editions:
        if ed.get("era_slug") in target_eras:
            lines.append(f"{ed['slug']}|{ed['title'][:50]}")

    return "\n".join(lines)


def build_batch_prompt(batch: list[dict], ref_list: str) -> str:
    editions_text = ""
    for i, ed in enumerate(batch, 1):
        editions_text += f"\n--- Edition {i} ---\n"
        editions_text += f"Slug: {ed['slug']}\n"
        editions_text += f"Title: {ed['title']}\n"
        editions_text += f"Format: {ed['format']}\n"
        editions_text += f"Era: {ed.get('era_slug', '?')}\n"
        editions_text += f"Issues: {ed.get('issues_collected', 'Unknown')[:150]}\n"
        conn_notes = ed.get("connection_notes", "")
        if conn_notes:
            editions_text += f"Connection Notes: {conn_notes[:100]}\n"

    return f"""Generate semantic connections for these {len(batch)} editions.
Both source_slug and target_slug MUST exist in the valid slug list below.
Do NOT generate leads_to connections (those exist already for sequential volumes).

{EXAMPLES}

EDITIONS TO PROCESS:
{editions_text}

VALID EDITION SLUGS (one per line — both source and target must be from this list):
{ref_list}

Respond with a JSON array:
[{{"source_slug":"...","target_slug":"...","connection_type":"recommended_after|ties_into|prerequisite|spin_off","strength":5,"confidence":80,"description":"..."}}]

Only output JSON. If no connections, output []."""


def call_claude_api(prompt: str, api_key: str) -> list[dict]:
    """Call Claude API and parse response."""
    try:
        import anthropic
    except ImportError:
        print("ERROR: anthropic package not installed. Run: pip install anthropic")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=api_key)

    response = client.messages.create(
        model="claude-sonnet-4-5-20250929",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Extract JSON from response
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    return json.loads(content)


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=0, help="Process only first N editions")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    args = parser.parse_args()

    print("Phase 6b: AI-Generate Semantic Connections")
    print("=" * 60)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    # Load all editions (existing + new)
    with open(EDITIONS_PATH) as f:
        all_editions = json.load(f)
    print(f"Total editions in reference: {len(all_editions)}")

    # Load new editions to process (the imported ones)
    with open(ENRICHED_PATH) as f:
        new_editions = json.load(f)
    print(f"New editions to process: {len(new_editions)}")

    # Load existing connections to avoid duplicates
    with open(CONNECTIONS_PATH) as f:
        existing_connections = json.load(f)
    existing_keys = set()
    for c in existing_connections:
        key = (c.get("source_slug", ""), c.get("target_slug", ""), c["connection_type"])
        existing_keys.add(key)
    print(f"Existing connections: {len(existing_connections)}")

    # Build reference list (slug-only to minimize tokens)
    all_slugs = {ed["slug"] for ed in all_editions}
    ref_list = build_reference_list(all_editions)
    print(f"Reference list: {len(all_slugs)} slugs, {len(ref_list)} chars (~{len(ref_list)//4} tokens)")

    # Handle sample mode
    if args.sample:
        new_editions = new_editions[:args.sample]
        print(f"Sample mode: processing first {args.sample} editions")

    # Handle resume
    start_index = 0
    new_connections = []
    if args.resume and CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        new_connections = checkpoint["connections"]
        # Add checkpoint connections to existing keys
        for c in new_connections:
            key = (c["source_slug"], c["target_slug"], c["connection_type"])
            existing_keys.add(key)
        print(f"Resuming from checkpoint: {start_index} already processed, {len(new_connections)} connections found")

    total = len(new_editions)
    total_batches = (total - start_index + BATCH_SIZE - 1) // BATCH_SIZE
    batches_since_checkpoint = 0
    api_errors = 0

    print(f"\nBatches remaining: {total_batches}")
    print(f"Estimated time: ~{total_batches * 10}s ({total_batches * 10 / 60:.0f} min)")
    print()

    for batch_start in range(start_index, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = new_editions[batch_start:batch_end]
        batch_num = (batch_start - start_index) // BATCH_SIZE + 1

        print(f"Batch {batch_num}/{total_batches} (editions {batch_start + 1}-{batch_end})...", end=" ", flush=True)

        prompt = build_batch_prompt(batch, ref_list)

        try:
            results = call_claude_api(prompt, api_key)

            # Validate and deduplicate results
            valid = 0
            for conn in results:
                src = conn.get("source_slug", "")
                tgt = conn.get("target_slug", "")
                ctype = conn.get("connection_type", "")

                # Validate
                if src not in all_slugs:
                    continue
                if tgt not in all_slugs:
                    continue
                if ctype not in ("recommended_after", "ties_into", "prerequisite", "spin_off"):
                    continue
                if src == tgt:
                    continue

                # Dedup
                key = (src, tgt, ctype)
                if key in existing_keys:
                    continue
                existing_keys.add(key)

                new_connections.append({
                    "source_type": "edition",
                    "source_slug": src,
                    "target_type": "edition",
                    "target_slug": tgt,
                    "connection_type": ctype,
                    "strength": conn.get("strength", 6),
                    "confidence": conn.get("confidence", 80),
                    "description": conn.get("description", "")[:100],
                })
                valid += 1

            print(f"OK ({valid} new connections from {len(results)} results)")

        except json.JSONDecodeError as e:
            api_errors += 1
            print(f"JSON parse error: {e}")

        except Exception as e:
            err_str = str(e)
            if "rate_limit" in err_str or "429" in err_str:
                # Rate limit — wait and retry once
                print(f"Rate limited, waiting 60s...")
                time.sleep(60)
                try:
                    era_context = build_era_context(batch, all_editions)
                    prompt = build_batch_prompt(batch, ref_list, era_context)
                    results = call_claude_api(prompt, api_key)
                    valid = 0
                    for conn in results:
                        src = conn.get("source_slug", "")
                        tgt = conn.get("target_slug", "")
                        ctype = conn.get("connection_type", "")
                        if src not in all_slugs or tgt not in all_slugs:
                            continue
                        if ctype not in ("recommended_after", "ties_into", "prerequisite", "spin_off"):
                            continue
                        if src == tgt:
                            continue
                        key = (src, tgt, ctype)
                        if key in existing_keys:
                            continue
                        existing_keys.add(key)
                        new_connections.append({
                            "source_type": "edition",
                            "source_slug": src,
                            "target_type": "edition",
                            "target_slug": tgt,
                            "connection_type": ctype,
                            "strength": conn.get("strength", 6),
                            "confidence": conn.get("confidence", 80),
                            "description": conn.get("description", "")[:100],
                        })
                        valid += 1
                    print(f"Retry OK ({valid} new connections)")
                except Exception as e2:
                    api_errors += 1
                    print(f"Retry failed: {e2}")
            else:
                api_errors += 1
                print(f"API error: {e}")

            if api_errors > 10:
                print("\nToo many errors, stopping.")
                break

        batches_since_checkpoint += 1

        # Checkpoint
        if batches_since_checkpoint >= CHECKPOINT_EVERY:
            checkpoint = {
                "processed_count": batch_end,
                "connections": new_connections,
            }
            with open(CHECKPOINT_PATH, "w") as f:
                json.dump(checkpoint, f)
            print(f"  [Checkpoint: {batch_end}/{total}, {len(new_connections)} connections so far]")
            batches_since_checkpoint = 0

        # Rate limiting — respect 30K tokens/min limit
        # Each request is ~20K tokens, so wait ~45s between requests
        time.sleep(45)

    # Connection type distribution
    type_counts = {}
    for c in new_connections:
        t = c["connection_type"]
        type_counts[t] = type_counts.get(t, 0) + 1

    print(f"\n{'=' * 60}")
    print(f"RESULTS")
    print(f"{'=' * 60}")
    print(f"New connections generated: {len(new_connections)}")
    print(f"API errors: {api_errors}")
    print(f"\nBy type:")
    for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

    # Save new connections to separate file
    with open(OUTPUT_PATH, "w") as f:
        json.dump(new_connections, f, indent=2)
    print(f"\nSaved: {OUTPUT_PATH}")

    # Merge into main connections.json
    merged = existing_connections + new_connections
    with open(CONNECTIONS_PATH, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"Merged into: {CONNECTIONS_PATH} ({len(merged)} total)")

    # Clean up checkpoint
    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")


if __name__ == "__main__":
    run()

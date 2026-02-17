#!/usr/bin/env python3
"""Phase 5: AI-generate synopses, importance levels, and connection notes.

Requires ANTHROPIC_API_KEY environment variable.
Uses Claude API in batches of 20 editions per call.
Checkpointed every 5 batches (100 editions) — safe to restart.

Usage:
  python3 import_phase5_ai_enrich.py              # Full run
  python3 import_phase5_ai_enrich.py --sample 50   # Sample run (first 50)
  python3 import_phase5_ai_enrich.py --resume       # Resume from checkpoint
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

INPUT_PATH = SCRIPT_DIR / "phase2_cleaned.json"
EXISTING_PATH = WEB_DATA_DIR / "collected_editions.json"
OUTPUT_PATH = SCRIPT_DIR / "phase5_enriched.json"
CHECKPOINT_PATH = SCRIPT_DIR / "phase5_checkpoint.json"

BATCH_SIZE = 10
CHECKPOINT_EVERY = 10  # batches

# Heuristic importance rules (AI can override)
def heuristic_importance(entry: dict) -> str:
    title_lower = entry["title"].lower()
    fmt = entry["format"]

    # Major series omnibus Vol. 1 → essential
    major_series = [
        "fantastic four", "amazing spider-man", "uncanny x-men", "avengers",
        "iron man", "captain america", "thor", "hulk", "daredevil",
        "x-men", "wolverine", "spider-man"
    ]
    is_vol1 = any(v in title_lower for v in ["vol. 1", "vol 1", "volume 1"])
    is_major = any(s in title_lower for s in major_series)

    if fmt == "omnibus" and is_vol1 and is_major:
        return "essential"
    if fmt == "omnibus" and is_major:
        return "recommended"
    if fmt == "omnibus":
        return "recommended"
    if fmt == "epic_collection":
        return "recommended"
    if fmt == "masterworks":
        return "supplemental"
    if fmt == "complete_collection":
        return "supplemental"
    if fmt in ("trade_paperback", "hardcover", "oversized_hardcover"):
        if is_major:
            return "recommended"
        return "supplemental"
    return "supplemental"


SYSTEM_PROMPT = """You are a Marvel Comics expert and editorial writer for a chronology reference app.
Your job is to write concise, informative synopses and assign importance levels for collected editions.

Rules:
- Synopsis: 3-5 sentences. Cite specific issue numbers. Focus on key storylines and significance.
- Importance: One of "essential", "recommended", "supplemental", "completionist"
  - essential: Foundational runs that define characters or the Marvel Universe
  - recommended: Strong runs worth reading for fans of the character/era
  - supplemental: Good but not critical reading
  - completionist: For completists only, minor or niche material
- connection_notes: 1-2 sentences about what to read before/after this edition.
- Write in an engaging editorial voice, not dry catalog descriptions.
- If you're unsure about content, note it honestly. Don't fabricate storylines."""


EXAMPLE_EDITIONS = [
    {
        "title": "Fantastic Four Omnibus Vol. 1",
        "format": "omnibus",
        "issues_collected": "FF #1-30, Annual #1",
        "synopsis": "The Marvel Universe begins here. Stan Lee and Jack Kirby's Fantastic Four #1-30 introduces Marvel's First Family, their origin in cosmic rays, and a parade of iconic villains including Doctor Doom (#5), Namor (#4), and the first Galactus saga. Annual #1 features the landmark Sub-Mariner/Doom team-up. This is the foundation upon which the entire Marvel Universe was built.",
        "importance": "essential",
        "connection_notes": "Leads to: FF Omnibus Vol. 2. Connects to: Amazing Spider-Man Omnibus Vol. 1 (concurrent early Marvel). Sets up Doctor Doom's ongoing rivalry."
    },
    {
        "title": "Moon Knight Epic Collection Vol. 1: Bad Moon Rising",
        "format": "epic_collection",
        "issues_collected": "Werewolf by Night #32-33, Marvel Spotlight #28-29, Defenders #47-50, Marvel Two-in-One #52, Moon Knight #1-10",
        "synopsis": "Marc Spector's journey from mercenary to avatar of Khonshu begins in Werewolf by Night #32, his landmark first appearance. This Epic Collection traces Moon Knight's evolution through guest appearances in Marvel Spotlight and Defenders before launching into Doug Moench and Bill Sienkiewicz's groundbreaking ongoing series. Issues #1-10 establish the multiple-identity concept that defines the character.",
        "importance": "recommended",
        "connection_notes": "Leads to: Moon Knight Epic Collection Vol. 2. The Moench/Sienkiewicz run (#1-10) is considered the definitive Moon Knight."
    },
]


def build_batch_prompt(batch: list[dict]) -> str:
    editions_text = ""
    for i, entry in enumerate(batch, 1):
        editions_text += f"\n--- Edition {i} ---\n"
        editions_text += f"Title: {entry['title']}\n"
        editions_text += f"Format: {entry['format']}\n"
        editions_text += f"Issues Collected: {entry.get('issues_collected', 'Unknown')}\n"
        editions_text += f"Heuristic Importance: {entry.get('_heuristic_importance', 'supplemental')}\n"

    examples_text = ""
    for ex in EXAMPLE_EDITIONS:
        examples_text += f"\nTitle: {ex['title']}\nFormat: {ex['format']}\nIssues: {ex['issues_collected']}\n"
        examples_text += f"Synopsis: {ex['synopsis']}\nImportance: {ex['importance']}\n"
        examples_text += f"Connection Notes: {ex['connection_notes']}\n"

    return f"""Generate synopsis, importance, and connection_notes for each edition below.

EXAMPLES of the style and quality expected:
{examples_text}

NOW generate for these {len(batch)} editions:
{editions_text}

Respond with a JSON array of objects, one per edition, in the same order:
[
  {{
    "index": 1,
    "synopsis": "...",
    "importance": "essential|recommended|supplemental|completionist",
    "connection_notes": "..."
  }},
  ...
]

Only output the JSON array, no other text."""


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
        max_tokens=8192,
        system=SYSTEM_PROMPT,
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


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=0, help="Process only first N entries")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    args = parser.parse_args()

    print("Phase 5: AI-Generate Synopses & Importance")
    print("=" * 50)

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    with open(INPUT_PATH) as f:
        entries = json.load(f)

    # Apply heuristic importance
    for entry in entries:
        entry["_heuristic_importance"] = heuristic_importance(entry)

    # Handle sample mode
    if args.sample:
        entries = entries[:args.sample]
        print(f"Sample mode: processing first {args.sample} entries")

    # Handle resume
    start_index = 0
    enriched = []
    if args.resume and CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        enriched = checkpoint["enriched"]
        print(f"Resuming from checkpoint: {start_index} already processed")

    total = len(entries)
    batches_since_checkpoint = 0

    print(f"Total entries to process: {total - start_index}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Estimated API calls: {(total - start_index + BATCH_SIZE - 1) // BATCH_SIZE}")
    print()

    for batch_start in range(start_index, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = entries[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"Batch {batch_num}/{total_batches} (entries {batch_start + 1}-{batch_end})...", end=" ", flush=True)

        prompt = build_batch_prompt(batch)

        try:
            results = call_claude_api(prompt, api_key)

            # Apply results to entries
            for i, entry in enumerate(batch):
                if i < len(results):
                    result = results[i]
                    entry["synopsis"] = result.get("synopsis", "")
                    entry["importance"] = result.get("importance", entry["_heuristic_importance"])
                    entry["connection_notes"] = result.get("connection_notes", "")
                else:
                    # Fallback if API returned fewer results
                    entry["importance"] = entry["_heuristic_importance"]

                # Clean up temp field
                del entry["_heuristic_importance"]
                enriched.append(entry)

            print(f"OK ({len(results)} results)")

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            # Use heuristic fallback
            for entry in batch:
                entry["importance"] = entry.pop("_heuristic_importance")
                entry["synopsis"] = f"Collects {entry.get('issues_collected', 'various issues')}."
                entry["connection_notes"] = ""
                enriched.append(entry)
            print("Used heuristic fallback")

        except Exception as e:
            print(f"API error: {e}")
            for entry in batch:
                entry["importance"] = entry.pop("_heuristic_importance")
                entry["synopsis"] = f"Collects {entry.get('issues_collected', 'various issues')}."
                entry["connection_notes"] = ""
                enriched.append(entry)
            print("Used heuristic fallback")

        batches_since_checkpoint += 1

        # Checkpoint
        if batches_since_checkpoint >= CHECKPOINT_EVERY:
            checkpoint = {
                "processed_count": batch_end,
                "enriched": enriched,
            }
            with open(CHECKPOINT_PATH, "w") as f:
                json.dump(checkpoint, f)
            print(f"  [Checkpoint saved: {batch_end}/{total}]")
            batches_since_checkpoint = 0

        # Rate limiting
        time.sleep(1)

    # Handle any remaining entries that weren't in a batch (shouldn't happen but safety)
    for entry in entries[len(enriched):]:
        if "_heuristic_importance" in entry:
            entry["importance"] = entry.pop("_heuristic_importance")
            entry["synopsis"] = f"Collects {entry.get('issues_collected', 'various issues')}."
            entry["connection_notes"] = ""
            enriched.append(entry)

    # Save final output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(enriched, f, indent=2)
    print(f"\nSaved: {OUTPUT_PATH}")
    print(f"Total enriched: {len(enriched)}")

    # Clean up checkpoint
    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")

    return enriched


if __name__ == "__main__":
    run()

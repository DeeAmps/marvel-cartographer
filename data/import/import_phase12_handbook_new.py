#!/usr/bin/env python3
"""Phase 12: Generate new handbook entries for characters/teams with editions but no coverage.

Identifies characters in characters.json that lack handbook entries, prioritizes by
edition count, and uses Claude API to generate full handbook entries.

Requires ANTHROPIC_API_KEY environment variable.

Usage:
  python3 import_phase12_handbook_new.py              # Full run
  python3 import_phase12_handbook_new.py --sample 20   # Sample first 20
  python3 import_phase12_handbook_new.py --resume       # Resume from checkpoint
  python3 import_phase12_handbook_new.py --analyze-only # Only report gaps
"""

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

HANDBOOK_PATH = WEB_DATA_DIR / "handbook_entries.json"
CHARACTERS_PATH = WEB_DATA_DIR / "characters.json"
EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
EVENTS_PATH = WEB_DATA_DIR / "events.json"
ERAS_PATH = WEB_DATA_DIR / "eras.json"

OUTPUT_PATH = SCRIPT_DIR / "phase12_new_handbook.json"
CHECKPOINT_PATH = SCRIPT_DIR / "phase12_checkpoint.json"
GAPS_PATH = SCRIPT_DIR / "phase12_gaps.json"

BATCH_SIZE = 5  # Rich output needed, smaller batches
CHECKPOINT_EVERY = 10  # batches

SYSTEM_PROMPT = """You are a Marvel Comics, Star Wars Comics, and Conan Comics expert.
Your job is to write comprehensive handbook/encyclopedia entries for a comics chronology app.

Each entry follows this exact JSON schema. Fill in ALL fields accurately.

Rules:
- entry_type: "character", "team", "concept", "location", or "artifact"
- core_concept: One punchy sentence capturing the essence
- canon_confidence: 0-100. Higher = more well-established in canon
- description: 2-3 rich paragraphs with specific issue citations
- tags: 4-8 relevant tags (lowercase, hyphenated)
- source_citations: 3-6 key issue references
- related_edition_slugs: Use ONLY slugs from the provided valid_edition_slugs list
- related_event_slugs: Use ONLY slugs from the provided valid_event_slugs list
- related_handbook_slugs: Slugs of related characters/concepts (use slug format)
- status_by_era: 3-6 entries showing character evolution across eras. Use ONLY era_slugs from the provided list.
- data.power_grid: Intelligence, Strength, Speed, Durability, Energy Projection, Fighting Skills (each 1-7)
- data.abilities: 3-6 key abilities
- data.affiliations: Team memberships with era_slugs
- Leave retcon_history as empty array [] — that will be curated manually later

For Star Wars characters, set power_grid values appropriately (Force users get higher energy_projection).
For non-powered characters, use realistic values (e.g., skilled human fighter: strength 2, speed 2).

If unsure about details, note it in the description and lower canon_confidence.
Do NOT invent storylines. Only cite real comics."""


def slugify(name: str) -> str:
    """Convert a name to a slug."""
    s = name.lower()
    s = re.sub(r'\([^)]*\)', '', s).strip()
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')


def find_character_editions(character: dict, editions: list[dict]) -> list[str]:
    """Find edition slugs that likely feature this character.
    Uses both slug matching and alias-derived slug matching for better coverage.
    """
    char_slug = character["slug"]
    char_name = character["name"].lower()
    char_name_clean = re.sub(r'\s*\([^)]*\)', '', char_name).strip()
    aliases = [a.lower() for a in character.get("aliases", [])]

    # Build search slugs from aliases (e.g., "Spider-Man" -> "spider-man")
    search_slugs = [char_slug]
    for alias in aliases:
        alias_clean = re.sub(r'\s*\([^)]*\)', '', alias).strip()
        alias_slug = re.sub(r'[^a-z0-9\s-]', '', alias_clean.lower())
        alias_slug = re.sub(r'\s+', '-', alias_slug).strip('-')
        if len(alias_slug) > 3 and alias_slug not in search_slugs:
            search_slugs.append(alias_slug)
    # Also add name-derived slug
    name_slug = re.sub(r'[^a-z0-9\s-]', '', char_name_clean)
    name_slug = re.sub(r'\s+', '-', name_slug).strip('-')
    if len(name_slug) > 3 and name_slug not in search_slugs:
        search_slugs.append(name_slug)

    matching = []
    for ed in editions:
        ed_slug = ed["slug"]
        ed_title = ed.get("title", "").lower()

        # Slug-based match: any search slug appears in edition slug
        matched = False
        for ss in search_slugs:
            if ss in ed_slug:
                matching.append(ed_slug)
                matched = True
                break
        if matched:
            continue

        # Title match (whole word) for name and aliases
        for term in [char_name_clean] + aliases:
            term_clean = re.sub(r'\s*\([^)]*\)', '', term).strip()
            if len(term_clean) > 3:
                pattern = r'\b' + re.escape(term_clean) + r'\b'
                if re.search(pattern, ed_title):
                    matching.append(ed_slug)
                    break

    return matching[:20]  # Cap at 20


def find_character_events(character: dict, events: list[dict]) -> list[str]:
    """Find event slugs related to this character."""
    char_name = character["name"].lower()
    char_name_clean = re.sub(r'\s*\([^)]*\)', '', char_name).strip()
    char_slug = character["slug"]
    teams = [t.lower() for t in character.get("teams", [])]

    matching = []
    for ev in events:
        ev_tags = [t.lower() for t in ev.get("tags", [])]
        ev_synopsis = (ev.get("synopsis", "") or "").lower()
        ev_slug = ev["slug"]

        # Tag match
        if char_slug in ev_tags or char_name_clean in ev_tags:
            matching.append(ev_slug)
            continue

        # Synopsis mention
        if len(char_name_clean) > 3:
            pattern = r'\b' + re.escape(char_name_clean) + r'\b'
            if re.search(pattern, ev_synopsis):
                matching.append(ev_slug)
                continue

        # Team-based matching (if character is in X-Men, link x-men events)
        for team in teams:
            team_slug = slugify(team)
            if team_slug in ev_tags or team_slug in ev_slug:
                matching.append(ev_slug)
                break

    return matching[:10]


def determine_eras(character: dict, editions: list[dict],
                   era_data: list[dict]) -> list[str]:
    """Determine which eras a character appears in based on their editions."""
    char_editions = find_character_editions(character, editions)
    ed_by_slug = {ed["slug"]: ed for ed in editions}

    era_slugs = set()
    for ed_slug in char_editions:
        ed = ed_by_slug.get(ed_slug)
        if ed and ed.get("era_slug"):
            era_slugs.add(ed["era_slug"])

    # Order by era number
    era_order = {e["slug"]: e["number"] for e in era_data}
    return sorted(era_slugs, key=lambda s: era_order.get(s, 99))


def build_batch_prompt(batch: list[dict], edition_slugs_by_char: dict,
                       event_slugs_by_char: dict, eras_by_char: dict,
                       all_era_slugs: list[str],
                       existing_handbook_slugs: set[str]) -> str:
    """Build prompt for Claude to generate handbook entries."""
    chars_text = ""
    for i, char in enumerate(batch, 1):
        slug = char["slug"]
        name = char["name"]
        aliases = ", ".join(char.get("aliases", [])) or "None"
        teams = ", ".join(char.get("teams", [])) or "None"
        universe = char.get("universe", "Earth-616")
        first_app = char.get("first_appearance_issue", "Unknown")
        description = char.get("description", "")
        ed_slugs = edition_slugs_by_char.get(slug, [])[:15]
        ev_slugs = event_slugs_by_char.get(slug, [])
        char_eras = eras_by_char.get(slug, [])

        chars_text += f"\n--- Character {i} ---\n"
        chars_text += f"Slug: {slug}\n"
        chars_text += f"Name: {name}\n"
        chars_text += f"Aliases: {aliases}\n"
        chars_text += f"First Appearance: {first_app}\n"
        chars_text += f"Universe: {universe}\n"
        chars_text += f"Teams: {teams}\n"
        chars_text += f"Brief: {description}\n"
        chars_text += f"Edition slugs: {json.dumps(ed_slugs)}\n"
        chars_text += f"Event slugs: {json.dumps(ev_slugs)}\n"
        chars_text += f"Active eras: {json.dumps(char_eras)}\n"

    # Provide reference lists
    era_list = json.dumps(all_era_slugs)

    return f"""Generate handbook entries for these {len(batch)} characters.

IMPORTANT: Use ONLY the edition slugs and event slugs provided for each character
in the related_edition_slugs and related_event_slugs fields.
For related_handbook_slugs, reference existing handbook entries if they match.
For status_by_era, use ONLY era slugs from: {era_list}

{chars_text}

Respond with a JSON array of handbook entry objects:
[
  {{
    "slug": "character-slug",
    "entry_type": "character",
    "name": "Full Character Name",
    "core_concept": "One sentence essence.",
    "canon_confidence": 85,
    "description": "2-3 paragraphs with issue citations...",
    "tags": ["tag1", "tag2"],
    "source_citations": ["Comic #1 (Year)", "Comic #2 (Year)"],
    "related_edition_slugs": ["slug1", "slug2"],
    "related_event_slugs": ["event-slug1"],
    "related_conflict_slugs": [],
    "related_handbook_slugs": ["related-char-slug"],
    "status_by_era": [
      {{
        "era_slug": "era-slug",
        "status": "What happened to this character in this era.",
        "note": "Significance or context.",
        "citation": "Comic #N (Year)"
      }}
    ],
    "retcon_history": [],
    "data": {{
      "power_grid": {{
        "intelligence": 3,
        "strength": 4,
        "speed": 3,
        "durability": 4,
        "energy_projection": 1,
        "fighting_skills": 5
      }},
      "abilities": ["Ability 1", "Ability 2", "Ability 3"],
      "affiliations": [
        {{
          "team_slug": "team-slug",
          "era_slugs": ["era-slug"]
        }}
      ],
      "identity_changes": []
    }}
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
        max_tokens=16384,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    # Extract JSON
    if content.startswith("```"):
        content = content.split("```")[1]
        if content.startswith("json"):
            content = content[4:]
    content = content.strip()

    return json.loads(content)


def run():
    parser = argparse.ArgumentParser(description="Phase 12: Generate new handbook entries")
    parser.add_argument("--sample", type=int, default=0, help="Process only first N characters")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--analyze-only", action="store_true", help="Only report gaps")
    args = parser.parse_args()

    print("Phase 12: Generate New Handbook Entries")
    print("=" * 55)

    # Load data
    with open(HANDBOOK_PATH) as f:
        handbook = json.load(f)
    print(f"Loaded {len(handbook)} handbook entries")

    with open(CHARACTERS_PATH) as f:
        characters = json.load(f)
    print(f"Loaded {len(characters)} characters")

    with open(EDITIONS_PATH) as f:
        editions = json.load(f)
    print(f"Loaded {len(editions)} editions")

    with open(EVENTS_PATH) as f:
        events = json.load(f)
    print(f"Loaded {len(events)} events")

    with open(ERAS_PATH) as f:
        eras = json.load(f)
    all_era_slugs = [e["slug"] for e in sorted(eras, key=lambda x: x["number"])]

    # Build handbook slug set
    existing_handbook_slugs = {h["slug"] for h in handbook}

    # Find characters without handbook entries
    chars_without_handbook = []
    for char in characters:
        if char["slug"] not in existing_handbook_slugs:
            chars_without_handbook.append(char)

    print(f"\nCharacters without handbook entries: {len(chars_without_handbook)}")

    # Find editions for each character and count them
    edition_slugs_by_char = {}
    for char in chars_without_handbook:
        ed_slugs = find_character_editions(char, editions)
        edition_slugs_by_char[char["slug"]] = ed_slugs

    # Prioritize by edition count
    # Tier 1: 5+ editions (must-have)
    # Tier 2: 2-4 editions (should-have)
    # Tier 3: 0-1 editions (nice-to-have)
    tier1 = [c for c in chars_without_handbook if len(edition_slugs_by_char.get(c["slug"], [])) >= 5]
    tier2 = [c for c in chars_without_handbook if 2 <= len(edition_slugs_by_char.get(c["slug"], [])) < 5]
    tier3 = [c for c in chars_without_handbook if len(edition_slugs_by_char.get(c["slug"], [])) < 2]

    # Sort each tier by edition count descending
    tier1.sort(key=lambda c: -len(edition_slugs_by_char.get(c["slug"], [])))
    tier2.sort(key=lambda c: -len(edition_slugs_by_char.get(c["slug"], [])))
    tier3.sort(key=lambda c: -len(edition_slugs_by_char.get(c["slug"], [])))

    print(f"  Tier 1 (5+ editions): {len(tier1)}")
    print(f"  Tier 2 (2-4 editions): {len(tier2)}")
    print(f"  Tier 3 (0-1 editions): {len(tier3)}")

    # Combine in priority order
    prioritized = tier1 + tier2 + tier3

    # Save gap analysis
    gaps = {
        "total_characters": len(characters),
        "total_handbook": len(handbook),
        "chars_without_handbook": len(chars_without_handbook),
        "tier1_count": len(tier1),
        "tier2_count": len(tier2),
        "tier3_count": len(tier3),
        "tier1": [
            {"slug": c["slug"], "name": c["name"],
             "editions": len(edition_slugs_by_char.get(c["slug"], []))}
            for c in tier1
        ],
        "tier2": [
            {"slug": c["slug"], "name": c["name"],
             "editions": len(edition_slugs_by_char.get(c["slug"], []))}
            for c in tier2[:50]  # first 50 only
        ],
    }
    with open(GAPS_PATH, "w") as f:
        json.dump(gaps, f, indent=2)
    print(f"\nGap analysis saved to {GAPS_PATH}")

    if args.analyze_only:
        print("\n--analyze-only mode: stopping before AI generation")
        if tier1:
            print("\nTop Tier 1 characters needing handbook entries:")
            for c in tier1[:20]:
                eds = len(edition_slugs_by_char.get(c["slug"], []))
                print(f"  {c['name']} ({c.get('universe', 'Earth-616')}): {eds} editions")
        return

    # AI generation
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    if args.sample:
        prioritized = prioritized[:args.sample]
        print(f"Sample mode: processing first {args.sample} characters")

    # Pre-compute event slugs and eras for all characters
    event_slugs_by_char = {}
    eras_by_char = {}
    for char in prioritized:
        event_slugs_by_char[char["slug"]] = find_character_events(char, events)
        eras_by_char[char["slug"]] = determine_eras(char, editions, eras)

    # Handle resume
    start_index = 0
    generated = []
    if args.resume and CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        generated = checkpoint["generated"]
        print(f"Resuming from checkpoint: {start_index} already processed")

    total = len(prioritized)
    batches_since_checkpoint = 0
    api_errors = 0

    print(f"\nTotal characters to generate: {total - start_index}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Estimated API calls: {(total - start_index + BATCH_SIZE - 1) // BATCH_SIZE}")
    print()

    generated_slugs = {g["slug"] for g in generated}

    for batch_start in range(start_index, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = prioritized[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"Batch {batch_num}/{total_batches} ({batch_start + 1}-{batch_end})...", end=" ", flush=True)

        prompt = build_batch_prompt(
            batch, edition_slugs_by_char, event_slugs_by_char, eras_by_char,
            all_era_slugs, existing_handbook_slugs
        )

        try:
            results = call_claude_api(prompt, api_key)
            print(f"OK ({len(results)} entries)")

            for result in results:
                result_slug = result.get("slug", "")
                if result_slug in existing_handbook_slugs or result_slug in generated_slugs:
                    print(f"    SKIP (already exists): {result_slug}")
                    continue

                # Validate related_edition_slugs against actual editions
                valid_ed_slugs = [s for s in result.get("related_edition_slugs", [])
                                  if s in {ed["slug"] for ed in editions}]
                result["related_edition_slugs"] = valid_ed_slugs

                # Validate related_event_slugs
                valid_ev_slugs = [s for s in result.get("related_event_slugs", [])
                                  if s in {ev["slug"] for ev in events}]
                result["related_event_slugs"] = valid_ev_slugs

                # Validate era slugs in status_by_era
                valid_eras = [s for s in result.get("status_by_era", [])
                              if s.get("era_slug") in set(all_era_slugs)]
                result["status_by_era"] = valid_eras

                # Ensure retcon_history is empty (manual curation)
                result["retcon_history"] = []

                # Ensure related_conflict_slugs exists
                if "related_conflict_slugs" not in result:
                    result["related_conflict_slugs"] = []

                generated.append(result)
                generated_slugs.add(result_slug)

            api_errors = 0

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            api_errors += 1
        except Exception as e:
            err_str = str(e).lower()
            if "rate_limit" in err_str or "429" in err_str:
                print("Rate limited, waiting 60s...")
                time.sleep(60)
                continue
            print(f"API error: {e}")
            api_errors += 1

        if api_errors > 5:
            print("\nToo many consecutive API errors, saving checkpoint and stopping")
            break

        batches_since_checkpoint += 1

        # Checkpoint
        if batches_since_checkpoint >= CHECKPOINT_EVERY:
            with open(CHECKPOINT_PATH, "w") as f:
                json.dump({
                    "processed_count": batch_end,
                    "generated": generated,
                }, f, indent=2)
            print(f"  [Checkpoint saved: {batch_end} processed, {len(generated)} entries]")
            batches_since_checkpoint = 0

        # Rate limiting
        time.sleep(5)

    # Save output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(generated, f, indent=2)
    print(f"\nSaved {len(generated)} new handbook entries to {OUTPUT_PATH}")

    # Merge into handbook_entries.json
    merged = handbook + generated
    with open(HANDBOOK_PATH, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"Updated handbook_entries.json: {len(handbook)} → {len(merged)} entries")

    # Clean up checkpoint
    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")

    # Summary
    print(f"\n{'=' * 55}")
    print("PHASE 12 COMPLETE")
    print("=" * 55)
    type_counts = {}
    for entry in generated:
        t = entry.get("entry_type", "unknown")
        type_counts[t] = type_counts.get(t, 0) + 1
    print(f"\nNew entries by type:")
    for t, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        print(f"  {t}: {count}")

    universe_counts = {}
    for entry in generated:
        # Infer universe from tags or description
        tags = entry.get("tags", [])
        if "star-wars" in tags or "star wars" in entry.get("description", "").lower():
            u = "Star Wars"
        elif "conan" in tags or "hyborian" in entry.get("description", "").lower():
            u = "Hyborian Age"
        else:
            u = "Marvel (616)"
        universe_counts[u] = universe_counts.get(u, 0) + 1

    print(f"\nNew entries by universe:")
    for u, count in sorted(universe_counts.items(), key=lambda x: -x[1]):
        print(f"  {u}: {count}")


if __name__ == "__main__":
    run()

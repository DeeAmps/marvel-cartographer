#!/usr/bin/env python3
"""Phase 10: Extract & generate new characters from all editions.

Parses edition titles and synopses to find character mentions not in characters.json,
then uses Claude API to generate proper character entries.

Requires ANTHROPIC_API_KEY environment variable.

Usage:
  python3 import_phase10_characters.py              # Full run
  python3 import_phase10_characters.py --sample 50   # Sample first 50 missing
  python3 import_phase10_characters.py --resume       # Resume from checkpoint
  python3 import_phase10_characters.py --extract-only # Only extract, skip AI generation
"""

import argparse
import json
import os
import re
import sys
import time
from difflib import SequenceMatcher
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent.parent / "web" / "data"

EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
CHARACTERS_PATH = WEB_DATA_DIR / "characters.json"
OUTPUT_PATH = SCRIPT_DIR / "phase10_new_characters.json"
CHECKPOINT_PATH = SCRIPT_DIR / "phase10_checkpoint.json"
EXTRACTED_PATH = SCRIPT_DIR / "phase10_extracted_names.json"

BATCH_SIZE = 20
CHECKPOINT_EVERY = 10  # batches

# Characters commonly mentioned in titles/synopses that we can extract
# Maps normalized name → canonical name for known Marvel/Star Wars/Conan characters
KNOWN_CHARACTER_PATTERNS = {
    # Star Wars
    "luke skywalker": {"name": "Luke Skywalker", "universe": "Star Wars"},
    "darth vader": {"name": "Darth Vader", "universe": "Star Wars"},
    "princess leia": {"name": "Princess Leia", "universe": "Star Wars"},
    "leia organa": {"name": "Princess Leia", "universe": "Star Wars"},
    "han solo": {"name": "Han Solo", "universe": "Star Wars"},
    "chewbacca": {"name": "Chewbacca", "universe": "Star Wars"},
    "boba fett": {"name": "Boba Fett", "universe": "Star Wars"},
    "yoda": {"name": "Yoda", "universe": "Star Wars"},
    "ahsoka tano": {"name": "Ahsoka Tano", "universe": "Star Wars"},
    "ahsoka": {"name": "Ahsoka Tano", "universe": "Star Wars"},
    "lando calrissian": {"name": "Lando Calrissian", "universe": "Star Wars"},
    # "lando" alone is too short — rely on "lando calrissian" match
    "darth maul": {"name": "Darth Maul", "universe": "Star Wars"},
    "kylo ren": {"name": "Kylo Ren", "universe": "Star Wars"},
    # "rey" alone matches non-Star-Wars editions (Sigil) — require fuller context
    "rey skywalker": {"name": "Rey", "universe": "Star Wars"},
    "poe dameron": {"name": "Poe Dameron", "universe": "Star Wars"},
    # "finn" alone is too ambiguous (matches "infinity", "efinned", etc.) — rely on full-context AI
    "fn-2187": {"name": "Finn (FN-2187)", "universe": "Star Wars"},
    "mace windu": {"name": "Mace Windu", "universe": "Star Wars"},
    "obi-wan kenobi": {"name": "Obi-Wan Kenobi", "universe": "Star Wars"},
    "obi-wan": {"name": "Obi-Wan Kenobi", "universe": "Star Wars"},
    "anakin skywalker": {"name": "Anakin Skywalker", "universe": "Star Wars"},
    "padme amidala": {"name": "Padmé Amidala", "universe": "Star Wars"},
    "emperor palpatine": {"name": "Emperor Palpatine", "universe": "Star Wars"},
    "palpatine": {"name": "Emperor Palpatine", "universe": "Star Wars"},
    "doctor aphra": {"name": "Doctor Aphra", "universe": "Star Wars"},
    "aphra": {"name": "Doctor Aphra", "universe": "Star Wars"},
    "captain phasma": {"name": "Captain Phasma", "universe": "Star Wars"},
    "jabba": {"name": "Jabba the Hutt", "universe": "Star Wars"},
    "thrawn": {"name": "Grand Admiral Thrawn", "universe": "Star Wars"},
    "qi'ra": {"name": "Qi'ra", "universe": "Star Wars"},
    "cassian andor": {"name": "Cassian Andor", "universe": "Star Wars"},
    # Conan
    "conan": {"name": "Conan the Barbarian", "universe": "Hyborian Age"},
    "conan the barbarian": {"name": "Conan the Barbarian", "universe": "Hyborian Age"},
    "red sonja": {"name": "Red Sonja", "universe": "Hyborian Age"},
    "kull": {"name": "Kull the Conqueror", "universe": "Hyborian Age"},
    "solomon kane": {"name": "Solomon Kane", "universe": "Hyborian Age"},
    # Marvel characters likely missing from original 222
    "moon girl": {"name": "Moon Girl", "universe": "Earth-616"},
    "devil dinosaur": {"name": "Devil Dinosaur", "universe": "Earth-616"},
    "gwenpool": {"name": "Gwenpool", "universe": "Earth-616"},
    "silk": {"name": "Silk (Cindy Moon)", "universe": "Earth-616"},
    "america chavez": {"name": "America Chavez", "universe": "Earth-616"},
    "agent venom": {"name": "Agent Venom (Flash Thompson)", "universe": "Earth-616"},
    "ironheart": {"name": "Ironheart (Riri Williams)", "universe": "Earth-616"},
    "riri williams": {"name": "Ironheart (Riri Williams)", "universe": "Earth-616"},
    "wave": {"name": "Wave (Pearl Pangan)", "universe": "Earth-616"},
    "aero": {"name": "Aero (Lei Ling)", "universe": "Earth-616"},
    "sword master": {"name": "Sword Master (Lin Lie)", "universe": "Earth-616"},
    "brawn": {"name": "Brawn (Amadeus Cho)", "universe": "Earth-616"},
    "amadeus cho": {"name": "Brawn (Amadeus Cho)", "universe": "Earth-616"},
    "totally awesome hulk": {"name": "Brawn (Amadeus Cho)", "universe": "Earth-616"},
    "ghost-spider": {"name": "Ghost-Spider (Gwen Stacy)", "universe": "Earth-616"},
    "spider-gwen": {"name": "Ghost-Spider (Gwen Stacy)", "universe": "Earth-616"},
    "nadia van dyne": {"name": "Nadia Van Dyne", "universe": "Earth-616"},
    "unstoppable wasp": {"name": "Nadia Van Dyne", "universe": "Earth-616"},
    "snowguard": {"name": "Snowguard (Amka Aliyak)", "universe": "Earth-616"},
    "red guardian": {"name": "Red Guardian", "universe": "Earth-616"},
    "yelena belova": {"name": "Yelena Belova", "universe": "Earth-616"},
    "taskmaster": {"name": "Taskmaster", "universe": "Earth-616"},
    "gorr": {"name": "Gorr the God Butcher", "universe": "Earth-616"},
    "jane foster": {"name": "Jane Foster", "universe": "Earth-616"},
    "valkyrie": {"name": "Valkyrie (Brunnhilde)", "universe": "Earth-616"},
    "kid loki": {"name": "Kid Loki", "universe": "Earth-616"},
    "kid omega": {"name": "Kid Omega (Quentin Quire)", "universe": "Earth-616"},
    "x-23": {"name": "X-23 (Laura Kinney)", "universe": "Earth-616"},
    "laura kinney": {"name": "X-23 (Laura Kinney)", "universe": "Earth-616"},
    "gabby kinney": {"name": "Honey Badger (Gabby Kinney)", "universe": "Earth-616"},
    "honey badger": {"name": "Honey Badger (Gabby Kinney)", "universe": "Earth-616"},
    "old man logan": {"name": "Old Man Logan", "universe": "Earth-807128"},
    "miles morales": {"name": "Miles Morales", "universe": "Earth-616"},
    "spider-man 2099": {"name": "Spider-Man 2099 (Miguel O'Hara)", "universe": "Earth-928"},
    "miguel o'hara": {"name": "Spider-Man 2099 (Miguel O'Hara)", "universe": "Earth-928"},
    "sam alexander": {"name": "Nova (Sam Alexander)", "universe": "Earth-616"},
    "squirrel girl": {"name": "Squirrel Girl", "universe": "Earth-616"},
    "moon knight": {"name": "Moon Knight", "universe": "Earth-616"},
    "blade": {"name": "Blade", "universe": "Earth-616"},
    "elsa bloodstone": {"name": "Elsa Bloodstone", "universe": "Earth-616"},
    "white fox": {"name": "White Fox (Ami Han)", "universe": "Earth-616"},
    "shang-chi": {"name": "Shang-Chi", "universe": "Earth-616"},
    "jimmy woo": {"name": "Jimmy Woo", "universe": "Earth-616"},
    # "agents of atlas" is a team, not a character — handle in handbook, not characters
}

SYSTEM_PROMPT = """You are a Marvel Comics (and Star Wars / Conan comics) expert.
Your job is to generate character reference entries for a comics chronology app.

Rules:
- slug: lowercase-hyphenated version of the character's primary name
- name: Character's most commonly known name
- aliases: Array of alternate names, codenames, civilian identities
- first_appearance_issue: First comic book appearance with year in parentheses
- universe: "Earth-616" for main Marvel, "Star Wars" for Star Wars comics,
  "Hyborian Age" for Conan, "Earth-1610" for Ultimate, "Earth-928" for 2099, etc.
- teams: Array of team affiliations
- description: 2-3 sentences covering powers, significance, and key story beats.
  Cite specific issue numbers where possible.

If unsure about a first appearance, give your best knowledge and note uncertainty.
Do NOT invent characters — only generate entries for real comic book characters."""


def slugify(name: str) -> str:
    """Convert a character name to a slug."""
    s = name.lower()
    s = re.sub(r'\([^)]*\)', '', s).strip()  # remove parentheticals
    s = re.sub(r'[^a-z0-9\s-]', '', s)
    s = re.sub(r'\s+', '-', s)
    s = re.sub(r'-+', '-', s)
    return s.strip('-')


def extract_character_names_from_editions(editions: list[dict]) -> dict[str, dict]:
    """Extract character names from edition titles and synopses.
    Returns dict of normalized_name -> {name, mentions, edition_slugs, universe}
    """
    found = {}

    for ed in editions:
        title = ed.get("title", "")
        synopsis = ed.get("synopsis", "")
        slug = ed.get("slug", "")
        text = f"{title} {synopsis}".lower()

        for pattern, info in KNOWN_CHARACTER_PATTERNS.items():
            # Use word-boundary matching to avoid substring false positives
            # e.g., "rey" should not match "grey", "finn" should not match "infinity"
            boundary_pattern = r'\b' + re.escape(pattern) + r'\b'
            if re.search(boundary_pattern, text):
                canonical = info["name"]
                if canonical not in found:
                    found[canonical] = {
                        "name": canonical,
                        "universe": info["universe"],
                        "mentions": 0,
                        "edition_slugs": [],
                    }
                found[canonical]["mentions"] += 1
                if slug not in found[canonical]["edition_slugs"]:
                    found[canonical]["edition_slugs"].append(slug)

    # Also extract from edition titles that are clearly character-named
    # e.g. "Silk Vol. 1" → "Silk", "Gwenpool Omnibus" → "Gwenpool"
    character_title_pattern = re.compile(
        r'^([\w\s-]+?)(?:\s+(?:omnibus|epic collection|by|vol\.?\s*\d|'
        r'masterworks|complete collection|compendium|tpb|hardcover|'
        r'the complete|marvel premiere))',
        re.IGNORECASE
    )
    for ed in editions:
        title = ed.get("title", "")
        m = character_title_pattern.match(title)
        if m:
            potential_name = m.group(1).strip()
            # Skip generic/series names
            if potential_name.lower() in (
                "marvel", "star wars", "the", "new", "all-new", "uncanny",
                "amazing", "incredible", "invincible", "mighty", "savage",
                "sensational", "spectacular", "web of", "tales of", "giant-size",
            ):
                continue
            # This is a title-derived name — don't add it here, the AI will handle it

    return found


def build_existing_name_index(characters: list[dict]) -> set[str]:
    """Build a set of all known character names/aliases (lowercased) for dedup."""
    names = set()
    for char in characters:
        names.add(char["name"].lower())
        names.add(char["slug"])
        for alias in char.get("aliases", []):
            names.add(alias.lower())
    return names


def fuzzy_match_existing(name: str, existing_names: set[str], threshold: float = 0.85) -> bool:
    """Check if a character name fuzzy-matches an existing one."""
    name_lower = name.lower()
    if name_lower in existing_names:
        return True
    slug = slugify(name)
    if slug in existing_names:
        return True
    for existing in existing_names:
        if SequenceMatcher(None, name_lower, existing).ratio() >= threshold:
            return True
    return False


def build_batch_prompt(batch: list[dict], edition_context: dict[str, list[str]]) -> str:
    """Build prompt for Claude API to generate character entries."""
    chars_text = ""
    for i, char_info in enumerate(batch, 1):
        name = char_info["name"]
        universe = char_info["universe"]
        edition_slugs = char_info.get("edition_slugs", [])[:10]  # cap context
        editions_str = ", ".join(edition_slugs) if edition_slugs else "N/A"

        chars_text += f"\n--- Character {i} ---\n"
        chars_text += f"Name: {name}\n"
        chars_text += f"Universe: {universe}\n"
        chars_text += f"Appears in editions: {editions_str}\n"

    return f"""Generate character reference entries for these {len(batch)} characters.
Each character appears in our comics collected editions database.

{chars_text}

Respond with a JSON array of objects, one per character, in the same order:
[
  {{
    "slug": "character-slug",
    "name": "Character Name",
    "aliases": ["Alias 1", "Alias 2"],
    "first_appearance_issue": "Comic Title #N (Year)",
    "universe": "Earth-616 or Star Wars or Hyborian Age etc.",
    "teams": ["Team 1", "Team 2"],
    "description": "2-3 sentences about the character..."
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
    parser = argparse.ArgumentParser(description="Phase 10: Extract & generate new characters")
    parser.add_argument("--sample", type=int, default=0, help="Process only first N missing characters")
    parser.add_argument("--resume", action="store_true", help="Resume from checkpoint")
    parser.add_argument("--extract-only", action="store_true", help="Only extract names, skip AI generation")
    args = parser.parse_args()

    print("Phase 10: Extract & Generate New Characters")
    print("=" * 55)

    # Load data
    with open(EDITIONS_PATH) as f:
        editions = json.load(f)
    print(f"Loaded {len(editions)} editions")

    with open(CHARACTERS_PATH) as f:
        existing_characters = json.load(f)
    print(f"Loaded {len(existing_characters)} existing characters")

    # Build index of existing names
    existing_names = build_existing_name_index(existing_characters)
    existing_slugs = {c["slug"] for c in existing_characters}

    # Extract character names from editions
    print("\nExtracting character names from edition titles/synopses...")
    extracted = extract_character_names_from_editions(editions)
    print(f"Found {len(extracted)} character name mentions")

    # Filter out characters that already exist
    missing = {}
    for name, info in extracted.items():
        if not fuzzy_match_existing(name, existing_names):
            slug = slugify(name)
            if slug not in existing_slugs and len(slug) > 1:
                missing[name] = info

    print(f"Missing (not in characters.json): {len(missing)}")

    # Sort by mention count (most mentioned first)
    missing_sorted = sorted(missing.values(), key=lambda x: -x["mentions"])

    # Save extracted names for reference
    with open(EXTRACTED_PATH, "w") as f:
        json.dump({
            "total_extracted": len(extracted),
            "already_exist": len(extracted) - len(missing),
            "missing": len(missing),
            "missing_characters": [
                {"name": m["name"], "universe": m["universe"],
                 "mentions": m["mentions"], "edition_count": len(m["edition_slugs"])}
                for m in missing_sorted
            ]
        }, f, indent=2)
    print(f"Saved extraction report to {EXTRACTED_PATH}")

    if args.extract_only:
        print("\n--extract-only mode: stopping before AI generation")
        return

    # AI generation
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        sys.exit(1)

    if args.sample:
        missing_sorted = missing_sorted[:args.sample]
        print(f"Sample mode: processing first {args.sample} characters")

    # Handle resume
    start_index = 0
    generated = []
    if args.resume and CHECKPOINT_PATH.exists():
        with open(CHECKPOINT_PATH) as f:
            checkpoint = json.load(f)
        start_index = checkpoint["processed_count"]
        generated = checkpoint["generated"]
        print(f"Resuming from checkpoint: {start_index} already processed")

    total = len(missing_sorted)
    batches_since_checkpoint = 0
    api_errors = 0

    print(f"\nTotal characters to generate: {total - start_index}")
    print(f"Batch size: {BATCH_SIZE}")
    print(f"Estimated API calls: {(total - start_index + BATCH_SIZE - 1) // BATCH_SIZE}")
    print()

    for batch_start in range(start_index, total, BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, total)
        batch = missing_sorted[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"Batch {batch_num}/{total_batches} ({batch_start + 1}-{batch_end})...", end=" ", flush=True)

        # Build edition context
        edition_context = {}
        for char_info in batch:
            for slug in char_info.get("edition_slugs", [])[:5]:
                edition_context[slug] = []

        prompt = build_batch_prompt(batch, edition_context)

        try:
            results = call_claude_api(prompt, api_key)
            print(f"OK ({len(results)} characters)")

            for result in results:
                # Validate and clean
                result_slug = result.get("slug", slugify(result.get("name", "")))
                if result_slug in existing_slugs:
                    print(f"    SKIP (already exists): {result_slug}")
                    continue
                result["slug"] = result_slug
                generated.append(result)
                existing_slugs.add(result_slug)

            api_errors = 0  # reset on success

        except json.JSONDecodeError as e:
            print(f"JSON parse error: {e}")
            api_errors += 1
        except Exception as e:
            err_str = str(e).lower()
            if "rate_limit" in err_str or "429" in err_str:
                print("Rate limited, waiting 60s...")
                time.sleep(60)
                # Retry this batch
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
            print(f"  [Checkpoint saved: {batch_end} processed, {len(generated)} generated]")
            batches_since_checkpoint = 0

        # Rate limiting
        time.sleep(3)

    # Save output
    with open(OUTPUT_PATH, "w") as f:
        json.dump(generated, f, indent=2)
    print(f"\nSaved {len(generated)} new characters to {OUTPUT_PATH}")

    # Merge into characters.json
    merged = existing_characters + generated
    with open(CHARACTERS_PATH, "w") as f:
        json.dump(merged, f, indent=2)
    print(f"Updated characters.json: {len(existing_characters)} → {len(merged)} characters")

    # Clean up checkpoint
    if CHECKPOINT_PATH.exists():
        CHECKPOINT_PATH.unlink()
        print("Checkpoint cleaned up")

    # Summary
    print(f"\n{'=' * 55}")
    print("PHASE 10 COMPLETE")
    print("=" * 55)
    universe_counts = {}
    for char in generated:
        u = char.get("universe", "Unknown")
        universe_counts[u] = universe_counts.get(u, 0) + 1
    print(f"\nNew characters by universe:")
    for u, count in sorted(universe_counts.items(), key=lambda x: -x[1]):
        print(f"  {u}: {count}")


if __name__ == "__main__":
    run()

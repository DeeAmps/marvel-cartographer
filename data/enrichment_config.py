#!/usr/bin/env python3
"""Shared configuration for AI enrichment scripts.

Provides paths, prompts, few-shot examples, and quality scoring
used by enrich_synopses.py and enrich_connections.py.
"""

import os
import re
import sys
from pathlib import Path

# ============================================================
# PATHS
# ============================================================
SCRIPT_DIR = Path(__file__).parent
WEB_DATA_DIR = SCRIPT_DIR.parent / "web" / "data"

EDITIONS_PATH = WEB_DATA_DIR / "collected_editions.json"
CONNECTIONS_PATH = WEB_DATA_DIR / "connections.json"
CHARACTERS_PATH = WEB_DATA_DIR / "characters.json"
EVENTS_PATH = WEB_DATA_DIR / "events.json"
ERAS_PATH = WEB_DATA_DIR / "eras.json"
CREATORS_PATH = WEB_DATA_DIR / "creators.json"

# Output paths (never overwrite originals)
ENRICHED_EDITIONS_PATH = WEB_DATA_DIR / "collected_editions_enriched.json"
ENRICHED_CONNECTIONS_PATH = WEB_DATA_DIR / "connections_enriched.json"
ENRICHMENT_REPORT_PATH = SCRIPT_DIR / "enrichment_report.md"
CONNECTIONS_REPORT_PATH = SCRIPT_DIR / "connections_report.md"

# Checkpoint paths
SYNOPSIS_CHECKPOINT_PATH = SCRIPT_DIR / "enrich_synopses_checkpoint.json"
CONNECTIONS_CHECKPOINT_PATH = SCRIPT_DIR / "enrich_connections_checkpoint.json"

# ============================================================
# BATCH SETTINGS
# ============================================================
BATCH_SIZE = 5           # editions per API call (smaller = richer context per call)
CHECKPOINT_EVERY = 10    # batches between checkpoint saves (= 50 editions)
API_DELAY_SECONDS = 1.0  # delay between API calls

# ============================================================
# QUALITY SCORING
# ============================================================
ISSUE_CITATION_PATTERN = re.compile(r"#\d+")


def score_synopsis_quality(synopsis: str) -> dict:
    """Score a synopsis and return quality metadata.

    Returns dict with:
        score: 0-100 quality score
        priority: 1 (full rewrite), 2 (enhance), 3 (light polish), 0 (skip)
        length: character count
        has_citations: bool
        citation_count: int
    """
    if not synopsis:
        return {"score": 0, "priority": 1, "length": 0,
                "has_citations": False, "citation_count": 0}

    length = len(synopsis)
    citations = ISSUE_CITATION_PATTERN.findall(synopsis)
    citation_count = len(citations)
    has_citations = citation_count > 0

    # Score components
    length_score = min(length / 900 * 50, 50)  # up to 50 pts for length
    citation_score = min(citation_count * 5, 30)  # up to 30 pts for citations
    # Bonus for named arcs, character names, thematic language
    depth_indicators = [
        "saga", "trilogy", "arc", "debut", "first appearance",
        "introduces", "establishes", "defines", "transforms",
        "groundbreaking", "landmark", "iconic"
    ]
    depth_score = min(
        sum(3 for word in depth_indicators if word in synopsis.lower()), 20
    )
    total_score = int(length_score + citation_score + depth_score)

    # Priority assignment
    if length < 200:
        priority = 1  # full rewrite
    elif length < 400:
        priority = 1  # also full rewrite (was "expand significantly" in plan)
    elif length < 700 and not has_citations:
        priority = 2  # enhance with citations + depth
    elif length < 700:
        priority = 3  # light polish
    else:
        priority = 0  # skip — already good

    return {
        "score": total_score,
        "priority": priority,
        "length": length,
        "has_citations": has_citations,
        "citation_count": citation_count,
    }


# ============================================================
# API KEY
# ============================================================
def get_api_key() -> str:
    """Get ANTHROPIC_API_KEY from environment, exit if missing."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("ERROR: ANTHROPIC_API_KEY environment variable not set")
        print("  export ANTHROPIC_API_KEY=sk-ant-...")
        sys.exit(1)
    return key


# ============================================================
# FEW-SHOT EXAMPLES (best synopses from the dataset)
# ============================================================
FEW_SHOT_EXAMPLES = [
    {
        "title": "Fantastic Four Omnibus Vol. 1",
        "format": "omnibus",
        "issues_collected": "FF #1-30, Annual #1",
        "era": "The Birth of Marvel (1961-1966)",
        "importance": "essential",
        "synopsis": (
            "The Marvel Universe begins here with Fantastic Four #1 (1961), as Reed Richards, "
            "Sue Storm, Johnny Storm, and Ben Grimm gain cosmic ray powers and become Marvel's "
            "First Family. Stan Lee and Jack Kirby introduce an astonishing roster of villains "
            "and concepts: the Mole Man in the debut issue, the shape-shifting Skrulls (#2), "
            "Namor the Sub-Mariner's dramatic return (#4), and the iconic first appearance of "
            "Doctor Doom (#5), who becomes Marvel's greatest antagonist. The Puppet Master and "
            "Alicia Masters arrive in #8, establishing Ben Grimm's most important relationship. "
            "The Impossible Man (#11), the Watcher and Red Ghost (#13), the Super-Skrull (#18), "
            "the Molecule Man (#20), and the Hate-Monger (#21) all debut across these foundational "
            "issues. Annual #1 features the first Namor/Doom alliance. This volume is the bedrock "
            "upon which every Marvel title builds, establishing the shared universe concept that "
            "revolutionized superhero comics."
        ),
        "connection_notes": (
            "Leads to: FF Omnibus Vol. 2. Parallel: Avengers #1 founding, ASM crossovers. "
            "Doom debut here is the start of Marvel's greatest villain arc."
        ),
    },
    {
        "title": "Amazing Spider-Man Omnibus Vol. 1",
        "format": "omnibus",
        "issues_collected": "AF #15, ASM #1-38, Annual #1-2",
        "era": "The Birth of Marvel (1961-1966)",
        "importance": "essential",
        "synopsis": (
            "The foundation of everything Spider-Man. Amazing Fantasy #15 introduces Peter Parker, "
            "a teenage science nerd bitten by a radioactive spider, whose selfish inaction leads "
            "to Uncle Ben's murder — establishing 'with great power comes great responsibility' "
            "as Marvel's defining ethos. Stan Lee and Steve Ditko create an astonishing rogues "
            "gallery issue after issue: Doctor Octopus (#3), Sandman (#4), the Lizard (#6), "
            "Vulture (#2), Electro (#9), Mysterio (#13), the Green Goblin's first shadowy "
            "appearance (#14), Kraven the Hunter (#15), and Scorpion (#20). The Sinister Six "
            "unite in Annual #1 for Marvel's first super-villain team-up against a single hero. "
            "The volume's crowning achievement is the Master Planner Saga (#31-33), where Peter "
            "lifts impossible wreckage to save Aunt May's life — one of the most iconic sequences "
            "in comic book history. Ditko's moody, angular art defines Spider-Man's visual identity, "
            "from the web-swinging to Peter's hunched, worried posture. This is where the entire "
            "Marvel method of flawed, relatable heroes was perfected."
        ),
        "connection_notes": (
            "Parallel: FF crossovers with Human Torch. Leads to: ASM Omnibus Vol. 2."
        ),
    },
    {
        "title": "Infinity Gauntlet Omnibus",
        "format": "omnibus",
        "issues_collected": "Silver Surfer #34-38, 40, 44-60, Thanos Quest #1-2, Infinity Gauntlet #1-6, and tie-ins",
        "era": "The Event Age (1985-1992)",
        "importance": "essential",
        "synopsis": (
            "THE cosmic Marvel event. Jim Starlin brings Thanos back from the dead to pursue the "
            "Infinity Gems in the two-issue Thanos Quest, outsmarting each Gem's guardian with "
            "cunning rather than brute force. With all six Gems assembled into the Infinity Gauntlet, "
            "Thanos snaps his fingers and erases half of all life in the universe — the moment that "
            "defines cosmic Marvel and directly inspires the MCU's biggest films. The six-issue "
            "Infinity Gauntlet series sees every surviving hero launch a desperate assault on Thanos, "
            "and they all fail spectacularly. George Perez and Ron Lim's art captures battles of "
            "unimaginable scale. Adam Warlock orchestrates the true plan: letting Thanos defeat "
            "himself through his own subconscious belief that he is unworthy of ultimate power. "
            "Nebula briefly seizes the Gauntlet before Warlock claims it. The story's resolution — "
            "power corrupts, even the righteous — resonates through every subsequent cosmic event."
        ),
        "connection_notes": (
            "Prerequisite: Warlock by Starlin. Sequel: Infinity War/Crusade. "
            "Parallel: all Avengers/cosmic titles."
        ),
    },
]

# ============================================================
# PROMPT TEMPLATES
# ============================================================
SYNOPSIS_SYSTEM_PROMPT = """You are a Marvel Comics expert and editorial writer for The Marvel Cartographer, \
a comprehensive chronology reference application. You write rich, encyclopedic synopses for collected editions \
(omnibuses, Epic Collections, trades) that serve as the primary reference for readers navigating Marvel's 60+ year history.

Your editorial voice is:
- Authoritative but engaging — like a knowledgeable friend who deeply loves comics
- Specific — always cite issue numbers (#N) for key story beats, character debuts, and turning points
- Analytical — explain WHY stories matter, not just WHAT happens
- Contextual — place each edition within the larger Marvel tapestry (era, creator legacy, franchise impact)

Quality standards for synopses (600-900 characters):
1. Open with a compelling hook or definitive statement about the edition's significance
2. Cite 4-8 specific issue numbers for key moments (character debuts, story arcs, plot twists)
3. Name key story arcs by their common fan/editorial names when applicable
4. Note character introductions, departures, or transformations
5. Include creator contributions where they define the work (art style, writing approach)
6. Close with the edition's legacy or impact on the broader Marvel Universe
7. Maintain factual accuracy — if unsure about a specific issue number, omit rather than guess

Quality standards for connection_notes (1-3 sentences):
- Name specific editions or series that precede/follow this one
- Use format: "Leads to: [title]. Prerequisite: [title]. Parallel: [titles]. Ties into: [event]."
- Focus on the strongest narrative threads, not every tangential connection"""


def build_synopsis_prompt(batch: list[dict], context: dict) -> str:
    """Build the user prompt for synopsis enrichment.

    Args:
        batch: list of edition dicts to enrich
        context: dict with keys 'eras', 'events', 'characters', 'connections'
                 providing lookup context
    """
    # Build few-shot examples section
    examples_text = ""
    for ex in FEW_SHOT_EXAMPLES:
        examples_text += f"""
--- Example ---
Title: {ex['title']}
Format: {ex['format']}
Issues: {ex['issues_collected']}
Era: {ex['era']}
Importance: {ex['importance']}

Synopsis: {ex['synopsis']}

Connection Notes: {ex['connection_notes']}
"""

    # Build editions to enrich
    editions_text = ""
    for i, entry in enumerate(batch, 1):
        editions_text += f"\n--- Edition {i} ---\n"
        editions_text += f"Title: {entry['title']}\n"
        editions_text += f"Format: {entry['format']}\n"
        editions_text += f"Issues Collected: {entry.get('issues_collected', 'Unknown')}\n"
        editions_text += f"Importance: {entry.get('importance', 'supplemental')}\n"

        # Add era context
        era_slug = entry.get("era_slug", "")
        era = context["eras_by_slug"].get(era_slug)
        if era:
            editions_text += f"Era: {era['name']} ({era['year_start']}-{era['year_end']}) — {era.get('subtitle', '')}\n"

        # Add creator info
        creators = entry.get("creators", [])
        if creators:
            creator_str = ", ".join(f"{c['name']} ({c['role']})" for c in creators)
            editions_text += f"Creators: {creator_str}\n"

        # Add existing synopsis (for enhancement, not full rewrite)
        existing = entry.get("synopsis", "")
        if existing and len(existing) > 50:
            editions_text += f"Current Synopsis (to enhance): {existing}\n"

        # Add connected editions context
        slug = entry.get("slug", "")
        outgoing = context["connections_by_source"].get(slug, [])
        incoming = context["connections_by_target"].get(slug, [])
        if outgoing:
            out_str = ", ".join(
                f"{c['target_slug']} ({c['connection_type']})"
                for c in outgoing[:5]
            )
            editions_text += f"Outgoing connections: {out_str}\n"
        if incoming:
            in_str = ", ".join(
                f"{c['source_slug']} ({c['connection_type']})"
                for c in incoming[:5]
            )
            editions_text += f"Incoming connections: {in_str}\n"

        # Add event context if tied to an event
        for event in context.get("events", []):
            tags = event.get("tags", [])
            title_lower = entry["title"].lower()
            if any(tag in title_lower for tag in tags) or event["slug"] in title_lower:
                editions_text += f"Related Event: {event['name']} — {event.get('synopsis', '')[:200]}\n"
                break

    return f"""Enrich the synopses and connection_notes for the following {len(batch)} collected editions.

EXAMPLES of the quality and style expected:
{examples_text}

NOW enrich these {len(batch)} editions. For each one:
- Write a synopsis of 600-900 characters with specific issue # citations
- Write connection_notes in 1-3 sentences
- If the edition already has a synopsis, improve it by adding issue citations, thematic depth, and creator context
- If you're unsure about specific issue contents, focus on what you DO know and note uncertainty

{editions_text}

Respond with a JSON array of objects, one per edition, in the same order:
[
  {{
    "index": 1,
    "synopsis": "...",
    "connection_notes": "..."
  }},
  ...
]

Only output the JSON array, no other text."""


CONNECTIONS_SYSTEM_PROMPT = """You are a Marvel Comics expert analyzing reading order connections between collected editions.

Your job is to identify the strongest narrative connections for editions that currently have NO connections in the graph. \
These connections power the "What's Next?" feature that guides readers through Marvel's chronology.

Connection types:
- leads_to: Direct narrative continuation (same series next volume, same storyline continues)
- recommended_after: Strong thematic or character continuity (not direct continuation)
- ties_into: Crosses over with or is part of an event
- parallel: Concurrent stories in the same era that share characters/plot threads
- spin_off: New series launched from events in this edition
- prerequisite: Must-read context for this edition

Strength (1-10): How important is this connection for understanding the story?
  10 = Direct sequel/continuation, 7-9 = Strong narrative thread, 4-6 = Thematic connection, 1-3 = Loose reference

Confidence (0-100): How certain are you this connection is accurate?
  90-100 = Definite (same series), 70-89 = Very likely, 50-69 = Probable, <50 = Uncertain"""


def build_connections_prompt(
    orphans: list[dict],
    all_slugs: set[str],
    existing_connections: list[dict],
    eras_by_slug: dict,
) -> str:
    """Build prompt for generating connections for orphaned editions."""
    editions_text = ""
    for i, entry in enumerate(orphans, 1):
        editions_text += f"\n--- Edition {i} ---\n"
        editions_text += f"Slug: {entry['slug']}\n"
        editions_text += f"Title: {entry['title']}\n"
        editions_text += f"Format: {entry['format']}\n"
        editions_text += f"Issues Collected: {entry.get('issues_collected', 'Unknown')}\n"
        editions_text += f"Importance: {entry.get('importance', 'supplemental')}\n"
        era_slug = entry.get("era_slug", "")
        era = eras_by_slug.get(era_slug)
        if era:
            editions_text += f"Era: {era['name']} ({era['year_start']}-{era['year_end']})\n"
        creators = entry.get("creators", [])
        if creators:
            creator_str = ", ".join(f"{c['name']} ({c['role']})" for c in creators)
            editions_text += f"Creators: {creator_str}\n"

    return f"""Generate reading order connections for the following {len(orphans)} editions that currently have \
NO connections in the graph. Each edition needs at least 1-3 connections to other editions.

IMPORTANT: Only suggest connections to editions that exist in the dataset. Valid target slugs will be validated \
against the full edition list after your response.

{editions_text}

For each edition, suggest 1-3 connections. Respond with a JSON array:
[
  {{
    "source_slug": "the-edition-slug",
    "connections": [
      {{
        "target_slug": "target-edition-slug",
        "connection_type": "leads_to|recommended_after|ties_into|parallel|spin_off|prerequisite",
        "strength": 8,
        "confidence": 85,
        "description": "Brief description of why these connect"
      }}
    ]
  }},
  ...
]

Only output the JSON array, no other text."""

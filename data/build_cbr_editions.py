#!/usr/bin/env python3
"""
build_cbr_editions.py — Convert Comic Book Roundup series/trades into collected editions.

Reads:  data/marvel_series_complete.json (768 series, 1057 trades)
Loads:  web/data/collected_editions.json, web/data/connections.json (for dedup)
Output: Appends new editions and connections to those JSON files.
"""

import json
import re
import unicodedata
from pathlib import Path
from collections import Counter

# ─── Paths ───────────────────────────────────────────────────────────────────

ROOT = Path(__file__).resolve().parent.parent
CBR_FILE = ROOT / "data" / "marvel_series_complete.json"
EDITIONS_FILE = ROOT / "web" / "data" / "collected_editions.json"
CONNECTIONS_FILE = ROOT / "web" / "data" / "connections.json"

# ─── Era definitions ─────────────────────────────────────────────────────────

ERAS = [
    {"slug": "current-ongoings", "start": 2025, "end": 2026},
    {"slug": "blood-hunt-doom", "start": 2024, "end": 2025},
    {"slug": "dawn-of-krakoa", "start": 2019, "end": 2024},
    {"slug": "all-new-all-different", "start": 2015, "end": 2018},
    {"slug": "hickman-saga", "start": 2009, "end": 2015},
    {"slug": "bendis-avengers", "start": 2004, "end": 2012},
    {"slug": "marvel-knights-ultimate", "start": 1998, "end": 2004},
    {"slug": "heroes-reborn-return", "start": 1996, "end": 1998},
    {"slug": "speculation-crash", "start": 1992, "end": 1996},
    {"slug": "event-age", "start": 1985, "end": 1992},
    {"slug": "rise-of-x-men", "start": 1975, "end": 1985},
    {"slug": "bronze-age", "start": 1970, "end": 1980},
    {"slug": "the-expansion", "start": 1966, "end": 1970},
    {"slug": "birth-of-marvel", "start": 1961, "end": 1966},
]

DEFAULT_ERA = "all-new-all-different"

# ─── Generic trade names (produce title = series name only) ──────────────────

GENERIC_TRADE_NAMES = {
    "trade paper back", "collected", "hardcover", "omnibus", "compendium",
    "complete collection", "",
}


# ─── Utility functions ───────────────────────────────────────────────────────

def slugify(text: str) -> str:
    """Convert text to URL-safe kebab-case slug."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower()
    text = text.replace("&", "and").replace("+", "and").replace("'", "")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    text = re.sub(r"-{2,}", "-", text)
    return text


def ensure_unique_slug(slug: str, seen: set) -> str:
    """Append -2, -3, etc. if slug already taken."""
    if slug not in seen:
        seen.add(slug)
        return slug
    n = 2
    while f"{slug}-{n}" in seen:
        n += 1
    final = f"{slug}-{n}"
    seen.add(final)
    return final


def extract_year(series_name: str) -> int | None:
    """Extract a 4-digit year from parenthesized text like '(2015)'."""
    m = re.search(r"\((\d{4})\)", series_name)
    return int(m.group(1)) if m else None


def assign_era(series_name: str) -> str:
    """Map a series year to the best-fit era slug."""
    year = extract_year(series_name)
    if year is None:
        return DEFAULT_ERA
    for era in ERAS:
        if era["start"] <= year <= era["end"]:
            return era["slug"]
    if year < 1961:
        return "birth-of-marvel"
    return "current-ongoings"


def detect_format(trade_name: str) -> str:
    """Detect edition format from trade name keywords."""
    tn = trade_name.lower()
    if "omnibus" in tn:
        return "omnibus"
    if "hardcover" in tn:
        return "hardcover"
    if "complete collection" in tn:
        return "complete_collection"
    if "compendium" in tn:
        return "compendium"
    if "epic collection" in tn:
        return "epic_collection"
    if "masterworks" in tn:
        return "masterworks"
    if "oversized" in tn:
        return "oversized_hardcover"
    if "premier" in tn:
        return "premier_collection"
    return "trade_paperback"


def parse_rating(val: str) -> float | None:
    """Parse a rating string to float, or None if N/A."""
    if not val or val == "N/A":
        return None
    try:
        return float(val)
    except ValueError:
        return None


def compute_importance(critic: str, user: str) -> str:
    """
    Rating-based importance tier. Never assign 'essential' (reserved for
    hand-curated editions in the existing dataset).
    """
    cr = parse_rating(critic)
    ur = parse_rating(user)
    ratings = [r for r in (cr, ur) if r is not None]
    if not ratings:
        return "supplemental"
    best = max(ratings)
    if best >= 8.0:
        return "recommended"
    if best >= 6.5:
        return "supplemental"
    return "completionist"


def strip_series_year(name: str) -> str:
    """Remove trailing (YYYY) from series name for title building."""
    return re.sub(r"\s*\(\d{4}\)\s*$", "", name).strip()


def build_title(series_name: str, trade_name: str) -> str:
    """
    Build a human-readable edition title.

    Examples:
      series="A+X", trade="Vol. 1: Equals Awesome" → "A+X Vol. 1: Equals Awesome"
      series="1602", trade="Vol. 1"                 → "1602 Vol. 1"
      series="Aero", trade="Trade Paper Back"        → "Aero"
      series="Aero", trade=""                         → "Aero"
    """
    clean_series = strip_series_year(series_name)
    if trade_name.lower().strip() in GENERIC_TRADE_NAMES:
        return clean_series
    return f"{clean_series}: {trade_name}"


def compute_issue_range(series_name: str, trades: list, idx: int) -> str:
    """
    Compute an issue range string like "Series #1-6".
    Uses cumulative issue counts from preceding trades.
    """
    clean_series = strip_series_year(series_name)
    trade = trades[idx]
    try:
        count = int(trade.get("issues_collected", 0))
    except (ValueError, TypeError):
        count = 0
    if count <= 0:
        return f"{clean_series}"

    # Sum preceding trades' issue counts to find start
    start = 1
    for i in range(idx):
        try:
            prev_count = int(trades[i].get("issues_collected", 0))
        except (ValueError, TypeError):
            prev_count = 0
        start += max(prev_count, 0)

    end = start + count - 1
    if start == end:
        return f"{clean_series} #{start}"
    return f"{clean_series} #{start}-{end}"


# ─── Main build ──────────────────────────────────────────────────────────────

def main():
    # Load inputs
    with open(CBR_FILE) as f:
        series_list = json.load(f)
    with open(EDITIONS_FILE) as f:
        existing_editions = json.load(f)
    with open(CONNECTIONS_FILE) as f:
        existing_connections = json.load(f)

    # Build dedup sets
    existing_slugs = {e["slug"] for e in existing_editions}
    seen_slugs = set(existing_slugs)

    existing_conn_keys = {
        (c["source_slug"], c["target_slug"], c["connection_type"])
        for c in existing_connections
    }

    new_editions = []
    new_connections = []
    era_counts = Counter()
    format_counts = Counter()

    for series in series_list:
        trades = series.get("trades", [])
        if not trades:
            continue

        era_slug = assign_era(series["name"])
        series_desc = series.get("description", "") or ""
        series_image = series.get("image_url", "") or ""

        trade_slugs = []  # track slugs for connection generation

        for idx, trade in enumerate(trades):
            title = build_title(series["name"], trade["name"])
            raw_slug = slugify(title)
            if not raw_slug:
                raw_slug = slugify(series["name"])
            slug = ensure_unique_slug(raw_slug, seen_slugs)

            fmt = detect_format(trade["name"])
            importance = compute_importance(
                trade.get("critic_rating", "N/A"),
                trade.get("user_rating", "N/A"),
            )
            issue_range = compute_issue_range(series["name"], trades, idx)

            try:
                issue_count = int(trade.get("issues_collected", 0))
            except (ValueError, TypeError):
                issue_count = None
            if issue_count and issue_count <= 0:
                issue_count = None

            # Use trade-level ratings for synopsis supplement
            synopsis = series_desc if series_desc else f"Collects {issue_range}."

            edition = {
                "slug": slug,
                "title": title,
                "format": fmt,
                "issues_collected": issue_range,
                "issue_count": issue_count,
                "print_status": "check_availability",
                "importance": importance,
                "era_slug": era_slug,
                "creators": [],
                "synopsis": synopsis,
                "connection_notes": "",
                "cover_image_url": series_image,
                "isbn": None,
                "page_count": None,
                "cover_price": None,
            }

            new_editions.append(edition)
            trade_slugs.append(slug)
            era_counts[era_slug] += 1
            format_counts[fmt] += 1

        # Generate sequential connections for multi-trade series
        for i in range(len(trade_slugs) - 1):
            src = trade_slugs[i]
            tgt = trade_slugs[i + 1]
            key = (src, tgt, "leads_to")
            if key not in existing_conn_keys:
                conn = {
                    "source_type": "edition",
                    "source_slug": src,
                    "target_type": "edition",
                    "target_slug": tgt,
                    "connection_type": "leads_to",
                    "strength": 8,
                    "confidence": 95,
                    "description": f"Next volume in {strip_series_year(series['name'])} series",
                }
                new_connections.append(conn)
                existing_conn_keys.add(key)

    # ─── Write output ────────────────────────────────────────────────────

    merged_editions = existing_editions + new_editions
    merged_connections = existing_connections + new_connections

    with open(EDITIONS_FILE, "w") as f:
        json.dump(merged_editions, f, indent=2, ensure_ascii=False)

    with open(CONNECTIONS_FILE, "w") as f:
        json.dump(merged_connections, f, indent=2, ensure_ascii=False)

    # ─── Stats ───────────────────────────────────────────────────────────

    print(f"{'=' * 60}")
    print(f"CBR Edition Builder — Results")
    print(f"{'=' * 60}")
    print(f"Existing editions:    {len(existing_editions)}")
    print(f"New editions added:   {len(new_editions)}")
    print(f"Total editions:       {len(merged_editions)}")
    print(f"")
    print(f"Existing connections: {len(existing_connections)}")
    print(f"New connections:      {len(new_connections)}")
    print(f"Total connections:    {len(merged_connections)}")
    print(f"")
    print(f"Per-era distribution:")
    for era_slug, count in sorted(era_counts.items(), key=lambda x: -x[1]):
        print(f"  {era_slug:<30} {count:>5}")
    print(f"")
    print(f"Per-format distribution:")
    for fmt, count in sorted(format_counts.items(), key=lambda x: -x[1]):
        print(f"  {fmt:<30} {count:>5}")
    print(f"")

    # Verify no duplicate slugs
    all_slugs = [e["slug"] for e in merged_editions]
    dupes = [s for s, c in Counter(all_slugs).items() if c > 1]
    if dupes:
        print(f"WARNING: {len(dupes)} duplicate slugs found: {dupes[:10]}")
    else:
        print(f"Slug uniqueness: PASS (all {len(all_slugs)} slugs unique)")


if __name__ == "__main__":
    main()

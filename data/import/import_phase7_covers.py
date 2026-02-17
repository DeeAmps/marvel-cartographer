#!/usr/bin/env python3
"""Phase 7: Fetch cover images — multi-source, minimal rate limiting.

Sources (priority order, matching fetch-covers-v3.mjs pattern):
  1. Amazon direct image URL (ISBN-10, no API, no rate limit)
  2. Bookcover API (longitood.com, no key needed)
  3. Open Library cover by cover_id (via search API)
  4. Open Library cover by ISBN (fallback)

Usage:
  python3 import_phase7_covers.py              # Full run
  python3 import_phase7_covers.py --sample 25   # First 25 only
  python3 import_phase7_covers.py --resume       # Resume from saved progress
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

SCRIPT_DIR = Path(__file__).parent
INPUT_PATH = SCRIPT_DIR / "phase5_enriched.json"
OUTPUT_PATH = INPUT_PATH  # Updates in-place
PROGRESS_PATH = SCRIPT_DIR / "phase7_progress.json"

SAVE_EVERY = 50
HEADERS = {"User-Agent": "MarvelCartographer/1.0 (comic-chronology-app)"}


def isbn13_to_isbn10(isbn13: str) -> str | None:
    """Convert ISBN-13 to ISBN-10."""
    if not isbn13 or len(isbn13) != 13 or not isbn13.startswith("978"):
        return None
    body = isbn13[3:12]  # 9 digits
    total = sum(int(d) * (10 - i) for i, d in enumerate(body))
    check = (11 - (total % 11)) % 11
    return body + ("X" if check == 10 else str(check))


def head_check(url: str, min_size: int = 1000) -> bool:
    """HEAD request to verify URL returns a real image (not a placeholder)."""
    try:
        req = urllib.request.Request(url, method="HEAD", headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=8)
        content_length = int(resp.headers.get("Content-Length", "0"))
        return content_length > min_size
    except Exception:
        return False


def fetch_json(url: str) -> dict | None:
    """Fetch JSON from URL."""
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read().decode("utf-8"))
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Source 1: Amazon direct image URL (no API, no rate limit)
# ---------------------------------------------------------------------------
def try_amazon_direct(isbn: str) -> str | None:
    """Direct Amazon cover URL from ISBN-10. No API call needed."""
    if not isbn:
        return None
    isbn10 = isbn13_to_isbn10(isbn) if len(isbn) == 13 else isbn
    if not isbn10:
        return None
    url = f"https://m.media-amazon.com/images/P/{isbn10}.01.LZZZZZZZ.jpg"
    if head_check(url):
        return url
    return None


# ---------------------------------------------------------------------------
# Source 2: Bookcover API (longitood.com — aggregates Goodreads/Amazon)
# ---------------------------------------------------------------------------
def try_bookcover_api(isbn: str) -> str | None:
    """Bookcover API — free, no key, returns best available cover."""
    if not isbn:
        return None
    data = fetch_json(f"https://bookcover.longitood.com/bookcover/{isbn}")
    if data and data.get("url"):
        return data["url"]
    return None


# ---------------------------------------------------------------------------
# Source 3: Open Library search → cover_id → direct cover URL
# ---------------------------------------------------------------------------
def try_open_library_search(title: str, isbn: str | None) -> str | None:
    """Search Open Library for cover_id, then construct cover URL."""
    # Try ISBN lookup first (faster)
    if isbn:
        data = fetch_json(
            f"https://openlibrary.org/search.json?isbn={isbn}&limit=1&fields=cover_i,isbn"
        )
        if data and data.get("docs"):
            cover_id = data["docs"][0].get("cover_i")
            if cover_id:
                return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"

    # Fall back to title search
    cleaned = title.replace("(", "").replace(")", "").strip()
    query = urllib.parse.quote(f"{cleaned} Marvel")
    data = fetch_json(
        f"https://openlibrary.org/search.json?q={query}&limit=3&fields=title,cover_i,publisher"
    )
    if data and data.get("docs"):
        title_lower = title.lower()
        for doc in data["docs"]:
            doc_title = (doc.get("title") or "").lower()
            # Basic relevance: at least one significant word matches
            title_words = [w for w in title_lower.split() if len(w) > 3]
            if any(w in doc_title for w in title_words[:3]):
                cover_id = doc.get("cover_i")
                if cover_id:
                    return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
    return None


# ---------------------------------------------------------------------------
# Source 4: Open Library direct ISBN cover URL (simplest, often misses)
# ---------------------------------------------------------------------------
def try_open_library_isbn(isbn: str) -> str | None:
    """Direct Open Library cover by ISBN."""
    if not isbn:
        return None
    url = f"https://covers.openlibrary.org/b/isbn/{isbn}-L.jpg"
    if head_check(url):
        return url
    return None


# ---------------------------------------------------------------------------
# Main pipeline for a single edition
# ---------------------------------------------------------------------------
def find_cover(entry: dict) -> tuple[str | None, str]:
    """Try all sources for a cover. Returns (url, source_name)."""
    isbn = (entry.get("isbn") or "").strip()
    title = entry.get("title", "")

    # Source 1: Amazon direct (fastest, no rate limit)
    url = try_amazon_direct(isbn)
    if url:
        return url, "Amazon"

    # Source 2: Bookcover API
    url = try_bookcover_api(isbn)
    if url:
        return url, "Bookcover"

    # Source 3: Open Library search
    url = try_open_library_search(title, isbn)
    if url:
        return url, "OL-Search"

    # Source 4: Open Library direct ISBN
    url = try_open_library_isbn(isbn)
    if url:
        return url, "OL-ISBN"

    return None, "miss"


def run():
    parser = argparse.ArgumentParser()
    parser.add_argument("--sample", type=int, default=0)
    parser.add_argument("--resume", action="store_true")
    args = parser.parse_args()

    print("Phase 7: Fetch Cover Images (Multi-Source)")
    print("=" * 50)

    with open(INPUT_PATH) as f:
        entries = json.load(f)

    # Resume support
    start_index = 0
    if args.resume and PROGRESS_PATH.exists():
        with open(PROGRESS_PATH) as f:
            progress = json.load(f)
        start_index = progress.get("last_index", 0) + 1
        print(f"Resuming from index {start_index}")

    total = len(entries)
    if args.sample:
        total = min(args.sample, total)
        print(f"Sample mode: processing first {total} entries")
    found = sum(1 for e in entries[:start_index] if e.get("cover_image_url"))
    skipped = 0
    source_stats = {}

    print(f"Total entries: {total}")
    print(f"Starting from: {start_index}")
    print()

    for i in range(start_index, total):
        entry = entries[i]

        # Skip if already has cover
        if entry.get("cover_image_url"):
            skipped += 1
            continue

        title = entry.get("title", "")
        print(f"[{i + 1}/{total}] {title[:55]}...", end=" ", flush=True)

        cover_url, source = find_cover(entry)

        if cover_url:
            entry["cover_image_url"] = cover_url
            found += 1
            source_stats[source] = source_stats.get(source, 0) + 1
            print(f"{source} ✓")
        else:
            print("✗")

        # Save progress periodically
        if (i + 1) % SAVE_EVERY == 0:
            with open(OUTPUT_PATH, "w") as f:
                json.dump(entries, f, indent=2)
            with open(PROGRESS_PATH, "w") as f:
                json.dump({"last_index": i}, f)
            processed = i + 1 - start_index
            coverage = found / processed * 100 if processed > 0 else 0
            print(f"  [Saved: {i + 1}/{total}, coverage: {coverage:.0f}%]")

    # Final save
    with open(OUTPUT_PATH, "w") as f:
        json.dump(entries, f, indent=2)
    print(f"\nSaved: {OUTPUT_PATH}")

    total_processed = total - start_index - skipped
    coverage = found / total_processed * 100 if total_processed > 0 else 0
    print(f"\nCovers found: {found}/{total_processed} ({coverage:.1f}%)")
    print(f"Already had covers: {skipped}")
    print(f"\nSource breakdown:")
    for source, count in sorted(source_stats.items(), key=lambda x: -x[1]):
        print(f"  {source}: {count}")

    # Clean up progress file
    if PROGRESS_PATH.exists():
        PROGRESS_PATH.unlink()

    return entries


if __name__ == "__main__":
    run()

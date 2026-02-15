#!/usr/bin/env python3
"""
Enrich collected editions with cover images from Open Library and Google Books.
Strategy:
  1. Open Library search by ISBN (if available) — no rate limit
  2. Open Library search by title — no rate limit
  3. Google Books search by title — rate limited (~1 req/sec)
"""
import json
import time
import urllib.request
import urllib.parse
import urllib.error
import sys
import os

# Rate limiting for Google Books
GOOGLE_DELAY = 1.2  # seconds between requests
OPEN_LIBRARY_DELAY = 0.3  # be polite even without hard limits
BATCH_SAVE_EVERY = 25  # save progress every N editions

DATA_FILE = "archive/collected_editions.json"

def fetch_json(url, timeout=15):
    """Fetch JSON from URL with error handling."""
    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "MarvelCartographer/1.0 (comic-chronology-app; educational)"
        })
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError) as e:
        return None

def open_library_by_isbn(isbn):
    """Search Open Library by ISBN. Returns cover URL or None."""
    if not isbn:
        return None
    clean_isbn = isbn.replace("-", "")
    url = f"https://openlibrary.org/api/books?bibkeys=ISBN:{clean_isbn}&format=json&jscmd=data"
    data = fetch_json(url)
    if data:
        key = f"ISBN:{clean_isbn}"
        if key in data and "cover" in data[key]:
            cover = data[key]["cover"]
            return cover.get("large") or cover.get("medium") or cover.get("small")
    return None

def open_library_by_title(title):
    """Search Open Library by title. Returns cover URL or None."""
    # Clean title for search
    search_title = title.replace("Epic Collection:", "").replace("Premier Collection:", "").strip()
    query = urllib.parse.quote(search_title)
    url = f"https://openlibrary.org/search.json?title={query}&limit=5"
    data = fetch_json(url)
    if data and data.get("docs"):
        for doc in data["docs"]:
            cover_id = doc.get("cover_i")
            if cover_id:
                return f"https://covers.openlibrary.org/b/id/{cover_id}-L.jpg"
            # Try ISBN-based cover
            isbns = doc.get("isbn", [])
            if isbns:
                return f"https://covers.openlibrary.org/b/isbn/{isbns[0]}-L.jpg"
    return None

def google_books_by_title(title):
    """Search Google Books by title. Returns cover URL or None."""
    # Clean and focus the search
    search_title = title.replace("Epic Collection:", "").replace("Premier Collection:", "")
    search_title = search_title.replace("Marvel", "").strip()
    query = urllib.parse.quote(f"Marvel {search_title}")
    url = f"https://www.googleapis.com/books/v1/volumes?q={query}&maxResults=5&printType=books"
    data = fetch_json(url)
    if data and data.get("items"):
        for item in data["items"]:
            info = item.get("volumeInfo", {})
            links = info.get("imageLinks", {})
            # Prefer larger images
            cover = links.get("thumbnail") or links.get("smallThumbnail")
            if cover:
                # Upgrade to larger size
                cover = cover.replace("zoom=1", "zoom=1")
                if "books.google.com" in cover:
                    return cover
    return None

def google_books_by_isbn(isbn):
    """Search Google Books by ISBN. Returns cover URL or None."""
    if not isbn:
        return None
    clean_isbn = isbn.replace("-", "")
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}&maxResults=1"
    data = fetch_json(url)
    if data and data.get("items"):
        info = data["items"][0].get("volumeInfo", {})
        links = info.get("imageLinks", {})
        cover = links.get("thumbnail") or links.get("smallThumbnail")
        if cover:
            return cover
    return None

def main():
    # Load editions
    with open(DATA_FILE, "r") as f:
        editions = json.load(f)

    # Find editions missing covers
    missing = [(i, e) for i, e in enumerate(editions) if not e.get("cover_image_url")]
    print(f"Total editions: {len(editions)}")
    print(f"Missing covers: {len(missing)}")
    print(f"Strategy: Open Library (ISBN) -> Open Library (title) -> Google Books (title)")
    print(f"Google Books rate limit: {GOOGLE_DELAY}s between requests")
    print(f"Saving progress every {BATCH_SAVE_EVERY} editions")
    print(f"{'='*60}")

    found_ol_isbn = 0
    found_ol_title = 0
    found_gb = 0
    not_found = 0
    google_calls = 0

    for batch_idx, (idx, edition) in enumerate(missing):
        title = edition["title"]
        isbn = edition.get("isbn")
        slug = edition["slug"]

        cover_url = None
        source = ""

        # Step 1: Open Library by ISBN
        if isbn:
            time.sleep(OPEN_LIBRARY_DELAY)
            cover_url = open_library_by_isbn(isbn)
            if cover_url:
                source = "OL-ISBN"
                found_ol_isbn += 1

        # Step 2: Open Library by title
        if not cover_url:
            time.sleep(OPEN_LIBRARY_DELAY)
            cover_url = open_library_by_title(title)
            if cover_url:
                source = "OL-title"
                found_ol_title += 1

        # Step 3: Google Books (rate limited)
        if not cover_url:
            time.sleep(GOOGLE_DELAY)
            google_calls += 1
            if isbn:
                cover_url = google_books_by_isbn(isbn)
                if cover_url:
                    source = "GB-ISBN"
                    found_gb += 1
            if not cover_url:
                time.sleep(GOOGLE_DELAY)
                google_calls += 1
                cover_url = google_books_by_title(title)
                if cover_url:
                    source = "GB-title"
                    found_gb += 1

        if cover_url:
            editions[idx]["cover_image_url"] = cover_url
            status = f"FOUND [{source}]"
        else:
            not_found += 1
            status = "NOT FOUND"

        progress = batch_idx + 1
        print(f"[{progress}/{len(missing)}] {status:16s} {slug[:60]}")

        # Save progress periodically
        if progress % BATCH_SAVE_EVERY == 0:
            with open(DATA_FILE, "w") as f:
                json.dump(editions, f, indent=4)
            print(f"  >> Saved progress ({progress}/{len(missing)})")

    # Final save
    with open(DATA_FILE, "w") as f:
        json.dump(editions, f, indent=4)

    print(f"\n{'='*60}")
    print(f"RESULTS:")
    print(f"  Open Library (ISBN): {found_ol_isbn}")
    print(f"  Open Library (title): {found_ol_title}")
    print(f"  Google Books: {found_gb}")
    print(f"  Not found: {not_found}")
    print(f"  Total found: {found_ol_isbn + found_ol_title + found_gb}")
    print(f"  Google API calls: {google_calls}")
    print(f"  Saved to {DATA_FILE}")

if __name__ == "__main__":
    main()

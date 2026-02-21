#!/usr/bin/env python3
"""
Verify print status of collected editions using heuristics + ISBN API lookups.

Strategy:
1. Apply smart heuristics based on format, age, ISBN presence, diamond code
2. For editions with ISBNs, verify via Open Library + Google Books APIs (free)
3. Update collected_editions.json
4. Optionally push changes to Supabase

Usage:
    python scripts/verify_print_status.py                    # Dry run (report only)
    python scripts/verify_print_status.py --apply            # Update JSON
    python scripts/verify_print_status.py --apply --push     # Update JSON + Supabase
    python scripts/verify_print_status.py --skip-api         # Heuristics only, no API calls
    python scripts/verify_print_status.py --verify-all --apply --push  # API-check ALL in_print + check_availability ISBNs
"""

import json
import os
import sys
import time
import urllib.request
import urllib.error
import urllib.parse
from datetime import datetime, date
from collections import defaultdict

# ============================================================
# Configuration
# ============================================================
EDITIONS_JSON = os.path.join(os.path.dirname(__file__), "..", "web", "data", "collected_editions.json")
REPORT_FILE = os.path.join(os.path.dirname(__file__), "print_status_report.json")

# Current date for age calculations
TODAY = date(2026, 2, 20)
CURRENT_YEAR = 2026

# API rate limiting
API_DELAY = 0.5  # seconds between API calls (be respectful)

# Supabase (only needed with --push) — loads from .env file if env vars not set
def load_dotenv():
    """Load .env file from project root."""
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip())

load_dotenv()
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", os.environ.get("SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


# ============================================================
# Heuristic Rules
# ============================================================
def apply_heuristics(edition):
    """
    Apply smart heuristics to determine likely print status.

    Returns:
        tuple: (new_status, confidence, reason)
        - new_status: "in_print", "out_of_print", "check_availability", or None (no change)
        - confidence: 0-100 how confident we are
        - reason: explanation string
    """
    fmt = edition.get("format", "")
    current_status = edition.get("print_status", "in_print")
    isbn = edition.get("isbn")
    diamond_code = edition.get("diamond_code")
    release_date_str = edition.get("release_date")
    cover_price = edition.get("cover_price")
    era_slug = edition.get("era_slug", "")
    pub_era_slug = edition.get("publication_era_slug", "")
    title = edition.get("title", "")
    slug = edition.get("slug", "")

    # Skip non-in_print editions (don't touch upcoming, ongoing, digital_only, etc.)
    if current_status != "in_print":
        return None, 0, "not in_print — skipped"

    # --- Rule 0: Recent diamond codes mean recently solicited = likely in print ---
    if diamond_code:
        # Diamond codes like "NOV240731" — first 3 chars = month, next 2 = year
        try:
            code_year = int(diamond_code[3:5]) + 2000
            if code_year >= 2024:
                return "in_print", 90, f"recent diamond code ({diamond_code}, year ~{code_year})"
        except (ValueError, IndexError):
            pass

    # --- Rule 1: Format-based age thresholds ---
    # These are based on real Marvel publishing patterns:
    # - Hardcovers go OOP within 1-2 years typically
    # - Oversized HCs even faster
    # - Omnibuses: popular ones get reprinted, but many go OOP in 2-3 years
    # - TPBs: longer shelf life, 5-8 years
    # - Epic Collections: Marvel cycles these, many stay in print
    # - Masterworks: old series OOP, new printings stay
    # - Complete Collections: go OOP relatively fast (3-4 years)

    # Publication era heuristics (when we don't have exact release dates)
    era_year_estimates = {
        "birth-of-marvel": 2020,       # These collected editions were published ~2020-2023
        "the-expansion": 2020,
        "bronze-age": 2021,
        "rise-of-x-men": 2021,
        "event-age": 2022,
        "speculation-crash": 2022,
        "heroes-reborn-return": 2022,
        "marvel-knights-ultimate": 2023,
        "bendis-avengers": 2023,
        "hickman-saga": 2023,
        "all-new-all-different": 2024,
        "dawn-of-krakoa": 2024,
        "blood-hunt-doom": 2025,
        "current-ongoings": 2025,
    }

    # Try to get publication year from diamond code or release_date
    pub_year = None
    if release_date_str:
        try:
            pub_year = int(release_date_str[:4])
        except (ValueError, IndexError):
            pass
    if not pub_year and diamond_code:
        try:
            pub_year = int(diamond_code[3:5]) + 2000
        except (ValueError, IndexError):
            pass
    if not pub_year:
        # Use publication era as rough estimate
        pub_year = era_year_estimates.get(pub_era_slug, era_year_estimates.get(era_slug, 2022))

    age_years = CURRENT_YEAR - pub_year

    # --- Format-specific thresholds ---
    if fmt == "hardcover":
        if age_years >= 3:
            return "out_of_print", 85, f"hardcover {age_years}yr old — HCs typically go OOP within 2-3 years"
        elif age_years >= 2:
            return "check_availability", 60, f"hardcover {age_years}yr old — approaching typical HC OOP window"

    elif fmt == "oversized_hardcover":
        if age_years >= 3:
            return "out_of_print", 85, f"OHC {age_years}yr old — oversized HCs go OOP quickly"
        elif age_years >= 2:
            return "check_availability", 60, f"OHC {age_years}yr old — likely going/gone OOP"

    elif fmt == "omnibus":
        # Omnibuses are trickier — popular ones get reprinted, niche ones go OOP fast
        # Key reprinted omnis: FF, ASM, Uncanny X-Men, Avengers
        is_perennial = any(kw in title.lower() for kw in [
            "fantastic four", "amazing spider-man", "uncanny x-men",
            "avengers", "incredible hulk", "iron man", "thor",
            "captain america", "daredevil", "x-men"
        ])
        if is_perennial:
            if age_years >= 5:
                return "check_availability", 55, f"perennial omnibus {age_years}yr old — may need reprint"
            else:
                return "in_print", 75, f"perennial omnibus {age_years}yr old — likely still available"
        else:
            if age_years >= 3:
                return "out_of_print", 80, f"niche omnibus {age_years}yr old — non-perennial omnis go OOP in 2-3 years"
            elif age_years >= 2:
                return "check_availability", 60, f"niche omnibus {age_years}yr old — approaching OOP window"

    elif fmt == "trade_paperback":
        if age_years >= 6:
            return "out_of_print", 75, f"TPB {age_years}yr old — older TPBs typically replaced or OOP"
        elif age_years >= 4:
            return "check_availability", 50, f"TPB {age_years}yr old — may be going OOP"

    elif fmt == "epic_collection":
        # Epic Collections are cycled by Marvel — they go OOP but get reprinted
        if age_years >= 4:
            return "check_availability", 55, f"Epic Collection {age_years}yr old — may be between print runs"
        else:
            return "in_print", 80, f"Epic Collection {age_years}yr old — Marvel keeps these cycling"

    elif fmt == "masterworks":
        if age_years >= 4:
            return "out_of_print", 75, f"Masterworks {age_years}yr old — older MW editions go OOP"
        elif age_years >= 3:
            return "check_availability", 55, f"Masterworks {age_years}yr old — approaching OOP"

    elif fmt == "complete_collection":
        if age_years >= 4:
            return "out_of_print", 80, f"Complete Collection {age_years}yr old — these go OOP in 3-4 years"
        elif age_years >= 3:
            return "check_availability", 55, f"Complete Collection {age_years}yr old — approaching OOP"

    elif fmt == "compendium":
        # Compendiums are newer format, tend to stay in print longer
        if age_years >= 4:
            return "check_availability", 50, f"Compendium {age_years}yr old — checking availability"

    elif fmt == "premier_collection":
        if age_years >= 3:
            return "out_of_print", 75, f"Premier Collection {age_years}yr old — limited print runs"

    # --- Rule 2: No ISBN and no diamond code = almost certainly OOP ---
    if not isbn and not diamond_code:
        return "out_of_print", 70, "no ISBN and no diamond code — cannot be ordered"

    # Default: keep as-is
    return None, 0, "passed all heuristic checks — keeping current status"


# ============================================================
# ISBN API Verification
# ============================================================
def check_open_library(isbn):
    """
    Check Open Library for ISBN availability info.
    Returns: dict with availability signals or None on error.
    """
    # Clean ISBN (remove hyphens)
    clean_isbn = isbn.replace("-", "")
    url = f"https://openlibrary.org/isbn/{clean_isbn}.json"

    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "MarvelCartographer/1.0 (print-status-checker)")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return {
                "found": True,
                "title": data.get("title", ""),
                "publish_date": data.get("publish_date", ""),
                "publishers": data.get("publishers", []),
                "number_of_pages": data.get("number_of_pages"),
            }
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return {"found": False}
        return None
    except Exception:
        return None


def check_google_books(isbn):
    """
    Check Google Books API for ISBN info (free, no key required for basic queries).
    Returns: dict with availability signals or None on error.
    """
    clean_isbn = isbn.replace("-", "")
    url = f"https://www.googleapis.com/books/v1/volumes?q=isbn:{clean_isbn}"

    try:
        req = urllib.request.Request(url)
        req.add_header("User-Agent", "MarvelCartographer/1.0")
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            total = data.get("totalItems", 0)
            if total > 0 and "items" in data:
                item = data["items"][0]
                vol_info = item.get("volumeInfo", {})
                sale_info = item.get("saleInfo", {})
                return {
                    "found": True,
                    "title": vol_info.get("title", ""),
                    "published_date": vol_info.get("publishedDate", ""),
                    "saleability": sale_info.get("saleability", ""),  # "FOR_SALE", "NOT_FOR_SALE", "FREE"
                    "is_ebook": sale_info.get("isEbook", False),
                    "buy_link": sale_info.get("buyLink", ""),
                }
            return {"found": False}
    except Exception:
        return None


def verify_isbn_via_apis(isbn):
    """
    Cross-reference ISBN against Open Library and Google Books.
    Returns: (is_likely_available, confidence_boost, details)
    """
    ol_result = check_open_library(isbn)
    time.sleep(API_DELAY)

    gb_result = check_google_books(isbn)
    time.sleep(API_DELAY)

    signals = []

    # Open Library signals
    if ol_result:
        if ol_result.get("found"):
            signals.append(("ol_found", True))
        else:
            signals.append(("ol_not_found", True))

    # Google Books signals
    if gb_result:
        if gb_result.get("found"):
            signals.append(("gb_found", True))
            saleability = gb_result.get("saleability", "")
            if saleability == "FOR_SALE":
                signals.append(("gb_for_sale", True))
            elif saleability == "NOT_FOR_SALE":
                signals.append(("gb_not_for_sale", True))
            if gb_result.get("buy_link"):
                signals.append(("gb_buy_link", True))
        else:
            signals.append(("gb_not_found", True))

    signal_dict = dict(signals)

    # Interpret signals
    # Google Books "FOR_SALE" with buy link = strong signal it's available
    if signal_dict.get("gb_for_sale") and signal_dict.get("gb_buy_link"):
        return True, 20, "Google Books shows FOR_SALE with buy link"

    # Not found on either = weak signal it may be OOP
    if signal_dict.get("ol_not_found") and signal_dict.get("gb_not_found"):
        return False, 15, "not found on Open Library or Google Books"

    # Google Books NOT_FOR_SALE = moderate OOP signal
    if signal_dict.get("gb_not_for_sale"):
        return False, 10, "Google Books shows NOT_FOR_SALE"

    # Found but no sale info = neutral
    return None, 0, "inconclusive API results"


# ============================================================
# Supabase Update
# ============================================================
def push_status_updates_to_supabase(changes):
    """Push print_status changes to Supabase."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for --push")
        sys.exit(1)

    print(f"\nPushing {len(changes)} status changes to Supabase...")

    # First, get slug -> id mapping
    all_rows = []
    offset = 0
    while True:
        url = f"{SUPABASE_URL}/rest/v1/collected_editions?select=id,slug&offset={offset}&limit=1000"
        req = urllib.request.Request(url, headers={
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
        })
        with urllib.request.urlopen(req) as resp:
            rows = json.loads(resp.read().decode("utf-8"))
        all_rows.extend(rows)
        if len(rows) < 1000:
            break
        offset += 1000

    slug_to_id = {r["slug"]: r["id"] for r in all_rows}
    print(f"  Fetched {len(slug_to_id)} editions from Supabase")

    updated = 0
    failed = 0
    for change in changes:
        slug = change["slug"]
        new_status = change["new_status"]
        ed_id = slug_to_id.get(slug)

        if not ed_id:
            print(f"  WARN: {slug} not found in Supabase")
            failed += 1
            continue

        patch_url = f"{SUPABASE_URL}/rest/v1/collected_editions?id=eq.{ed_id}"
        body = json.dumps({"print_status": new_status}).encode("utf-8")
        req = urllib.request.Request(patch_url, data=body, method="PATCH")
        req.add_header("apikey", SUPABASE_KEY)
        req.add_header("Authorization", f"Bearer {SUPABASE_KEY}")
        req.add_header("Content-Type", "application/json")
        req.add_header("Prefer", "return=minimal")

        try:
            urllib.request.urlopen(req)
            updated += 1
        except urllib.error.HTTPError as e:
            print(f"  FAILED: {slug} — HTTP {e.code}")
            failed += 1

        # Don't hammer the API
        if updated % 50 == 0 and updated > 0:
            print(f"    ... updated {updated} so far")
            time.sleep(0.2)

    print(f"  Updated: {updated}")
    if failed:
        print(f"  Failed: {failed}")


# ============================================================
# Main
# ============================================================
def main():
    # Force unbuffered output
    sys.stdout.reconfigure(line_buffering=True)

    args = set(sys.argv[1:])
    dry_run = "--apply" not in args
    push_to_supabase = "--push" in args
    skip_api = "--skip-api" in args
    verify_all = "--verify-all" in args

    if dry_run:
        print("=" * 70)
        print("DRY RUN — No changes will be written. Use --apply to write changes.")
        print("=" * 70)

    # Load editions
    print(f"\nLoading {EDITIONS_JSON}...")
    with open(EDITIONS_JSON) as f:
        editions = json.load(f)
    print(f"  Loaded {len(editions)} editions")

    # Count current statuses
    status_counts = defaultdict(int)
    for ed in editions:
        status_counts[ed.get("print_status", "unknown")] += 1
    print(f"\n  Current status breakdown:")
    for status, count in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"    {status}: {count}")

    # ============================================================
    # Phase 1: Heuristic analysis
    # ============================================================
    print("\n" + "=" * 70)
    print("PHASE 1: Heuristic Analysis")
    print("=" * 70)

    heuristic_results = []
    for ed in editions:
        new_status, confidence, reason = apply_heuristics(ed)
        if new_status and new_status != ed.get("print_status"):
            heuristic_results.append({
                "slug": ed["slug"],
                "title": ed["title"],
                "format": ed.get("format"),
                "current_status": ed.get("print_status"),
                "heuristic_status": new_status,
                "heuristic_confidence": confidence,
                "heuristic_reason": reason,
                "isbn": ed.get("isbn"),
            })

    # Summarize heuristic results
    h_status_counts = defaultdict(int)
    for r in heuristic_results:
        h_status_counts[r["heuristic_status"]] += 1

    print(f"\n  Heuristic recommendations:")
    print(f"    -> out_of_print: {h_status_counts.get('out_of_print', 0)}")
    print(f"    -> check_availability: {h_status_counts.get('check_availability', 0)}")
    print(f"    -> in_print (confirmed): {h_status_counts.get('in_print', 0)}")
    print(f"    Total editions flagged for change: {len(heuristic_results)}")

    # Show breakdown by format
    fmt_breakdown = defaultdict(lambda: defaultdict(int))
    for r in heuristic_results:
        fmt_breakdown[r["format"]][r["heuristic_status"]] += 1

    print(f"\n  Breakdown by format:")
    for fmt in sorted(fmt_breakdown.keys()):
        statuses = fmt_breakdown[fmt]
        parts = [f"{s}: {c}" for s, c in sorted(statuses.items())]
        print(f"    {fmt}: {', '.join(parts)}")

    # ============================================================
    # Phase 2: ISBN API verification
    # ============================================================
    if not skip_api:
        if verify_all:
            # --verify-all: Check ALL editions with ISBNs that are in_print or check_availability
            # This catches editions that heuristics didn't flag (already processed)
            all_to_verify = []
            for ed in editions:
                if ed.get("isbn") and ed.get("print_status") in ("in_print", "check_availability"):
                    all_to_verify.append({
                        "slug": ed["slug"],
                        "title": ed["title"],
                        "format": ed.get("format"),
                        "current_status": ed.get("print_status"),
                        "heuristic_status": ed.get("print_status"),  # no heuristic change
                        "heuristic_confidence": 50,
                        "heuristic_reason": "API verification of existing status",
                        "isbn": ed["isbn"],
                    })

            print(f"\n" + "=" * 70)
            print(f"PHASE 2: ISBN API Verification — VERIFY ALL ({len(all_to_verify)} editions with ISBNs)")
            print("=" * 70)

            if all_to_verify:
                print(f"  Checking {len(all_to_verify)} ISBNs via Open Library + Google Books...")
                print(f"  Estimated time: ~{len(all_to_verify) * API_DELAY * 2 / 60:.1f} minutes\n")

                api_verified = 0
                api_overridden = 0

                for i, result in enumerate(all_to_verify):
                    isbn = result["isbn"]
                    is_available, confidence_boost, api_detail = verify_isbn_via_apis(isbn)

                    result["api_checked"] = True
                    result["api_detail"] = api_detail

                    if is_available is True and result["current_status"] == "check_availability":
                        # API says available — upgrade check_availability to in_print
                        result["final_status"] = "in_print"
                        result["api_override"] = True
                        api_overridden += 1
                    elif is_available is False and result["current_status"] == "in_print":
                        # API says NOT available — downgrade in_print to check_availability
                        result["final_status"] = "check_availability"
                        result["api_override"] = True
                        api_overridden += 1
                    elif is_available is False and result["current_status"] == "check_availability":
                        # API confirms likely OOP — downgrade to out_of_print
                        result["final_status"] = "out_of_print"
                        result["api_override"] = True
                        api_overridden += 1

                    api_verified += 1
                    if (i + 1) % 25 == 0:
                        print(f"    Checked {i + 1}/{len(all_to_verify)}...")

                print(f"\n  API verified: {api_verified}")
                print(f"  API overrides: {api_overridden}")

                # Merge API results into heuristic_results for Phase 3
                for r in all_to_verify:
                    if r.get("api_override"):
                        heuristic_results.append(r)
            else:
                print("  No ISBNs to verify")
        else:
            # Standard mode: only verify editions flagged by heuristics
            to_verify = [r for r in heuristic_results if r.get("isbn") and r["heuristic_status"] in ("check_availability", "out_of_print")]

            print(f"\n" + "=" * 70)
            print(f"PHASE 2: ISBN API Verification ({len(to_verify)} editions with ISBNs)")
            print("=" * 70)

            if to_verify:
                print(f"  Checking {len(to_verify)} ISBNs via Open Library + Google Books...")
                print(f"  Estimated time: ~{len(to_verify) * API_DELAY * 2 / 60:.1f} minutes\n")

                api_verified = 0
                api_overridden = 0

                for i, result in enumerate(to_verify):
                    isbn = result["isbn"]
                    is_available, confidence_boost, api_detail = verify_isbn_via_apis(isbn)

                    result["api_checked"] = True
                    result["api_detail"] = api_detail

                    if is_available is True:
                        if result["heuristic_status"] == "out_of_print":
                            result["final_status"] = "check_availability"
                            result["api_override"] = True
                            api_overridden += 1
                        elif result["heuristic_status"] == "check_availability":
                            result["final_status"] = "in_print"
                            result["api_override"] = True
                            api_overridden += 1
                    elif is_available is False:
                        if result["heuristic_status"] == "check_availability":
                            result["final_status"] = "out_of_print"
                            result["api_override"] = True
                            api_overridden += 1
                        result["heuristic_confidence"] = min(100, result["heuristic_confidence"] + confidence_boost)

                    api_verified += 1
                    if (i + 1) % 25 == 0:
                        print(f"    Checked {i + 1}/{len(to_verify)}...")

                print(f"\n  API verified: {api_verified}")
                print(f"  API overrides: {api_overridden}")
            else:
                print("  No ISBNs to verify")
    else:
        print(f"\n  Skipping API verification (--skip-api)")

    # ============================================================
    # Phase 3: Finalize decisions
    # ============================================================
    print(f"\n" + "=" * 70)
    print("PHASE 3: Final Decisions")
    print("=" * 70)

    changes = []
    for result in heuristic_results:
        final_status = result.get("final_status", result["heuristic_status"])

        # Don't change if final = current
        if final_status == result["current_status"]:
            continue

        changes.append({
            "slug": result["slug"],
            "title": result["title"],
            "format": result["format"],
            "old_status": result["current_status"],
            "new_status": final_status,
            "confidence": result["heuristic_confidence"],
            "reason": result["heuristic_reason"],
            "api_detail": result.get("api_detail", ""),
            "api_override": result.get("api_override", False),
        })

    # Summary
    change_counts = defaultdict(int)
    for c in changes:
        key = f"{c['old_status']} -> {c['new_status']}"
        change_counts[key] += 1

    print(f"\n  Total changes: {len(changes)}")
    for transition, count in sorted(change_counts.items(), key=lambda x: -x[1]):
        print(f"    {transition}: {count}")

    # Show some examples
    print(f"\n  Sample changes (first 15):")
    for c in changes[:15]:
        override = " [API override]" if c.get("api_override") else ""
        print(f"    [{c['format']}] {c['title']}")
        print(f"      {c['old_status']} -> {c['new_status']} (confidence: {c['confidence']}%) — {c['reason']}{override}")

    if len(changes) > 15:
        print(f"    ... and {len(changes) - 15} more")

    # ============================================================
    # Phase 4: Apply changes
    # ============================================================
    if not dry_run and changes:
        print(f"\n" + "=" * 70)
        print("PHASE 4: Applying Changes")
        print("=" * 70)

        # Build slug -> new_status map
        change_map = {c["slug"]: c["new_status"] for c in changes}

        # Update JSON
        updated_count = 0
        for ed in editions:
            if ed["slug"] in change_map:
                ed["print_status"] = change_map[ed["slug"]]
                updated_count += 1

        # Write updated JSON
        print(f"\n  Writing {updated_count} changes to {EDITIONS_JSON}...")
        with open(EDITIONS_JSON, "w") as f:
            json.dump(editions, f, indent=2, ensure_ascii=False)
        print(f"  Done.")

        # New status breakdown
        new_status_counts = defaultdict(int)
        for ed in editions:
            new_status_counts[ed.get("print_status", "unknown")] += 1
        print(f"\n  Updated status breakdown:")
        for status, count in sorted(new_status_counts.items(), key=lambda x: -x[1]):
            print(f"    {status}: {count}")

        # Push to Supabase
        if push_to_supabase:
            push_status_updates_to_supabase(changes)

    # ============================================================
    # Save report
    # ============================================================
    report = {
        "run_date": TODAY.isoformat(),
        "dry_run": dry_run,
        "total_editions": len(editions),
        "original_status_counts": dict(status_counts),
        "total_changes": len(changes),
        "changes": changes,
    }

    print(f"\n  Saving report to {REPORT_FILE}...")
    with open(REPORT_FILE, "w") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)

    print(f"\n{'=' * 70}")
    print("COMPLETE")
    print(f"{'=' * 70}")

    if dry_run:
        print(f"\nThis was a dry run. To apply changes:")
        print(f"  python scripts/verify_print_status.py --apply              # JSON only")
        print(f"  python scripts/verify_print_status.py --apply --push       # JSON + Supabase")
        print(f"  python scripts/verify_print_status.py --apply --skip-api   # Heuristics only")


if __name__ == "__main__":
    main()

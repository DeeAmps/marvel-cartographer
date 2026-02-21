 ---
  MARVEL CARTOGRAPHER: COMPLETE DATA AUDIT
   REPORT

  14 Eras, 14 Agents, 2237 Editions
  (post-cleanup)

  ---
  EXECUTIVE SUMMARY

  The Marvel Cartographer dataset contains
   genuinely excellent editorial work in
  its curated core -- roughly 300-400
  hand-written entries with detailed
  synopses, accurate connection notes, and
   defensible importance ratings. This is
  some of the best comic reference writing
   in any database.

  However, systemic data quality issues
  affect every single era. These are not
  isolated problems -- they are structural
   flaws in the data pipeline that inflate
   counts, confuse users, and undermine
  the project's core differentiators.

  ---
  FIXES APPLIED (February 20, 2026)

  Round 1 (prior session):
  - [x] Removed 9 fabricated editions
  - [x] Fixed 5 factual errors
  - [x] Retagged 202 Epic Collections
        with correct format field

  Round 2 (this session):
  - [x] Removed 140 non-Marvel content
        entries (83 Star Wars, 31 Conan/
        Kull/Red Sonja/Solomon Kane, 15
        Alien/Aliens, 8 Predator, 3 other
        licensed)
  - [x] Removed 157 cover variant
        duplicates (Masterworks Variant
        Editions, alternate cover omnibuses)
  - [x] Fixed 25 era misassignments
        (classic reprints moved from modern
        eras to correct narrative eras)
  - [x] Cleaned 2,512 dangling connection
        references
  - [x] Cleaned 68 dangling reading path
        entries

  Dataset: 2518 -> 2221 -> 2237 editions
  Connections: 6801 -> 4289
  All verification checks pass: no
  duplicate slugs, no dangling refs, all
  era_slug values valid.

  Round 4 (February 21, 2026):
  - [x] Replaced fabricated "X-Force
        Omnibus Vol. 2" with real Cable &
        X-Force Omnibus (ISBN 9781302917777)
  - [x] Fixed issue mappings: removed
        #26-31 (belong to Deadpool & X-Force
        Omnibus) and #44-50 (uncollected)
  - [x] Added Defenders by Bendis (2017)
        Vol. 1-2 (2 editions)
  - [x] Added Dawn of X Vols. 2-16
        (15 editions)
  - [x] Updated all slug references across
        6 data files + archive copies
  - [x] Pushed all changes to Supabase

  ---
  SYSTEMIC ISSUES (Found Across ALL 14
  Eras)

  1. Cover Variant Duplicates
  [FIXED] Removed 157 cover variant
  duplicate entries across all eras.

  2. Era Misassignment by Publication Date

  [PARTIALLY FIXED] 25 clear-cut cases
  fixed (Golden Age omnibuses, classic
  Epic Collections, Hickman reprints in
  wrong modern eras). Remaining cases
  require manual review -- many modern
  eras still have entries that may belong
  elsewhere but lack explicit series
  references in issues_collected to
  confirm.

  Fix remaining: Add separate
  narrative_era and publication_date
  fields. Era slug should reflect
  narrative placement.

  3. Non-Marvel Universe Content
  [FIXED] Removed 140 non-Marvel entries:
  Star Wars, Conan, Kull, Red Sonja,
  Solomon Kane, Alien, Aliens, Predator,
  League of Legends, Planet of the Apes,
  Warhammer 40K, Halo, Tron, Disney
  Kingdoms.

  4. Two-Tier Data Quality

  ~40% of entries are hand-curated with
  excellent synopses and connections. ~60%
   are bulk-imported with placeholder
  synopses, empty connection notes,
  "check_availability" print status, and
  sometimes raw solicitation copy.

  5. "check_availability" Print Status
  Epidemic

  Across all eras, roughly 60-70% of
  entries have check_availability as their
   print status -- effectively "we don't
  know." This undermines the project's
  Print Status Intelligence
  differentiator.

  6. Fabricated/Non-Existent Editions
  [FIXED in Round 1] Removed 9 fabricated
  editions including Silver Surfer Omnibus
  Vol. 2, Ka-Zar Complete Collection,
  Alpha Flight Vol. 2, Quicksilver
  Complete Collection, and speculative
  2025 relaunch entries.

  7. Duplicate Content Entries (Beyond
  Cover Variants)

  The same run appears in multiple formats
   (Omnibus, Epic Collection, Complete
  Collection, TPB) without
  cross-referencing. Some runs have 3-6
  entries. Examples:
  - FF by Waid & Wieringo: 6 entries in
  Era 8
  - Punisher: Welcome Back Frank: 3
  entries in Era 8
  - Silver Surfer #1-18: 5+ entries in Era
   2

  8. Format Field Inconsistencies
  [FIXED in Round 1] 202 Epic Collections
  retagged from trade_paperback to
  epic_collection.

  ---
  PER-ERA COUNTS (Post-Cleanup)

  Era: 1
  Name: Birth of Marvel (1961-66)
  Editions: 142
  ────────────────────────────────────────
  Era: 2
  Name: The Expansion (1966-70)
  Editions: 72
  ────────────────────────────────────────
  Era: 3
  Name: Bronze Age (1970-80)
  Editions: 218
  ────────────────────────────────────────
  Era: 4
  Name: Rise of X-Men (1975-85)
  Editions: 191
  ────────────────────────────────────────
  Era: 5
  Name: Event Age (1985-92)
  Editions: 196
  ────────────────────────────────────────
  Era: 6
  Name: Speculation Crash (1992-96)
  Editions: 113
  ────────────────────────────────────────
  Era: 7
  Name: Heroes Reborn/Return (1996-98)
  Editions: 54
  ────────────────────────────────────────
  Era: 8
  Name: Marvel Knights/Ultimate (1998-04)
  Editions: 153
  ────────────────────────────────────────
  Era: 9
  Name: Bendis Avengers (2004-12)
  Editions: 197
  ────────────────────────────────────────
  Era: 10
  Name: Hickman Saga (2009-15)
  Editions: 152
  ────────────────────────────────────────
  Era: 11
  Name: All-New All-Different (2015-18)
  Editions: 164
  ────────────────────────────────────────
  Era: 12
  Name: Dawn of Krakoa (2019-24)
  Editions: 274
  ────────────────────────────────────────
  Era: 13
  Name: Blood Hunt & Doom (2024-25)
  Editions: 222
  ────────────────────────────────────────
  Era: 14
  Name: Current Ongoings (2025-26)
  Editions: 73

  ---
  TOP FACTUAL ERRORS REQUIRING IMMEDIATE
  FIXES

  Era: 2
  Error: Silver Surfer Omnibus Vol. 2
  Detail: This edition does not exist as
    published
  Status: [FIXED in Round 1]
  ────────────────────────────────────────
  Era: 2
  Error: Ancient One's death
  Detail: Placed in wrong collection (dies

    in Marvel Premiere #10, 1973)
  Status: [FIXED in Round 3] Synopsis corrected; death reference removed
  ────────────────────────────────────────
  Era: 7
  Error: 8-10 fabricated editions
  Detail: Ka-Zar, Alpha Flight,
  Quicksilver
    collections never published
  Status: [FIXED in Round 1]
  ────────────────────────────────────────
  Era: 7
  Error: James Robinson on Heroes Reborn
    Cap
  Detail: Actually Jeph Loeb
  Status: [FIXED in Round 1]
  ────────────────────────────────────────
  Era: 8
  Error: Maximum Security
  Detail: Listed as 12 issues (actually
    3-issue mini)
  Status: [N/A] Entry not found in current dataset; likely removed in prior cleanup
  ────────────────────────────────────────
  Era: 8
  Error: Spider-Man's Tangled Web
  Detail: Issues #23-45 don't exist
  (series
    was only 22 issues)
  Status: [N/A] Entry not found in current dataset; likely removed in prior cleanup
  ────────────────────────────────────────
  Era: 9
  Error: Mighty Avengers #1-20
  Detail: Attributed to Dan Slott
  (actually
    Bendis)
  Status: [FIXED in Round 3] Title, slug, and creators corrected to Bendis
  ────────────────────────────────────────
  Era: 13
  Error: Uncanny X-Men (2024)
  Detail: Attributed to Gerry Duggan
    (actually Gail Simone)
  Status: [FIXED in Round 3] Duplicate Duggan entry removed; correct Simone entry existed
  ────────────────────────────────────────
  Era: 13
  Error: Doctor Doom by "Rodwell Frietas"
  Detail: Unverifiable creator name
  (series
    is by Christopher Cantwell)
  Status: [FIXED in Round 3] Slug, title, and creators corrected to Cantwell/Larroca
  ────────────────────────────────────────
  Era: 14
  Error: Multiple "(2025)" relaunches
  Detail: Speculative entries for FF, Cap,

    Iron Man, Thor, Hulk that may not
  exist
  Status: [FIXED in Round 1]

  ---
  TOP MISSING EDITIONS (Across All Eras)

  Era: 5
  Missing Edition: Born Again (curated
    entry)
  Why It Matters: One of the most
  important
    DD stories ever
  ────────────────────────────────────────
  Era: 8
  Missing Edition: Iron Man: Extremis by
    Warren Ellis
  Why It Matters: Direct MCU inspiration,
    landmark Iron Man story
  ────────────────────────────────────────
  Era: 8
  Missing Edition: Astonishing X-Men by
    Whedon Vol. 1
  Why It Matters: Only Vol. 2 is present
  ────────────────────────────────────────
  Era: 10
  Missing Edition: Secret Warriors by
    Hickman
  Why It Matters: Missing from the Hickman

    Saga era
  ────────────────────────────────────────
  Era: 11
  Missing Edition: All-New X-Men by
    Hopeless
  Why It Matters: Core ANAD X-title
    completely absent
  ────────────────────────────────────────
  Era: 11
  Missing Edition: Defenders by Bendis
    (2017)
  Why It Matters: Netflix-era team book
    absent
  Status: [FIXED in Round 4] Added
    defenders-bendis-vol-1 and
    defenders-bendis-vol-2
  ────────────────────────────────────────
  Era: 12
  Missing Edition: Dawn of X TPBs Vol.
  2-16
  Why It Matters: Primary Krakoa
  collection
    format, only Vol. 1 exists
  Status: [FIXED in Round 4] Added
    dawn-of-x-vol-2 through
    dawn-of-x-vol-16 (15 volumes)
  ────────────────────────────────────────
  Era: 14
  Missing Edition: Storm (2024) by Ayodele
  Why It Matters: Major From the Ashes
    solo, critically acclaimed
  ────────────────────────────────────────
  Era: 14
  Missing Edition: Scarlet Witch by
  Orlando
  Why It Matters: Becomes Sorcerer Supreme

    post-OWUD
  ────────────────────────────────────────
  Era: 14
  Missing Edition: Ultimate Universe line
    trades
  Why It Matters: Described in era text
  but
    zero entries

  ---
  REMAINING PRIORITY ACTIONS

  Immediate (Data Integrity)

  1. [DONE] Deduplicate cover variants
     across all eras (157 removed)
  2. [DONE] Remove/verify fabricated
     editions (9 removed in Round 1)
  3. [DONE] Fix the 10 critical factual
     errors listed above (9 fixed, 2 N/A
     -- entries already removed, 1 removed
     as duplicate)
  4. [DONE] Remove non-Marvel content
     (140 removed)

  Short-Term (Data Quality)

  5. [PARTIAL] Re-tag misassigned eras
     (25 fixed, more may need manual
     review)
  6. Audit print status -- replace
  check_availability with actual data
  7. Add missing essential editions
  (~30-50 additions)
  8. Rewrite solicitation-copy synopses in
   editorial voice

  Architectural

  9. Add narrative_era vs publication_era
  fields to handle omnibuses spanning
  multiple eras
  10. Add cover_variants array to the
  edition schema
  11. Add overlaps_with field linking
  format variants of the same content
  12. Standardize format fields (Epic
  Collections should use epic_collection)

  ---
  BOTTOM LINE

  The curated core of this dataset is
  genuinely outstanding -- knowledgeable,
  opinionated, and editorially rigorous.
  The connection notes and synopsis
  quality for the top ~300 entries rival
  or exceed any public comics database.

  After two rounds of cleanup, the dataset
  has been reduced from ~3,566 to 2,221
  entries. Non-Marvel content, cover
  variant duplicates, fabricated editions,
  and format mistagging have been
  addressed. The remaining work focuses on
  print status auditing, synopsis quality,
  and adding missing essential editions.

# MARVEL COMICS CHRONOLOGY ENGINE
## Master Project Plan — "The Marvel Cartographer"

**Version:** 1.0
**Author:** Daniel (Principal Backend Engineer) + Claude (Continuity Architect)
**Date:** February 7, 2026
**Status:** PLANNING PHASE

---

## TABLE OF CONTENTS

1. [Project Vision & Philosophy](#1-project-vision--philosophy)
2. [The Core Problem: Why Marvel Chronology is Hard](#2-the-core-problem)
3. [Content Architecture: How Marvel Canon Actually Works](#3-content-architecture)
4. [Data Model Design](#4-data-model-design)
5. [Marvel Chronology: Complete Era Mapping](#5-complete-era-mapping)
6. [Technical Architecture Decisions](#6-technical-architecture-decisions)
7. [Deliverables & Phases](#7-deliverables--phases)
8. [Open Questions for Daniel](#8-open-questions)

---

## 1. PROJECT VISION & PHILOSOPHY

### What This Is
A definitive, interactive, living reference system for mapping the entire Marvel Comics universe from Fantastic Four #1 (November 1961) to the current publications (February 2026). Not just a reading order — a **continuity cartography engine** that treats Marvel's timeline as a complex, multi-layered graph with branches, retcons, and competing interpretations.

### Core Principles

1. **Timelines are living data, not gospel.** Every placement comes with a confidence score and source citation.
2. **Multiple interpretations coexist.** Official Marvel stance, fan-accepted interpretation, and editorial retcon explanation all exist side-by-side.
3. **Issue numbers are sacred.** Every claim cites specific issues. No hand-waving.
4. **Collected editions are the entry point.** Real humans read omnibuses and trades — we map to those, not just individual issues.
5. **"What do I read next?" is THE killer feature.** Select any book, get a mapped path forward (and backward).

### Why This Hasn't Been Done Well

- Comic Book Herald does great reading orders but doesn't handle competing chronologies
- Crushing Krisis does incredible collected edition guides but per-character, not unified
- Marvel Unlimited has chronology but it's messy and missing nuance
- No one treats conflicts as FEATURES rather than problems to hide

---

## 2. THE CORE PROBLEM: WHY MARVEL CHRONOLOGY IS HARD

### 2.1 Marvel Time vs. Real Time
Marvel operates on a "sliding timescale" — roughly 13-15 years of in-universe time from FF #1 to present day. This means:
- Events that were "10 years ago" in 1975 are STILL "10 years ago" in 2026
- Origins get retconned to fit modern settings (Tony Stark's origin moves from Vietnam → Gulf War → Afghanistan → generic conflict)
- The FF gaining powers from cosmic rays in 1961 is treated as "about 13 years ago" in current continuity

**Confidence system needed:** When did the FF form? 
- Publication date: November 1961 (FACT, confidence: 100%)
- In-universe sliding scale: ~13 years before "now" (OFFICIAL, confidence: 90%)
- Original intent: 1961 (HISTORICAL, confidence: 100%)

### 2.2 Retcon Categories
We need to classify every continuity change:

| Type | Description | Example |
|------|-------------|---------|
| **Hard Retcon** | Directly contradicts earlier story | Spider-Man: One More Day erasing the marriage |
| **Soft Retcon** | Reinterprets without contradicting | Hickman making Moira X a mutant who always existed |
| **Additive Retcon** | Adds new context to existing events | Avengers: Illuminati revealing the secret group existed all along |
| **Sliding Scale** | Modern updating of timeframes | Iron Man's origin shifting from Vietnam |
| **Editorial Mandate** | Changed for business reasons | Heroes Reborn, Brand New Day |
| **Crisis-level Reset** | Universe-wide reboot/merge | Secret Wars (2015) merging 616 and Ultimate |

### 2.3 Parallel Publication Tracks
At any given point in Marvel history, DOZENS of series run simultaneously. Key parallel tracks:

```
1961-1970: FF → Spider-Man → Avengers → X-Men → Thor → Iron Man → Hulk → DD → Strange → Cap
1970-1980: + Defenders, Luke Cage, Iron Fist, Werewolf, Ghost Rider, Tomb of Dracula
1980-1990: + New Mutants, Alpha Flight, X-Factor, West Coast Avengers, Secret Wars
1990-2000: + X-Force, Cable, Spawn of X-books, Age of Apocalypse, Heroes Reborn
2000-2010: + Ultimate Universe, Bendis Avengers, Annihilation cosmic, House of M/Civil War
2010-2020: + Hickman Avengers/FF, All-New All-Different, Krakoa era
2020-2026: + Krakoa conclusion, Blood Hunt, One World Under Doom, current ongoings
```

### 2.4 The "What Matters" Problem
Not every issue matters equally. We need a system:

- **ESSENTIAL** (🔴): Core storyline, cannot be skipped
- **RECOMMENDED** (🟡): Enriches understanding significantly
- **SUPPLEMENTAL** (🟢): Good but optional, adds color
- **COMPLETIONIST** (⚪): Only for deep-dive collectors

---

## 3. CONTENT ARCHITECTURE: HOW MARVEL CANON ACTUALLY WORKS

### 3.1 The Marvel Universe Graph Structure

Marvel's continuity is NOT a linear timeline. It's a **directed acyclic graph (mostly)** with:

```
NODES = Individual issues, story arcs, events
EDGES = Continuity connections (leads-to, ties-into, retcons, spin-off-from)
CLUSTERS = Eras, family groups, event clusters
LAYERS = Character threads, team threads, cosmic threads, street-level threads
```

### 3.2 Reading Path Types

| Path Type | Description | Example |
|-----------|-------------|---------|
| **Publication Order** | As originally published month by month | FF #1, then FF #2, etc. |
| **Character Thread** | Follow one character across all books | Spider-Man from AF#15 through current |
| **Team Thread** | Follow a team through its full history | Avengers from #1 through current |
| **Event Thread** | All tie-ins for a specific event | Civil War core + all tie-ins |
| **Creator Run** | Follow a specific creator's work | Hickman's FF → Avengers → Secret Wars |
| **Thematic Thread** | Conceptual groupings | "All cosmic Marvel" or "All street-level" |
| **Collected Edition Order** | How to read via omnibuses/trades | Practical purchasing/reading path |
| **Recommended/Curated** | Opinionated "best path" for new readers | Skip to essential runs only |

### 3.3 Era Definitions (Our Canonical Breakdown)

| Era | Years | Defining Characteristic | Key Event Anchor |
|-----|-------|------------------------|-----------------|
| **The Birth** | 1961–1966 | Lee/Kirby/Ditko create the Marvel Universe | FF #1 through Galactus Trilogy |
| **The Expansion** | 1966–1970 | Universe matures, cosmic scope increases | Silver Surfer, Cap revived, Inhumans |
| **The Bronze Age** | 1970–1980 | Social relevance, darker themes, new heroes | Kree-Skrull War through Korvac |
| **The Rise of the X-Men** | 1975–1985 | Claremont/Byrne revolution | Giant-Size X-Men #1 through Secret Wars |
| **The Event Age** | 1984–1992 | Crossovers become king | Secret Wars → Infinity Gauntlet |
| **The Speculation Crash** | 1992–1996 | Image exodus, market collapse | X-Force #1 through Onslaught |
| **Heroes Reborn/Return** | 1996–1998 | Pocket universe experiment | Onslaught → Heroes Return |
| **Marvel Knights / Ultimate** | 1998–2004 | Creative renaissance | Marvel Knights DD, Ultimates, NXM |
| **The Bendis Avengers** | 2004–2012 | Event-driven, Avengers-centric | Disassembled → AvX |
| **The Hickman Saga** | 2009–2015 | Grand cosmic architect | FF → Avengers → Secret Wars (2015) |
| **All-New All-Different** | 2015–2018 | Post-Secret Wars relaunch | ANAD Marvel through Legacy |
| **Fresh Start** | 2018–2019 | Soft relaunch | Fresh Start initiative |
| **The Dawn of Krakoa** | 2019–2024 | Mutant nation-building | HoX/PoX through Fall of X |
| **Blood Hunt / Doom Era** | 2024–2025 | Vampire war, Doom rises | Blood Hunt → One World Under Doom |
| **Post-Doom / Current** | 2025–present | Aftermath, Armageddon | Dungeons of Doom, current ongoings |

---

## 4. DATA MODEL DESIGN

### 4.1 Core Entities

```
ISSUE {
  id: UUID
  series_name: string        // "Fantastic Four (1961)"
  issue_number: string       // "#52" or "Annual #3"
  publication_date: date     // November 1961
  cover_date: string         // "Nov 1961"
  writers: [CreatorRef]
  artists: [CreatorRef]
  editor: string
  first_appearances: [CharacterRef]
  deaths: [CharacterRef]
  story_title: string
  synopsis: text
  importance_level: enum     // ESSENTIAL, RECOMMENDED, SUPPLEMENTAL, COMPLETIONIST
  tags: [string]             // ["cosmic", "doom", "galactus", "first-appearance"]
  universe: string           // "Earth-616", "Earth-1610", etc.
  continuity_notes: [ContinuityNote]
}

COLLECTED_EDITION {
  id: UUID
  title: string              // "Fantastic Four Omnibus Vol. 1"
  format: enum               // OMNIBUS, EPIC_COLLECTION, TRADE, MASTERWORKS, COMPENDIUM
  isbn: string
  issues_collected: [IssueRef]
  page_count: int
  cover_price: decimal
  print_status: enum         // IN_PRINT, OUT_OF_PRINT, UPCOMING, DIGITAL_ONLY
  edition_number: int        // 1st printing, 2nd printing, etc.
  release_date: date
  availability: [AvailabilityRef]
  writers: [CreatorRef]      // Primary creators
  artists: [CreatorRef]
  cover_artist: CreatorRef
}

AVAILABILITY {
  edition_id: ref
  retailer: string           // "Amazon", "IST", "DCBS", "CGN", "eBay"
  url: string
  approximate_price: decimal
  in_stock: boolean
  last_checked: datetime
}

STORY_ARC {
  id: UUID
  name: string               // "The Galactus Trilogy"
  issues: [IssueRef]         // FF #48-50
  collected_in: [CollectedEditionRef]
  importance: enum
  synopsis: text
  connections: [ConnectionRef]
  era: EraRef
  tags: [string]
}

EVENT {
  id: UUID
  name: string               // "Civil War"
  core_series: [IssueRef]    // The main series
  tie_ins: [TieIn]           // { series, issues, importance, synopsis }
  collected_in: [CollectedEditionRef]
  reading_order: [ReadingOrderEntry]  // Specific issue-by-issue order
  prerequisites: [StoryArcRef]
  consequences: [StoryArcRef]
  continuity_impact: text
  era: EraRef
}

CONNECTION {
  id: UUID
  source: ref                // Issue, Arc, or Event
  target: ref
  type: enum                 // LEADS_TO, TIES_INTO, SPIN_OFF, RETCONS, REFERENCES, PARALLEL
  strength: int              // 1-10 how important this connection is
  description: text
  confidence: int            // 0-100
  interpretation: enum       // OFFICIAL, FAN_ACCEPTED, EDITORIAL_RETCON
  citation: string           // "As confirmed in FF #570 letters page"
}

READING_PATH {
  id: UUID
  name: string               // "The Complete Fantastic Four"
  type: enum                 // CHARACTER, TEAM, EVENT, CREATOR, THEMATIC, CURATED
  description: text
  entries: [ReadingPathEntry] // Ordered list of collected editions or issues
  difficulty: enum            // BEGINNER, INTERMEDIATE, ADVANCED, COMPLETIONIST
  estimated_issues: int
  estimated_cost: decimal
}

CONTINUITY_NOTE {
  issue_id: ref
  note_type: enum            // CONFLICT, RETCON, SLIDING_SCALE, EDITORIAL_NOTE
  description: text
  official_stance: text
  fan_interpretation: text
  retcon_explanation: text
  confidence: int            // 0-100
  sources: [string]          // Issue citations
}

CREATOR {
  id: UUID
  name: string
  roles: [string]            // ["writer", "artist", "editor"]
  notable_runs: [RunRef]
  active_years: string
}

CHARACTER {
  id: UUID
  name: string               // "Reed Richards"
  aliases: [string]          // ["Mr. Fantastic", "The Maker"]
  first_appearance: IssueRef
  universe: string
  teams: [string]
  reading_paths: [ReadingPathRef]
}
```

### 4.2 The Connection Graph

This is the KEY innovation. Every node (issue/arc/event) connects to others via typed, weighted, confidence-scored edges.

```
FF #48 --[LEADS_TO, strength:10, confidence:100%]--> FF #49
FF #48 --[FIRST_APPEARANCE, confidence:100%]--> Silver Surfer
FF #48 --[SPIN_OFF, strength:8]--> Silver Surfer (1968) #1
FF #52 --[FIRST_APPEARANCE, confidence:100%]--> Black Panther
FF #52 --[LEADS_TO, strength:6]--> Avengers #52 (BP joins Avengers)
FF #52 --[SPIN_OFF, strength:7]--> Jungle Action #6 (BP solo)

Secret Wars (2015) --[RETCONS, type:CRISIS_RESET]--> All pre-SW continuity
  Official: "Everything happened, multiverse collapsed and reformed"
  Fan: "616 continued mostly unchanged, Ultimate elements merged in"
  Editorial: "Soft reboot to allow new #1s and story flexibility"
```

### 4.3 Confidence Scoring System

```
100% = Directly stated in published comic, no ambiguity
90%  = Strongly implied, confirmed by editorial
80%  = Widely accepted, minor ambiguity
70%  = Generally agreed upon, some debate
60%  = Common interpretation but alternatives exist
50%  = Genuinely contested, multiple valid readings
40%  = Likely but contradicted by some evidence
30%  = Possible interpretation, minority view
20%  = Speculative, based on thin evidence
10%  = Fan theory with minimal support
```

---

## 5. COMPLETE ERA MAPPING

### This is the actual content. Below is a comprehensive mapping of EVERY significant collected edition, organized by era, with the metadata our system needs.

---

### ERA 1: THE BIRTH OF MARVEL (1961–1966)

**Context:** Stan Lee, Jack Kirby, and Steve Ditko create an interconnected universe of flawed, human superheroes. Everything starts with Fantastic Four #1. Within 5 years, the entire foundation of Marvel is laid.

#### FANTASTIC FOUR — The First Family (Anchor Series)

| # | Collected Edition | Issues | Creators | Status | Importance | Key Story/Connections |
|---|------------------|--------|----------|--------|------------|----------------------|
| 1 | **Fantastic Four Omnibus Vol. 1** | FF #1–30, Annual #1 | Lee/Kirby | ✅ IN PRINT | 🔴 ESSENTIAL | Origin of Marvel. Doctor Doom (#5), Namor (#4), Skrulls (#2), Puppet Master (#8), Impossible Man (#11), Watcher (#13), Super-Skrull (#18), Molecule Man (#20), Hate-Monger (#21), Diablo (#30). Annual #1 = Namor/Doom team-up. → Leads to: Avengers #1 (founding), ASM crossovers |
| 2 | **Fantastic Four Omnibus Vol. 2** | FF #31–60, Annual #2–3 | Lee/Kirby | ✅ IN PRINT | 🔴 ESSENTIAL | THE essential Silver Age Marvel. Frightful Four (#36), Dragon Man (#35), Inhumans full intro (#44–47), **Galactus Trilogy (#48–50)** — most important cosmic event in early Marvel. Silver Surfer, Galactus debut. Black Panther first appearance (#52–53). Doctor Doom steals Silver Surfer's power (#57–60). → Spins off: Silver Surfer series, Inhumans, Black Panther in Avengers |
| 3 | **Fantastic Four Omnibus Vol. 3** | FF #61–93, Annual #4–7 | Lee/Kirby | ✅ IN PRINT | 🔴 ESSENTIAL | Peak cosmic Kirby. Him/Adam Warlock (#66–67), Psycho-Man, Annihilus (#6 Annual), Crystal joins, Ronan the Accuser. **Franklin Richards born (#94 in Vol.4)**. → Leads to: Adam Warlock series, Kree-Skrull War in Avengers |
| 4 | **Fantastic Four Omnibus Vol. 4** | FF #94–125, Annual #8–9 | Lee-Kirby (#94-102), then Lee/Romita/Buscema, Thomas/Buckler | ✅ IN PRINT | 🟡 RECOMMENDED | Final Lee/Kirby issues. Over-Mind saga. Agatha Harkness as Franklin's nanny. Transition era. → Connects to: Warlock on Counter-Earth |
| 5 | **Fantastic Four Omnibus Vol. 5** | FF #126–163, GS FF #1–4, GS Super-Stars #1 | Conway/Buckler/Englehart/Perez | ✅ IN PRINT | 🟡 RECOMMENDED | Medusa replaces Sue. Thundra joins. Reed/Sue marriage strained. Crystal/Quicksilver wedding. → Connects to: Avengers (wedding issue), Inhumans |
| 6 | **Fantastic Four Omnibus Vol. 6** | FF #164–200, Annual #10–14 | Perez/Pollard/Wolfman/Wein | ✅ IN PRINT | 🟡 RECOMMENDED | Landmark #200 = definitive Doom battle. Nova (Frankie Raye) introduced. Salem's Seven. → Leads to: John Byrne's FF |

**GAP ALERT:** FF #201–231 = Not yet collected in omnibus. Available in:
- **FF Epic Collection Vol. 10: The Possession of Franklin Richards** (FF #201–218, Annual #14) — ✅ IN PRINT
- **FF Epic Collection Vol. 11: The Coming of... H.E.R.B.I.E.** (FF #219–231, Annual #15) — varies availability

| 7 | **Fantastic Four by John Byrne Omnibus Vol. 1** | FF #232–262, Annual #17, Thing #2, Avengers #233, Alpha Flight #4 | Byrne | ✅ IN PRINT | 🔴 ESSENTIAL | Byrne's legendary run begins. Considered the best FF run after Lee/Kirby. She-Hulk joins. Trial of Galactus. Terrax saga. Doom restored to power. → Widely considered the best modern jumping-on point for FF |
| 8 | **Fantastic Four by John Byrne Omnibus Vol. 2** | FF #263–295, Annual #18–19, Thing #10, 19, 23, Avengers #263, Alpha Flight #33, X-Factor #1 (partial) | Byrne | ✅ IN PRINT | 🔴 ESSENTIAL | Beyonder arrives (ties to Secret Wars II). She-Hulk era continues. Sue becomes Invisible Woman (not Girl). Reed/Sue leave team. → Leads to: Englehart's FF, then eventually Simonson and DeFalco |

**GAP:** FF #296–346 (Englehart, then Simonson runs)
- **FF Epic Collection: The Dream is Dead** (#296–313) — check availability
- **Fantastic Four by Walter Simonson Omnibus** (FF #337–354, plus New FF issues) — ⚠️ OUT OF PRINT (was in print 2021, check secondary market)

| 9 | **Fantastic Four by Waid & Wieringo Omnibus** | FF (1998) #60–70, #500–524, misc | Waid/Wieringo | ✅ IN PRINT | 🔴 ESSENTIAL | Modern masterpiece. "Unthinkable" = Doom at his most terrifying. "Authoritative Action" = FF take over Latveria. Arguably the best modern FF run alongside Hickman. → Best modern entry point alongside Hickman |
| 10 | **Fantastic Four by Jonathan Hickman Omnibus Vol. 1** | FF (1998) #570–588, plus tie-ins | Hickman/Eaglesham/Epting | ✅ IN PRINT | 🔴 ESSENTIAL | Hickman's grand architecture begins. The Council of Reeds. War of Four Cities. The death of Johnny Storm. Future Foundation formed. This run sets up EVERYTHING for Hickman's Avengers/New Avengers and ultimately Secret Wars (2015). → CRITICAL: Read before Hickman Avengers |
| 11 | **Fantastic Four by Jonathan Hickman Omnibus Vol. 2** | FF (2011) #1–23, FF (1998) #600–611 | Hickman/Various | ✅ IN PRINT | 🔴 ESSENTIAL | Johnny returns. Franklin & Valeria become central. The Celestials, Universal Inhumans, Kang's machinations. Seeds planted for Incursions and Secret Wars. → Leads directly to: Hickman's Avengers/New Avengers |
| 12 | **Fantastic Four by Dan Slott Omnibus Vol. 1** | FF (2018) #1–24, specials | Slott/Pichelli/Various | UPCOMING (June 2026) | 🟡 RECOMMENDED | FF reunites after being absent during Secret Wars aftermath. Ben/Alicia wedding. Griever at the End of All Things. → Bridges gap between Hickman and North |
| 13 | **Fantastic Four by Ryan North** | FF (2022) #1–ongoing, collected in trades | North/Coello/Various | ✅ IN PRINT (trades) | 🔴 ESSENTIAL | Current run, leads directly into One World Under Doom. Tyrannosaurus Doom. Best current FF comic. → Direct setup for OWUD event |
| 14 | **Fantastic Four (2025)** | FF (2025) #1–ongoing | Current creative team | ✅ CURRENT ONGOING | 🟡 RECOMMENDED | Post-One World Under Doom. Current status quo. → Trade Vol. 1 collecting #1-5 solicited |

---

#### SPIDER-MAN — The Street-Level Anchor

| # | Collected Edition | Issues | Creators | Status | Importance |
|---|------------------|--------|----------|--------|------------|
| 1 | **Amazing Spider-Man Omnibus Vol. 1** | AF #15, ASM #1–38, Ann #1–2 | Lee/Ditko | ✅ IN PRINT | 🔴 ESSENTIAL |
| 2 | **Amazing Spider-Man Omnibus Vol. 2** | ASM #39–67, Ann #3–5, Spec #1–2 | Lee/Romita Sr. | ✅ IN PRINT | 🔴 ESSENTIAL |
| 3 | **Amazing Spider-Man Omnibus Vol. 3** | ASM #68–104, Ann #6–8 | Lee/Thomas/Romita/Kane | ✅ IN PRINT | 🟡 RECOMMENDED |
| 4 | **Amazing Spider-Man Omnibus Vol. 4** | ASM #105–142 | Conway/Kane/Andru | ✅ IN PRINT | 🔴 ESSENTIAL |
| 5 | **Amazing Spider-Man Omnibus Vol. 5** | ASM #143–180, Ann #10–12, GS #1–5 | Conway/Wein/Andru | ✅ IN PRINT | 🟡 RECOMMENDED |
| — | *(Continues through Vol. 6–7 covering through ~#250s)* | | | | |
| — | **Spider-Man by Roger Stern Omnibus** | ASM #224–252, Spec, etc. | Stern/Romita Jr. | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Spider-Man by Michelinie & McFarlane Omnibus** | ASM #296–329 | Michelinie/McFarlane | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Spider-Man: Kraven's Last Hunt** | Web #31–32, ASM #293–294, Spec #131–132 | DeMatteis/Zeck | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Spider-Man: Brand New Day Omnibus Vol. 1–3** | ASM #546–647 | Various | ✅ IN PRINT (Vol.1-2), Vol.3 upcoming | 🟡 RECOMMENDED |
| — | **Superior Spider-Man Omnibus** | Superior SM #1–33, Ann, etc. | Slott/Various | ✅ IN PRINT | 🟡 RECOMMENDED |
| — | **Amazing Spider-Man by Nick Spencer Omnibus Vol. 1–2** | ASM (2018) #1–74 | Spencer/Ottley/Various | ✅ IN PRINT | 🟡 RECOMMENDED |
| — | **Amazing Spider-Man by Zeb Wells** | ASM (2022) #1–ongoing, in trades | Wells/Romita Jr. | ✅ IN PRINT (trades) | 🟢 SUPPLEMENTAL |
| — | **ASM (2025) current ongoing** | Eight Deaths arc, current | Various | CURRENT ONGOING | 🟡 RECOMMENDED |

---

#### AVENGERS — Earth's Mightiest Heroes

| # | Collected Edition | Issues | Creators | Status | Importance |
|---|------------------|--------|----------|--------|------------|
| 1 | **Avengers Omnibus Vol. 1** | Avengers #1–30 | Lee/Kirby/Heck | ✅ IN PRINT | 🔴 ESSENTIAL |
| 2 | **Avengers Omnibus Vol. 2** | Avengers #31–58 | Thomas/Buscema/Heck | ✅ IN PRINT | 🟡 RECOMMENDED |
| 3 | **Avengers Omnibus Vol. 3** | Avengers #59–88, Ann | Thomas/Buscema/Sal B | ⚠️ OUT OF PRINT | 🟡 RECOMMENDED |
| 4 | **Avengers/Defenders War** | Avengers #115–118, Defenders #8–11 | Englehart/Brown | ✅ IN PRINT (Epic) | 🟡 RECOMMENDED |
| 5 | **Avengers: The Korvac Saga** | Avengers #167–177 | Shooter/Perez | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Avengers: Under Siege** | Avengers #264–277 | Stern/Buscema | ✅ IN PRINT (Epic) | 🔴 ESSENTIAL |
| — | **Avengers by Busiek & Perez Omnibus Vol. 1–2** | Avengers (1998) #1–56+ | Busiek/Perez | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Avengers by Geoff Johns Omnibus** | Avengers (1998) #57–84, Vision #1–4 | Johns/Coipel | ✅ IN PRINT | 🟡 RECOMMENDED |
| — | **New Avengers Omnibus Vol. 1–2** | New Avengers #1–64, Ann, Illuminati | Bendis/Various | ✅ IN PRINT (2025 ed) | 🔴 ESSENTIAL |
| — | **Avengers by Hickman Omnibus Vol. 1–2** | Avengers (2012) #1–44, New Avengers #1–33 | Hickman/Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Avengers by Jason Aaron Omnibus Vol. 1–3** | Avengers (2018) #1–66 | Aaron/McGuinness/Various | ✅ IN PRINT | 🟢 SUPPLEMENTAL |
| — | **Avengers (2023/current)** | Current ongoing by Jed MacKay | MacKay/Immonen | ✅ IN PRINT (trades) | 🟡 RECOMMENDED |

---

#### X-MEN — The Mutant Saga

| # | Collected Edition | Issues | Creators | Status | Importance |
|---|------------------|--------|----------|--------|------------|
| 1 | **Uncanny X-Men Omnibus Vol. 1** | X-Men #1–31 | Lee/Kirby, then Thomas | ✅ IN PRINT | 🟡 RECOMMENDED |
| 2 | **Uncanny X-Men Omnibus Vol. 1 (Claremont)** | GS X-Men #1, UXM #94–131 | Claremont/Cockrum/Byrne | ✅ IN PRINT | 🔴 ESSENTIAL |
| 3 | **Uncanny X-Men Omnibus Vol. 2** | UXM #132–153, Ann #3–5 | Claremont/Byrne/Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| 4 | **Uncanny X-Men Omnibus Vol. 3** | UXM #154–175+, Ann #6 | Claremont/Cockrum/Smith | ✅ IN PRINT | 🔴 ESSENTIAL |
| 5 | **Uncanny X-Men Omnibus Vol. 4** | UXM #176–200+ | Claremont/Romita Jr./Smith | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **X-Men: Mutant Massacre Omnibus** | UXM, XF, NM, Thor, PH crossovers | Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **X-Men: Inferno Omnibus** | UXM, XF, NM + crossovers | Claremont/L.Simonson | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **X-Men: Age of Apocalypse Omnibus** | Complete AoA event | Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **New X-Men by Morrison Omnibus** | NXM #114–154 | Morrison/Quitely/Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **Astonishing X-Men by Whedon Omnibus** | AXM #1–24, Giant-Size #1 | Whedon/Cassaday | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **House of X / Powers of X** | HoX #1–6, PoX #1–6 | Hickman/Larraz/Silva | ✅ IN PRINT | 🔴 ESSENTIAL |
| — | **X-Men: Dawn of X Omnibus Vol. 1–2** | Multiple Krakoa launch titles | Various | ✅ IN PRINT | 🟡 RECOMMENDED |
| — | **X-Men: Fall of X** | Multiple titles | Various | ✅ IN PRINT (trades) | 🟡 RECOMMENDED |
| — | **X-Men (2024/current)** | Post-Krakoa era, current ongoings | Various | CURRENT ONGOING | 🟡 RECOMMENDED |

---

#### COSMIC MARVEL — The Grand Scale

| # | Collected Edition | Issues | Creators | Status | Importance |
|---|------------------|--------|----------|--------|------------|
| 1 | **Silver Surfer Omnibus Vol. 1** | SS (1968) #1–18, FF Ann #5 material | Lee/Buscema | ✅ IN PRINT (2025 ed) | 🔴 ESSENTIAL |
| 2 | **Silver Surfer: Return to the Spaceways Omnibus** | SS (1987) #1–33+, related | Englehart/Rogers then Starlin | ✅ IN PRINT | 🟡 RECOMMENDED |
| 3 | **Warlock by Jim Starlin Omnibus** (aka Complete Collection) | Strange Tales #178–181, Warlock #9–15, Avengers Annual #7, MTIO Annual #2 | Starlin | ✅ IN PRINT | 🔴 ESSENTIAL |
| 4 | **Infinity Gauntlet Omnibus** | Thanos Quest, IG #1–6, tie-ins | Starlin/Perez/Lim | ✅ IN PRINT | 🔴 ESSENTIAL |
| 5 | **Infinity War/Crusade Omnibus** | IW #1–6, IC #1–6, Warlock & Infinity Watch | Starlin/Lim | ⚠️ Check availability | 🟡 RECOMMENDED |
| 6 | **Annihilation Omnibus** | All Annihilation minis + main series | Giffen/Various | ✅ IN PRINT (2025 ed) | 🔴 ESSENTIAL |
| 7 | **Annihilation: Conquest Omnibus** | Full event | DnA/Various | ✅ IN PRINT | 🔴 ESSENTIAL |
| 8 | **Guardians of the Galaxy by DnA Omnibus** | GotG (2008), War/Realm of Kings, Thanos Imperative | DnA/Pelletier | ✅ IN PRINT | 🔴 ESSENTIAL |

---

#### MAJOR EVENTS — Universe-Shaking Crossovers

| Event | Year | Core Issues | Collected In | Status | Importance | Key Impact |
|-------|------|-------------|-------------|--------|------------|------------|
| **Secret Wars (1984)** | 1984 | SW #1–12 | Omnibus (includes SW II) | ✅ IN PRINT | 🔴 ESSENTIAL | Beyonder, Symbiote origin, Doom as God |
| **Infinity Gauntlet** | 1991 | IG #1–6 | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Thanos kills half the universe |
| **Age of Apocalypse** | 1995 | Multiple series | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Alternate X-timeline |
| **Onslaught** | 1996 | Multiple series | Omnibus | ✅ IN PRINT | 🟡 RECOMMENDED | Heroes "die," go to pocket universe |
| **House of M** | 2005 | HoM #1–8 | Trade | ✅ IN PRINT | 🔴 ESSENTIAL | "No More Mutants" — mutant decimation |
| **Civil War** | 2006 | CW #1–7 | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Hero registration, heroes vs heroes |
| **Secret Invasion** | 2008 | SI #1–8 | Included in NA Omni Vol.2 | ✅ IN PRINT | 🟡 RECOMMENDED | Skrull infiltration revealed |
| **Siege** | 2010 | Siege #1–4 | Trade | ✅ IN PRINT | 🟡 RECOMMENDED | End of Dark Reign, Heroic Age begins |
| **Avengers vs. X-Men** | 2012 | AvX #1–12 | Omnibus | ⚠️ OUT OF PRINT | 🟡 RECOMMENDED | Phoenix Force returns, Cyclops kills Xavier |
| **Infinity (Hickman)** | 2013 | Infinity #1–6 + Avengers/NA tie-ins | Included in Hickman Avengers Omni | ✅ IN PRINT | 🔴 ESSENTIAL | Builders War, Thanos invades Earth |
| **Secret Wars (2015)** | 2015 | SW #1–9 | Omnibus (+ Battleworld Omnis) | ✅ IN PRINT | 🔴 ESSENTIAL | Multiverse dies, Doom becomes God. **Continuity reset point.** |
| **Secret Empire** | 2017 | SE #0–10 | Omnibus | ⚠️ OUT OF PRINT | 🟢 SUPPLEMENTAL | Hydra Cap, controversial |
| **War of the Realms** | 2019 | WotR #1–6 | Omnibus | ✅ IN PRINT | 🟡 RECOMMENDED | Malekith invades Midgard |
| **Blood Hunt** | 2024 | BH #1–5 | Trade | ✅ IN PRINT | 🟡 RECOMMENDED | Blade turns villain, vampires attack. **Doom becomes Sorcerer Supreme** |
| **One World Under Doom** | 2025 | OWUD #1–9 | Trade (collecting now) | ✅ IN PRINT | 🔴 ESSENTIAL | Doom rules the world. Current event. Leads to Armageddon |
| **Armageddon** | 2026 | Upcoming | TBD | UPCOMING | TBD | Next major event, announced by Chip Zdarsky |

---

#### ADDITIONAL KEY RUNS (Collected Edition Priorities)

| Title | Collected Edition | Status | Importance | Why It Matters |
|-------|------------------|--------|------------|----------------|
| **Thor by Walt Simonson** | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Definitive Thor. Beta Ray Bill. Surtur Saga. |
| **Daredevil by Frank Miller** | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Reinvented DD. Elektra. Kingpin. Born Again. |
| **Daredevil by Bendis & Maleev** | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Unmasked as DD. Street-level masterpiece. |
| **Captain America by Brubaker** | Omnibus Vol.1-3 | ✅ IN PRINT | 🔴 ESSENTIAL | Winter Soldier. Death of Cap. Definitive modern Cap. |
| **Iron Man by Michelinie** | Omnibus | ✅ IN PRINT | 🟡 RECOMMENDED | Armor Wars. Demon in a Bottle. |
| **Invincible Iron Man by Fraction** | Omnibus | ✅ IN PRINT | 🟡 RECOMMENDED | Modern definitive Iron Man. |
| **Immortal Hulk** | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Al Ewing's horror masterpiece. Best Hulk ever. |
| **Doctor Strange by Lee/Ditko** | Omnibus | ✅ IN PRINT | 🟡 RECOMMENDED | Origin of the Sorcerer Supreme. Dormammu. Eternity. |
| **Punisher MAX by Ennis** | Omnibus Vol.1-2 | ✅ IN PRINT | 🔴 ESSENTIAL | Definitive mature Punisher. Not 616 continuity. |
| **Black Panther by Priest** | Omnibus | ✅ IN PRINT | 🔴 ESSENTIAL | Definitive BP. Introduced Everett K. Ross. |
| **Moon Knight by Lemire** | Trade | ✅ IN PRINT | 🔴 ESSENTIAL | Best Moon Knight run. |
| **Marvels** | Trade | ✅ IN PRINT | 🔴 ESSENTIAL | Kurt Busiek/Alex Ross. Marvel history through a photographer's eyes. |

---

## 6. TECHNICAL ARCHITECTURE DECISIONS

### 6.1 The Big Decision: Monolith vs. Separated Services

Given the nature of this project, I recommend a **separated architecture**:

```
┌──────────────────────────────────────────────────┐
│                    FRONTEND                       │
│  React/Next.js SPA with Interactive Graph UI      │
│  - Interactive timeline visualization             │
│  - Filterable reading path builder                │
│  - Search with autocomplete                       │
│  - Book detail pages with "read next" mapping     │
│  - Embedded YouTube/resource links                │
│  - Mobile-responsive (PWA for future mobile app)  │
└───────────────────┬──────────────────────────────┘
                    │ REST/GraphQL API
┌───────────────────▼──────────────────────────────┐
│                    BACKEND                        │
│  Go (Gin/Echo) API Server                         │
│  - Reading path computation (graph traversal)     │
│  - Search indexing (Meilisearch or built-in)      │
│  - Availability checker (periodic scraping)       │
│  - User preferences & saved paths                 │
│  - Admin panel for data entry/updates             │
└───────────────────┬──────────────────────────────┘
                    │
┌───────────────────▼──────────────────────────────┐
│                   DATABASE                        │
│  PostgreSQL + Graph extension (Apache AGE or      │
│  separate Neo4j for graph queries)                │
│  - Relational: Issues, Editions, Creators, etc.   │
│  - Graph: Connections, Reading Paths, Continuity  │
│  - Full-text search: Synopsis, notes              │
└──────────────────────────────────────────────────┘
```

### 6.2 Why This Split?

| Concern | Decision | Reasoning |
|---------|----------|-----------|
| **Frontend framework** | Next.js (React) | SSR for SEO (people search for reading orders), React ecosystem for interactive graphs |
| **Backend language** | Go | Daniel's expertise. Perfect for API serving and graph computation. |
| **Database** | PostgreSQL + Neo4j | Relational for structured data, graph DB for the connection/reading-path engine |
| **Graph visualization** | D3.js or Cytoscape.js | Interactive node-link diagrams for continuity mapping |
| **Timeline UI** | Custom React component | Horizontal scrollable timeline with zoom levels |
| **Search** | Meilisearch or PostgreSQL FTS | Fast, typo-tolerant search across all entities |
| **Mobile strategy** | PWA first, then React Native later | Reuse frontend components, add offline reading lists |
| **Content management** | Admin panel (self-built in Go) | Need custom UI for entering continuity data with confidence scores |
| **Hosting** | Vercel (frontend) + VPS/Railway (backend + DBs) | Cost-effective, scalable |

### 6.3 Alternative: Start Simpler

If the full stack is too much for Phase 1, we could start with:

**Option A: Static Site + JSON Data**
- Next.js static generation
- All data in JSON/YAML files (version controlled)
- No backend needed initially
- Upgrade to API + DB when data gets large

**Option B: Single-Page React App with Supabase**
- React frontend
- Supabase for DB (PostgreSQL) + Auth + API
- No custom backend needed initially
- Graph queries via PostgreSQL recursive CTEs

### 6.4 Key Technical Features

1. **Interactive Graph Visualization**
   - Pan/zoom timeline
   - Click any node to see connections
   - Filter by: era, character, team, creator, importance level
   - Toggle between: publication order, chronological order, recommended order

2. **"What's Next?" Engine**
   - Select any collected edition
   - Algorithm computes: immediate sequel, branching paths, recommended jump-ahead
   - Shows confidence scores for suggested reading order
   - Accounts for format: "If you have the Omnibus, skip these trades"

3. **Continuity Conflict Viewer**
   - When conflicts exist, show three panels:
     - 🏛️ Official Marvel stance (citing handbook entries, editorial statements)
     - 👥 Fan-accepted interpretation (citing community consensus)
     - 📝 Editorial retcon explanation (citing behind-the-scenes context)

4. **Collection Tracker**
   - Mark what you own
   - See gaps in your collection
   - Get recommendations for what to buy next
   - Price tracking / in-stock alerts (future feature)

5. **Embedded Media**
   - YouTube video essays linked per era/event (e.g., Comics Explained, NerdSync)
   - Cover art galleries
   - Creator interview links
   - Podcast episode links (e.g., Jay & Miles X-Plain the X-Men)

---

## 7. DELIVERABLES & PHASES

### Phase 0: Planning & Content (THIS DOCUMENT + Data Entry) — Week 1-2
- [x] Master project plan (this document)
- [ ] Finalize architecture decisions (need Daniel's input)
- [ ] Begin data entry: Core FF timeline with full metadata
- [ ] Create PDF reference guide (static version of the chronology)

### Phase 1: Static Reference (PDF + Interactive Web Page) — Week 3-4
- [ ] Comprehensive PDF: "The Marvel Cartographer's Guide" 
  - Complete era-by-era mapping
  - Every collected edition with status, authors, availability
  - Reading path recommendations
  - Continuity conflict notes
- [ ] Single-page interactive React app (artifact-style)
  - Filterable timeline
  - Click-to-expand reading paths
  - Basic "what's next" from static data

### Phase 2: Full Web Application — Month 2-3
- [ ] Go backend API
- [ ] PostgreSQL database with seed data
- [ ] Neo4j graph database for connections
- [ ] React/Next.js frontend with:
  - Timeline visualization
  - Reading path builder
  - Edition detail pages
  - Search
  - Continuity conflict viewer
  
### Phase 3: Community & Mobile — Month 4+
- [ ] User accounts & collection tracking
- [ ] Community contributions (suggest corrections, add confidence votes)
- [ ] PWA for mobile
- [ ] Price/availability tracking
- [ ] React Native mobile app

---

## 8. OPEN QUESTIONS FOR DANIEL

Before we start building, I need your input on several decisions:

### Architecture
1. **Go backend vs. Supabase?** Given you work three jobs, the pragmatic choice might be Supabase (less code to maintain) vs. custom Go backend (more control, your wheelhouse). What's your preference?

2. **Graph DB: Neo4j vs. PostgreSQL with Apache AGE extension vs. just recursive CTEs?** Neo4j is purpose-built for this but adds infra complexity. PostgreSQL can handle it with CTEs for our scale.

3. **Start with static JSON or database from day one?** If we start with JSON files, we can iterate on the data model faster without migrations. But it won't scale past ~10,000 entries.

### Content Scope
4. **How deep do we go on non-FF/Avengers/X-Men/Spider-Man titles?** Do we map every Doctor Strange issue, or focus on "where it intersects the main continuity"?

5. **Ultimate Universe and alternate realities — include or exclude from the main map?** Ultimate Spider-Man, Ultimates, etc. are their own continuity but influence 616 (Miles Morales). The new Ultimate Universe (2024) is also a thing now.

6. **How much editorial/behind-the-scenes context?** Do we want "Jim Shooter fired the writer which is why this arc ended abruptly" level detail?

### Visual/UX
7. **Design aesthetic preference?** Options:
   - A) Clean/modern dashboard (think Notion-like)
   - B) Comic book aesthetic (halftone dots, bold colors, speech bubbles)
   - C) Dark mode editorial (like Comic Book Herald's design)
   - D) Something else?

8. **Primary use case priority:** Are you building this for:
   - A) Personal reference (optimize for YOUR reading journey)
   - B) Community resource (optimize for discoverability and sharing)
   - C) Both but start with personal?

### Practical
9. **Timeline for Phase 1?** Should I start with the PDF immediately, or do you want to refine the plan further?

10. **Content sourcing:** I have strong knowledge through May 2025. For the most current ongoings (late 2025 / early 2026), should I web-search for each entry, or do you want to fill in recent gaps yourself?

---

## APPENDIX A: RECOMMENDED YOUTUBE RESOURCES TO EMBED

| Channel | Focus | Best For |
|---------|-------|----------|
| **Comics Explained** | Deep-dive storyline explanations | Event summaries, character histories |
| **NerdSync** | Cultural/historical analysis | Understanding WHY stories matter |
| **ComicPOP** | Back Issues reviews | Individual issue analysis |
| **Jay & Miles X-Plain the X-Men** (podcast) | X-Men deep dive | Episode-by-episode X-Men coverage |
| **Near Mint Condition** | Collected edition market analysis | What's in print, what to buy |
| **Comic Tom** | Market/collecting advice | Price tracking, investment |
| **GemMintCollectibles** | Omnibus reviews | Physical quality of editions |
| **Omar's show** (Near Mint Condition) | Omnibus unboxing/reviews | Visual look at editions |

## APPENDIX B: KEY RETAILER LINKS FOR AVAILABILITY

| Retailer | URL | Notes |
|----------|-----|-------|
| **InStockTrades (IST)** | instocktrades.com | Best discount prices for in-print books |
| **Discount Comic Book Service (DCBS)** | dcbservice.com | Pre-order discounts (best for upcoming) |
| **Cheap Graphic Novels (CGN)** | cheapgraphicnovels.com | Good prices, reliable |
| **Amazon** | amazon.com | Widest availability, variable pricing |
| **Organic Priced Books** | organicpricedbooks.com | UK-based, good international shipping |
| **Tales of Wonder** | talesofwonder.com | Occasional deep discounts |
| **eBay** | ebay.com | Only option for many OOP books |
| **Marvel Unlimited** | marvel.com/unlimited | Digital: ~$10/month, 6-month delay on new issues |
| **Comixology/Amazon Kindle** | amazon.com/kindle | Digital purchases, permanent access |
| **Hoopla/Libby** | Check local library | Free with library card, variable selection |

## APPENDIX C: CONTINUITY CONFLICT EXAMPLES (Data Model Test Cases)

### Conflict #1: When Did the Fantastic Four Form?
```
OFFICIAL: ~13 years before current stories (sliding timescale)
FAN_ACCEPTED: Most readers treat it as "the early days," not pinned to a date
EDITORIAL_RETCON: Originally 1961, but Marvel's official position since the 
  1970s has been a sliding timescale where the Marvel Age began "about 10-15 
  years ago" relative to current publication. Mark Waid's FF #60 (2002) 
  explicitly addressed this.
CONFIDENCE: 90% (well-established policy, minor disagreements on exact years)
SOURCES: FF #1 (1961), FF (1998) #60, Official Handbook of the Marvel Universe
```

### Conflict #2: Did Spider-Man's Marriage to MJ Really Happen?
```
OFFICIAL: The marriage was erased by Mephisto in One More Day (ASM #545, 2007).
  In current 616 continuity, Peter and MJ were never married.
FAN_ACCEPTED: Most fans consider the marriage "real" and One More Day a poorly 
  received editorial mandate. The marriage existed from ASM Annual #21 (1987) 
  to ASM #545 (2007). Recent stories by Zeb Wells have partially re-addressed 
  the Peter/MJ relationship.
EDITORIAL_RETCON: Joe Quesada (then EIC) felt a married Spider-Man limited 
  storytelling. Mephisto deal serves as in-universe mechanism for editorial desire. 
  Nick Spencer's run hinted at undoing this but ultimately didn't.
CONFIDENCE: 95% (very well documented, just controversial)
SOURCES: ASM Annual #21, ASM #544-545, interviews with Quesada (2007), 
  ASM (2018) #1, ASM (2022) #1
```

### Conflict #3: What Universe Are We In After Secret Wars (2015)?
```
OFFICIAL: Earth-616 survived the Incursions and was rebuilt by Reed Richards 
  using the power of the Beyonders. It is the "same" 616, not a new universe.
FAN_ACCEPTED: Functionally a soft reboot. Some Ultimate elements (Miles Morales, 
  the Maker) were folded in. Most 616 history still "happened" but some details 
  are intentionally vague.
EDITORIAL_RETCON: Secret Wars served as Marvel's version of DC's Crisis — a way 
  to relaunch all titles with new #1s without technically rebooting. 
  Hickman's intent was to tell a complete story, not reboot continuity.
CONFIDENCE: 80% (general agreement but some ambiguity on specific details)
SOURCES: Secret Wars #1-9 (2015), All-New All-Different Marvel Point One, 
  Hickman interviews (2015-2016)
```

---

*This document is a living plan. Updated as decisions are made.*

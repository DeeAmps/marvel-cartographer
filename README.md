# The Marvel Cartographer

**Map the Marvel Universe.** A complete chronology engine covering Fantastic Four #1 (1961) through current ongoings (2026) -- 14 eras, 120+ collected editions, and the connections between them.

## What It Does

The Marvel Cartographer treats **collected editions** (omnibuses, trades, Epic Collections) as the primary unit of navigation. Instead of a flat reading list, it builds an interactive graph of how stories connect, branch, and collide across 65 years of Marvel Comics.

## Core Features

### Interactive Timeline
Browse Marvel history across 14 eras, from the Silver Age to the current Doom era. Filter by character family, importance level, or print status. Zoom from decade view down to individual issues.

### "What's Next?" Engine
Click any edition and instantly see a branching map of what to read next. The graph weights connections by strength and confidence, so you always know the most impactful next step -- whether that's a direct sequel, a spin-off, or a crossover tie-in.

### Curated Reading Paths
Pre-built paths for different goals:
- **The Absolute Essentials** -- 29 books covering 60+ years (beginner)
- **The Complete Fantastic Four** -- every major FF run (advanced)
- **Doctor Doom: Villain to God** -- one character's full arc across decades
- **Cosmic Marvel** -- Galactus through the multiverse

Each path shows estimated issue count, cost, and lets you toggle between "essentials only" and "completionist."

### Continuity Conflict Viewer
Marvel's history contradicts itself. Instead of hiding that, every known conflict shows three perspectives side-by-side:
- **Official** -- Marvel's stated position with citations
- **Fan Accepted** -- community consensus
- **Editorial** -- behind-the-scenes context

Each conflict has a confidence score (0-100%) so you know how settled the debate is.

### Purchase Planner
Select a reading path and get a full purchase breakdown:
- Which editions are in print vs. out of print
- Cheapest retailer per book (IST, DCBS, Amazon, etc.)
- Total cost optimized across retailers
- Estimated reprint dates for OOP books
- Digital alternatives (Marvel Unlimited, Comixology)

### Issue Overlap Detector
Omnibus collectors constantly buy books with overlapping content. Select any set of editions and see exactly which issues overlap, displayed as a Venn diagram. Avoid paying twice for the same stories.

### Creator Saga Threading
Follow a creator's connected Marvel saga as a graph -- not just "all books by Hickman" but the actual narrative thread: FF -> Avengers -> Secret Wars -> X-Men, in the order the story connects. Pre-built sagas for Hickman, Claremont, Starlin, Byrne, and Bendis.

### Print Status Tracking
Track when editions go in and out of print over time. Set reprint alerts to get notified when an out-of-print omnibus gets a new printing.

## Search

Full-text search across titles, creators, characters, issue numbers, and story synopses. Search "Galactus" and find every edition where he appears, from his debut in FF #48 to his role in Hickman's Avengers.

## Coverage

| Stat | Count |
|------|-------|
| Eras | 14 (1961-2026) |
| Collected Editions | 120+ |
| Story Arcs | 50+ |
| Crossover Events | 30+ |
| Continuity Conflicts | 5 documented with citations |
| Reading Paths | 4 curated + custom builder |
| Creators Profiled | 40+ |
| Characters Tracked | 100+ |

## Design

Dark mode editorial aesthetic. High contrast text on near-black backgrounds, color-coded badges for print status and importance level, and a typography system built for scanning dense comics metadata.

## Tech Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS, D3.js
- **Backend:** Go (graph computation), Supabase (data, auth, API)
- **Database:** PostgreSQL with recursive CTEs for graph traversal
- **Hosting:** Vercel (frontend) + Railway (Go service) + Supabase (managed DB)

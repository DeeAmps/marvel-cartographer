# The Marvel Cartographer Handbook System — Implementation Plan

## Context

The Marvel Cartographer is a comprehensive Marvel Comics chronology app with 120+ collected editions, 100+ characters, 500+ connections, and 14 eras. The user wants to add a **Handbook** layer — a structured continuity intelligence system inspired by *The Official Handbook of the Marvel Universe*. This is NOT a wiki or reading guide; it's a reference layer that explains *who, what, and why* at any point in Marvel history, with era-aware state tracking, retcon histories, and deep integration into every existing surface.

The existing app has a mature codebase: 19 JSON seed files, 6 SQL migrations, a Go graph service with 9 API endpoints, and a Next.js frontend with 20+ pages and 40+ components. All data is currently read from JSON files via `data.ts` using a `readJson` + in-memory cache pattern.

---

## Architecture Decision: Single Polymorphic Table

**One `handbook_entries` table** with a JSONB `data` column for type-specific fields.

6 entity types (character, team, location, artifact, species, editorial_concept) share 90% of their schema (`core_concept`, `status_by_era`, `retcon_history`, `canon_confidence`, related slugs). Only a few fields differ (power_grid for characters, roster for teams, possession_history for artifacts). A polymorphic approach avoids 12+ tables and duplicated code across the entire stack.

This mirrors the existing `connections` table pattern which uses `source_type`/`target_type` for polymorphism.

---

## Phase 1: Foundation (Seed Data + Types + Browser + Detail Page)

### 1a. Create `data/handbook_entries.json`

~40-50 initial entries covering the most impactful entities:

| Type | Count | Examples |
|------|-------|---------|
| character | 15-18 | Doctor Doom, Thanos, Jean Grey, Wolverine, Reed Richards, Magneto, Captain America, Spider-Man, Thor, Iron Man, Hulk, Adam Warlock, Doctor Strange, Storm, Black Panther |
| team | 5-6 | Fantastic Four, Avengers, X-Men, Illuminati, Guardians of the Galaxy, Krakoan Quiet Council |
| artifact | 5-6 | Infinity Gauntlet, Mjolnir, Cosmic Cube, Darkhold, Ultimate Nullifier, Phoenix Force |
| location | 4-5 | Krakoa, Latveria, Negative Zone, Asgard, Savage Land |
| species | 3-4 | Kree, Skrulls, Celestials, Eternals |
| editorial_concept | 4-5 | Sliding Timescale, Mutant Resurrection Protocols, The Multiverse, Retcon, The Snap |

Each entry structure:
```json
{
  "slug": "string",
  "entry_type": "character|team|location|artifact|species|editorial_concept",
  "name": "string",
  "core_concept": "One sentence — for tooltips and panels",
  "canon_confidence": 0-100,
  "description": "Full reference text",
  "tags": ["cosmic", "x-men", ...],
  "source_citations": ["FF #5 (1962)", ...],
  "related_edition_slugs": ["ff-omnibus-v1", ...],
  "related_event_slugs": ["secret-wars-2015", ...],
  "related_conflict_slugs": ["sliding-timescale", ...],
  "related_handbook_slugs": ["doom-armor", ...],
  "status_by_era": [
    { "era_slug": "birth-of-marvel", "status": "Active description", "note": "Context", "citation": "FF #5" }
  ],
  "retcon_history": [
    { "year": 1991, "description": "What changed", "source": "Issue ref", "old_state": "Before", "new_state": "After" }
  ],
  "data": { /* type-specific — see below */ }
}
```

**Type-specific `data` shapes:**
- **character**: `{ power_grid: {intelligence,strength,speed,durability,energy_projection,fighting_skills}, abilities: [], affiliations: [{team_slug, era_slugs}], identity_changes: [{era_slug, identity, citation}] }`
- **team**: `{ roster_by_era: [{era_slug, members: [], note}], founding_event, headquarters: [] }`
- **location**: `{ location_type, significance_by_era: [{era_slug, significance, citation}], notable_residents: [] }`
- **artifact**: `{ artifact_type, possession_history: [{holder_slug, era_slug, how_obtained, citation}], power_description }`
- **species**: `{ species_type, homeworld, notable_members: [], canon_evolution: [{era_slug, change, citation}] }`
- **editorial_concept**: `{ concept_type, applies_to: [], examples: [{description, citation}] }`

### 1b. Add TypeScript types to `web/src/lib/types.ts`

Append ~80 lines:
- `HandbookEntryType` union type
- `HandbookStatusByEra` interface
- `HandbookRetconEvent` interface
- `PowerGrid` interface (6 axes, 1-7 scale)
- Type-specific data interfaces: `CharacterHandbookData`, `TeamHandbookData`, `LocationHandbookData`, `ArtifactHandbookData`, `SpeciesHandbookData`, `EditorialConceptData`
- `HandbookData` union type
- `HandbookEntry` main interface

### 1c. Add data access functions to `web/src/lib/data.ts`

Follow existing pattern (readJson + RawType → mapped output):
- `getHandbookEntries(): Promise<HandbookEntry[]>`
- `getHandbookEntryBySlug(slug): Promise<HandbookEntry | undefined>`
- `getHandbookEntriesByType(type): Promise<HandbookEntry[]>`
- `getHandbookEntriesForEdition(editionSlug): Promise<HandbookEntry[]>` — filters by `related_edition_slugs`
- `getHandbookEntriesForEra(eraSlug): Promise<HandbookEntry[]>` — filters by `status_by_era`
- `getHandbookEntriesForEvent(eventSlug): Promise<HandbookEntry[]>` — filters by `related_event_slugs`

### 1d. Build core components

| Component | Path | Purpose |
|-----------|------|---------|
| `HandbookEntryCard` | `web/src/components/handbook/HandbookEntryCard.tsx` | Compact card: type icon, name, core_concept (truncated), confidence score, tag chips. Links to `/handbook/[slug]` |
| `HandbookTypeBadge` | `web/src/components/handbook/HandbookTypeBadge.tsx` | Colored pill: character=red, team=blue, location=green, artifact=gold, species=purple, editorial=muted gray |

### 1e. Build `/handbook` browser page

`web/src/app/handbook/page.tsx`
- Filter tabs: All | Characters | Teams | Locations | Artifacts | Species | Concepts
- Search input filtering by name/tags/core_concept
- Responsive grid of `HandbookEntryCard` components
- Sort by name, confidence, type
- Uses `getHandbookEntries()` + `getEras()` (for era name resolution in cards)

### 1f. Build `/handbook/[slug]` detail page

`web/src/app/handbook/[slug]/page.tsx`
- Header: name, `HandbookTypeBadge`, `ConfidenceScore` (reuse existing component)
- Core Concept: large prominent text in accent color
- Description: full reference text
- Status by Era: styled list/table of era status entries with era color dots and citations in monospace
- Retcon History: vertical timeline of old_state → new_state transitions (if any)
- Type-Specific Section: render based on `entry_type` (power grid table, roster list, possession list, etc.) — simple table/list formats initially, visualizations in Phase 2
- Related Editions: grid of edition links (reuse existing card pattern from edition detail page)
- Related Events: link list to `/event/[slug]`
- Related Conflicts: link list to `/conflicts` with anchor
- Related Handbook Entries: link chips to other `/handbook/[slug]` pages
- Source Citations: monospace list

### 1g. Add "Handbook" to Header navigation

Modify `web/src/components/layout/Header.tsx`:
- Add `{ href: "/handbook", label: "Handbook", icon: BookMarked }` to `navLinks` array (after "Conflicts", before "Collection")
- Import `BookMarked` from lucide-react

---

## Phase 2: Visual Intelligence (Type-Specific Visualizations)

### 2a. Status Timeline component

`web/src/components/handbook/StatusTimeline.tsx`
- Horizontal timeline with era dots color-coded from `era.color`
- Each dot shows status text on hover/click
- Citation displayed in monospace below
- Connects dots with lines showing continuity
- Uses existing CSS variable system for colors

### 2b. Power Grid Radar component

`web/src/components/handbook/PowerGridRadar.tsx`
- SVG radar/spider chart for 6-axis power grid (intelligence, strength, speed, durability, energy_projection, fighting_skills)
- Scale 1-7 matching Official Handbook convention
- Styled with `--accent-red` fill, `--bg-tertiary` grid lines
- Character entries only

### 2c. Possession Timeline component

`web/src/components/handbook/PossessionTimeline.tsx`
- Vertical timeline: each entry shows holder name, era, how_obtained, citation
- Holder names link to their handbook entry if one exists
- Artifact entries only

### 2d. Roster Table component

`web/src/components/handbook/RosterTable.tsx`
- Era-by-era roster display: era name header, member list below
- Members link to character handbook entries or character pages
- Team entries only

### 2e. Retcon Timeline component

`web/src/components/handbook/RetconTimeline.tsx`
- Vertical timeline: year marker, old_state → new_state with visual arrow
- Source citation in monospace
- For any entry with `retcon_history.length > 0`

### 2f. Enhance detail page with visualizations

Update `/handbook/[slug]/page.tsx` to render type-specific visualization components instead of plain lists.

---

## Phase 3: Deep Integration (Overlays into Existing Pages)

### 3a. Edition Detail integration

Modify `web/src/app/edition/[slug]/page.tsx`:
- Add `getHandbookEntriesForEdition(slug)` to data fetching
- Add new "Continuity Intelligence" section between "Character Appearances" and "Story Arcs"
- Shows `HandbookEntryCard` components for related handbook entries
- Header: "Key Concepts in This Volume" with BookMarked icon

### 3b. Character Detail integration

Modify `web/src/app/character/[slug]/page.tsx`:
- Check if a matching handbook entry exists (match by slug or name)
- If found, show: power grid visualization, status timeline, retcon history, affiliations
- Adds depth without replacing the existing reading-order-focused page

### 3c. Timeline overlay

Modify `web/src/app/timeline/page.tsx`:
- Add optional "Handbook Overlay" toggle
- When enabled, show `status_by_era` annotations as small badges below era sections
- Filter by entity type (show character changes, artifact changes, etc.)

### 3d. Conflicts page integration

Modify `web/src/app/conflicts/page.tsx`:
- For each conflict, check `related_conflict_slugs` on handbook entries
- Show "Related Handbook Entries" section linking to relevant entries

### 3e. Search integration

Modify search functions in `data.ts`:
- Add `searchHandbook(query)` function
- Modify search results page to include handbook results in a separate section

### 3f. Handbook Tooltip component

`web/src/components/handbook/HandbookTooltip.tsx`
- Inline tooltip for handbook terms in edition synopses
- Shows `core_concept` on hover, confidence, link to full entry
- Can be progressively adopted across text-heavy pages

---

## Phase 4: Database + Go API (When Moving Beyond JSON)

### 4a. SQL migration `007_create_handbook_tables.sql`

```sql
CREATE TYPE handbook_entry_type AS ENUM (
  'character','team','location','artifact','species','editorial_concept'
);

CREATE TABLE handbook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  entry_type handbook_entry_type NOT NULL,
  name TEXT NOT NULL,
  core_concept TEXT NOT NULL,
  canon_confidence INTEGER CHECK (canon_confidence BETWEEN 0 AND 100),
  status_by_era JSONB DEFAULT '[]',
  retcon_history JSONB DEFAULT '[]',
  data JSONB DEFAULT '{}',
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  source_citations TEXT[] DEFAULT '{}',
  related_edition_slugs TEXT[] DEFAULT '{}',
  related_event_slugs TEXT[] DEFAULT '{}',
  related_conflict_slugs TEXT[] DEFAULT '{}',
  related_handbook_slugs TEXT[] DEFAULT '{}',
  search_text TSVECTOR,
  metron_id INTEGER,
  comicvine_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
-- + indexes, search trigger, junction tables
```

### 4b. Go structs in `go-graph-service/internal/graph/models.go`

Add `HandbookEntry` struct with `json.RawMessage` for the `data` field.

### 4c. Go API endpoints in `routes.go` + `handler.go`

```
GET /api/v1/handbook                     — List/filter entries
GET /api/v1/handbook/:slug               — Single entry
GET /api/v1/handbook/search              — Full-text search
GET /api/v1/handbook/for-edition/:slug   — Entries related to an edition
GET /api/v1/handbook/era-overlay/:slug   — Status changes for timeline overlay
```

---

## Files to Create (All Phases)

| # | File | Phase |
|---|------|-------|
| 1 | `data/handbook_entries.json` | 1 |
| 2 | `web/src/app/handbook/page.tsx` | 1 |
| 3 | `web/src/app/handbook/[slug]/page.tsx` | 1 |
| 4 | `web/src/components/handbook/HandbookEntryCard.tsx` | 1 |
| 5 | `web/src/components/handbook/HandbookTypeBadge.tsx` | 1 |
| 6 | `web/src/components/handbook/StatusTimeline.tsx` | 2 |
| 7 | `web/src/components/handbook/PowerGridRadar.tsx` | 2 |
| 8 | `web/src/components/handbook/PossessionTimeline.tsx` | 2 |
| 9 | `web/src/components/handbook/RosterTable.tsx` | 2 |
| 10 | `web/src/components/handbook/RetconTimeline.tsx` | 2 |
| 11 | `web/src/components/handbook/HandbookTooltip.tsx` | 3 |
| 12 | `web/src/components/handbook/HandbookIntelligenceSection.tsx` | 3 |
| 13 | `supabase/migrations/007_create_handbook_tables.sql` | 4 |

## Files to Modify

| File | Change | Phase |
|------|--------|-------|
| `web/src/lib/types.ts` | Add ~80 lines of Handbook types | 1 |
| `web/src/lib/data.ts` | Add ~60 lines of Handbook data functions | 1 |
| `web/src/components/layout/Header.tsx` | Add "Handbook" nav link | 1 |
| `web/src/app/page.tsx` | Add Handbook to home page quick links | 1 |
| `web/src/app/edition/[slug]/page.tsx` | Add Handbook Intelligence section | 3 |
| `web/src/app/character/[slug]/page.tsx` | Add handbook data if matching entry | 3 |
| `web/src/app/conflicts/page.tsx` | Add related handbook entry links | 3 |
| `web/src/app/timeline/page.tsx` | Add handbook overlay toggle | 3 |
| `go-graph-service/internal/graph/models.go` | Add HandbookEntry struct | 4 |
| `go-graph-service/internal/api/handler.go` | Add 5 handbook handlers | 4 |
| `go-graph-service/internal/api/routes.go` | Add 5 route registrations | 4 |

## Verification

- Handbook browser at `/handbook` loads and shows all entries with type filter tabs working
- Each entry detail page at `/handbook/[slug]` renders all sections correctly
- Power grid renders for character entries, possession timeline for artifacts, roster for teams
- Status timeline shows era-by-era changes with correct era colors
- Edition detail page shows "Continuity Intelligence" section for editions with related handbook entries
- Character detail page shows handbook data when a matching entry exists
- Header shows "Handbook" link that highlights when on handbook pages
- Search for "Infinity Gauntlet" returns both the edition and the handbook entry
- All pages render correctly at 375px, 768px, 1024px, 1440px breakpoints
- Dark mode styling consistent with existing CSS variable system
- No TypeScript compilation errors after type additions

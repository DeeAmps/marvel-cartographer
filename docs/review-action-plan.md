# Marvel Cartographer - Review Action Plan

## Context

An expert Marvel fan reviewed the application and provided a detailed 536-line assessment covering data accuracy, UX, accessibility, technical bugs, and missing content. The reviewer rated it 8/10 for data quality but 6/10 for user experience, citing three main blockers: beginner accessibility, visual polish, and actionability (no buy links). This plan addresses all 25 prioritized items from the review plus technical bugs from the appendix code review.

---

## Phase 1: Ship-Blocking Bug Fixes
*All items independent — can be done in parallel. Estimated: 1-2 days.*

### 1A. Fix collection page slug-derived titles
- **Files:** `web/src/app/collection/page.tsx`, `web/src/hooks/useCollection.ts`
- **Bug:** Line 132-134 shows "Ff Omnibus V1" instead of real titles
- **Fix:** Create a server component wrapper that loads editions via `getEditions()`, builds a `Record<string, string>` slug-to-title map, passes it to a client `CollectionContent` component. Replace the regex with a map lookup.

### 1B. Fix ReadingOrderList slug-derived titles
- **Files:** `web/src/components/events/ReadingOrderList.tsx`, `web/src/app/event/[slug]/page.tsx`
- **Bug:** Line 175 shows raw slug text for "Collected in:" labels
- **Fix:** Pass `editionTitleMap: Record<string, string>` prop from parent event page (which already has access to editions data).

### 1C. Fix characters page N+1 performance bug
- **File:** `web/src/app/characters/page.tsx`
- **Bug:** Lines 54-59 sequentially call `getEditionsByCharacter()` for each of ~50 characters
- **Fix:** Load editions once at top, build a character-to-edition-count map in a single pass, use for sorting. Reduces ~50 sequential reads to 1 read + in-memory iteration.

### 1D. Fix timeline format/creator filters + debounce
- **Files:** `web/src/app/timeline/page.tsx`, `web/src/components/timeline/TimelineFilters.tsx`
- **Bug:** Format and creator filters push URL params but server-side `FilteredEditions` only reads `importance` and `status`. Creator input fires `router.push()` on every keystroke.
- **Fix:**
  - Read `format` and `creator` from searchParams in `FilteredEditions`, add filtering logic
  - Add 300ms debounce to creator input using local state + `useRef` timer pattern

### 1E. Fix color contrast for WCAG AA
- **File:** `web/src/app/globals.css`
- **Bug:** `--text-tertiary` (#6e7681) on `--bg-secondary` (#161b22) = ~3.5:1 ratio (needs 4.5:1)
- **Fix:** Change `--text-tertiary` to `#8b8b9e` (~4.6:1 ratio). Adjust light mode equivalent if needed.

---

## Phase 2: Accessibility Foundation
*All items independent — can be done in parallel with Phase 1. Estimated: 1-2 days.*

### 2A. Add skip-to-content link
- **File:** `web/src/app/layout.tsx`
- **Fix:** Add visually-hidden skip link as first child of `<body>`, add `id="main-content"` to `<main>`.

### 2B. Header mobile menu ARIA
- **File:** `web/src/components/layout/Header.tsx`
- **Fix:** Add `aria-label`, `aria-expanded`, `aria-controls` to mobile menu button (lines 71-77). Add `id="mobile-nav"` and `role="navigation"` to the nav element.

### 2C. CollectionButton dropdown ARIA
- **File:** `web/src/components/collection/CollectionButton.tsx`
- **Fix:** Add `aria-expanded`, `aria-haspopup="listbox"`, `aria-controls` to toggle button. Add `role="listbox"` to dropdown, `role="option"` to items.

### 2D. FilterDrawer focus trap
- **File:** `web/src/components/ui/FilterDrawer.tsx`
- **Fix:** Add `role="dialog"`, `aria-modal="true"`. Implement focus trap on open (cycle Tab within drawer, Escape to close). Return focus to trigger on close.

### 2E. D3 visualization accessibility
- **File:** `web/src/components/editions/WhatsNextMap.tsx`
- **Fix:** Add `role="img"` and `aria-label` to SVG. Add a `sr-only` div with text summary of connections for screen readers.

---

## Phase 3: Mobile Graph + Inline Styles Migration
*Estimated: 3-4 days.*

### 3A. WhatsNextMap mobile support (HIGH PRIORITY)
- **File:** `web/src/components/editions/WhatsNextMap.tsx`
- **Bug:** Lines 427, 433: `!isMobile` checks hide the graph entirely below 768px
- **Fix:**
  - Remove `!isMobile` guard from the Graph View button
  - Create a simplified mobile tree/list-graph layout: current edition at top, depth-1 connections as cards with colored left-borders and visual arrows
  - Keep the full D3 force graph for desktop (>768px), use the simplified tree for mobile
  - This is the "killer feature" — it must be visible on all devices

### 3B. Inline styles migration to Tailwind utilities (INCREMENTAL)
- **Files:** `web/src/app/globals.css` + all 54 component files
- **Problem:** `style={{}}` used everywhere, preventing CSS `:hover`/`:focus` pseudo-classes
- **Approach (phased, one component per commit):**
  1. Register all CSS custom properties in `@theme inline` block in globals.css (enables `bg-bg-secondary`, `text-text-primary`, etc.)
  2. Migrate interactive components first (buttons, links, inputs) — where hover/focus is broken
  3. Migrate layout components (Header, Footer)
  4. Migrate card components (EditionCard, CharacterCard, etc.)
  5. Migrate page-level styles last
- **Note:** This spans multiple sessions. Each component is an independent atomic change.

---

## Phase 4: Tier 2 Features
*Estimated: 3-4 days. Items 4A-4C are independent.*

### 4A. "Where Do I Start?" wizard
- **New files:** `web/src/app/start/page.tsx`, `web/src/components/wizard/StartWizard.tsx`
- **Approach:** 3-question interactive flow:
  1. "What interests you?" (Cosmic, Street-Level, Mutants, Teams, Everything)
  2. "How deep?" (Quick/5 books, Medium/20, Deep/50+)
  3. "Physical or digital?"
  → Maps to existing reading paths with appropriate filters
- **Link from:** Home page hero section, nav header

### 4B. Retailer/buy links on edition detail — ALREADY DONE
- **File:** `web/src/app/edition/[slug]/page.tsx` (lines 449-581)
- **Status:** A "WHERE TO BUY" section already exists with Amazon/eBay search links, digital retailers, and OOP-aware logic. Reviewer may have missed it. **No work needed.**

### 4C. Explain overlapping eras on timeline
- **Files:** `web/src/app/timeline/page.tsx`, `web/src/components/timeline/EraCard.tsx`
- **Fix:** Add an info callout above the era list: "Some eras overlap because Marvel's narrative movements ran in parallel across different titles." Collapsible note or tooltip on overlapping eras.

### 4D. Implement WhatsNext depth-2/3 visual graph — ALREADY DONE
- **Status:** The ForceGraph in WhatsNextMap.tsx already supports depth 1-3 via slider. `getMultiHopConnections()` BFS in data.ts handles traversal. The issue was only mobile visibility (addressed in 3A).

---

## Phase 5: Data Quality & Content Additions
*All items independent of code — can be done in parallel at any time. Estimated: 2-3 days.*

### 5A. Fix Black Panther citation
- **File:** `data/collected_editions.json`
- Change "BLACK PANTHER first appearance (#52-53)" → "BLACK PANTHER first appearance (#52)" in `ff-omnibus-v2` entry

### 5B. Merge/differentiate duplicate Spider-Man marriage conflicts
- **File:** `data/continuity_conflicts.json`
- Differentiate titles: "Did Peter & MJ Get Married?" vs. "One More Day: The Full Controversy"
- Add `related_conflict_slugs` field to link them

### 5C. Add 13 new continuity conflicts (12 → 25)
- **File:** `data/continuity_conflicts.json`
- New entries: Magneto's Age/Holocaust, Nick Fury's Race Change, The Sentry, Scarlet Witch "No More Mutants" Scope, Krakoan Resurrection Stakes, Franklin Richards Powers, Wolverine's Origins, Phoenix Force vs Jean Grey, Ultimate Universe Merger, Miles Morales in 616, Thor/Jane Foster Timeline, The Beyonder's Nature, Thanos Death Cycle

### 5D. Add missing characters (~20 new, 50 → 70)
- **File:** `data/characters.json`
- Add: Kitty Pryde, Elektra, Nick Fury (both versions), Beast, Gambit, Cable, Bishop, Psylocke, Emma Frost, Namor, Blade, Moon Knight, She-Hulk, Hercules, Sentry, America Chavez, Kate Bishop, The Watcher, Jessica Jones, Luke Cage (verify)

### 5E. Add missing collected editions (~10-15 new)
- **Files:** `data/collected_editions.json`, `data/connections.json`
- Key gaps: Astonishing X-Men by Whedon/Cassaday, Age of Apocalypse Omnibus, Daredevil by Brubaker, Punisher MAX by Ennis, Avengers by Busiek/Perez Vol. 2, New Mutants Omnibus Vol. 2, Kraven's Last Hunt, Avengers Omnibus Vols. 2-4, X-Force/X-Statix
- Each needs: synopsis, connection_notes, creator links, and graph connections

### 5F. Add missing events
- **File:** `data/events.json`
- Add: Onslaught, World War Hulk, Maximum Carnage, Kree-Skrull War

### 5G. Add era overlap notes
- **File:** `data/eras.json`
- Add `overlap_note` field to Bronze Age, Rise of X-Men, Hickman Saga, Bendis Avengers eras explaining intentional overlap

---

## Phase 6: Nice-to-Have Enhancements
*Estimated: 4-6 days. Lower priority, tackle after Phases 1-5.*

### 6A. "What is this?" intro page / format glossary
- **New file:** `web/src/app/about/page.tsx`
- Static page: What is a collected edition? Format glossary (Omnibus, Trade, Epic Collection, etc. with price ranges). How to use the site. What importance/confidence scores mean.

### 6B. Search autocomplete/fuzzy matching
- **Files:** `web/src/components/search/SearchBar.tsx`, new API route `web/src/app/api/search/suggestions/route.ts`
- Debounced input (300ms) → API returns top 8 matches across editions, characters, creators. Simple `includes()` matching with prefix boost. Keyboard navigation (arrows + Enter).

### 6C. Break large reading paths into sub-sections
- **Files:** `data/reading_paths.json` (add `section` field), `data/reading_order_entries.json`, `web/src/app/path/[slug]/page.tsx`
- Group entries by era/section. Render section headers. Collapsible groups on long paths.

### 6D. Add new reading paths
- **File:** `data/reading_paths.json`, `data/reading_order_entries.json`
- "Quick Reads" (under 5 books), "Best of Each Decade", Budget paths ($50/$100/$200), Per-MCU-movie paths

### 6E. Mobile-optimized timeline visualization
- **File:** `web/src/components/timeline/TimelineView.tsx`
- Current D3 timeline compresses to unusable sizes on small screens
- Add horizontal scroll with touch support, or switch to a vertical timeline on mobile

### 6F. Collection export/import
- **File:** `web/src/app/collection/page.tsx`
- Add export to JSON/CSV button, import from file. Mitigates localStorage fragility noted by reviewer.

---

## Verification Plan

After each phase, verify:
- **Phase 1:** Collection page shows real titles. Characters page loads in <2s with popularity sort. Timeline filters actually filter. Color contrast passes WCAG AA checker.
- **Phase 2:** Tab through entire app with keyboard — skip link works, mobile menu announced, dropdowns have proper roles. Run axe-core or Lighthouse accessibility audit.
- **Phase 3:** Open edition detail on 375px mobile — graph visualization is visible and usable. Hover states work via CSS on all migrated components (no JS handlers needed).
- **Phase 4:** Navigate to /start, complete wizard, arrive at a relevant reading path. Overlapping eras have visual explanation.
- **Phase 5:** Spot-check 5 new conflicts, 5 new characters, 5 new editions for data accuracy. Verify connections.json has edges for new editions.
- **Phase 6:** Type partial query in search — suggestions appear. About page renders with glossary.

Run `npm run build` after each phase to catch type errors and build failures.

---

## Summary

| Phase | Items | Est. Time | Can Parallelize? |
|-------|-------|-----------|------------------|
| 1. Bug Fixes | 5 items (1A-1E) | 1-2 days | All parallel |
| 2. Accessibility | 5 items (2A-2E) | 1-2 days | All parallel, parallel with Phase 1 |
| 3. Mobile + Styles | 2 items (3A-3B) | 3-4 days | 3B is incremental/ongoing |
| 4. Tier 2 Features | 2 new items (4A, 4C) | 2-3 days | All parallel |
| 5. Data Quality | 7 items (5A-5G) | 2-3 days | All parallel, any time |
| 6. Enhancements | 6 items (6A-6F) | 4-6 days | Most parallel |

**Total: ~25 actionable items across 6 phases. 2 items already done (4B, 4D). ~13-20 working days.**

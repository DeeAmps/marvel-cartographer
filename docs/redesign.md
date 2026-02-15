# Marvel Cartographer — Complete UI Redesign

**Date:** February 8, 2026
**Trigger:** UI review flagged poor readability, uncatchy theme, weak font choices
**Scope:** Full visual redesign — fonts, colors, typography, layout, navigation, components, pages

---

## Problems Identified

### Fonts
- **Oswald** (headings): Condensed YouTube-thumbnail font. Aggressive, monotonous when everything is uppercase + letter-spaced. Not editorial, not premium.
- **Source Sans 3** (body): Invisible. Zero personality. Perfectly fine but utterly generic.
- **JetBrains Mono at 0.6rem** used everywhere: filter pills, badges, legends, nav labels, footer, timeline axis. At that size it's nearly illegible and makes the UI feel like a terminal.

### Colors
- `#0d1117` / `#161b22` / `#21262d` = GitHub's exact dark mode palette. Every developer recognizes it subconsciously. No Marvel energy.
- Five competing accent colors (red, gold, green, blue, purple) = Christmas tree, not a design system.
- Red accent overloaded — CTAs, badges, nav, hover, logo. Desensitized.

### Typography Hierarchy
- Every heading: uppercase Oswald + tracking-wider. H1-H4 all identical treatment. No rhythm or contrast.
- Body text at 0.875rem with secondary gray on dark backgrounds = hard to read.
- Monospace-everywhere makes the UI feel like a developer tool.

### Layout & Density
- Cards are information-packed but visually flat.
- No breathing room between sections.
- Cover images too small for a comic book site.

### Navigation
- Horizontal scroll tab bar invisible on desktop.
- Mobile bottom bar: 0.6rem monospace labels are hard to read and hit.

---

## Redesign Decisions

### 1. Font System

| Role | Before | After | Rationale |
|------|--------|-------|-----------|
| Display/Hero | Oswald | **Bricolage Grotesque** | Optical size variation, editorial weight, distinctive. Magazine masthead feel. Google Fonts. |
| Body | Source Sans 3 | **Inter** | Gold standard for screen readability. Variable font with optical sizing. |
| Data/Mono | JetBrains Mono | **Geist Mono** | More readable at small sizes. Warmer, less "code editor." |

**Rules:**
- Monospace reserved ONLY for issue numbers, dates, prices, and data.
- Nav labels, filter pills, footer links, badges → use Inter (body font).
- Stop all-uppercase headings. Use sentence case. Let weight + size create hierarchy.
- Minimum text size: 0.75rem (up from 0.6rem).
- Body text: 1rem (up from 0.875rem), line-height 1.7.

### 2. Color Palette

**Backgrounds — deep ink with blue undertones (not GitHub gray):**
```
--bg-primary:    #08090d
--bg-secondary:  #0f1118
--bg-tertiary:   #171c28
--bg-surface:    #121620
```

**Text — warmer, more readable:**
```
--text-primary:  #f0f0f0
--text-secondary:#9ba4b5
--text-tertiary: #5c6478
```

**Two hero accents (not five):**
```
--accent-red:    #e63946    (warmer, less neon)
--accent-gold:   #d4a843    (richer, less fluorescent)
```

**Semantic colors (badges/status only, not decoration):**
```
--status-in-print:     #2ec486
--status-out-of-print: #e63946
--status-upcoming:     #a78bfa
--status-digital:      #60a5fa
--status-ongoing:      #d4a843
```

**Borders — blue-shifted:**
```
--border-default: #1e2433
--border-accent:  #e63946
```

### 3. Typography Scale

```
Hero:     3rem,   Bricolage Grotesque 700, normal case
Section:  1.5rem, Bricolage Grotesque 600, normal case
Card:     1rem,   Inter 600
Body:     1rem,   Inter 400, line-height 1.7
Caption:  0.8rem, Inter 500, secondary color
Data:     0.75rem, Geist Mono 400 (issue numbers, dates, prices ONLY)
```

### 4. Component Changes

**EditionCard** — Cover-first:
- Large cover image (full card width on mobile, 50%+ on desktop)
- Title below cover, not beside it
- Badges overlaid on cover corner (small pills)
- Synopsis on hover/expand, not crammed in
- Subtle Y-translate (-2px) + shadow on hover

**StatusBadge / ImportanceBadge:**
- Inter font, not monospace
- 0.75rem not 0.65rem
- rounded-md not rounded-full
- ImportanceBadge: filled + subtle inner shadow
- StatusBadge: subtle fill (10% opacity bg)

**Header:**
- Logo: Bricolage Grotesque, not Oswald
- Nav: cleaner hierarchy, active indicator dot above
- Mobile: improved touch targets, readable labels

**MobileNav:**
- Larger icons (24px)
- Inter labels at 0.75rem
- Active: colored dot indicator above icon

**EraCard:**
- Bricolage Grotesque heading, sentence case
- Better spacing, larger era color indicator

**Timeline:**
- Increased cover sizes in fullscreen
- Era bands at 0.18 opacity (more saturated)
- Inter for all non-data labels

**Footer:**
- Inter for all text
- Slightly larger section headings
- More generous spacing

### 5. Layout Changes

**Home page — editorial:**
- Full-bleed hero with large featured cover + CTA
- Featured reading paths as visual horizontal cards
- Era sections as editorial story blocks
- More whitespace (3-4rem between sections)

**Card grids:**
- 2 cols mobile, 3 tablet, 4-5 desktop
- 1.5rem gap minimum
- Cover-dominant layout

### 6. Spacing & Motion

**Spacing:**
- Section gaps: 3rem-4rem
- Card padding: 1.25rem-1.5rem
- Card gap: 1.5rem minimum

**Motion:**
- Card hover: translateY(-2px) + shadow expansion over 200ms
- Cover hover: scale(1.02) over 300ms
- Page content: fade-in with 50ms stagger via CSS
- Loading: skeleton shimmer in gold accent

---

## Implementation Order

1. Fonts + typography (globals.css + layout.tsx)
2. Color palette (globals.css)
3. Header navigation
4. EditionCard cover-first redesign
5. Badges, EraCard, Footer, MobileNav, remaining components
6. Home page editorial layout
7. Timeline + remaining pages
8. Build verification

---

## Status: COMPLETE

**Build:** Passes cleanly (557 pages, 0 errors, 0 warnings)
**Verification:** Zero remaining old font references (`font-oswald`, `font-jetbrains`), zero tiny font sizes (`0.55rem`, `0.6rem`, `0.65rem`) across entire `src/` directory.

---

## Files Modified (49 total)

### Core Theme + Layout
- `web/src/app/globals.css` — Color palette, typography rules, font aliases
- `web/src/app/layout.tsx` — Font imports (Inter, Bricolage Grotesque, Geist Mono)
- `web/src/app/page.tsx` — Complete editorial home page rewrite

### Layout Components
- `web/src/components/layout/Header.tsx` — Logo, nav, sentence case
- `web/src/components/layout/Footer.tsx` — Font swap, spacing
- `web/src/components/layout/MobileNav.tsx` — Larger icons, active dot indicator

### UI Components
- `web/src/components/ui/StatusBadge.tsx` — Sentence case, color-mix backgrounds
- `web/src/components/ui/ImportanceBadge.tsx` — Sentence case, inner shadow
- `web/src/components/ui/ConfidenceScore.tsx` — Font swap
- `web/src/components/ui/CoverPlaceholder.tsx` — Font swap
- `web/src/components/ui/BackToTop.tsx` — No font refs (unchanged)
- `web/src/components/ui/FilterChips.tsx` — Font swap
- `web/src/components/ui/RandomEditionButton.tsx` — No font refs (unchanged)

### Feature Components
- `web/src/components/editions/EditionCard.tsx` — Cover-first vertical layout
- `web/src/components/editions/EditionDetail.tsx` — Font swap, typography
- `web/src/components/timeline/TimelineView.tsx` — Font swap, era-proportional layout
- `web/src/components/timeline/EraCard.tsx` — Bricolage heading, sentence case
- `web/src/components/search/SearchBar.tsx` — Font swap
- `web/src/components/search/SearchFilters.tsx` — Font swap
- `web/src/components/search/SearchResults.tsx` — Font swap
- `web/src/components/paths/ReadingPathView.tsx` — Font swap
- `web/src/components/paths/PathProgress.tsx` — Font swap
- `web/src/components/collection/CollectionManager.tsx` — Font swap
- `web/src/components/collection/SmartRecommendations.tsx` — Font swap
- `web/src/components/creators/CreatorCard.tsx` — Font swap
- `web/src/components/conflicts/ConflictCard.tsx` — Font swap
- `web/src/components/conflicts/InterpretationPanel.tsx` — Font swap
- `web/src/components/overlap/OverlapDetector.tsx` — Font swap
- `web/src/components/purchase/PurchasePlanner.tsx` — Font swap
- `web/src/components/trivia/TriviaGame.tsx` — Font swap

### Page Files (all updated for fonts, typography, sentence case)
- `web/src/app/about/page.tsx`
- `web/src/app/character/[slug]/page.tsx`
- `web/src/app/characters/page.tsx`
- `web/src/app/collection/CollectionContent.tsx`
- `web/src/app/compare/CompareContent.tsx`
- `web/src/app/conflicts/page.tsx`
- `web/src/app/creator/[slug]/page.tsx`
- `web/src/app/creator/[slug]/saga/page.tsx`
- `web/src/app/creators/page.tsx`
- `web/src/app/edition/[slug]/page.tsx`
- `web/src/app/error.tsx`
- `web/src/app/event/[slug]/page.tsx`
- `web/src/app/events/EventsClient.tsx`
- `web/src/app/loading.tsx`
- `web/src/app/not-found.tsx`
- `web/src/app/path/[slug]/page.tsx`
- `web/src/app/plan/[slug]/page.tsx`
- `web/src/app/search/page.tsx`
- `web/src/app/start/page.tsx`
- `web/src/app/start/StartWizard.tsx`
- `web/src/app/timeline/page.tsx`
- `web/src/app/trivia/page.tsx`
- `web/src/app/universes/page.tsx`

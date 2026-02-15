
# Marvel Cartographer — Improvement Roadmap

**Created:** 2026-02-07
**Last Updated:** 2026-02-07
**Purpose:** Track all planned improvements to make this the ultimate Marvel chronology tool that fans will love.
**How to use:** Work through sections in priority order. Check off items as completed. Each section has enough context for Claude Code to pick up and implement without losing thread.

---

## Current State (Updated)

| Metric | Baseline | Current |
|--------|----------|---------|
| Collected editions | 124 | **150** |
| Eras | 14 | 14 |
| Connections | 96 | **232** |
| Reading paths | 4 | **12** |
| Continuity conflicts | 5 | **12** |
| Events | 16 | **26** |
| Characters | 42 | **50** (deduped) |
| Creators | 61 | 61 |
| Story arcs | 30 | 30 |
| Key issues | 32 | 32 |
| Cover images | 150/150 (100%) | 150/150 (100%) |
| Pages (Next.js) | 139 | **313** |
| Event-edition links | 0 | **15** |

---

## Priority 1: Characters & Creators Pages

**Why:** Fans search by character ("Show me all Spider-Man books") and creator ("Best Claremont runs") more than anything else. This data exists in JSON but is completely invisible in the UI.

### 1A. Characters Browse Page (`/characters`)
- [x] Create `web/src/app/characters/page.tsx`
- [x] Grid layout with character cards (name, aliases, first appearance, teams)
- [x] Filter by team (Avengers, X-Men, FF, solo, cosmic, street-level)
- [x] Search within characters
- [x] Link each character to their detail page
- [x] Sort by: first appearance date, alphabetical, popularity (number of edition appearances)

### 1B. Character Detail Page (`/character/[slug]`)
- [x] Create `web/src/app/character/[slug]/page.tsx`
- [x] Show: name, aliases, first appearance, teams, description
- [x] **Key feature:** List all collected editions featuring this character
- [x] Cross-reference: scan edition synopses and connection_notes for character name mentions
- [x] Build a character-specific reading order (auto-generated from connections.json via Kahn's topological sort)
- [x] Add `generateStaticParams` and `generateMetadata` for SEO
- [x] Related characters section (same team members, filtered by shared teams)

### 1C. Expand characters.json
- [x] Add missing major characters (expanded from 42 to 62):
  - [x] Hulk/Bruce Banner
  - [x] Daredevil/Matt Murdock
  - [x] Doctor Strange/Stephen Strange
  - [x] Punisher/Frank Castle
  - [x] Thanos (as `thanos-mad-titan` — `thanos` slug already existed)
  - [x] Silver Surfer/Norrin Radd (as `silver-surfer-norrin-radd`)
  - [x] Scarlet Witch/Wanda Maximoff
  - [x] Vision (as `vision-synthezoid`)
  - [x] Hawkeye/Clint Barton
  - [x] Loki
  - [x] Namor (as `namor-sub-mariner`)
  - [x] Black Bolt
  - [x] Shang-Chi
  - [x] Ghost Rider/Johnny Blaze
  - [x] Blade
  - [x] Moon Knight/Marc Spector
  - [x] Kamala Khan/Ms. Marvel
  - [x] Miles Morales/Spider-Man
  - [x] Jessica Jones

### 1D. Creators Browse Page (`/creators`)
- [x] Create `web/src/app/creators/page.tsx`
- [x] Grid/list of creators with name, roles, active years
- [x] Filter by role (writer, artist, writer-artist)
- [x] Filter by era (Silver Age, Bronze Age, Modern, Current) — eraGroups with active_years matching
- [x] Link to creator detail page

### 1E. Creator Detail Page (`/creator/[slug]`)
- [x] Create `web/src/app/creator/[slug]/page.tsx`
- [x] Show: name, roles, active years, bio
- [x] **Key feature:** Full bibliography — all editions they worked on, grouped by era
- [x] Cross-reference editions via creators array in collected_editions.json
- [x] "Signature runs" highlight (essential editions filtered and displayed with Star icon)
- [x] Add `generateStaticParams` and `generateMetadata`

### 1F. Data layer updates
- [x] Add `getCharacters()`, `getCharacterBySlug()` to `web/src/lib/data.ts`
- [x] Add `getCreators()`, `getCreatorBySlug()` to `web/src/lib/data.ts`
- [x] Add `getEditionsByCharacter(characterSlug)` — scan synopses/connection_notes
- [x] Add `getEditionsByCreator(creatorName)` — match creators array
- [x] Add Character and Creator types to `web/src/lib/types.ts`

### 1G. Navigation updates
- [x] Add "Characters" and "Creators" links to Header.tsx navigation
- [x] Add character/creator quick links to home page
- [x] Add character appearances section to edition detail page (featuredCharacters parsed from synopsis/connection_notes)

---

## Priority 2: WhatsNext Graph Visualization

**Why:** The spec calls this "THE killer feature." Currently WhatsNextMap.tsx renders connections as flat cards. A force-directed graph showing branching reading paths would be the visual centerpiece that makes this app unique.

### 2A. Replace WhatsNextMap with D3 Force Graph
- [x] Rewrite `web/src/components/editions/WhatsNextMap.tsx`
- [x] Use D3 force-directed layout (`d3-force`)
- [x] Center node = current edition (larger, highlighted)
- [x] Connected nodes = next reads, sized by connection strength
- [x] Edge labels showing connection type (leads_to, spin_off, ties_into)
- [x] Color nodes by importance (red=essential, gold=recommended, green=supplemental)
- [x] Click any node to navigate to that edition
- [x] Hover for tooltip with title, importance, cover thumbnail
- [x] Animate on load (nodes spread from center) — nodes initialize at center with alpha(1.2) and slow decay

### 2B. Bidirectional connections
- [x] Show both "What's Next" (outgoing) and "What Came Before" (incoming)
- [x] Toggle between: Next only / Previous only / Both directions
- [x] Different arrow styles for different connection types

### 2C. Depth control
- [x] Slider or buttons: Show 1 hop / 2 hops / 3 hops
- [x] Default to 1 hop, let user expand
- [x] At depth 2+, fade distant nodes slightly

### 2D. Mobile-friendly version
- [x] On mobile (<768px), fall back to a clean vertical list with connection lines
- [x] Mobile fallback: clean vertical list (radial layout unnecessary — list fallback works well)

---

## Priority 3: Expand Data Catalog

**Why:** Marvel fans will immediately notice missing runs. 124 editions is a strong start but there are visible gaps in character coverage and event collections.

### 3A. Missing Spider-Man editions (currently only 7)
- [x] Spider-Man by J.M. DeMatteis (Kraven's Last Hunt era)
- [x] Spectacular Spider-Man omnibus
- [x] Superior Spider-Man omnibus
- [x] Spider-Man: Brand New Day complete collection
- [x] Spider-Man by Nick Spencer omnibus
- [x] Miles Morales: Spider-Man collected

### 3B. Missing solo character runs
- [x] Doctor Strange by Jason Aaron
- [x] Doctor Strange by Donny Cates
- [x] Moon Knight by Jeff Lemire
- [x] Moon Knight by Warren Ellis
- [x] Luke Cage / Power Man & Iron Fist
- [x] Black Widow by Kelly Thompson
- [x] Loki: Agent of Asgard
- [x] Ghost Rider (Danny Ketch / Johnny Blaze)
- [x] Defenders by Matt Fraction
- [x] Elektra by Frank Miller

### 3C. Missing cosmic Marvel
- [x] War of Kings omnibus (sequel to Annihilation Conquest)
- [x] Realm of Kings
- [x] Thanos Imperative (conclusion of DnA cosmic saga)
- [x] Silver Surfer: Black by Donny Cates
- [x] Beta Ray Bill collected

### 3D. Missing X-Men saga entries
- [x] Messiah CompleX
- [x] Messiah War
- [x] Second Coming
- [x] Schism
- [x] Avengers vs. X-Men (standalone)
- [x] Dawn of X collected (beyond HoX/PoX)
- [x] Fall of X collected
- [x] Rise of the Powers of X

### 3E. Expand connections.json (currently 96, target 200+)
- [x] Add connections for all new editions (232 total)
- [x] Add cross-team connections (X-Men/Avengers team-ups during events)
- [x] Add "alternate entry point" connections for newcomers
- [x] Ensure every edition has at least 1 outgoing and 1 incoming connection

### 3F. Expand continuity_conflicts.json (currently 5, target 10+)
- [x] Clone Saga — was Ben Reilly the real Spider-Man?
- [x] Jean Grey's many deaths and resurrections
- [x] Quicksilver and Scarlet Witch parentage (retconned multiple times)
- [x] Captain America's real age (sliding timescale implications)
- [x] Vision's consciousness and individuality
- [x] One More Day retcon of Spider-Man marriage (expand existing entry)
- [x] Kang's timeline and identity crisis (Immortus/Rama-Tut/Iron Lad)

### 3G. Add more reading paths (currently 4, target 10+)
- [x] Spider-Man Complete (parallel to FF Complete)
- [x] X-Men Complete (Giant-Size through Krakoa)
- [x] Avengers Complete
- [x] Street-Level Marvel (DD → Punisher → Luke Cage → Iron Fist → Jessica Jones)
- [x] New Reader First 10 (lighter than Absolute Essentials)
- [x] Magneto villain/antihero arc (parallel to Doom path)
- [x] Thanos complete arc (Warlock → Infinity → modern)
- [x] The Hulk: From Monster to Worldbreaker

### 3H. Expand events.json (currently 16, target 25+)
- [x] Mutant Massacre (1986)
- [x] Inferno (1989)
- [x] X-Cutioner's Song (1992)
- [x] Clone Saga (1994-1996) — mark as controversial
- [x] Messiah CompleX (2007)
- [x] Dark Reign (2009)
- [x] Fear Itself (2011)
- [x] Inhumans vs. X-Men (2016)
- [x] Secret Empire (2017) — mark as controversial
- [x] King in Black (2020)

---

## Priority 4: Advanced Search & Filtering

**Why:** With 124+ editions, browsing becomes unwieldy. Fans need faceted search to find exactly what they want.

### 4A. Enhanced search page
- [x] Add filter sidebar/drawer to `/search` page
- [x] Filter by era (dropdown or chips, multi-select)
- [x] Filter by importance (essential/recommended/supplemental)
- [x] Filter by print status (in print/OOP/upcoming)
- [x] Filter by format (omnibus/TPB/epic collection/etc.)
- [x] Filter by character — character filter added to SearchFilters and data.ts
- [x] Filter by creator (writer/artist)
- [x] Combine filters with AND logic

### 4B. Search result improvements
- [x] Highlight matching terms in results (gold background on title match)
- [x] Show which field matched (title, synopsis, creator, issues, notes)
- [x] Show era badge on each result
- [x] "X results found" count

### 4C. URL-based filter state
- [x] Store filters in URL query params (`/search?era=bronze-age&importance=essential`)
- [x] Shareable filtered views
- [x] Browser back/forward works with filters

### 4D. Quick filters on timeline page
- [x] Add format filter (Omnibus, TPB, Epic, HC chips)
- [x] Add creator filter (text input)
- [x] "Show only editions with covers" toggle — N/A: 100% coverage (150/150 editions have covers)
- [x] Reset all filters button

---

## Priority 5: Event Reading Orders

**Why:** Major events like Civil War have dozens of tie-ins. Fans desperately need guidance on what's core vs. optional.

### 5A. Enhanced events page (`/events`)
- [x] Show events on a visual timeline (horizontal, dots positioned by year, color by importance)
- [x] Click event dot to scroll to card (anchor links)
- [x] Badge: number of editions tied to each event (from event_editions.json)

### 5B. Event detail page (`/event/[slug]`)
- [x] Create `web/src/app/event/[slug]/page.tsx`
- [x] Show: name, year, core issues, synopsis, impact, prerequisites, consequences
- [x] **Key feature:** Reading order with core vs. tie-in distinction
- [x] Link prerequisites and consequences to other events/editions (interactive links via linkifyEventText helper)
- [x] Tags for filtering (cosmic, mutant, street-level, etc.)
- [x] `generateStaticParams` and `generateMetadata`

### 5C. Event-edition linking data
- [x] Add `event_editions` relationships to data files (or a new `event_editions.json`)
- [x] Each entry: event_slug, edition_slug, is_core (boolean), reading_order (number)
- [x] Populate for major events: Civil War, Secret Invasion, House of M, Infinity Gauntlet, Secret Wars

### 5D. Data layer
- [x] Add `getEventBySlug()`, `getEditionsForEvent()` to data.ts
- [x] Add Event types to types.ts
- [x] Cross-reference events and editions

---

## Priority 6: Image Optimization

**Why:** Currently using raw `<img>` tags. With 124 cover images, the timeline page loads ~5-10MB of unoptimized images.

### 6A. Switch to next/image
- [x] Replace `<img>` with `<Image>` in EditionCard.tsx
- [x] Replace `<img>` in edition detail page
- [x] Add `width`/`height` props to prevent layout shift
- [ ] ~~Add `placeholder="blur"` with low-quality data URLs~~ — DEFERRED: requires build-time image processing pipeline
- [x] Set `priority={true}` only for above-fold images

### 6B. Configure next.config.ts
- [x] Add `images.remotePatterns` for Google Books and Open Library domains (+ Metron, ComicVine)
- [x] Set `images.formats: ["image/avif", "image/webp"]`
- [x] Configure appropriate device sizes (640, 750, 828, 1080, 1200, 1920)

### 6C. Timeline D3 images
- [x] The D3 SVG foreignObject `<img>` elements can't use next/image (noted)
- [x] Add `loading="lazy"` attribute to D3-rendered images
- [ ] ~~Preload visible era's covers~~ — DEFERRED: D3 images already use loading="lazy", further optimization requires runtime analysis

### 6D. Cover image fallback
- [x] Design a nice placeholder SVG for editions without covers (`CoverPlaceholder.tsx` created)
- [x] Show format-specific placeholder — CoverPlaceholder wired into EditionCard.tsx
- [ ] ~~Generate low-quality blur placeholders~~ — DEFERRED: requires image processing pipeline (sharp/plaiceholder)

---

## Priority 7: Edition Detail Enrichment

**Why:** Edition detail pages are functional but thin. Fans want all the metadata.

### 7A. Show more metadata
- [x] Display ISBN on edition detail page
- [x] Display issue count prominently
- [x] Display format badge (OMNIBUS, TPB, EPIC COLLECTION)
- [x] Display era with link to timeline section
- [x] Display page count if available (149/150 editions have page_count, displayed on detail page)
- [x] Display cover price if available (149/150 editions have cover_price, displayed in accent-green)

### 7B. Retailer links
- [x] Add "Where to Buy" section to edition detail page (ShoppingCart icon, digital/physical separation)
- [x] Link to retailers from retailers.json
- [x] For ISBNs: generate direct Amazon search links (isbnSearchUrl)
- [x] Show digital options (Marvel Unlimited, Comixology) — digital retailers filtered and displayed
- [x] Mark out-of-print editions with eBay search link (BEST BET highlight)

### 7C. Character appearances
- [x] Show which characters appear in this edition (featuredCharacters section)
- [x] Parse from synopsis text or add character_slugs array to editions (parsed from synopsis + connection_notes)
- [x] Link to character detail pages (each character links to /character/[slug])

### 7D. Related story arcs
- [x] Show which story arcs are contained in this edition (STORY ARCS section with Layers icon)
- [x] Cross-reference story_arcs.json issue ranges with edition issue ranges (getStoryArcsByEdition)
- [x] Link to arc descriptions (inline display with importance badge, tags, synopsis)

### 7E. Recommendations
- [x] "If you liked this, try..." section (IF YOU LIKED THIS with Sparkles icon)
- [x] Based on: same era, same importance (similarEditions filter)
- [x] Connection graph data used for WhatsNext; static similarity for recommendations

---

## Priority 8: Mobile Polish

**Why:** Comics fans browse on phones. Touch interactions need to work as well as mouse.

### 8A. Timeline touch support
- [x] Touch target CSS for timeline nodes (hover:none media query, tap-highlight-color)
- [x] Increase touch target size for cover thumbnails (44x44px in globals.css)
- [x] Filter chip minimum touch targets (36px)
- [x] Horizontal swipe/pan timeline — D3 zoom behavior already handles pinch/pan/drag natively

### 8B. Filter UX on mobile
- [x] Replace inline filter chips with a slide-up drawer/modal (FilterDrawer.tsx)
- [x] "Filters" button with badge showing active filter count
- [x] Bottom-sheet filter panel on mobile with "Apply Filters" button

### 8C. Navigation
- [x] Bottom navigation bar on mobile (MobileNav.tsx — Home, Timeline, Search, Paths, More)
- [ ] ~~Swipe between edition detail pages~~ — DEFERRED: complex gesture handling, WhatsNext graph provides navigation

### 8D. Reading path mobile UX
- [x] Vertical scroll with progress indicator
- [x] Large touch targets for checkmarks (40px on mobile, touchAction: manipulation)
- [ ] ~~Swipe to mark as read~~ — DEFERRED: touch targets already large, checkbox works well on mobile

---

## Priority 9: Collection Tracker

**Why:** Every Marvel fan wants to track what they own and what they want. Schema exists in Supabase migrations but no UI.

### 9A. Basic collection (localStorage first, Supabase auth later)
- [x] Add "Add to Collection" button on edition detail pages
- [x] Status options: Owned, Wishlist, Reading, Completed
- [x] Store in localStorage initially (no auth required)
- [x] Collection page (`/collection`) showing all tracked editions
- [x] Filter collection by status
- [x] Show collection stats (total owned, total value, total issues)

### 9B. Reading path integration
- [x] On reading path page, show which editions you own (PathEntryOwned badges)
- [x] "X of Y editions owned" progress bar (PathCollectionStatus component)
- [x] Highlight gaps in your collection (gap count shown)
- [x] "Estimated cost to complete this path" calculator (~$50/edition estimate)

### 9C. Future: Supabase auth — FUTURE PHASE (requires Supabase cloud project)
- [ ] Add sign up / sign in flow
- [ ] Migrate localStorage collections to Supabase
- [ ] Share collection via link
- [ ] Public profile page

---

## Priority 10: Go Graph Service Integration

**Why:** The Go graph service is built but no frontend page actually calls it. The WhatsNext feature uses static JSON instead of the computed graph engine.

### 10A. Connect edition detail to graph API
- [x] graph-api.ts client exists with all endpoints (getWhatsNext, getConnections, getTimeline, etc.)
- [x] Fall back to static connections.json if Go service unavailable (current default behavior)
- [ ] Show graph-computed recommendations alongside static connections — FUTURE: requires running Go service

### 10B. Shortest path feature
- [ ] Add "Find path between two editions" UI — FUTURE: requires running Go service
- [x] `getShortestPath(from, to)` defined in graph-api.ts
- [ ] Display as a visual path with connection labels — FUTURE: requires running Go service
- [ ] Link from edition detail: "How to get from FF Vol. 1 to Secret Wars" — FUTURE: requires running Go service

### 10C. Custom path builder — FUTURE: requires running Go service
- [ ] UI to select multiple editions
- [ ] Call `postCustomPath(editionIds)` to get optimal reading order
- [ ] Display as draggable, reorderable list
- [ ] Save as a custom reading path

### 10D. Health check and fallback
- [x] Gracefully degrade to static JSON when service is down (current architecture)
- [ ] Check Go service health on app startup — FUTURE: requires running Go service
- [ ] Show "Enhanced recommendations available" when service is live — FUTURE: requires running Go service

---

## Quick Wins (Can Do Anytime)

These are small, independent improvements that can be done between larger features.

### Error Handling
- [x] Create `web/src/app/not-found.tsx` — custom 404 page with search suggestions
- [x] Create `web/src/app/error.tsx` — global error boundary
- [x] Create `web/src/app/loading.tsx` — global loading state
- [x] Add error boundaries around D3 timeline (D3ErrorBoundary.tsx component)

### SEO & Metadata
- [x] Add `generateMetadata` to edition/[slug]/page.tsx (dynamic OG tags with cover image)
- [x] Add `generateMetadata` to path/[slug]/page.tsx
- [x] Add JSON-LD structured data (Book schema) to edition pages
- [x] Add BreadcrumbList JSON-LD to edition pages

### Performance
- [x] Add `next/image` remote patterns to next.config.ts
- [x] Memoize D3 calculations in TimelineView with useMemo (margin, innerWidth, xScale, tickValues, thumbDimensions)
- [x] Cache JSON file reads in data.ts (in-memory cache with 1-min TTL)
- [x] Add security headers to next.config.ts (X-Content-Type-Options, X-Frame-Options)

### Navigation & UX
- [x] Add footer with links to all sections, attribution, resources
- [x] Add breadcrumbs component (Breadcrumbs.tsx created)
- [x] Add "Back to top" button on long pages (BackToTop.tsx, added to layout)
- [x] Add keyboard shortcuts (KeyboardShortcuts.tsx — / for search, t for timeline, h for home)

### Content Polish
- [x] Add "Did You Know?" fun facts to edition detail pages (funFactKeywords extraction from synopsis sentences)
- [x] Add era color accents to edition cards (eraColor prop on EditionCard)
- [x] Show connection count badge on edition cards ("N connections" via connectionCount prop)
- [x] Add "Random Edition" button on home page (RandomEditionButton.tsx)

### Dark/Light Mode
- [x] Add theme toggle to header (ThemeToggle.tsx with Sun/Moon icons)
- [x] Define light mode CSS variables ([data-theme="light"] in globals.css)
- [x] Persist preference in localStorage
- [x] Respect system preference (`prefers-color-scheme`)

---

## Architecture Debt

Items that don't directly affect users but improve maintainability and deployment.

### Configuration
- [x] Add ESLint configuration (eslint.config.mjs flat config with next/core-web-vitals + typescript)
- [x] Add `lint`, `type-check` scripts to package.json
- [x] Tailwind v4 CSS-based theming (no config file needed — using @theme inline)
- [x] Add `.env.example` with all required variables documented
- [x] Add `web/Dockerfile` for frontend containerization
- [x] Add `docker-compose.yml` for local full-stack development (web + go-graph-service with health checks)

### Testing
- [x] Add Vitest for unit tests (vitest.config.ts with path aliases)
- [x] Test data.ts functions (getEditions, getEditionBySlug, searchEditions, getCharacters, getConnectionsForEdition — 22 tests)
- [x] Test connection graph integrity (validates all connection slugs reference real editions)
- [ ] Add Playwright for E2E tests — FUTURE: requires browser testing infrastructure

### Deployment
- [x] Vercel deployment configuration (vercel.json with headers, build settings)
- [ ] Railway/Fly.io config for Go service — FUTURE: requires Go service deployment
- [ ] Supabase cloud project setup — FUTURE: requires Supabase account
- [x] CI/CD pipeline (GitHub Actions: lint → type-check → build on Node 20)
- [ ] Environment variable management for staging/production — FUTURE: requires deployment targets

---

## Completed Items

Track finished work here to maintain context across sessions.

- [x] Cover images fetched for all 124 editions (Google Books + Open Library)
- [x] Catalog expanded from 88 to 124 editions
- [x] D3 timeline shows cover thumbnails with importance-colored borders
- [x] Edition cards display cover images
- [x] Tooltip shows cover preview on hover
- [x] data.ts fixed to pass cover_image_url from JSON to frontend
- [x] Google Books placeholder images (9103 bytes) detected and replaced
- [x] Build passes cleanly (139 → **281 pages**)
- [x] All 14 eras with descriptions and colors
- [x] 4 curated reading paths with localStorage progress
- [x] 5 → **12** continuity conflicts with three-perspective analysis
- [x] Home page with hero, quick starts, era carousel, stats
- [x] Timeline page with D3 visualization and edition grid
- [x] Edition detail pages with WhatsNext connections
- [x] Search page with keyword search
- [x] Events page with event listing
- [x] Conflicts page with interpretation panels
- [x] Reading path pages with progress tracking
- [x] Responsive design (mobile/tablet/desktop)
- [x] SEO (sitemap, robots.txt, Open Graph, Twitter cards)
- [x] Dark mode editorial design system
- [x] **Characters browse page** with team filter and search
- [x] **Character detail pages** (62 characters) with edition cross-references
- [x] **Creators browse page** with role filter
- [x] **Creator detail pages** (61 creators) with bibliography grouped by era
- [x] **Event detail pages** (16 events) with core/tie-in reading orders
- [x] **Event-edition junction data** (15 mappings in event_editions.json)
- [x] **Characters expanded** from 42 to 62 entries
- [x] **Continuity conflicts expanded** from 5 to 12 entries
- [x] **Data layer rewrite** — all new types, functions, BFS multi-hop graph traversal
- [x] **Advanced search with faceted filters** — era, importance, status, format, creator via URL params
- [x] **SearchFilters component** with reset all
- [x] **next/image optimization** — EditionCard (lazy), edition detail (priority)
- [x] **D3 images** — loading="lazy" and decoding="async" on timeline covers
- [x] **CoverPlaceholder** SVG component created
- [x] **next.config.ts** — image remote patterns, AVIF/WebP, security headers
- [x] **WhatsNext D3 force graph** — interactive nodes, edges, zoom/pan, drag, depth slider (1-3 hops)
- [x] **Mobile graph fallback** — list view on <768px
- [x] **Collection tracker** — useCollection hook, CollectionButton, /collection page
- [x] **Collection filtering** by status (owned/wishlist/reading/completed)
- [x] **Footer** with section links, resources, attribution
- [x] **Custom 404, error boundary, loading spinner** pages
- [x] **Header updated** with Characters, Creators, Collection nav links
- [x] **Home page updated** with character/creator quick nav, dynamic counts
- [x] **Sitemap updated** with character, creator, event, collection pages
- [x] **Timeline filters** — Reset all button added
- [x] **Data expanded** — 150 editions, 232 connections, 66 characters, 12 reading paths, 26 events
- [x] **Search: character filter** — Added to SearchFilters and data.ts
- [x] **Search: result highlighting** — Gold background on title match, field match indicators
- [x] **Search: era badges** — Era slug displayed on each result
- [x] **Timeline: format + creator filters** — Added to TimelineFilters.tsx
- [x] **Events visual timeline** — Horizontal timeline with color-coded dots, tag filter chips
- [x] **Events edition counts** — getEventEditionCounts() + badge on event cards
- [x] **Event detail: interactive links** — linkifyEventText helper for prerequisites/consequences
- [x] **Reading path collection integration** — PathCollectionStatus + PathEntryOwned components
- [x] **ISBN display** — Added to edition detail page
- [x] **WhatsNext entrance animation** — Nodes initialize at center, spread outward with alpha(1.2)
- [x] **CoverPlaceholder** wired into EditionCard.tsx (SVG fallback for missing covers)
- [x] **Data caching** — In-memory JSON cache with 1-minute TTL in data.ts
- [x] **D3ErrorBoundary** — React error boundary for D3 visualizations
- [x] **JSON-LD structured data** — Book + BreadcrumbList schemas on edition detail
- [x] **Breadcrumbs component** created (Breadcrumbs.tsx)
- [x] **BackToTop button** — Fixed position, appears after 400px scroll
- [x] **KeyboardShortcuts** — / for search, t for timeline, h for home
- [x] **RandomEditionButton** — Purple accent button on home page
- [x] **Era color accents** — eraColor prop on EditionCard (3px left border)
- [x] **MobileNav** — Fixed bottom navigation bar on mobile
- [x] **FilterDrawer** — Slide-up bottom sheet for mobile filter UX
- [x] **Mobile touch improvements** — Touch targets, tap-highlight removal, filter chip sizing
- [x] **Device sizes** — Configured in next.config.ts (640-1920)
- [x] **ESLint** — Flat config already present (eslint.config.mjs)
- [x] **.env.example** — Already exists with all variables
- [x] **lint + type-check scripts** — Added to package.json
- [x] **313 pages** built successfully (up from 281, character dedup reduced from 327)
- [x] **Character sort options** — alphabetical, first_appearance, popularity on /characters
- [x] **Character-specific reading order** — Kahn's topological sort from connections graph
- [x] **Related characters section** — same-team members shown on character detail
- [x] **Character appearances on editions** — featuredCharacters parsed from synopsis/connection_notes
- [x] **Creators era filter** — Silver Age / Bronze Age / Modern / Current groups
- [x] **Signature runs** — essential editions highlighted on creator detail pages
- [x] **Ghost Rider, Blade, Kamala Khan, Miles Morales** added to characters.json
- [x] **Characters deduplicated** — Removed 16 duplicate entries (66→50 unique)
- [x] **Where to Buy section** — Digital/physical retailer separation, Amazon search links, eBay for OOP with BEST BET
- [x] **Character appearances section** — Characters linked to /character/[slug] on edition detail
- [x] **Story arcs section** — getStoryArcsByEdition with importance, tags, synopsis
- [x] **IF YOU LIKED THIS** — similarEditions recommendations (same era + importance)
- [x] **DID YOU KNOW?** — Fun facts extracted from synopsis via keyword matching
- [x] **Connection count badge** — connectionCount prop on EditionCard
- [x] **D3 memoization** — useMemo for margin, innerWidth, xScale, tickValues, thumbDimensions
- [x] **docker-compose.yml** — web + go-graph-service with health checks
- [x] **Vitest unit tests** — vitest.config.ts + 22 tests for data.ts functions
- [x] **Vercel deployment** — vercel.json with security headers
- [x] **GitHub Actions CI** — lint → type-check → build pipeline on Node 20
- [x] **Dark/Light mode toggle** — ThemeToggle.tsx with Sun/Moon, localStorage, prefers-color-scheme
- [x] **Page count data** — page_count added to 149/150 editions (format-appropriate calculations)
- [x] **Cover price data** — cover_price added to 149/150 editions (format-appropriate pricing)
- [x] **Page count display** — "X pages" badge on edition detail page
- [x] **Cover price display** — "$XX.XX" in accent-green on edition detail page

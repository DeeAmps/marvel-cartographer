-- ============================================================
-- 005: Narrative Structure Tables
-- Era Chapters, Event Phases, Universes, Reading Order Entries
-- Inspired by MarvelGuides.com's chapter-based era navigation
-- ============================================================

-- ============================================================
-- GUIDE STATUS (for transparency on completion)
-- ============================================================
CREATE TYPE guide_status AS ENUM ('complete', 'in_progress', 'planned');

ALTER TABLE eras ADD COLUMN guide_status guide_status DEFAULT 'in_progress';
ALTER TABLE events ADD COLUMN guide_status guide_status DEFAULT 'in_progress';

-- ============================================================
-- UNIVERSES (Alternate reality tracking)
-- ============================================================
CREATE TABLE universes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,                     -- 'Earth-616 (Main Continuity)'
    designation TEXT NOT NULL,              -- '616', '1610', '2099'
    year_start INTEGER,
    year_end INTEGER,                       -- NULL if ongoing
    description TEXT,
    is_primary BOOLEAN DEFAULT false,
    color TEXT,                             -- UI accent color
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Link editions to universes (most are 616 by default)
ALTER TABLE collected_editions ADD COLUMN universe_id UUID REFERENCES universes(id);

-- ============================================================
-- ERA CHAPTERS (Named narrative parts within eras)
-- e.g., Birth of Marvel -> "Origins", "The Universe Expands", "Cosmic Horizon"
-- ============================================================
CREATE TABLE era_chapters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    era_id UUID NOT NULL REFERENCES eras(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,                     -- 'Cosmic Horizon', 'City of Heroes'
    number INTEGER NOT NULL,               -- Order within era (1, 2, 3...)
    description TEXT,
    year_start INTEGER,
    year_end INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(era_id, number)
);

CREATE INDEX idx_era_chapters_era ON era_chapters(era_id);

-- Link editions to chapters
ALTER TABLE collected_editions ADD COLUMN chapter_id UUID REFERENCES era_chapters(id);

-- ============================================================
-- EVENT PHASES (Narrative sub-parts for major events)
-- e.g., Civil War -> "The Stamford Incident", "Lines Drawn", "All-Out War"
-- ============================================================
CREATE TABLE event_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    slug TEXT NOT NULL,
    name TEXT NOT NULL,                     -- 'The Stamford Incident'
    number INTEGER NOT NULL,               -- Order within event
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, number)
);

CREATE INDEX idx_event_phases_event ON event_phases(event_id);

-- ============================================================
-- READING ORDER ENTRIES (Issue-level interleaved reading orders)
-- Individual issues sequenced across multiple series within
-- an event, chapter, or arc context
-- ============================================================
CREATE TABLE reading_order_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type TEXT NOT NULL CHECK (context_type IN ('event', 'event_phase', 'chapter', 'arc')),
    context_id UUID NOT NULL,
    position INTEGER NOT NULL,
    series_title TEXT NOT NULL,             -- 'Civil War', 'Wolverine', 'New Avengers'
    issue_number TEXT NOT NULL,             -- '#1', '#42-49', 'Annual #7'
    edition_slug TEXT,                      -- Which collected edition contains this
    note TEXT,                              -- 'Peter unmasks on live TV'
    is_core BOOLEAN DEFAULT true,           -- Core series vs optional tie-in
    phase_id UUID REFERENCES event_phases(id), -- Optional: which phase this belongs to
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(context_type, context_id, position)
);

CREATE INDEX idx_reading_order_context ON reading_order_entries(context_type, context_id);
CREATE INDEX idx_reading_order_phase ON reading_order_entries(phase_id);

-- ============================================================
-- UPDATED VIEWS
-- ============================================================

-- Era with chapters view
CREATE VIEW era_with_chapters AS
SELECT
    e.*,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ec.id,
                'slug', ec.slug,
                'name', ec.name,
                'number', ec.number,
                'description', ec.description,
                'year_start', ec.year_start,
                'year_end', ec.year_end
            ) ORDER BY ec.number
        ) FILTER (WHERE ec.id IS NOT NULL),
        '[]'::jsonb
    ) AS chapters
FROM eras e
LEFT JOIN era_chapters ec ON e.id = ec.era_id
GROUP BY e.id;

-- Event with phases view
CREATE VIEW event_with_phases AS
SELECT
    ev.*,
    COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', ep.id,
                'slug', ep.slug,
                'name', ep.name,
                'number', ep.number,
                'description', ep.description
            ) ORDER BY ep.number
        ) FILTER (WHERE ep.id IS NOT NULL),
        '[]'::jsonb
    ) AS phases
FROM events ev
LEFT JOIN event_phases ep ON ev.id = ep.event_id
GROUP BY ev.id;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get reading order for an event (with phases)
CREATE OR REPLACE FUNCTION get_event_reading_order(event_slug_param TEXT)
RETURNS TABLE (
    "position" INTEGER,
    series_title TEXT,
    issue_number TEXT,
    edition_slug TEXT,
    note TEXT,
    is_core BOOLEAN,
    phase_name TEXT,
    phase_number INTEGER
) AS $$
SELECT
    roe.position,
    roe.series_title,
    roe.issue_number,
    roe.edition_slug,
    roe.note,
    roe.is_core,
    ep.name AS phase_name,
    ep.number AS phase_number
FROM reading_order_entries roe
JOIN events e ON roe.context_type = 'event' AND roe.context_id = e.id AND e.slug = event_slug_param
LEFT JOIN event_phases ep ON roe.phase_id = ep.id
ORDER BY roe.position;
$$ LANGUAGE sql;

-- Get editions for a specific chapter
CREATE OR REPLACE FUNCTION get_chapter_editions(chapter_slug_param TEXT)
RETURNS TABLE (
    edition_id UUID,
    title TEXT,
    issues_collected TEXT,
    print_status print_status,
    importance importance_level,
    synopsis TEXT,
    cover_image_url TEXT
) AS $$
SELECT
    ce.id,
    ce.title,
    ce.issues_collected,
    ce.print_status,
    ce.importance,
    ce.synopsis,
    ce.cover_image_url
FROM collected_editions ce
JOIN era_chapters ec ON ce.chapter_id = ec.id AND ec.slug = chapter_slug_param
ORDER BY ce.release_date, ce.title;
$$ LANGUAGE sql;

-- ============================================================
-- Updated editions_full view with chapter and universe data
-- ============================================================
DROP VIEW IF EXISTS editions_full;
CREATE VIEW editions_full AS
SELECT
    ce.*,
    e.name AS era_name,
    e.slug AS era_slug,
    e.number AS era_number,
    e.color AS era_color,
    ec.name AS chapter_name,
    ec.slug AS chapter_slug,
    ec.number AS chapter_number,
    u.name AS universe_name,
    u.designation AS universe_designation,
    ARRAY_AGG(DISTINCT c.name || ' (' || ecr.role || ')') FILTER (WHERE c.name IS NOT NULL) AS creator_names
FROM collected_editions ce
LEFT JOIN eras e ON ce.era_id = e.id
LEFT JOIN era_chapters ec ON ce.chapter_id = ec.id
LEFT JOIN universes u ON ce.universe_id = u.id
LEFT JOIN edition_creators ecr ON ce.id = ecr.edition_id
LEFT JOIN creators c ON ecr.creator_id = c.id
GROUP BY ce.id, e.name, e.slug, e.number, e.color,
         ec.name, ec.slug, ec.number,
         u.name, u.designation;

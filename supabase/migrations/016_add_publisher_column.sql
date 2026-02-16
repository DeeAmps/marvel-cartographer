-- ============================================================
-- 016: Multi-Publisher Support
-- Adds publisher column to publisher-scoped tables,
-- updates slug uniqueness, views, and functions.
-- ============================================================

-- ============================================================
-- ADD PUBLISHER COLUMN TO SCOPED TABLES
-- ============================================================

ALTER TABLE eras ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE collected_editions ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE story_arcs ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE events ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE continuity_conflicts ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE reading_paths ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE universes ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE era_chapters ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE handbook_entries ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE debates ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE trivia_questions ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';
ALTER TABLE mcu_content ADD COLUMN publisher TEXT NOT NULL DEFAULT 'marvel';

-- ============================================================
-- CREATE INDEXES
-- ============================================================

CREATE INDEX idx_eras_publisher ON eras(publisher);
CREATE INDEX idx_editions_publisher ON collected_editions(publisher);
CREATE INDEX idx_story_arcs_publisher ON story_arcs(publisher);
CREATE INDEX idx_events_publisher ON events(publisher);
CREATE INDEX idx_conflicts_publisher ON continuity_conflicts(publisher);
CREATE INDEX idx_reading_paths_publisher ON reading_paths(publisher);
CREATE INDEX idx_universes_publisher ON universes(publisher);
CREATE INDEX idx_era_chapters_publisher ON era_chapters(publisher);
CREATE INDEX idx_handbook_entries_publisher ON handbook_entries(publisher);
CREATE INDEX idx_debates_publisher ON debates(publisher);
CREATE INDEX idx_trivia_publisher ON trivia_questions(publisher);
CREATE INDEX idx_mcu_content_publisher ON mcu_content(publisher);

-- ============================================================
-- CHANGE SLUG UNIQUENESS TO COMPOSITE (publisher, slug)
-- Drop old unique constraints, add new composite ones.
-- ============================================================

-- eras: slug was UNIQUE from table creation
ALTER TABLE eras DROP CONSTRAINT IF EXISTS eras_slug_key;
ALTER TABLE eras ADD CONSTRAINT eras_publisher_slug_unique UNIQUE (publisher, slug);

-- collected_editions: slug was UNIQUE
ALTER TABLE collected_editions DROP CONSTRAINT IF EXISTS collected_editions_slug_key;
ALTER TABLE collected_editions ADD CONSTRAINT editions_publisher_slug_unique UNIQUE (publisher, slug);

-- story_arcs: slug was UNIQUE
ALTER TABLE story_arcs DROP CONSTRAINT IF EXISTS story_arcs_slug_key;
ALTER TABLE story_arcs ADD CONSTRAINT story_arcs_publisher_slug_unique UNIQUE (publisher, slug);

-- events: slug was UNIQUE
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_slug_key;
ALTER TABLE events ADD CONSTRAINT events_publisher_slug_unique UNIQUE (publisher, slug);

-- continuity_conflicts: slug was UNIQUE
ALTER TABLE continuity_conflicts DROP CONSTRAINT IF EXISTS continuity_conflicts_slug_key;
ALTER TABLE continuity_conflicts ADD CONSTRAINT conflicts_publisher_slug_unique UNIQUE (publisher, slug);

-- reading_paths: slug was UNIQUE
ALTER TABLE reading_paths DROP CONSTRAINT IF EXISTS reading_paths_slug_key;
ALTER TABLE reading_paths ADD CONSTRAINT reading_paths_publisher_slug_unique UNIQUE (publisher, slug);

-- universes: slug was UNIQUE
ALTER TABLE universes DROP CONSTRAINT IF EXISTS universes_slug_key;
ALTER TABLE universes ADD CONSTRAINT universes_publisher_slug_unique UNIQUE (publisher, slug);

-- era_chapters: slug was UNIQUE
ALTER TABLE era_chapters DROP CONSTRAINT IF EXISTS era_chapters_slug_key;
ALTER TABLE era_chapters ADD CONSTRAINT era_chapters_publisher_slug_unique UNIQUE (publisher, slug);

-- handbook_entries: slug was UNIQUE
ALTER TABLE handbook_entries DROP CONSTRAINT IF EXISTS handbook_entries_slug_key;
ALTER TABLE handbook_entries ADD CONSTRAINT handbook_entries_publisher_slug_unique UNIQUE (publisher, slug);

-- debates: slug was UNIQUE
ALTER TABLE debates DROP CONSTRAINT IF EXISTS debates_slug_key;
ALTER TABLE debates ADD CONSTRAINT debates_publisher_slug_unique UNIQUE (publisher, slug);

-- mcu_content: slug was UNIQUE
ALTER TABLE mcu_content DROP CONSTRAINT IF EXISTS mcu_content_slug_key;
ALTER TABLE mcu_content ADD CONSTRAINT mcu_content_publisher_slug_unique UNIQUE (publisher, slug);

-- ============================================================
-- UPDATE editions_full VIEW TO INCLUDE PUBLISHER
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

-- ============================================================
-- UPDATE search_editions FUNCTION — optional publisher filter
-- ============================================================

CREATE OR REPLACE FUNCTION search_editions(
    query TEXT,
    limit_count INTEGER DEFAULT 20,
    publisher_filter TEXT DEFAULT NULL
)
RETURNS SETOF collected_editions AS $$
    SELECT * FROM collected_editions
    WHERE search_text @@ plainto_tsquery('english', query)
      AND (publisher_filter IS NULL OR publisher = publisher_filter)
    ORDER BY ts_rank(search_text, plainto_tsquery('english', query)) DESC
    LIMIT limit_count;
$$ LANGUAGE sql;

-- ============================================================
-- UPDATE get_whats_next — no change needed (works on edition IDs)
-- UPDATE get_era_editions — add publisher awareness
-- ============================================================

CREATE OR REPLACE FUNCTION get_era_editions(era_slug_param TEXT, publisher_param TEXT DEFAULT 'marvel')
RETURNS TABLE (
    edition_id UUID,
    title TEXT,
    issues_collected TEXT,
    print_status print_status,
    importance importance_level,
    synopsis TEXT,
    creators TEXT[],
    next_editions JSONB
) AS $$
SELECT ce.id, ce.title, ce.issues_collected, ce.print_status,
    ce.importance, ce.synopsis,
    ARRAY_AGG(DISTINCT cr.name) FILTER (WHERE cr.name IS NOT NULL),
    COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
        'id', tgt.id, 'title', tgt.title, 'type', c.connection_type
    )) FILTER (WHERE tgt.id IS NOT NULL), '[]'::jsonb)
FROM collected_editions ce
JOIN eras e ON ce.era_id = e.id AND e.slug = era_slug_param AND e.publisher = publisher_param
LEFT JOIN edition_creators ec ON ce.id = ec.edition_id
LEFT JOIN creators cr ON ec.creator_id = cr.id
LEFT JOIN connections c ON c.source_type = 'edition' AND c.source_id = ce.id AND c.target_type = 'edition'
LEFT JOIN collected_editions tgt ON c.target_id = tgt.id
GROUP BY ce.id ORDER BY ce.release_date, ce.title;
$$ LANGUAGE sql;

-- ============================================================
-- BACKFILL: Mark all existing data as 'marvel'
-- (Already done via DEFAULT, but explicit for clarity)
-- ============================================================

UPDATE eras SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE collected_editions SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE story_arcs SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE events SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE continuity_conflicts SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE reading_paths SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE universes SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE era_chapters SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE handbook_entries SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE debates SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE trivia_questions SET publisher = 'marvel' WHERE publisher IS NULL;
UPDATE mcu_content SET publisher = 'marvel' WHERE publisher IS NULL;

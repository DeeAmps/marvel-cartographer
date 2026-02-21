-- ============================================================
-- 017: Add publication_era_id to collected_editions
-- Separates narrative era (era_id) from publication window
-- ============================================================

ALTER TABLE collected_editions
ADD COLUMN publication_era_id UUID REFERENCES eras(id);

CREATE INDEX idx_editions_publication_era ON collected_editions(publication_era_id);

COMMENT ON COLUMN collected_editions.era_id IS 'Narrative era — the era this content belongs to story-wise';
COMMENT ON COLUMN collected_editions.publication_era_id IS 'Publication era — when this edition was published/released';

-- ============================================================
-- Update editions_full view to include publication era fields
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
    pe.name AS publication_era_name,
    pe.slug AS publication_era_slug,
    pe.number AS publication_era_number,
    pe.color AS publication_era_color,
    ARRAY_AGG(DISTINCT c.name || ' (' || ecr.role || ')') FILTER (WHERE c.name IS NOT NULL) AS creator_names
FROM collected_editions ce
LEFT JOIN eras e ON ce.era_id = e.id
LEFT JOIN eras pe ON ce.publication_era_id = pe.id
LEFT JOIN era_chapters ec ON ce.chapter_id = ec.id
LEFT JOIN universes u ON ce.universe_id = u.id
LEFT JOIN edition_creators ecr ON ce.id = ecr.edition_id
LEFT JOIN creators c ON ecr.creator_id = c.id
GROUP BY ce.id, e.name, e.slug, e.number, e.color,
         ec.name, ec.slug, ec.number,
         u.name, u.designation,
         pe.name, pe.slug, pe.number, pe.color;

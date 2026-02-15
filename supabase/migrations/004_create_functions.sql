-- ============================================================
-- 004: Views and Functions
-- ============================================================

-- Editions with era name and creator list
CREATE VIEW editions_full AS
SELECT
    ce.*,
    e.name AS era_name,
    e.slug AS era_slug,
    e.number AS era_number,
    e.color AS era_color,
    ARRAY_AGG(DISTINCT c.name || ' (' || ec.role || ')') FILTER (WHERE c.name IS NOT NULL) AS creator_names
FROM collected_editions ce
LEFT JOIN eras e ON ce.era_id = e.id
LEFT JOIN edition_creators ec ON ce.id = ec.edition_id
LEFT JOIN creators c ON ec.creator_id = c.id
GROUP BY ce.id, e.name, e.slug, e.number, e.color;

-- Graph adjacency for an edition
CREATE VIEW edition_connections AS
SELECT
    c.*,
    CASE
        WHEN c.source_type = 'edition' THEN src_ed.title
    END AS source_title,
    CASE
        WHEN c.target_type = 'edition' THEN tgt_ed.title
    END AS target_title
FROM connections c
LEFT JOIN collected_editions src_ed ON c.source_type = 'edition' AND c.source_id = src_ed.id
LEFT JOIN collected_editions tgt_ed ON c.target_type = 'edition' AND c.target_id = tgt_ed.id;

-- ============================================================
-- get_whats_next: Find recommended reads after a given edition
-- ============================================================
CREATE OR REPLACE FUNCTION get_whats_next(edition_uuid UUID, max_depth INTEGER DEFAULT 3)
RETURNS TABLE (
    edition_id UUID,
    title TEXT,
    connection_type connection_type,
    strength INTEGER,
    confidence INTEGER,
    depth INTEGER,
    path UUID[]
) AS $$
WITH RECURSIVE next_reads AS (
    SELECT
        c.target_id AS edition_id,
        ce.title,
        c.connection_type,
        c.strength,
        c.confidence,
        1 AS depth,
        ARRAY[c.source_id, c.target_id] AS path
    FROM connections c
    JOIN collected_editions ce ON c.target_id = ce.id
    WHERE c.source_type = 'edition'
      AND c.source_id = edition_uuid
      AND c.target_type = 'edition'
      AND c.connection_type IN ('leads_to', 'recommended_after', 'spin_off')

    UNION ALL

    SELECT
        c.target_id,
        ce.title,
        c.connection_type,
        c.strength,
        c.confidence,
        nr.depth + 1,
        nr.path || c.target_id
    FROM next_reads nr
    JOIN connections c ON c.source_type = 'edition'
                       AND c.source_id = nr.edition_id
                       AND c.target_type = 'edition'
                       AND c.connection_type IN ('leads_to', 'recommended_after')
    JOIN collected_editions ce ON c.target_id = ce.id
    WHERE nr.depth < max_depth
      AND NOT c.target_id = ANY(nr.path)
)
SELECT DISTINCT ON (edition_id) * FROM next_reads
ORDER BY edition_id, strength DESC, depth ASC;
$$ LANGUAGE sql;

-- ============================================================
-- search_editions: Full-text search
-- ============================================================
CREATE OR REPLACE FUNCTION search_editions(query TEXT, limit_count INTEGER DEFAULT 20)
RETURNS SETOF collected_editions AS $$
    SELECT * FROM collected_editions
    WHERE search_text @@ plainto_tsquery('english', query)
    ORDER BY ts_rank(search_text, plainto_tsquery('english', query)) DESC
    LIMIT limit_count;
$$ LANGUAGE sql;

-- ============================================================
-- get_era_editions: All editions for an era with connections
-- ============================================================
CREATE OR REPLACE FUNCTION get_era_editions(era_slug_param TEXT)
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
SELECT
    ce.id,
    ce.title,
    ce.issues_collected,
    ce.print_status,
    ce.importance,
    ce.synopsis,
    ARRAY_AGG(DISTINCT cr.name) FILTER (WHERE cr.name IS NOT NULL),
    COALESCE(
        jsonb_agg(DISTINCT jsonb_build_object(
            'id', tgt.id,
            'title', tgt.title,
            'type', c.connection_type
        )) FILTER (WHERE tgt.id IS NOT NULL),
        '[]'::jsonb
    )
FROM collected_editions ce
JOIN eras e ON ce.era_id = e.id AND e.slug = era_slug_param
LEFT JOIN edition_creators ec ON ce.id = ec.edition_id
LEFT JOIN creators cr ON ec.creator_id = cr.id
LEFT JOIN connections c ON c.source_type = 'edition' AND c.source_id = ce.id AND c.target_type = 'edition'
LEFT JOIN collected_editions tgt ON c.target_id = tgt.id
GROUP BY ce.id
ORDER BY ce.release_date, ce.title;
$$ LANGUAGE sql;

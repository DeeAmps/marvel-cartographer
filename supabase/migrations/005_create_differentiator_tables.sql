-- ============================================================
-- 005: Differentiator Feature Tables
-- Purchase Planner, Overlap Detector, Print Status Intelligence,
-- Creator Saga Threading
-- ============================================================

-- ============================================================
-- EDITION ISSUES (Normalized issue ranges for overlap detection)
-- ============================================================
CREATE TABLE edition_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    series_name TEXT NOT NULL,          -- 'Fantastic Four', 'Amazing Spider-Man'
    issue_number INTEGER NOT NULL,      -- 1, 2, 3...
    is_annual BOOLEAN DEFAULT false,
    UNIQUE(edition_id, series_name, issue_number, is_annual)
);

CREATE INDEX idx_edition_issues_series ON edition_issues(series_name, issue_number);
CREATE INDEX idx_edition_issues_edition ON edition_issues(edition_id);

-- ============================================================
-- PRINT STATUS HISTORY (Track status changes over time)
-- ============================================================
CREATE TABLE print_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    old_status print_status,
    new_status print_status NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT now(),
    source TEXT                         -- 'manual', 'retailer_check', 'user_report'
);

CREATE INDEX idx_print_status_history_edition ON print_status_history(edition_id);
CREATE INDEX idx_print_status_history_changed ON print_status_history(changed_at);

-- ============================================================
-- REPRINT ALERTS (User notifications for OOP editions)
-- ============================================================
CREATE TABLE reprint_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    notify_email BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, edition_id)
);

CREATE INDEX idx_reprint_alerts_user ON reprint_alerts(user_id);
CREATE INDEX idx_reprint_alerts_edition ON reprint_alerts(edition_id);

-- ============================================================
-- Add reprint tracking columns to collected_editions
-- ============================================================
ALTER TABLE collected_editions ADD COLUMN IF NOT EXISTS reprint_date DATE;
ALTER TABLE collected_editions ADD COLUMN IF NOT EXISTS reprint_source TEXT;
ALTER TABLE collected_editions ADD COLUMN IF NOT EXISTS last_in_print_date DATE;

-- ============================================================
-- Add 'creator_saga' to path_type enum
-- ============================================================
ALTER TYPE path_type ADD VALUE IF NOT EXISTS 'creator_saga';

-- ============================================================
-- FUNCTIONS: Find issue overlaps between editions
-- ============================================================
CREATE OR REPLACE FUNCTION find_edition_overlaps(edition_ids UUID[])
RETURNS TABLE (
    edition_a_id UUID,
    edition_b_id UUID,
    series_name TEXT,
    issue_number INTEGER,
    is_annual BOOLEAN
) AS $$
SELECT DISTINCT
    a.edition_id AS edition_a_id,
    b.edition_id AS edition_b_id,
    a.series_name,
    a.issue_number,
    a.is_annual
FROM edition_issues a
JOIN edition_issues b ON a.series_name = b.series_name
    AND a.issue_number = b.issue_number
    AND a.is_annual = b.is_annual
    AND a.edition_id < b.edition_id  -- Avoid duplicates
WHERE a.edition_id = ANY(edition_ids)
  AND b.edition_id = ANY(edition_ids)
ORDER BY a.series_name, a.issue_number;
$$ LANGUAGE sql;

-- ============================================================
-- FUNCTION: Get purchase plan for a reading path
-- ============================================================
CREATE OR REPLACE FUNCTION get_purchase_plan(path_slug_param TEXT)
RETURNS TABLE (
    edition_id UUID,
    title TEXT,
    slug TEXT,
    print_status print_status,
    importance importance_level,
    cover_price DECIMAL(8,2),
    reprint_date DATE,
    "position" INTEGER,
    cheapest_retailer TEXT,
    cheapest_price DECIMAL(8,2)
) AS $$
SELECT
    ce.id,
    ce.title,
    ce.slug,
    ce.print_status,
    ce.importance,
    ce.cover_price,
    ce.reprint_date,
    rpe.position,
    (SELECT a.retailer FROM availability a WHERE a.edition_id = ce.id AND a.in_stock = true ORDER BY a.approximate_price ASC LIMIT 1),
    (SELECT MIN(a.approximate_price) FROM availability a WHERE a.edition_id = ce.id AND a.in_stock = true)
FROM reading_path_entries rpe
JOIN collected_editions ce ON rpe.edition_id = ce.id
JOIN reading_paths rp ON rpe.path_id = rp.id
WHERE rp.slug = path_slug_param
ORDER BY rpe.position;
$$ LANGUAGE sql;

-- ============================================================
-- FUNCTION: Get print status history for an edition
-- ============================================================
CREATE OR REPLACE FUNCTION get_print_status_history(edition_slug_param TEXT)
RETURNS TABLE (
    old_status print_status,
    new_status print_status,
    changed_at TIMESTAMPTZ,
    source TEXT
) AS $$
SELECT
    psh.old_status,
    psh.new_status,
    psh.changed_at,
    psh.source
FROM print_status_history psh
JOIN collected_editions ce ON psh.edition_id = ce.id
WHERE ce.slug = edition_slug_param
ORDER BY psh.changed_at DESC;
$$ LANGUAGE sql;

-- ============================================================
-- FUNCTION: Get creator saga — all editions by creator
-- ordered by graph connections
-- ============================================================
CREATE OR REPLACE FUNCTION get_creator_saga(creator_slug_param TEXT)
RETURNS TABLE (
    edition_id UUID,
    title TEXT,
    slug TEXT,
    importance importance_level,
    print_status print_status,
    issues_collected TEXT,
    synopsis TEXT,
    era_name TEXT,
    cover_image_url TEXT,
    connection_count BIGINT
) AS $$
SELECT
    ce.id,
    ce.title,
    ce.slug,
    ce.importance,
    ce.print_status,
    ce.issues_collected,
    ce.synopsis,
    e.name AS era_name,
    COALESCE(ce.cover_image_url, ''),
    (SELECT COUNT(*) FROM connections c
     WHERE (c.source_type = 'edition' AND c.source_id = ce.id)
        OR (c.target_type = 'edition' AND c.target_id = ce.id)) AS connection_count
FROM collected_editions ce
JOIN edition_creators ec ON ce.id = ec.edition_id
JOIN creators cr ON ec.creator_id = cr.id
LEFT JOIN eras e ON ce.era_id = e.id
WHERE cr.slug = creator_slug_param
ORDER BY ce.release_date, ce.title;
$$ LANGUAGE sql;

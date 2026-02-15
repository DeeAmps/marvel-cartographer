-- ============================================================
-- 007: Add missing columns for frontend compatibility
-- ============================================================

-- Reading paths: add category and sections
ALTER TABLE reading_paths ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE reading_paths ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Connections: add slug columns for efficient frontend queries
-- These are denormalized for performance (avoids joining on every graph traversal)
ALTER TABLE connections ADD COLUMN IF NOT EXISTS source_slug TEXT;
ALTER TABLE connections ADD COLUMN IF NOT EXISTS target_slug TEXT;

CREATE INDEX IF NOT EXISTS idx_connections_source_slug ON connections(source_slug);
CREATE INDEX IF NOT EXISTS idx_connections_target_slug ON connections(target_slug);

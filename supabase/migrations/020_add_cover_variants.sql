-- ============================================================
-- 020: Add cover_variants JSONB column to collected_editions
-- ============================================================
-- Stores variant cover information after deduplication.
-- Each entry: {"title": "Mike Deodato Jr. Cover", "isbn": "978...", "cover_image_url": "https://..."}
-- The editions_full view uses ce.* so it picks this up automatically.

ALTER TABLE collected_editions
  ADD COLUMN IF NOT EXISTS cover_variants JSONB DEFAULT '[]';

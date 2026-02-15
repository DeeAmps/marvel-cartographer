-- ============================================================
-- 008: Trivia, Handbook Entries, and Issues tables
-- ============================================================

-- ============================================================
-- TRIVIA QUESTIONS
-- ============================================================
CREATE TABLE trivia_questions (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    source_issue TEXT,
    category TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_trivia_category ON trivia_questions(category);
CREATE INDEX idx_trivia_difficulty ON trivia_questions(difficulty);

-- ============================================================
-- HANDBOOK ENTRIES (complex nested data stored as JSONB)
-- ============================================================
CREATE TABLE handbook_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    entry_type TEXT NOT NULL,
    name TEXT NOT NULL,
    core_concept TEXT,
    canon_confidence INTEGER CHECK (canon_confidence BETWEEN 0 AND 100),
    description TEXT,
    tags TEXT[] DEFAULT '{}',
    source_citations TEXT[] DEFAULT '{}',
    related_edition_slugs TEXT[] DEFAULT '{}',
    related_event_slugs TEXT[] DEFAULT '{}',
    related_conflict_slugs TEXT[] DEFAULT '{}',
    related_handbook_slugs TEXT[] DEFAULT '{}',
    status_by_era JSONB DEFAULT '[]'::jsonb,
    retcon_history JSONB DEFAULT '[]'::jsonb,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_handbook_slug ON handbook_entries(slug);
CREATE INDEX idx_handbook_type ON handbook_entries(entry_type);
CREATE INDEX idx_handbook_tags ON handbook_entries USING GIN(tags);

-- ============================================================
-- KEY ISSUES
-- ============================================================
CREATE TABLE issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    series TEXT NOT NULL,
    issue_number TEXT NOT NULL,
    publication_date DATE,
    title TEXT,
    importance TEXT DEFAULT 'recommended',
    first_appearances TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_issues_series ON issues(series);
CREATE INDEX idx_issues_importance ON issues(importance);

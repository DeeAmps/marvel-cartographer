-- ============================================================
-- 003: Reading Paths, Resources, Retailers, User Collections
-- ============================================================

CREATE TYPE path_type AS ENUM (
    'character', 'team', 'event', 'creator', 'thematic', 'curated', 'complete'
);

CREATE TYPE difficulty_level AS ENUM (
    'beginner', 'intermediate', 'advanced', 'completionist'
);

CREATE TYPE resource_type AS ENUM (
    'youtube_channel', 'youtube_video', 'podcast', 'website', 'article'
);

-- ============================================================
-- READING PATHS
-- ============================================================
CREATE TABLE reading_paths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    path_type path_type NOT NULL,
    difficulty difficulty_level NOT NULL,
    description TEXT NOT NULL,
    estimated_issues INTEGER,
    estimated_cost DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE reading_path_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id UUID REFERENCES reading_paths(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    note TEXT,
    is_optional BOOLEAN DEFAULT false,
    UNIQUE(path_id, position)
);

-- ============================================================
-- RESOURCES
-- ============================================================
CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    resource_type resource_type NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    focus TEXT,
    best_for TEXT,
    related_era_ids UUID[] DEFAULT '{}',
    related_edition_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RETAILERS
-- ============================================================
CREATE TABLE retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    notes TEXT,
    is_digital BOOLEAN DEFAULT false,
    ships_international BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER COLLECTIONS
-- ============================================================
CREATE TABLE user_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'owned',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    added_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, edition_id)
);

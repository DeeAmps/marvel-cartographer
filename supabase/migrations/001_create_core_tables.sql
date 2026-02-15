-- ============================================================
-- 001: Core Tables — Eras, Creators, Characters, Editions
-- ============================================================

-- Enums
CREATE TYPE edition_format AS ENUM (
    'omnibus', 'epic_collection', 'trade_paperback', 'hardcover',
    'masterworks', 'compendium', 'complete_collection', 'oversized_hardcover'
);

CREATE TYPE print_status AS ENUM (
    'in_print', 'out_of_print', 'upcoming', 'digital_only', 'ongoing', 'check_availability'
);

CREATE TYPE importance_level AS ENUM (
    'essential', 'recommended', 'supplemental', 'completionist'
);

-- ============================================================
-- ERAS
-- ============================================================
CREATE TABLE eras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    year_start INTEGER NOT NULL,
    year_end INTEGER NOT NULL,
    subtitle TEXT,
    description TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CREATORS
-- ============================================================
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    roles TEXT[] DEFAULT '{}',
    active_years TEXT,
    bio TEXT,
    image_url TEXT,
    metron_id INTEGER,
    comicvine_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_creators_metron_id ON creators(metron_id);

-- ============================================================
-- CHARACTERS
-- ============================================================
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    aliases TEXT[] DEFAULT '{}',
    first_appearance_issue TEXT,
    universe TEXT DEFAULT 'Earth-616',
    teams TEXT[] DEFAULT '{}',
    description TEXT,
    image_url TEXT,
    metron_id INTEGER,
    comicvine_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_characters_metron_id ON characters(metron_id);

-- ============================================================
-- COLLECTED EDITIONS (Primary navigation unit)
-- ============================================================
CREATE TABLE collected_editions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    format edition_format NOT NULL,
    issues_collected TEXT NOT NULL,
    issue_count INTEGER,
    page_count INTEGER,
    isbn TEXT,
    cover_price DECIMAL(8,2),
    print_status print_status NOT NULL,
    importance importance_level NOT NULL,
    release_date DATE,
    edition_number INTEGER DEFAULT 1,
    era_id UUID REFERENCES eras(id),
    synopsis TEXT NOT NULL,
    connection_notes TEXT,
    cover_image_url TEXT,
    metron_id INTEGER,
    comicvine_id INTEGER,
    gcd_id INTEGER,
    detail_url TEXT,
    search_text TSVECTOR,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_editions_search ON collected_editions USING GIN(search_text);
CREATE INDEX idx_editions_era ON collected_editions(era_id);
CREATE INDEX idx_editions_importance ON collected_editions(importance);
CREATE INDEX idx_editions_print_status ON collected_editions(print_status);
CREATE INDEX idx_editions_metron_id ON collected_editions(metron_id);
CREATE INDEX idx_editions_comicvine_id ON collected_editions(comicvine_id);
CREATE INDEX idx_editions_gcd_id ON collected_editions(gcd_id);

-- Auto-update search vector
CREATE OR REPLACE FUNCTION update_edition_search() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_text := to_tsvector('english',
        coalesce(NEW.title, '') || ' ' ||
        coalesce(NEW.issues_collected, '') || ' ' ||
        coalesce(NEW.synopsis, '') || ' ' ||
        coalesce(NEW.connection_notes, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_edition_search
    BEFORE INSERT OR UPDATE ON collected_editions
    FOR EACH ROW EXECUTE FUNCTION update_edition_search();

-- ============================================================
-- EDITION <-> CREATOR junction
-- ============================================================
CREATE TABLE edition_creators (
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    PRIMARY KEY (edition_id, creator_id, role)
);

-- ============================================================
-- EDITION <-> CHARACTER junction (populated by enrichment)
-- ============================================================
CREATE TABLE edition_characters (
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    character_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    PRIMARY KEY (edition_id, character_id)
);

-- ============================================================
-- AVAILABILITY
-- ============================================================
CREATE TABLE availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    retailer TEXT NOT NULL,
    url TEXT,
    approximate_price DECIMAL(8,2),
    in_stock BOOLEAN DEFAULT true,
    last_checked TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STORY ARCS
-- ============================================================
CREATE TABLE story_arcs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    issues TEXT NOT NULL,
    era_id UUID REFERENCES eras(id),
    importance importance_level NOT NULL,
    synopsis TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE arc_editions (
    arc_id UUID REFERENCES story_arcs(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    PRIMARY KEY (arc_id, edition_id)
);

-- ============================================================
-- EVENTS
-- ============================================================
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    year INTEGER NOT NULL,
    core_issues TEXT NOT NULL,
    importance importance_level NOT NULL,
    synopsis TEXT NOT NULL,
    impact TEXT,
    prerequisites TEXT,
    consequences TEXT,
    era_id UUID REFERENCES eras(id),
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE event_editions (
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    is_core BOOLEAN DEFAULT false,
    reading_order INTEGER,
    PRIMARY KEY (event_id, edition_id)
);

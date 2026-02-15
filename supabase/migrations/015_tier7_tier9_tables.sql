-- ============================================================
-- Migration 015: Tier 7 & Tier 9 Feature Tables
-- MCU Cross-Reference, Debate Arena, Infinity Themes, Journey
-- ============================================================

-- MCU Cross-Reference (#33)
CREATE TABLE IF NOT EXISTS mcu_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'series', 'special')),
    release_date DATE,
    phase INTEGER,
    saga TEXT,
    poster_url TEXT,
    faithfulness_score INTEGER CHECK (faithfulness_score BETWEEN 0 AND 100),
    synopsis TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcu_comic_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mcu_content_id UUID REFERENCES mcu_content(id) ON DELETE CASCADE,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    mapping_type TEXT NOT NULL CHECK (mapping_type IN ('direct_adaptation', 'loose_inspiration', 'character_origin')),
    faithfulness INTEGER CHECK (faithfulness BETWEEN 0 AND 100),
    notes TEXT,
    UNIQUE(mcu_content_id, edition_id, mapping_type)
);

CREATE INDEX IF NOT EXISTS idx_mcu_mappings_content ON mcu_comic_mappings(mcu_content_id);
CREATE INDEX IF NOT EXISTS idx_mcu_mappings_edition ON mcu_comic_mappings(edition_id);

-- Infinity Stones Thematic Tags (#26)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'collected_editions' AND column_name = 'infinity_themes'
    ) THEN
        ALTER TABLE collected_editions ADD COLUMN infinity_themes TEXT[] DEFAULT '{}';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_editions_infinity_themes ON collected_editions USING GIN(infinity_themes);

-- Debate Arena (#34)
CREATE TABLE IF NOT EXISTS debates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    question TEXT NOT NULL,
    category TEXT NOT NULL,
    context TEXT,
    is_featured BOOLEAN DEFAULT false,
    featured_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    related_edition_ids UUID[] DEFAULT '{}',
    related_character_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debate_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    position TEXT NOT NULL CHECK (position IN ('agree', 'disagree', 'complicated')),
    evidence_text TEXT,
    evidence_citations TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(debate_id, user_id)
);

CREATE TABLE IF NOT EXISTS debate_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    position TEXT NOT NULL CHECK (position IN ('agree', 'disagree', 'complicated')),
    edition_id UUID REFERENCES collected_editions(id),
    issue_citation TEXT NOT NULL,
    description TEXT NOT NULL,
    vote_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debate_votes_debate ON debate_votes(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_evidence_debate ON debate_evidence(debate_id);

-- Reading Journey timestamps (#25)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_collections' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE user_collections ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'user_collections' AND column_name = 'read_order'
    ) THEN
        ALTER TABLE user_collections ADD COLUMN read_order INTEGER;
    END IF;
END $$;

-- RLS policies for new tables
ALTER TABLE mcu_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcu_comic_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_evidence ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "mcu_content_read" ON mcu_content FOR SELECT USING (true);
CREATE POLICY "mcu_mappings_read" ON mcu_comic_mappings FOR SELECT USING (true);
CREATE POLICY "debates_read" ON debates FOR SELECT USING (true);
CREATE POLICY "debate_votes_read" ON debate_votes FOR SELECT USING (true);
CREATE POLICY "debate_evidence_read" ON debate_evidence FOR SELECT USING (true);

-- Authenticated write for votes/evidence
CREATE POLICY "debate_votes_insert" ON debate_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "debate_votes_update" ON debate_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "debate_evidence_insert" ON debate_evidence FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Phase 2 & 3: Enhanced Comparisons, Calendar, Context Engine,
-- Retcon Tracker, Character Relationship Map
-- ============================================================

-- ============================================================
-- COMPARISON VOTES (community "which should I buy?" voting)
-- ============================================================

CREATE TABLE IF NOT EXISTS comparison_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    edition_a_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    edition_b_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    -- Each user can only vote once per edition pair
    UNIQUE(user_id, edition_a_id, edition_b_id)
);

CREATE INDEX idx_comparison_votes_pair ON comparison_votes(edition_a_id, edition_b_id);

-- Aggregated vote stats per pair (materialized for performance)
CREATE TABLE IF NOT EXISTS comparison_vote_stats (
    edition_a_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    edition_b_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    a_votes INTEGER DEFAULT 0,
    b_votes INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (edition_a_id, edition_b_id)
);

-- Trigger to update vote stats on new vote
CREATE OR REPLACE FUNCTION update_comparison_vote_stats()
RETURNS TRIGGER AS $$
DECLARE
    canonical_a UUID;
    canonical_b UUID;
BEGIN
    -- Canonical ordering: smaller UUID first
    IF NEW.edition_a_id < NEW.edition_b_id THEN
        canonical_a := NEW.edition_a_id;
        canonical_b := NEW.edition_b_id;
    ELSE
        canonical_a := NEW.edition_b_id;
        canonical_b := NEW.edition_a_id;
    END IF;

    INSERT INTO comparison_vote_stats (edition_a_id, edition_b_id, a_votes, b_votes, updated_at)
    VALUES (
        canonical_a,
        canonical_b,
        CASE WHEN NEW.winner_id = canonical_a THEN 1 ELSE 0 END,
        CASE WHEN NEW.winner_id = canonical_b THEN 1 ELSE 0 END,
        now()
    )
    ON CONFLICT (edition_a_id, edition_b_id)
    DO UPDATE SET
        a_votes = comparison_vote_stats.a_votes + CASE WHEN NEW.winner_id = canonical_a THEN 1 ELSE 0 END,
        b_votes = comparison_vote_stats.b_votes + CASE WHEN NEW.winner_id = canonical_b THEN 1 ELSE 0 END,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_comparison_vote_stats
    AFTER INSERT ON comparison_votes
    FOR EACH ROW EXECUTE FUNCTION update_comparison_vote_stats();

-- RLS for comparison_votes
ALTER TABLE comparison_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read all votes" ON comparison_votes FOR SELECT USING (true);
CREATE POLICY "Users can insert own votes" ON comparison_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- comparison_vote_stats is read-only for clients
ALTER TABLE comparison_vote_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vote stats" ON comparison_vote_stats FOR SELECT USING (true);

-- ============================================================
-- CHARACTER RELATIONSHIPS (explicit curated edges)
-- ============================================================

CREATE TYPE relationship_type AS ENUM (
    'ally', 'enemy', 'family', 'romantic', 'mentor', 'rival', 'teammate'
);

CREATE TABLE IF NOT EXISTS character_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_a_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    character_b_id UUID REFERENCES characters(id) ON DELETE CASCADE,
    relationship_type relationship_type NOT NULL,
    strength INTEGER CHECK (strength BETWEEN 1 AND 10) DEFAULT 5,
    description TEXT,
    citation TEXT,
    era_slug TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(character_a_id, character_b_id, relationship_type)
);

CREATE INDEX idx_char_rel_a ON character_relationships(character_a_id);
CREATE INDEX idx_char_rel_b ON character_relationships(character_b_id);

-- RLS
ALTER TABLE character_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read relationships" ON character_relationships FOR SELECT USING (true);

-- ============================================================
-- SEED: Key character relationships (~40 curated edges)
-- ============================================================
-- We use a DO block to look up character UUIDs by slug

DO $$
DECLARE
    -- Character IDs
    v_reed UUID; v_doom UUID; v_sue UUID; v_ben UUID; v_johnny UUID;
    v_peter UUID; v_mj UUID; v_harry UUID; v_norman UUID;
    v_xavier UUID; v_magneto UUID; v_wolverine UUID; v_cyclops UUID;
    v_jean UUID; v_storm UUID; v_scott UUID;
    v_tony UUID; v_cap UUID; v_thor UUID; v_loki UUID;
    v_hulk UUID; v_natasha UUID; v_clint UUID;
    v_daredevil UUID; v_punisher UUID; v_kingpin UUID;
    v_thanos UUID; v_warlock UUID; v_surfer UUID; v_galactus UUID;
    v_miles UUID; v_t_challa UUID; v_namor UUID;
    v_strange UUID; v_wanda UUID; v_vision UUID; v_pietro UUID;
    v_kamala UUID; v_carol UUID;
BEGIN
    SELECT id INTO v_reed FROM characters WHERE slug = 'reed-richards';
    SELECT id INTO v_doom FROM characters WHERE slug = 'doctor-doom';
    SELECT id INTO v_sue FROM characters WHERE slug = 'sue-storm';
    SELECT id INTO v_ben FROM characters WHERE slug = 'ben-grimm';
    SELECT id INTO v_johnny FROM characters WHERE slug = 'johnny-storm';
    SELECT id INTO v_peter FROM characters WHERE slug = 'peter-parker';
    SELECT id INTO v_mj FROM characters WHERE slug = 'mary-jane-watson';
    SELECT id INTO v_harry FROM characters WHERE slug = 'harry-osborn';
    SELECT id INTO v_norman FROM characters WHERE slug = 'norman-osborn';
    SELECT id INTO v_xavier FROM characters WHERE slug = 'charles-xavier';
    SELECT id INTO v_magneto FROM characters WHERE slug = 'magneto';
    SELECT id INTO v_wolverine FROM characters WHERE slug = 'wolverine';
    SELECT id INTO v_cyclops FROM characters WHERE slug = 'cyclops';
    SELECT id INTO v_jean FROM characters WHERE slug = 'jean-grey';
    SELECT id INTO v_storm FROM characters WHERE slug = 'storm';
    SELECT id INTO v_tony FROM characters WHERE slug = 'tony-stark';
    SELECT id INTO v_cap FROM characters WHERE slug = 'steve-rogers';
    SELECT id INTO v_thor FROM characters WHERE slug = 'thor';
    SELECT id INTO v_loki FROM characters WHERE slug = 'loki';
    SELECT id INTO v_hulk FROM characters WHERE slug = 'bruce-banner';
    SELECT id INTO v_natasha FROM characters WHERE slug = 'natasha-romanoff';
    SELECT id INTO v_clint FROM characters WHERE slug = 'clint-barton';
    SELECT id INTO v_daredevil FROM characters WHERE slug = 'matt-murdock';
    SELECT id INTO v_punisher FROM characters WHERE slug = 'frank-castle';
    SELECT id INTO v_kingpin FROM characters WHERE slug = 'kingpin';
    SELECT id INTO v_thanos FROM characters WHERE slug = 'thanos';
    SELECT id INTO v_warlock FROM characters WHERE slug = 'adam-warlock';
    SELECT id INTO v_surfer FROM characters WHERE slug = 'silver-surfer';
    SELECT id INTO v_galactus FROM characters WHERE slug = 'galactus';
    SELECT id INTO v_miles FROM characters WHERE slug = 'miles-morales';
    SELECT id INTO v_t_challa FROM characters WHERE slug = 'black-panther';
    SELECT id INTO v_namor FROM characters WHERE slug = 'namor';
    SELECT id INTO v_strange FROM characters WHERE slug = 'doctor-strange';
    SELECT id INTO v_wanda FROM characters WHERE slug = 'scarlet-witch';
    SELECT id INTO v_vision FROM characters WHERE slug = 'vision';
    SELECT id INTO v_pietro FROM characters WHERE slug = 'quicksilver';
    SELECT id INTO v_kamala FROM characters WHERE slug = 'kamala-khan';
    SELECT id INTO v_carol FROM characters WHERE slug = 'carol-danvers';

    -- FF relationships
    IF v_reed IS NOT NULL AND v_sue IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_reed, v_sue, 'romantic', 10, 'Married since FF Annual #3. The First Family.', 'FF Annual #3 (1965)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_reed IS NOT NULL AND v_doom IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_reed, v_doom, 'enemy', 10, 'College rivals turned archenemies. The defining rivalry of Marvel.', 'FF #5 (1962)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_reed IS NOT NULL AND v_ben IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_reed, v_ben, 'ally', 9, 'Best friends since college. Reed carries guilt for Ben''s transformation.', 'FF #1 (1961)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_sue IS NOT NULL AND v_johnny IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_sue, v_johnny, 'family', 10, 'Siblings. Sue is protective; Johnny is impulsive.', 'FF #1 (1961)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_sue IS NOT NULL AND v_namor IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_sue, v_namor, 'romantic', 6, 'Namor''s enduring attraction to Sue is a recurring tension.', 'FF #4 (1962)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Spider-Man relationships
    IF v_peter IS NOT NULL AND v_mj IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_peter, v_mj, 'romantic', 10, 'Married ASM Annual #21. Erased by Mephisto in OMD. Fans reject the retcon.', 'ASM Annual #21 (1987)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_peter IS NOT NULL AND v_norman IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_peter, v_norman, 'enemy', 10, 'The Green Goblin. Killed Gwen Stacy. Spider-Man''s greatest enemy.', 'ASM #14 (1964)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_peter IS NOT NULL AND v_harry IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_peter, v_harry, 'ally', 7, 'Best friends, complicated by Harry becoming the second Green Goblin.', 'ASM #31 (1965)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_peter IS NOT NULL AND v_miles IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_peter, v_miles, 'mentor', 8, 'Peter mentors Miles after Secret Wars brings him to 616.', 'Spider-Men #1 (2012)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- X-Men relationships
    IF v_xavier IS NOT NULL AND v_magneto IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_xavier, v_magneto, 'rival', 10, 'Friends turned ideological opponents. Integration vs separatism.', 'X-Men #1 (1963)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_wolverine IS NOT NULL AND v_cyclops IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_wolverine, v_cyclops, 'rival', 8, 'Love triangle with Jean. Leadership tension. Schism splits the X-Men.', 'UXM #98 (1976)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_cyclops IS NOT NULL AND v_jean IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_cyclops, v_jean, 'romantic', 9, 'The X-Men''s central romance. Phoenix Saga defines them.', 'X-Men #1 (1963)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_wolverine IS NOT NULL AND v_jean IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_wolverine, v_jean, 'romantic', 7, 'Unrequited love, sometimes requited. Decades of tension.', 'UXM #132 (1980)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_storm IS NOT NULL AND v_t_challa IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_storm, v_t_challa, 'romantic', 7, 'Married during Civil War. Annulled during AvX.', 'Black Panther #18 (2006)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Avengers relationships
    IF v_tony IS NOT NULL AND v_cap IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_tony, v_cap, 'rival', 9, 'Friends torn apart by Civil War. The ideological heart of the Avengers.', 'Civil War #1 (2006)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_thor IS NOT NULL AND v_loki IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_thor, v_loki, 'family', 10, 'Adopted brothers. Loki''s jealousy drives most of Thor''s conflicts.', 'Journey into Mystery #85 (1962)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_natasha IS NOT NULL AND v_clint IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_natasha, v_clint, 'ally', 8, 'Partners, former lovers. Deep trust forged through espionage.', 'Tales of Suspense #57 (1964)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_wanda IS NOT NULL AND v_vision IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_wanda, v_vision, 'romantic', 9, 'Married. Had children (sort of). Tragic love story.', 'Avengers #113 (1973)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_wanda IS NOT NULL AND v_pietro IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_wanda, v_pietro, 'family', 10, 'Twins. Inseparable bond, even as parentage changes repeatedly.', 'X-Men #4 (1964)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Street level
    IF v_daredevil IS NOT NULL AND v_kingpin IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_daredevil, v_kingpin, 'enemy', 10, 'The defining street-level rivalry. Fisk destroys Matt''s life repeatedly.', 'Daredevil #170 (1981)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_daredevil IS NOT NULL AND v_punisher IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_daredevil, v_punisher, 'rival', 7, 'Ideological opposites on justice. Respect each other but clash constantly.', 'Daredevil #183 (1982)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_peter IS NOT NULL AND v_daredevil IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_peter, v_daredevil, 'ally', 6, 'Fellow New York heroes. Team up frequently on street-level threats.', 'ASM #16 (1964)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Cosmic relationships
    IF v_thanos IS NOT NULL AND v_warlock IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_thanos, v_warlock, 'enemy', 9, 'Cosmic nemeses. Warlock is Thanos''s counterbalance in the universe.', 'Warlock #9 (1975)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_surfer IS NOT NULL AND v_galactus IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_surfer, v_galactus, 'enemy', 8, 'Former herald turned rebel. Norrin Radd sacrificed his world for freedom.', 'FF #48 (1966)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Mentor relationships
    IF v_xavier IS NOT NULL AND v_cyclops IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_xavier, v_cyclops, 'mentor', 9, 'Xavier''s first student. Scott carries the dream when Xavier falters.', 'X-Men #1 (1963)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_cap IS NOT NULL AND v_peter IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_cap, v_peter, 'mentor', 6, 'Cap sees himself in Peter''s idealism. Civil War strains this.', 'ASM #537 (2007)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_strange IS NOT NULL AND v_wanda IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_strange, v_wanda, 'mentor', 7, 'Strange trains Wanda in chaos magic. She eventually surpasses him.', 'Avengers #503 (2004)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_carol IS NOT NULL AND v_kamala IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_carol, v_kamala, 'mentor', 8, 'Kamala idolizes Carol. Takes the Ms. Marvel name in tribute.', 'Ms. Marvel #1 (2014)')
        ON CONFLICT DO NOTHING;
    END IF;

    -- Team rivalries
    IF v_hulk IS NOT NULL AND v_wolverine IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_hulk, v_wolverine, 'rival', 8, 'Wolverine debuted fighting Hulk. Clash of the unstoppable.', 'Incredible Hulk #181 (1974)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_hulk IS NOT NULL AND v_thor IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_hulk, v_thor, 'rival', 7, 'The eternal "who is stronger?" debate. Allies but always measuring.', 'Avengers #1 (1963)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_namor IS NOT NULL AND v_doom IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_namor, v_doom, 'ally', 6, 'Fellow monarchs and occasional allies against the heroes.', 'FF Annual #1 (1963)')
        ON CONFLICT DO NOTHING;
    END IF;
    IF v_t_challa IS NOT NULL AND v_namor IS NOT NULL THEN
        INSERT INTO character_relationships (character_a_id, character_b_id, relationship_type, strength, description, citation)
        VALUES (v_t_challa, v_namor, 'rival', 8, 'Kings of Wakanda and Atlantis. Namor floods Wakanda in Hickman''s run.', 'New Avengers #7 (2013)')
        ON CONFLICT DO NOTHING;
    END IF;

END $$;

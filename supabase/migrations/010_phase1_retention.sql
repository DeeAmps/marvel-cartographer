-- ============================================================
-- Phase 1: Retention Features
-- Tables: user_activity, user_stats, achievements, user_achievements,
--          edition_ratings, edition_rating_stats, user_briefing_views
-- ============================================================

-- ============================================================
-- USER ACTIVITY — tracks daily reading events
-- ============================================================
CREATE TABLE IF NOT EXISTS user_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT NOT NULL,  -- 'edition_reading', 'edition_completed', 'path_completed', 'trivia_played'
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_user_activity_user_date ON user_activity(user_id, activity_date);
CREATE INDEX idx_user_activity_type ON user_activity(activity_type);

-- ============================================================
-- USER STATS — cached XP/level/streaks per user
-- ============================================================
CREATE TABLE IF NOT EXISTS user_stats (
    user_id UUID PRIMARY KEY,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    editions_read INTEGER DEFAULT 0,
    paths_completed INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ACHIEVEMENTS — definitions
-- ============================================================
CREATE TYPE achievement_rarity AS ENUM (
    'common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'
);

CREATE TABLE IF NOT EXISTS achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    rarity achievement_rarity NOT NULL DEFAULT 'common',
    icon TEXT NOT NULL DEFAULT 'trophy',  -- lucide icon name
    requirement_type TEXT NOT NULL,       -- 'edition_read', 'edition_owned', 'streak', 'era_coverage', etc.
    requirement_value JSONB NOT NULL DEFAULT '{}',  -- e.g. {"count": 1} or {"streak": 7}
    xp_reward INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER ACHIEVEMENTS — unlocks
-- ============================================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON user_achievements(user_id);

-- ============================================================
-- EDITION RATINGS — user ratings
-- ============================================================
CREATE TABLE IF NOT EXISTS edition_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    edition_id UUID REFERENCES collected_editions(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review TEXT CHECK (char_length(review) <= 280),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, edition_id)
);

CREATE INDEX idx_edition_ratings_edition ON edition_ratings(edition_id);

-- ============================================================
-- EDITION RATING STATS — aggregated avg/count per edition
-- ============================================================
CREATE TABLE IF NOT EXISTS edition_rating_stats (
    edition_id UUID PRIMARY KEY REFERENCES collected_editions(id) ON DELETE CASCADE,
    average_rating NUMERIC(3,2) DEFAULT 0,
    rating_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- USER BRIEFING VIEWS — tracking daily briefing views
-- ============================================================
CREATE TABLE IF NOT EXISTS user_briefing_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    view_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_briefing_views_date ON user_briefing_views(view_date);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Calculate user streak from activity data
CREATE OR REPLACE FUNCTION calculate_user_streak(p_user_id UUID)
RETURNS TABLE (current_streak INTEGER, longest_streak INTEGER) AS $$
DECLARE
    v_current INTEGER := 0;
    v_longest INTEGER := 0;
    v_prev_date DATE;
    v_date DATE;
    v_streak INTEGER := 0;
BEGIN
    FOR v_date IN
        SELECT DISTINCT activity_date
        FROM user_activity
        WHERE user_id = p_user_id
        ORDER BY activity_date DESC
    LOOP
        IF v_prev_date IS NULL THEN
            -- First row: check if it's today or yesterday
            IF v_date >= CURRENT_DATE - INTERVAL '1 day' THEN
                v_streak := 1;
            ELSE
                v_streak := 0;
                EXIT;
            END IF;
        ELSIF v_prev_date - v_date = 1 THEN
            -- Consecutive day
            v_streak := v_streak + 1;
        ELSE
            -- Gap found
            EXIT;
        END IF;
        v_prev_date := v_date;
    END LOOP;

    v_current := v_streak;

    -- Calculate longest streak
    v_prev_date := NULL;
    v_streak := 0;
    FOR v_date IN
        SELECT DISTINCT activity_date
        FROM user_activity
        WHERE user_id = p_user_id
        ORDER BY activity_date ASC
    LOOP
        IF v_prev_date IS NULL OR v_date - v_prev_date = 1 THEN
            v_streak := v_streak + 1;
        ELSE
            IF v_streak > v_longest THEN
                v_longest := v_streak;
            END IF;
            v_streak := 1;
        END IF;
        v_prev_date := v_date;
    END LOOP;
    IF v_streak > v_longest THEN
        v_longest := v_streak;
    END IF;

    RETURN QUERY SELECT v_current, v_longest;
END;
$$ LANGUAGE plpgsql;

-- Trigger: update edition_rating_stats on rating insert/update/delete
CREATE OR REPLACE FUNCTION update_edition_rating_stats()
RETURNS TRIGGER AS $$
DECLARE
    v_edition_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_edition_id := OLD.edition_id;
    ELSE
        v_edition_id := NEW.edition_id;
    END IF;

    INSERT INTO edition_rating_stats (edition_id, average_rating, rating_count, updated_at)
    SELECT
        v_edition_id,
        COALESCE(AVG(rating), 0),
        COUNT(*),
        now()
    FROM edition_ratings
    WHERE edition_id = v_edition_id
    ON CONFLICT (edition_id) DO UPDATE SET
        average_rating = EXCLUDED.average_rating,
        rating_count = EXCLUDED.rating_count,
        updated_at = EXCLUDED.updated_at;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_rating_stats
    AFTER INSERT OR UPDATE OR DELETE ON edition_ratings
    FOR EACH ROW EXECUTE FUNCTION update_edition_rating_stats();

-- Trigger: init user_stats on first activity
CREATE OR REPLACE FUNCTION init_user_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_stats (user_id, total_xp, current_level, current_streak, longest_streak, last_activity_date, editions_read, paths_completed, updated_at)
    VALUES (NEW.user_id, 0, 1, 0, 0, NEW.activity_date, 0, 0, now())
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_init_user_stats
    AFTER INSERT ON user_activity
    FOR EACH ROW EXECUTE FUNCTION init_user_stats();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE edition_rating_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_briefing_views ENABLE ROW LEVEL SECURITY;

-- user_activity: users can only see/insert their own
CREATE POLICY user_activity_select ON user_activity FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_activity_insert ON user_activity FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_stats: users can only see/update their own
CREATE POLICY user_stats_select ON user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_stats_insert ON user_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY user_stats_update ON user_stats FOR UPDATE USING (auth.uid() = user_id);

-- achievements: readable by everyone
CREATE POLICY achievements_select ON achievements FOR SELECT USING (true);

-- user_achievements: users can see/insert their own
CREATE POLICY user_achievements_select ON user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_achievements_insert ON user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- edition_ratings: users can manage their own, everyone can read
CREATE POLICY edition_ratings_select ON edition_ratings FOR SELECT USING (true);
CREATE POLICY edition_ratings_insert ON edition_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY edition_ratings_update ON edition_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY edition_ratings_delete ON edition_ratings FOR DELETE USING (auth.uid() = user_id);

-- edition_rating_stats: readable by everyone
CREATE POLICY edition_rating_stats_select ON edition_rating_stats FOR SELECT USING (true);

-- user_briefing_views: users can see/insert their own
CREATE POLICY user_briefing_views_select ON user_briefing_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY user_briefing_views_insert ON user_briefing_views FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- SEED: 13 Achievements
-- ============================================================
INSERT INTO achievements (slug, name, description, rarity, icon, requirement_type, requirement_value, xp_reward) VALUES
    ('first-contact', 'First Contact', 'Mark your first edition as completed', 'common', 'book-open', 'edition_read', '{"count": 1}', 10),
    ('origin-story', 'Origin Story', 'Complete 5 editions', 'common', 'sparkles', 'edition_read', '{"count": 5}', 25),
    ('collector', 'Collector', 'Own 10 editions in your collection', 'uncommon', 'library', 'edition_owned', '{"count": 10}', 30),
    ('hoarder', 'Hoarder', 'Own 50 editions in your collection', 'rare', 'archive', 'edition_owned', '{"count": 50}', 75),
    ('cosmic-awareness', 'Cosmic Awareness', 'Read editions from 5 different eras', 'uncommon', 'globe', 'era_coverage', '{"count": 5}', 40),
    ('multiverse-scholar', 'Multiverse Scholar', 'Read editions from 10 different eras', 'rare', 'orbit', 'era_coverage', '{"count": 10}', 80),
    ('essential-reader', 'Essential Reader', 'Complete 10 essential-level editions', 'rare', 'star', 'essential_read', '{"count": 10}', 60),
    ('completionist', 'Completionist', 'Complete an entire reading path', 'epic', 'trophy', 'path_complete', '{"count": 1}', 100),
    ('dooms-approval', 'Doom''s Approval', 'Maintain a 7-day reading streak', 'uncommon', 'flame', 'streak', '{"days": 7}', 50),
    ('watchers-eye', 'Watcher''s Eye', 'Maintain a 30-day reading streak', 'epic', 'eye', 'streak', '{"days": 30}', 150),
    ('true-believer', 'True Believer', 'Complete the Absolute Essentials reading path', 'legendary', 'shield', 'path_complete', '{"path_slug": "absolute-essentials"}', 200),
    ('no-prize', 'No-Prize', 'Rate 20 different editions', 'rare', 'award', 'ratings_given', '{"count": 20}', 50),
    ('living-tribunal', 'Living Tribunal', 'Complete all reading paths', 'mythic', 'crown', 'all_paths_complete', '{}', 500)
ON CONFLICT (slug) DO NOTHING;

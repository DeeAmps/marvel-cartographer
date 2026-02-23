-- ============================================================
-- 019: Reading Schedule — Personal reading planner & calendar
-- ============================================================

-- Schedule item status enum
CREATE TYPE schedule_item_status AS ENUM (
    'scheduled', 'in_progress', 'completed', 'skipped', 'overdue'
);

-- ============================================================
-- READING SCHEDULES — Named plans (e.g., "2026 Reading Plan")
-- ============================================================
CREATE TABLE reading_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Reading Plan',
    pace_per_week NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    source_type TEXT CHECK (source_type IN ('path', 'collection', 'watcher', 'manual')),
    source_id TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reading_schedules_user ON reading_schedules(user_id);
CREATE INDEX idx_reading_schedules_active ON reading_schedules(user_id, is_active);

-- ============================================================
-- SCHEDULE ITEMS — Individual edition assignments
-- ============================================================
CREATE TABLE schedule_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES reading_schedules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    edition_id UUID NOT NULL REFERENCES collected_editions(id) ON DELETE CASCADE,
    scheduled_date DATE NOT NULL,
    due_date DATE NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    status schedule_item_status NOT NULL DEFAULT 'scheduled',
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(schedule_id, edition_id)
);

CREATE INDEX idx_schedule_items_user ON schedule_items(user_id);
CREATE INDEX idx_schedule_items_schedule ON schedule_items(schedule_id);
CREATE INDEX idx_schedule_items_date ON schedule_items(scheduled_date);
CREATE INDEX idx_schedule_items_status ON schedule_items(user_id, status);
CREATE INDEX idx_schedule_items_due ON schedule_items(due_date, status);

-- ============================================================
-- RLS — Same pattern as 009_auth_rls.sql
-- ============================================================

ALTER TABLE reading_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedules" ON reading_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules" ON reading_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON reading_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON reading_schedules
  FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE schedule_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own schedule items" ON schedule_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedule items" ON schedule_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedule items" ON schedule_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedule items" ON schedule_items
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get schedule statistics for a user
CREATE OR REPLACE FUNCTION get_schedule_stats(p_user_id UUID)
RETURNS TABLE (
    total_scheduled BIGINT,
    total_completed BIGINT,
    total_overdue BIGINT,
    current_week_items BIGINT,
    current_week_completed BIGINT,
    on_track BOOLEAN,
    next_edition_id UUID,
    next_edition_date DATE
) AS $$
DECLARE
    week_start DATE;
    week_end DATE;
BEGIN
    week_start := date_trunc('week', CURRENT_DATE)::date;
    week_end := week_start + INTERVAL '6 days';

    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND status != 'skipped')::BIGINT AS total_scheduled,
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND status = 'completed')::BIGINT AS total_completed,
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND status = 'overdue')::BIGINT AS total_overdue,
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND scheduled_date >= week_start AND scheduled_date <= week_end AND status != 'skipped')::BIGINT AS current_week_items,
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND scheduled_date >= week_start AND scheduled_date <= week_end AND status = 'completed')::BIGINT AS current_week_completed,
        (SELECT COUNT(*) FROM schedule_items WHERE user_id = p_user_id AND status = 'overdue')::BIGINT = 0 AS on_track,
        (SELECT si.edition_id FROM schedule_items si WHERE si.user_id = p_user_id AND si.status IN ('scheduled', 'in_progress') ORDER BY si.scheduled_date ASC, si.position ASC LIMIT 1) AS next_edition_id,
        (SELECT si.scheduled_date FROM schedule_items si WHERE si.user_id = p_user_id AND si.status IN ('scheduled', 'in_progress') ORDER BY si.scheduled_date ASC, si.position ASC LIMIT 1) AS next_edition_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark overdue items
CREATE OR REPLACE FUNCTION mark_overdue_items(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE schedule_items
    SET status = 'overdue', updated_at = now()
    WHERE user_id = p_user_id
      AND status = 'scheduled'
      AND due_date < CURRENT_DATE;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update updated_at on reading_schedules
CREATE OR REPLACE FUNCTION update_reading_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reading_schedules_updated
    BEFORE UPDATE ON reading_schedules
    FOR EACH ROW EXECUTE FUNCTION update_reading_schedule_timestamp();

CREATE TRIGGER trg_schedule_items_updated
    BEFORE UPDATE ON schedule_items
    FOR EACH ROW EXECUTE FUNCTION update_reading_schedule_timestamp();

-- ============================================================
-- SCHEDULE ACHIEVEMENTS
-- ============================================================

INSERT INTO achievements (slug, name, description, rarity, icon, requirement_type, requirement_value, xp_reward)
VALUES
  ('schedule-keeper', 'Schedule Keeper', 'Complete 5 scheduled readings on time', 'common', 'calendar-check', 'schedule_on_time', '{"count": 5}', 15),
  ('on-track-month', 'Perfect Month', 'Stay on track for 4 consecutive weeks', 'uncommon', 'trending-up', 'schedule_consecutive_weeks', '{"weeks": 4}', 30),
  ('reading-machine', 'Reading Machine', 'Complete 50 scheduled readings', 'rare', 'zap', 'schedule_total_completed', '{"count": 50}', 75),
  ('master-planner', 'Master Planner', 'Complete an entire scheduled reading path', 'epic', 'map', 'schedule_path_complete', '{}', 100)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ASK THE WATCHER — Query logging & rate limiting
-- ============================================================

CREATE TABLE IF NOT EXISTS watcher_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question TEXT NOT NULL,
    token_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watcher_queries_user
    ON watcher_queries(user_id, created_at);

-- RLS: users can only see their own queries
ALTER TABLE watcher_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own queries"
    ON watcher_queries FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own queries"
    ON watcher_queries FOR INSERT
    WITH CHECK (user_id = auth.uid());

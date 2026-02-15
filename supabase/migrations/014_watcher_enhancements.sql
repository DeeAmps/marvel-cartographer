-- ============================================================
-- Tier 5: Watcher Enhancements
-- Cached AI verdicts, newsletter subscribers, send log
-- ============================================================

-- Cached AI verdicts for editions
CREATE TABLE watcher_verdicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    edition_slug TEXT NOT NULL UNIQUE,
    verdict_json JSONB NOT NULL,
    model_version TEXT NOT NULL,
    generated_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days')
);
CREATE INDEX idx_verdicts_slug ON watcher_verdicts(edition_slug);

-- Newsletter subscribers
CREATE TABLE newsletter_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    preferences JSONB DEFAULT '{}',
    subscribed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own subscription" ON newsletter_subscribers
    FOR ALL USING (user_id = auth.uid());

-- Newsletter send log
CREATE TABLE newsletter_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    subject TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_newsletter_sends_user ON newsletter_sends(user_id, sent_at);

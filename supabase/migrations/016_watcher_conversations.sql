-- ============================================================
-- 016: Watcher Conversations — persist chat history
-- ============================================================

-- Conversations
CREATE TABLE watcher_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_watcher_conversations_user ON watcher_conversations(user_id, updated_at DESC);

-- Messages
CREATE TABLE watcher_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES watcher_conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'watcher')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_watcher_messages_conversation ON watcher_messages(conversation_id, created_at ASC);

-- Auto-update updated_at on conversation when a message is inserted
CREATE OR REPLACE FUNCTION update_watcher_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE watcher_conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_watcher_message_timestamp
    AFTER INSERT ON watcher_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_watcher_conversation_timestamp();

-- ============================================================
-- RLS Policies
-- ============================================================

ALTER TABLE watcher_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE watcher_messages ENABLE ROW LEVEL SECURITY;

-- Conversations: users can only access their own
CREATE POLICY "Users can view own conversations"
    ON watcher_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
    ON watcher_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
    ON watcher_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
    ON watcher_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Messages: access gated through conversation ownership
CREATE POLICY "Users can view messages in own conversations"
    ON watcher_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM watcher_conversations
            WHERE id = watcher_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages in own conversations"
    ON watcher_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM watcher_conversations
            WHERE id = watcher_messages.conversation_id
            AND user_id = auth.uid()
        )
    );

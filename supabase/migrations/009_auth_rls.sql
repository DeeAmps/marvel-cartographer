-- ============================================================
-- 009: Auth RLS — Secure user_collections with Row Level Security
-- ============================================================

-- Add FK to auth.users (user_id was previously unlinked)
ALTER TABLE user_collections
  ADD CONSTRAINT fk_user_collections_user
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE user_collections ENABLE ROW LEVEL SECURITY;

-- Users can read their own collections
CREATE POLICY "Users can view own collection" ON user_collections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert into their own collection
CREATE POLICY "Users can add to own collection" ON user_collections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own collection
CREATE POLICY "Users can update own collection" ON user_collections
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete from their own collection
CREATE POLICY "Users can delete from own collection" ON user_collections
  FOR DELETE USING (auth.uid() = user_id);

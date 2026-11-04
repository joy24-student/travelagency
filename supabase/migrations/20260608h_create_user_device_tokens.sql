-- ============================================================================
-- Migration: 20260608h_create_user_device_tokens.sql
-- Table for storing Firebase Cloud Messaging (FCM) device tokens
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES community_profiles(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'android' | 'ios' | 'web'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user ON user_device_tokens(user_id);

ALTER TABLE user_device_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public device tokens policy" ON user_device_tokens;
CREATE POLICY "Public device tokens policy" ON user_device_tokens FOR ALL USING (true);


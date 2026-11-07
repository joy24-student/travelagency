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

-- Revoke insecure public access
REVOKE ALL ON user_device_tokens FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_device_tokens TO authenticated, service_role;

DROP POLICY IF EXISTS "Public device tokens policy" ON user_device_tokens;
DROP POLICY IF EXISTS "User device tokens isolated" ON user_device_tokens;

-- Strict zero-trust policy: users can only manage their own device tokens
CREATE POLICY "User device tokens isolated" ON user_device_tokens
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

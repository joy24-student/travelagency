-- ============================================================================
-- Migration: 20260614_create_user_device_sessions.sql
-- Table for tracking active user devices, sessions, and remote logout revocation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'android' | 'ios' | 'web' | 'desktop'
  os_version TEXT,
  app_version TEXT,
  ip_address TEXT,
  location TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  is_revoked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_user_device_sessions_user_id ON public.user_device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_device_sessions_device_id ON public.user_device_sessions(device_id);

ALTER TABLE public.user_device_sessions ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon
REVOKE ALL ON public.user_device_sessions FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_device_sessions TO authenticated, service_role;

DROP POLICY IF EXISTS "User device sessions isolated" ON public.user_device_sessions;

-- Zero-trust policy: users can only view and manage their own sessions
CREATE POLICY "User device sessions isolated" ON public.user_device_sessions
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

NOTIFY pgrst, 'reload schema';

-- Migration 20260608i: Create user_settings and user_addresses tables
CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  notifications BOOLEAN DEFAULT true,
  "notificationsEnabled" BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  "emailNotifications" BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  "emailDigest" BOOLEAN DEFAULT true,
  "flightAlerts" BOOLEAN DEFAULT true,
  "dealsPromos" BOOLEAN DEFAULT true,
  "chatMessages" BOOLEAN DEFAULT true,
  "darkMode" BOOLEAN DEFAULT false,
  dark_mode BOOLEAN DEFAULT false,
  "darkTheme" BOOLEAN DEFAULT false,
  "targetedAdsOptOut" BOOLEAN DEFAULT false,
  "highContrast" BOOLEAN DEFAULT false,
  "largeText" BOOLEAN DEFAULT false,
  "reduceMotion" BOOLEAN DEFAULT false,
  "hapticFeedback" BOOLEAN DEFAULT true,
  "twoFactorAuth" BOOLEAN DEFAULT false,
  two_factor_auth BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'English (US)',
  country TEXT DEFAULT 'United States',
  currency TEXT DEFAULT 'USD',
  units TEXT DEFAULT 'Metric',
  "tempScale" TEXT DEFAULT 'Celsius',
  "timeFormat" TEXT DEFAULT '12-hour',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon
REVOKE ALL ON public.user_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated, service_role;

DROP POLICY IF EXISTS user_settings_all ON public.user_settings;
DROP POLICY IF EXISTS "User settings isolated" ON public.user_settings;

CREATE POLICY "User settings isolated" ON public.user_settings
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON public.user_addresses(user_id);

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

-- Revoke all access from anon
REVOKE ALL ON public.user_addresses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated, service_role;

DROP POLICY IF EXISTS user_addresses_all ON public.user_addresses;
DROP POLICY IF EXISTS "User addresses isolated" ON public.user_addresses;

CREATE POLICY "User addresses isolated" ON public.user_addresses
  FOR ALL TO authenticated
  USING ((SELECT auth.uid()) = user_id OR public.is_admin())
  WITH CHECK ((SELECT auth.uid()) = user_id OR public.is_admin());

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- Migration: 20260615_add_missing_system_and_operational_tables.sql
-- Description: Adds all missing operational, admin, security, loyalty,
--              tour guides, and integration tables to align with codebase.
--              Enables Supabase Realtime CDC publication on bookings.
-- ============================================================================

-- Enable required extensions if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Profiles & Users Mapping Views / Tables
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    notification_marketing BOOLEAN DEFAULT true,
    notification_security BOOLEAN DEFAULT true,
    notification_booking BOOLEAN DEFAULT true,
    deletion_requested_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
    FOR SELECT USING (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role' OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR auth.jwt() ->> 'role' = 'service_role');

-- Create users table for admin overview and user management
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    full_name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user',
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_sign_in_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_read_all" ON public.users FOR SELECT USING (true);
CREATE POLICY "users_admin_write" ON public.users FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 2. User Roles & Verification
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'user',
    permissions TEXT[] DEFAULT '{}',
    assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_roles_read_own_or_admin" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.user_verification_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    kyc_status TEXT DEFAULT 'unverified',
    verification_status TEXT DEFAULT 'pending',
    nid_status TEXT DEFAULT 'unverified',
    passport_status TEXT DEFAULT 'unverified',
    phone_verified BOOLEAN DEFAULT false,
    email_verified BOOLEAN DEFAULT false,
    kyc_submitted_at TIMESTAMPTZ,
    kyc_verified_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_verification_status_user_id ON public.user_verification_status(user_id);
ALTER TABLE public.user_verification_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_verification_status_all" ON public.user_verification_status
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    tier TEXT DEFAULT 'standard',
    status TEXT DEFAULT 'active',
    start_date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    end_date TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    auto_renew BOOLEAN DEFAULT false,
    payment_method TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_subscriptions_read_own" ON public.user_subscriptions
    FOR SELECT USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 3. Security, Auditing & Threat Monitoring
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT DEFAULT 'system',
    severity TEXT NOT NULL DEFAULT 'medium',
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_severity ON public.admin_alerts(severity, is_resolved);
ALTER TABLE public.admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_alerts_admin_policy" ON public.admin_alerts
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_token TEXT,
    ip_address TEXT,
    user_agent TEXT,
    active BOOLEAN DEFAULT true,
    last_active TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON public.admin_sessions(admin_id);
ALTER TABLE public.admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_sessions_policy" ON public.admin_sessions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.threat_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    threat_type TEXT NOT NULL,
    severity TEXT NOT NULL DEFAULT 'high',
    source_ip TEXT,
    description TEXT,
    status TEXT DEFAULT 'detected',
    detected_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.threat_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "threat_alerts_policy" ON public.threat_alerts
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    severity TEXT DEFAULT 'info',
    ip_address TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "security_events_policy" ON public.security_events
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.ip_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ip_whitelist_policy" ON public.ip_whitelist
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.two_factor_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    method TEXT DEFAULT 'authenticator',
    secret TEXT,
    backup_codes TEXT[] DEFAULT '{}',
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_two_factor_config_user_id ON public.two_factor_config(user_id);
ALTER TABLE public.two_factor_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "two_factor_config_own" ON public.two_factor_config
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.sms_verification_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    attempts INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sms_codes_phone ON public.sms_verification_codes(phone);
ALTER TABLE public.sms_verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sms_codes_policy" ON public.sms_verification_codes FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action, created_at);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_logs_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 4. Tour Guides & Bookings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tour_guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    bio TEXT,
    photo_url TEXT,
    languages TEXT[] DEFAULT '{"Bengali", "English"}',
    specialties TEXT[] DEFAULT '{"Heritage", "Nature"}',
    hourly_rate NUMERIC(10, 2) DEFAULT 500.00,
    daily_rate NUMERIC(10, 2) DEFAULT 3500.00,
    rating NUMERIC(3, 2) DEFAULT 5.0,
    review_count INT DEFAULT 0,
    is_verified BOOLEAN DEFAULT true,
    city TEXT DEFAULT 'Cox''s Bazar',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.tour_guides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tour_guides_public_read" ON public.tour_guides FOR SELECT USING (true);
CREATE POLICY "tour_guides_admin_write" ON public.tour_guides FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.guide_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES public.tour_guides(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tour_date DATE NOT NULL,
    duration_hours INT DEFAULT 4,
    meeting_point TEXT,
    special_requests TEXT,
    total_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_guide_bookings_user ON public.guide_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_guide_bookings_guide ON public.guide_bookings(guide_id);
ALTER TABLE public.guide_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "guide_bookings_user_policy" ON public.guide_bookings
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 5. Travel Matching, Price Alerts & Saved Filters
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.match_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    budget NUMERIC(10, 2),
    travel_style TEXT DEFAULT 'adventure',
    preferences JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'active',
    matched_user_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_match_requests_dest ON public.match_requests(destination, status);
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_requests_policy" ON public.match_requests FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL DEFAULT 'flight',
    origin TEXT,
    destination TEXT NOT NULL,
    travel_date DATE,
    target_price NUMERIC(10, 2) NOT NULL,
    current_price NUMERIC(10, 2),
    currency TEXT DEFAULT 'BDT',
    is_active BOOLEAN DEFAULT true,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_price_alerts_user ON public.price_alerts(user_id, is_active);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "price_alerts_user_policy" ON public.price_alerts
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filter_name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_saved_filters_user ON public.saved_filters(user_id);
ALTER TABLE public.saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_filters_user_policy" ON public.saved_filters
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.admin_saved_filters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    filter_type TEXT DEFAULT 'analytics',
    filter_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.admin_saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_saved_filters_policy" ON public.admin_saved_filters
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 6. Loyalty Rewards, Gamification & Streaks
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_required INT NOT NULL DEFAULT 500,
    reward_type TEXT DEFAULT 'discount_voucher',
    discount_amount NUMERIC(10, 2) DEFAULT 200.00,
    expires_in_days INT DEFAULT 30,
    is_active BOOLEAN DEFAULT true,
    stock INT DEFAULT 100,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "loyalty_rewards_public_read" ON public.loyalty_rewards FOR SELECT USING (true);
CREATE POLICY "loyalty_rewards_admin_write" ON public.loyalty_rewards
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID NOT NULL REFERENCES public.loyalty_rewards(id) ON DELETE CASCADE,
    points_spent INT NOT NULL,
    status TEXT DEFAULT 'active',
    redemption_code TEXT NOT NULL UNIQUE,
    redeemed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON public.reward_redemptions(user_id);
ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reward_redemptions_user_policy" ON public.reward_redemptions
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 1,
    longest_streak INT DEFAULT 1,
    last_login_date DATE DEFAULT CURRENT_DATE,
    freeze_tokens INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON public.user_streaks(user_id);
ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_streaks_user_policy" ON public.user_streaks
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 7. Agency Operations & Payments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_agencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, agency_id)
);
CREATE INDEX IF NOT EXISTS idx_saved_agencies_user ON public.saved_agencies(user_id);
ALTER TABLE public.saved_agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_agencies_user_policy" ON public.saved_agencies
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.agency_live_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    host_name TEXT,
    status TEXT DEFAULT 'scheduled',
    viewer_count INT DEFAULT 0,
    stream_url TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agency_live_sessions_agency ON public.agency_live_sessions(agency_id);
ALTER TABLE public.agency_live_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_live_sessions_read" ON public.agency_live_sessions FOR SELECT USING (true);
CREATE POLICY "agency_live_sessions_write" ON public.agency_live_sessions
    FOR ALL USING (auth.jwt() ->> 'role' IN ('agency', 'admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.agency_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency TEXT DEFAULT 'BDT',
    status TEXT DEFAULT 'completed',
    payment_method TEXT DEFAULT 'bank_transfer',
    transaction_reference TEXT,
    invoice_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agency_payments_agency ON public.agency_payments(agency_id);
ALTER TABLE public.agency_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agency_payments_policy" ON public.agency_payments
    FOR ALL USING (auth.jwt() ->> 'role' IN ('agency', 'admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 8. Notifications, Rules & Preferences
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT true,
    booking_updates BOOLEAN DEFAULT true,
    promotions BOOLEAN DEFAULT true,
    security_alerts BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_preferences_user_policy" ON public.notification_preferences
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    channels TEXT[] DEFAULT '{"push", "in_app"}',
    template_id TEXT,
    conditions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_rules_admin" ON public.notification_rules
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 9. Integrations, Webhooks, API Keys & Usage
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT DEFAULT 'webhook',
    provider TEXT DEFAULT 'custom',
    config JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'connected',
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integrations_admin" ON public.integrations
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    key_hash TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    scopes TEXT[] DEFAULT '{"read:bookings"}',
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_keys_admin" ON public.api_keys
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.api_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    method TEXT DEFAULT 'GET',
    status_code INT DEFAULT 200,
    response_time_ms INT DEFAULT 50,
    request_count INT DEFAULT 1,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON public.api_usage(created_at);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "api_usage_admin" ON public.api_usage
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID,
    url TEXT NOT NULL,
    events TEXT[] DEFAULT '{"booking.created", "booking.updated"}',
    headers JSONB DEFAULT '{}'::jsonb,
    secret TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhooks_admin" ON public.webhooks
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES public.webhooks(id) ON DELETE CASCADE,
    event_name TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    response_code INT,
    response_body TEXT,
    status TEXT DEFAULT 'success',
    execution_time_ms INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON public.webhook_logs(webhook_id);
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "webhook_logs_admin" ON public.webhook_logs
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 10. Automation, Tasks, Reports & Dashboards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bulk_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    operation_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    total_items INT DEFAULT 0,
    processed_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMPTZ
);
ALTER TABLE public.bulk_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bulk_operations_admin" ON public.bulk_operations
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'pending',
    priority INT DEFAULT 0,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_queue_status_sched ON public.job_queue(status, scheduled_for);
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_queue_admin" ON public.job_queue
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL DEFAULT '0 0 * * *',
    task_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.scheduled_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_tasks_admin" ON public.scheduled_tasks
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    report_type TEXT DEFAULT 'revenue_summary',
    frequency TEXT DEFAULT 'weekly',
    recipients TEXT[] DEFAULT '{}',
    format TEXT DEFAULT 'pdf',
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scheduled_reports_admin" ON public.scheduled_reports
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.custom_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    layout JSONB DEFAULT '[]'::jsonb,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_custom_dashboards_user ON public.custom_dashboards(user_id);
ALTER TABLE public.custom_dashboards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custom_dashboards_user_policy" ON public.custom_dashboards
    FOR ALL USING (auth.uid() = user_id OR auth.jwt() ->> 'role' IN ('admin', 'service_role'));

CREATE TABLE IF NOT EXISTS public.widget_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    widget_type TEXT NOT NULL,
    default_config JSONB DEFAULT '{}'::jsonb,
    category TEXT DEFAULT 'metrics',
    is_system BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.widget_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widget_templates_public_read" ON public.widget_templates FOR SELECT USING (true);
CREATE POLICY "widget_templates_admin" ON public.widget_templates
    FOR ALL USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- ----------------------------------------------------------------------------
-- 11. Realtime CDC Publication Sync for Bookings
-- ----------------------------------------------------------------------------
-- Ensure bookings table replica identity is set to FULL so that UPDATE CDC events
-- deliver the complete prior and updated rows.
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

DO $$
BEGIN
  -- Add bookings and related transactional tables to Supabase Realtime publication
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_items;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;

    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_payments;
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;

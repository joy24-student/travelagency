-- ============================================================================
-- Migration: 20260615_price_alerts_and_snapshots.sql
-- Description: Fare calendar with price alerts, price snapshots, RLS, and 10-alert cap
-- ============================================================================

-- 1. Create price_alerts table
CREATE TABLE IF NOT EXISTS public.price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service_type TEXT NOT NULL CHECK (service_type IN ('flight', 'bus', 'launch', 'train', 'hotel')),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    travel_date DATE NOT NULL,
    date_flex_days INT NOT NULL DEFAULT 0,
    target_price_paisa BIGINT NULL,
    drop_percent NUMERIC NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'paused', 'expired')),
    last_notified_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create price_snapshots table
CREATE TABLE IF NOT EXISTS public.price_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_key TEXT NOT NULL,
    travel_date DATE NOT NULL,
    lowest_price_paisa BIGINT NOT NULL,
    source TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create required performance indexes
CREATE INDEX IF NOT EXISTS idx_price_snapshots_route_date_captured 
    ON public.price_snapshots (route_key, travel_date, captured_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_status 
    ON public.price_alerts (user_id, status);

CREATE INDEX IF NOT EXISTS idx_price_alerts_active_eval 
    ON public.price_alerts (status, travel_date) 
    WHERE status = 'active';

-- 4. Limit 10 active alerts per user via database trigger
CREATE OR REPLACE FUNCTION public.check_max_active_alerts_per_user()
RETURNS TRIGGER AS $$
DECLARE
    active_count INT;
BEGIN
    -- Only evaluate when moving into or creating an 'active' alert
    IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR OLD.status <> 'active') THEN
        SELECT count(*) INTO active_count
        FROM public.price_alerts
        WHERE user_id = NEW.user_id 
          AND status = 'active'
          AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF active_count >= 10 THEN
            RAISE EXCEPTION 'User cannot exceed limit of 10 active price alerts.'
                USING ERRCODE = 'P0001';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enforce_max_active_alerts ON public.price_alerts;
CREATE TRIGGER trigger_enforce_max_active_alerts
    BEFORE INSERT OR UPDATE ON public.price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.check_max_active_alerts_per_user();

-- Auto-update updated_at timestamp on price_alerts
CREATE OR REPLACE FUNCTION public.update_price_alerts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_price_alerts_updated_at ON public.price_alerts;
CREATE TRIGGER trigger_price_alerts_updated_at
    BEFORE UPDATE ON public.price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_price_alerts_timestamp();

-- 5. Enable and FORCE Row Level Security (RLS)
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.price_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_snapshots FORCE ROW LEVEL SECURITY;

-- 6. RLS Policies for price_alerts: Users manage only their own alerts
DROP POLICY IF EXISTS "Users view own price alerts" ON public.price_alerts;
CREATE POLICY "Users view own price alerts"
    ON public.price_alerts
    FOR SELECT
    USING (
        auth.uid() = user_id 
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users insert own price alerts" ON public.price_alerts;
CREATE POLICY "Users insert own price alerts"
    ON public.price_alerts
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id 
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users update own price alerts" ON public.price_alerts;
CREATE POLICY "Users update own price alerts"
    ON public.price_alerts
    FOR UPDATE
    USING (
        auth.uid() = user_id 
        OR auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        auth.uid() = user_id 
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Users delete own price alerts" ON public.price_alerts;
CREATE POLICY "Users delete own price alerts"
    ON public.price_alerts
    FOR DELETE
    USING (
        auth.uid() = user_id 
        OR auth.jwt() ->> 'role' = 'service_role'
    );

-- 7. RLS Policies for price_snapshots:
-- Readable by authenticated users and writable only by service_role
DROP POLICY IF EXISTS "Snapshots readable by authenticated and service_role" ON public.price_snapshots;
CREATE POLICY "Snapshots readable by authenticated and service_role"
    ON public.price_snapshots
    FOR SELECT
    USING (
        auth.role() IN ('authenticated', 'service_role')
        OR auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Snapshots insertable only by service_role" ON public.price_snapshots;
CREATE POLICY "Snapshots insertable only by service_role"
    ON public.price_snapshots
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Snapshots updatable only by service_role" ON public.price_snapshots;
CREATE POLICY "Snapshots updatable only by service_role"
    ON public.price_snapshots
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'service_role'
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

DROP POLICY IF EXISTS "Snapshots deletable only by service_role" ON public.price_snapshots;
CREATE POLICY "Snapshots deletable only by service_role"
    ON public.price_snapshots
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'service_role'
    );

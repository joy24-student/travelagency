-- ============================================================================
-- Migration: 20260615_booking_events.sql
-- Description: Realtime booking events ledger with strict Row Level Security (RLS)
-- and Supabase Realtime publication for multi-app synchronization across
-- Consumer, Agency (AGEN), and Hotel portals.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.booking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('created','paid','confirmed','rescheduled','cancelled','refunded','checked_in')),
  actor_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Index (booking_id, created_at desc)
CREATE INDEX IF NOT EXISTS idx_booking_events_booking_created 
  ON public.booking_events (booking_id, created_at DESC);

-- Index for delta synchronization / cursor catch-up on reconnect
CREATE INDEX IF NOT EXISTS idx_booking_events_created_at_desc
  ON public.booking_events (created_at DESC);

-- ENABLE and FORCE row level security
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_events FORCE ROW LEVEL SECURITY;

-- Deny all writes to anon and authenticated; only service_role inserts
REVOKE ALL ON public.booking_events FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.booking_events FROM authenticated;
GRANT SELECT ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;

-- SELECT policy:
-- 1. Booking owner (user_id = auth.uid())
-- 2. Agency whose agency_id matches the booking
-- 3. Hotel staff of the booking's hotel
-- 4. Platform administrators
DROP POLICY IF EXISTS booking_events_select_policy ON public.booking_events;
CREATE POLICY booking_events_select_policy ON public.booking_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_events.booking_id
        AND (
          b.user_id = (SELECT auth.uid())
          OR (
            b.agency_id IS NOT NULL AND (
              (SELECT public.is_agency_member(b.agency_id, (SELECT auth.uid())))
              OR EXISTS (
                SELECT 1 FROM public.agencies a 
                WHERE a.id = b.agency_id AND a.owner_user_id = (SELECT auth.uid())
              )
              OR EXISTS (
                SELECT 1 FROM public.agency_team_members atm 
                WHERE atm.agency_id = b.agency_id AND atm.user_id = (SELECT auth.uid()) AND atm.status = 'active'
              )
            )
          )
          OR (
            b.hotel_id IS NOT NULL AND (
              (SELECT public.is_hotel_staff(b.hotel_id, (SELECT auth.uid())))
              OR EXISTS (
                SELECT 1 FROM public.hotel_staff hs 
                WHERE hs.hotel_id = b.hotel_id AND hs.user_id = (SELECT auth.uid()) AND hs.status = 'active'
              )
            )
          )
          OR (SELECT public.is_admin((SELECT auth.uid())))
          OR EXISTS (
            SELECT 1 FROM public.admin_users au 
            WHERE au.user_id = (SELECT auth.uid()) AND au.status = 'active'
          )
        )
    )
    OR (SELECT public.is_admin((SELECT auth.uid())))
    OR EXISTS (
      SELECT 1 FROM public.admin_users au 
      WHERE au.user_id = (SELECT auth.uid()) AND au.status = 'active'
    )
  );

-- Set replica identity full so realtime updates emit complete row data
ALTER TABLE public.booking_events REPLICA IDENTITY FULL;

-- Add table to supabase_realtime publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'booking_events'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_events;
    END IF;
  END IF;
END $$;

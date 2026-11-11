-- ============================================================================
-- Migration: 20260615_offline_tamper_proof_tickets.sql
-- Description: Offline-capable, tamper-proof e-tickets and audit scan logs
--              with Zero-Trust Row Level Security (RLS).
-- ============================================================================

BEGIN;

-- 1. Create public.tickets Table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_name TEXT NOT NULL,
  service_type TEXT NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  seat TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'revoked', 'expired')),
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create public.ticket_scans Table
CREATE TABLE IF NOT EXISTS public.ticket_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scanner_device_id TEXT,
  result TEXT NOT NULL CHECK (result IN ('valid', 'invalid', 'used', 'expired', 'revoked')),
  scanned_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. High-Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_tickets_booking_id ON public.tickets(booking_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_valid_range ON public.tickets(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_tickets_updated_at ON public.tickets(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_id ON public.ticket_scans(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON public.ticket_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_synced_at ON public.ticket_scans(synced_at DESC);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_at ON public.ticket_scans(scanned_at DESC);

-- 4. Enable and Force Row Level Security (Zero-Trust)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_scans FORCE ROW LEVEL SECURITY;

-- 5. Drop existing policies if any
DROP POLICY IF EXISTS tickets_traveler_select ON public.tickets;
DROP POLICY IF EXISTS tickets_agency_staff_select ON public.tickets;
DROP POLICY IF EXISTS tickets_hotel_staff_select ON public.tickets;
DROP POLICY IF EXISTS tickets_admin_select ON public.tickets;
DROP POLICY IF EXISTS tickets_service_role_all ON public.tickets;

DROP POLICY IF EXISTS ticket_scans_insert_authorized_staff ON public.ticket_scans;
DROP POLICY IF EXISTS ticket_scans_select_staff ON public.ticket_scans;
DROP POLICY IF EXISTS ticket_scans_service_role_all ON public.ticket_scans;

-- 6. RLS Policies on public.tickets

-- A. Travellers read only their own tickets
CREATE POLICY tickets_traveler_select ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = tickets.booking_id
      AND b.user_id = (SELECT auth.uid())
  )
);

-- B. Agency staff read tickets of their agency's bookings
CREATE POLICY tickets_agency_staff_select ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = tickets.booking_id
      AND b.agency_id IS NOT NULL
      AND public.is_agency_member(b.agency_id, (SELECT auth.uid()))
  )
);

-- C. Hotel staff read tickets of their hotel's reservations
CREATE POLICY tickets_hotel_staff_select ON public.tickets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bookings b
    WHERE b.id = tickets.booking_id
      AND b.hotel_id IS NOT NULL
      AND public.is_hotel_staff(b.hotel_id, (SELECT auth.uid()))
  )
);

-- D. Admins read all tickets
CREATE POLICY tickets_admin_select ON public.tickets
FOR SELECT
TO authenticated
USING (
  public.is_admin((SELECT auth.uid()))
);

-- E. Only service_role writes tickets (insert, update, delete)
CREATE POLICY tickets_service_role_all ON public.tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 7. RLS Policies on public.ticket_scans

-- A. Authorized staff insert scans only for tickets belonging to their own agency or hotel
CREATE POLICY ticket_scans_insert_authorized_staff ON public.ticket_scans
FOR INSERT
TO authenticated
WITH CHECK (
  (scanned_by IS NULL OR scanned_by = (SELECT auth.uid()))
  AND (
    public.is_admin((SELECT auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      JOIN public.bookings b ON b.id = t.booking_id
      WHERE t.id = ticket_scans.ticket_id
        AND (
          (b.agency_id IS NOT NULL AND public.is_agency_member(b.agency_id, (SELECT auth.uid())))
          OR
          (b.hotel_id IS NOT NULL AND public.is_hotel_staff(b.hotel_id, (SELECT auth.uid())))
        )
    )
  )
);

-- B. Staff and admins read scans relevant to their properties/agency
CREATE POLICY ticket_scans_select_staff ON public.ticket_scans
FOR SELECT
TO authenticated
USING (
  scanned_by = (SELECT auth.uid())
  OR public.is_admin((SELECT auth.uid()))
  OR EXISTS (
    SELECT 1 FROM public.tickets t
    JOIN public.bookings b ON b.id = t.booking_id
    WHERE t.id = ticket_scans.ticket_id
      AND (
        (b.agency_id IS NOT NULL AND public.is_agency_member(b.agency_id, (SELECT auth.uid())))
        OR
        (b.hotel_id IS NOT NULL AND public.is_hotel_staff(b.hotel_id, (SELECT auth.uid())))
      )
  )
);

-- C. Full service_role access on ticket_scans
CREATE POLICY ticket_scans_service_role_all ON public.ticket_scans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 8. Explicit Role Permissions & Grants
REVOKE ALL ON public.tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.tickets FROM authenticated;
GRANT SELECT ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

REVOKE ALL ON public.ticket_scans FROM anon;
GRANT SELECT, INSERT ON public.ticket_scans TO authenticated;
GRANT ALL ON public.ticket_scans TO service_role;

COMMIT;

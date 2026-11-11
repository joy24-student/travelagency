-- ============================================================================
-- PAYMENT WEBHOOKS, AGENCY COMMISSions, & ZERO-TRUST SECURITY AUDIT MIGRATION
-- Migration Version: 20260610_payment_webhooks_and_agency_commissions.sql
-- Description: Adds agency_commissions ledger, expands payment provider support
-- (Rocket, Stripe, Card), enforces strict RLS, and hardens payment nonces.
-- ============================================================================

BEGIN;

-- 1. EXPAND PAYMENT PROVIDER CHECK CONSTRAINTS
-- Update booking_payments if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'booking_payments'
  ) THEN
    ALTER TABLE public.booking_payments
      DROP CONSTRAINT IF EXISTS booking_payments_payment_method_check;

    ALTER TABLE public.booking_payments
      ADD CONSTRAINT booking_payments_payment_method_check
      CHECK (payment_method IN ('card', 'wallet', 'bank_transfer', 'points', 'cash', 'bkash', 'nagad', 'rocket', 'stripe', 'paypal', 'google_pay'));
  END IF;
END $$;

-- Update payment_transactions if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payment_transactions'
  ) THEN
    ALTER TABLE public.payment_transactions
      DROP CONSTRAINT IF EXISTS payment_transactions_method_check;

    ALTER TABLE public.payment_transactions
      ADD CONSTRAINT payment_transactions_method_check
      CHECK (method IN ('bkash', 'nagad', 'rocket', 'stripe', 'card', 'bank_transfer', 'wallet', 'google_pay'));
  END IF;
END $$;

-- 2. AGENCY COMMISSIONS LEDGER
CREATE TABLE IF NOT EXISTS public.agency_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 5.0 CHECK (commission_rate >= 0 AND commission_rate <= 100),
  currency TEXT NOT NULL DEFAULT 'BDT',
  status TEXT NOT NULL DEFAULT 'credited' CHECK (status IN ('pending', 'credited', 'paid_out', 'reversed')),
  transaction_reference TEXT UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(agency_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_agency_commissions_agency_id ON public.agency_commissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_commissions_booking_id ON public.agency_commissions(booking_id);
CREATE INDEX IF NOT EXISTS idx_agency_commissions_status ON public.agency_commissions(status);

-- Enable strict RLS on agency_commissions
ALTER TABLE public.agency_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agency_commissions FORCE ROW LEVEL SECURITY;

-- Agencies can only view their own commissions
CREATE POLICY "Agencies view own commissions" ON public.agency_commissions
  FOR SELECT TO authenticated
  USING (public.is_agency_member(agency_id) OR public.is_admin());

-- Only service role / admin or database security definer functions can insert/update commissions
CREATE POLICY "Admin manage commissions" ON public.agency_commissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 3. PAYMENT SECURITY NONCE AUDIT & RECORD KEEPING
CREATE TABLE IF NOT EXISTS public.payment_webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_transaction_id TEXT,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT UNIQUE,
  payload_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'duplicate', 'failed')),
  error_message TEXT,
  client_ip TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_provider ON public.payment_webhook_logs(provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhook_logs_idempotency ON public.payment_webhook_logs(idempotency_key);

ALTER TABLE public.payment_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Admin view payment webhook logs" ON public.payment_webhook_logs
  FOR SELECT TO authenticated
  USING (public.is_admin());

COMMIT;

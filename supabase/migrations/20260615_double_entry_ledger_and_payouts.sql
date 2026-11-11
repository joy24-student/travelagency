-- ============================================================================
-- DOUBLE-ENTRY LEDGER & AGENCY PAYOUTS MIGRATION
-- Migration Version: 20260615_double_entry_ledger_and_payouts.sql
-- Description: Creates immutable double-entry ledger accounts, transaction
-- entries, payout batches, and payouts. Enforces strict zero-trust RLS,
-- immutability triggers, and deferred balance check constraints.
-- ============================================================================

BEGIN;

-- 1. LEDGER ACCOUNTS TABLE
CREATE TABLE IF NOT EXISTS public.ledger_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('platform', 'agency', 'escrow', 'gateway', 'vat')),
  owner_id UUID NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_accounts_system 
  ON public.ledger_accounts(owner_type, currency) 
  WHERE owner_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_accounts_owner 
  ON public.ledger_accounts(owner_type, owner_id, currency) 
  WHERE owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_owner_lookup 
  ON public.ledger_accounts(owner_type, owner_id);

-- 2. LEDGER ENTRIES TABLE (IMMUTABLE)
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_group UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.ledger_accounts(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('debit', 'credit')),
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  booking_id UUID NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  payment_id UUID NULL REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx_group 
  ON public.ledger_entries(transaction_group);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account 
  ON public.ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_booking 
  ON public.ledger_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_payment 
  ON public.ledger_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at 
  ON public.ledger_entries(created_at DESC);

-- 3. PAYOUT BATCHES TABLE
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'failed')),
  total_paisa BIGINT NOT NULL DEFAULT 0 CHECK (total_paisa >= 0),
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_batches_status 
  ON public.payout_batches(status);
CREATE INDEX IF NOT EXISTS idx_payout_batches_created_at 
  ON public.payout_batches(created_at DESC);

-- 4. PAYOUTS TABLE (REPLACES MISSING agency_payments)
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.payout_batches(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  reference TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  paid_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_payouts_batch_id 
  ON public.payouts(batch_id);
CREATE INDEX IF NOT EXISTS idx_payouts_agency_id 
  ON public.payouts(agency_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status 
  ON public.payouts(status);

-- 5. ENABLE AND FORCE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.ledger_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_accounts FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_batches FORCE ROW LEVEL SECURITY;

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts FORCE ROW LEVEL SECURITY;

-- 6. RLS POLICIES: AGENCIES READ ONLY THEIR OWN; ADMINS READ ALL; ONLY SERVICE_ROLE WRITES
DROP POLICY IF EXISTS "Agencies read own accounts" ON public.ledger_accounts;
CREATE POLICY "Agencies read own accounts" ON public.ledger_accounts
  FOR SELECT TO authenticated
  USING (
    (owner_id IS NOT NULL AND public.is_agency_member(owner_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Agencies read own ledger entries" ON public.ledger_entries;
CREATE POLICY "Agencies read own ledger entries" ON public.ledger_entries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ledger_accounts la
      WHERE la.id = ledger_entries.account_id
        AND la.owner_id IS NOT NULL
        AND public.is_agency_member(la.owner_id)
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admin view payout batches" ON public.payout_batches;
CREATE POLICY "Admin view payout batches" ON public.payout_batches
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Agencies read own payouts" ON public.payouts;
CREATE POLICY "Agencies read own payouts" ON public.payouts
  FOR SELECT TO authenticated
  USING (
    public.is_agency_member(agency_id)
    OR public.is_admin()
  );

-- 7. DB TRIGGER: REJECT UPDATE AND DELETE ON ledger_entries
CREATE OR REPLACE FUNCTION public.reject_ledger_entry_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Immutable ledger: UPDATE and DELETE operations are strictly prohibited on ledger_entries';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_ledger_entries ON public.ledger_entries;
CREATE TRIGGER trg_immutable_ledger_entries
  BEFORE UPDATE OR DELETE ON public.ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_ledger_entry_mutation();

-- 8. DEFERRED CONSTRAINT TRIGGER: ENSURE TRANSACTION GROUP SUMS TO ZERO
CREATE OR REPLACE FUNCTION public.check_transaction_group_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_balance BIGINT;
  v_group UUID;
BEGIN
  v_group := NEW.transaction_group;
  SELECT COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_paisa ELSE -amount_paisa END), 0)
  INTO v_balance
  FROM public.ledger_entries
  WHERE transaction_group = v_group;

  IF v_balance <> 0 THEN
    RAISE EXCEPTION 'Double-entry transaction group % is unbalanced: net sum is % paisa (must be 0)', v_group, v_balance;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_transaction_group_balance ON public.ledger_entries;
CREATE CONSTRAINT TRIGGER trg_check_transaction_group_balance
  AFTER INSERT ON public.ledger_entries
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION public.check_transaction_group_balance();

-- 9. AUDIT FUNCTION: VERIFY OVERALL LEDGER INTEGRITY
CREATE OR REPLACE FUNCTION public.verify_ledger_integrity()
RETURNS TABLE (
  transaction_group UUID,
  net_paisa BIGINT,
  entry_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    transaction_group,
    SUM(CASE WHEN direction = 'debit' THEN amount_paisa ELSE -amount_paisa END) AS net_paisa,
    COUNT(*) AS entry_count
  FROM public.ledger_entries
  GROUP BY transaction_group
  HAVING SUM(CASE WHEN direction = 'debit' THEN amount_paisa ELSE -amount_paisa END) <> 0;
$$;

-- 10. SERVER-SIDE BALANCE AGGREGATION RPC (ZERO CLIENT MONEY MATH)
CREATE OR REPLACE FUNCTION public.get_agency_balances(p_agency_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_credits BIGINT;
  v_pending_debits BIGINT;
  v_net_escrow BIGINT;
  v_pending_paisa BIGINT;
  v_avail_credits BIGINT;
  v_avail_debits BIGINT;
  v_locked_payouts BIGINT;
  v_available_paisa BIGINT;
  v_paid_paisa BIGINT;
BEGIN
  -- 1. Pending Escrow Balance
  SELECT 
    COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_paisa ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount_paisa ELSE 0 END), 0)
  INTO v_pending_credits, v_pending_debits
  FROM public.ledger_entries le
  JOIN public.ledger_accounts la ON le.account_id = la.id
  WHERE la.owner_type = 'escrow' AND la.owner_id = p_agency_id;

  v_net_escrow := GREATEST(0, v_pending_credits - v_pending_debits);
  v_pending_paisa := (v_net_escrow * 500) / 10000; -- 5% commission rate

  -- 2. Available Agency Ledger Balance
  SELECT 
    COALESCE(SUM(CASE WHEN le.direction = 'credit' THEN le.amount_paisa ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN le.direction = 'debit' THEN le.amount_paisa ELSE 0 END), 0)
  INTO v_avail_credits, v_avail_debits
  FROM public.ledger_entries le
  JOIN public.ledger_accounts la ON le.account_id = la.id
  WHERE la.owner_type = 'agency' AND la.owner_id = p_agency_id;

  SELECT COALESCE(SUM(amount_paisa), 0)
  INTO v_locked_payouts
  FROM public.payouts
  WHERE agency_id = p_agency_id AND status IN ('draft', 'approved');

  v_available_paisa := GREATEST(0, (v_avail_credits - v_avail_debits) - v_locked_payouts);

  -- 3. Paid Payouts Balance
  SELECT COALESCE(SUM(amount_paisa), 0)
  INTO v_paid_paisa
  FROM public.payouts
  WHERE agency_id = p_agency_id AND status = 'paid';

  RETURN jsonb_build_object(
    'agency_id', p_agency_id,
    'currency', 'BDT',
    'pending_paisa', v_pending_paisa,
    'available_paisa', v_available_paisa,
    'paid_paisa', v_paid_paisa,
    'pending_bdt', TO_CHAR(v_pending_paisa / 100, 'FM999,999,999') || '.' || LPAD(TO_CHAR(ABS(v_pending_paisa % 100), 'FM99'), 2, '0'),
    'available_bdt', TO_CHAR(v_available_paisa / 100, 'FM999,999,999') || '.' || LPAD(TO_CHAR(ABS(v_available_paisa % 100), 'FM99'), 2, '0'),
    'paid_bdt', TO_CHAR(v_paid_paisa / 100, 'FM999,999,999') || '.' || LPAD(TO_CHAR(ABS(v_paid_paisa % 100), 'FM99'), 2, '0')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_balances(UUID) TO authenticated;

COMMIT;


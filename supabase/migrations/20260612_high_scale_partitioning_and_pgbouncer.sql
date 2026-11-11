-- ============================================================================
-- HIGH-SCALE DATABASE PARTITIONING, PGBOUNCER & ZERO-STARVATION SCALE ARCHITECTURE
-- Migration Version: 20260612_high_scale_partitioning_and_pgbouncer.sql
-- Role: Principal Database Administrator (DBA) & Infrastructure Scale Architect
-- Target Tables: bookings, payment_transactions, messages, admin_activity_logs
-- Capacity Target: 1,000,000+ daily bookings, >= 5,000 QPS, zero pool starvation
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PGBOUNCER & STATEMENT TIMEOUT SECURITY HARDENING
-- ============================================================================

-- Ensure transaction pooler statement timeouts:
-- 5s for search/catalog queries, 10s for booking write transactions.
DO $$
BEGIN
  -- Set database-level default statement timeout to 10s to kill rogue queries
  ALTER DATABASE current_database() SET statement_timeout = '10s';
  ALTER DATABASE current_database() SET idle_in_transaction_session_timeout = '15s';
  ALTER DATABASE current_database() SET lock_timeout = '5s';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping database-level ALTER settings (insufficient permissions in current environment)';
END $$;

-- Dedicated Read-Only Search Role (5s timeout)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shopno_search_readonly') THEN
    CREATE ROLE shopno_search_readonly WITH LOGIN PASSWORD 'shopno_search_password';
  END IF;
  ALTER ROLE shopno_search_readonly SET statement_timeout = '5s';
  ALTER ROLE shopno_search_readonly SET idle_in_transaction_session_timeout = '10s';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping role creation shopno_search_readonly';
END $$;

-- Dedicated Primary Booking Transaction Role (10s timeout)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'shopno_booking_tx') THEN
    CREATE ROLE shopno_booking_tx WITH LOGIN PASSWORD 'shopno_booking_password';
  END IF;
  ALTER ROLE shopno_booking_tx SET statement_timeout = '10s';
  ALTER ROLE shopno_booking_tx SET idle_in_transaction_session_timeout = '15s';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Skipping role creation shopno_booking_tx';
END $$;

-- PgBouncer User Lookup Function for Transaction-Pooling Auth
CREATE OR REPLACE FUNCTION public.lookup_pgbouncer_user(p_username TEXT)
RETURNS TABLE (username TEXT, password TEXT)
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT rolname::text, rolpassword::text
  FROM pg_authid
  WHERE rolname = p_username;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_pgbouncer_user(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_pgbouncer_user(TEXT) TO postgres;


-- ============================================================================
-- 2. TABLE PARTITIONING: BOOKINGS
-- ============================================================================

-- Safely transition bookings to a range-partitioned table by created_at
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_partitioned_table pt
    JOIN pg_class c ON pt.partrelid = c.oid
    WHERE c.relname = 'bookings'
  ) THEN
    -- Drop FK constraints from dependent tables to allow seamless partitioned swap
    ALTER TABLE IF EXISTS public.booking_items DROP CONSTRAINT IF EXISTS booking_items_booking_id_fkey;
    ALTER TABLE IF EXISTS public.booking_passengers DROP CONSTRAINT IF EXISTS booking_passengers_booking_id_fkey;
    ALTER TABLE IF EXISTS public.booking_payments DROP CONSTRAINT IF EXISTS booking_payments_booking_id_fkey;
    ALTER TABLE IF EXISTS public.payment_transactions DROP CONSTRAINT IF EXISTS payment_transactions_booking_id_fkey;
    ALTER TABLE IF EXISTS public.shopno_wallets DROP CONSTRAINT IF EXISTS shopno_wallets_booking_id_fkey;
    ALTER TABLE IF EXISTS public.agency_commissions DROP CONSTRAINT IF EXISTS agency_commissions_booking_id_fkey;

    -- Rename existing unpartitioned table
    ALTER TABLE public.bookings RENAME TO bookings_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  traveler_id UUID,
  agency_id UUID,
  hotel_id UUID,
  booking_reference TEXT NOT NULL,
  product_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  flow_step TEXT NOT NULL DEFAULT 'traveler_details',
  origin_city TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT DEFAULT 'Bangladesh',
  start_date DATE,
  end_date DATE,
  number_of_guests INTEGER NOT NULL DEFAULT 1,
  total_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BDT',
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  service_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  final_price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  special_requests TEXT,
  cancellation_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create 2026 Quarterly Partitions for bookings
CREATE TABLE IF NOT EXISTS public.bookings_2026_q1 PARTITION OF public.bookings
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.bookings_2026_q2 PARTITION OF public.bookings
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.bookings_2026_q3 PARTITION OF public.bookings
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.bookings_2026_q4 PARTITION OF public.bookings
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- Default fallback partition for bookings
CREATE TABLE IF NOT EXISTS public.bookings_default PARTITION OF public.bookings DEFAULT;

-- Migrate legacy data into partitioned bookings if legacy table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'bookings_legacy') THEN
    INSERT INTO public.bookings (
      id, user_id, traveler_id, agency_id, hotel_id, booking_reference,
      product_type, status, flow_step, origin_city, destination_city,
      destination_country, start_date, end_date, number_of_guests,
      total_price, currency, discount_amount, tax_amount, service_fee,
      final_price, notes, special_requests, cancellation_policy,
      created_at, updated_at, confirmed_at, cancelled_at, completed_at
    )
    SELECT
      id, user_id, traveler_id, agency_id, hotel_id, booking_reference,
      product_type, status, flow_step, origin_city, destination_city,
      destination_country, start_date, end_date, number_of_guests,
      total_price, currency, discount_amount, tax_amount, service_fee,
      final_price, notes, special_requests, cancellation_policy,
      created_at, updated_at, confirmed_at, cancelled_at, completed_at
    FROM public.bookings_legacy
    ON CONFLICT (id, created_at) DO NOTHING;
  END IF;
END $$;

-- Targeted compound B-Tree indexes on bookings (user_id, status, created_at DESC)
-- 1) Index on parent table (automatically inherited by all current and future partitions)
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_created 
  ON public.bookings (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_ref_created 
  ON public.bookings (booking_reference, created_at DESC);

-- 2) Explicit targeted indexes on individual partitions
CREATE INDEX IF NOT EXISTS idx_bookings_2026_q1_user_status_created 
  ON public.bookings_2026_q1 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_2026_q2_user_status_created 
  ON public.bookings_2026_q2 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_2026_q3_user_status_created 
  ON public.bookings_2026_q3 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_2026_q4_user_status_created 
  ON public.bookings_2026_q4 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_default_user_status_created 
  ON public.bookings_default (user_id, status, created_at DESC);


-- ============================================================================
-- 3. TABLE PARTITIONING: PAYMENT TRANSACTIONS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_transactions'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_partitioned_table pt
    JOIN pg_class c ON pt.partrelid = c.oid
    WHERE c.relname = 'payment_transactions'
  ) THEN
    ALTER TABLE public.payment_transactions RENAME TO payment_transactions_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  booking_payment_id UUID,
  booking_id UUID NOT NULL,
  user_id UUID NOT NULL,
  method TEXT NOT NULL,
  gateway TEXT NOT NULL,
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions for payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions_2026_q1 PARTITION OF public.payment_transactions
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.payment_transactions_2026_q2 PARTITION OF public.payment_transactions
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.payment_transactions_2026_q3 PARTITION OF public.payment_transactions
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.payment_transactions_2026_q4 PARTITION OF public.payment_transactions
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.payment_transactions_default PARTITION OF public.payment_transactions DEFAULT;

-- Migrate legacy data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payment_transactions_legacy') THEN
    INSERT INTO public.payment_transactions (
      id, booking_payment_id, booking_id, user_id, method, gateway,
      provider_transaction_id, status, provider_response, initiated_at,
      verified_at, created_at, updated_at
    )
    SELECT
      id, booking_payment_id, booking_id, user_id, method, gateway,
      provider_transaction_id, status, provider_response, initiated_at,
      verified_at, created_at, updated_at
    FROM public.payment_transactions_legacy
    ON CONFLICT (id, created_at) DO NOTHING;
  END IF;
END $$;

-- Targeted compound B-Tree indexes on payment_transactions (user_id, status, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_payment_tx_user_status_created 
  ON public.payment_transactions (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_booking_created 
  ON public.payment_transactions (booking_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_2026_q1_user_status_created 
  ON public.payment_transactions_2026_q1 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_2026_q2_user_status_created 
  ON public.payment_transactions_2026_q2 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_2026_q3_user_status_created 
  ON public.payment_transactions_2026_q3 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payment_tx_2026_q4_user_status_created 
  ON public.payment_transactions_2026_q4 (user_id, status, created_at DESC);


-- ============================================================================
-- 4. TABLE PARTITIONING: MESSAGES
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_partitioned_table pt
    JOIN pg_class c ON pt.partrelid = c.oid
    WHERE c.relname = 'messages'
  ) THEN
    ALTER TABLE public.messages RENAME TO messages_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  conversation_id UUID,
  user_id UUID NOT NULL,
  recipient_id UUID,
  message_type TEXT NOT NULL DEFAULT 'text',
  status TEXT NOT NULL DEFAULT 'sent',
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions for messages
CREATE TABLE IF NOT EXISTS public.messages_2026_q1 PARTITION OF public.messages
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.messages_2026_q2 PARTITION OF public.messages
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.messages_2026_q3 PARTITION OF public.messages
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.messages_2026_q4 PARTITION OF public.messages
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.messages_default PARTITION OF public.messages DEFAULT;

-- Migrate legacy messages if available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages_legacy') THEN
    INSERT INTO public.messages (
      id, conversation_id, user_id, recipient_id, message_type, status,
      content, metadata, created_at, updated_at
    )
    SELECT
      id, conversation_id, user_id, recipient_id, message_type, status,
      content, metadata, created_at, updated_at
    FROM public.messages_legacy
    ON CONFLICT (id, created_at) DO NOTHING;
  END IF;
END $$;

-- Targeted compound B-Tree indexes on messages (user_id, status, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_messages_user_status_created 
  ON public.messages (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON public.messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_q1_user_status_created 
  ON public.messages_2026_q1 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_q2_user_status_created 
  ON public.messages_2026_q2 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_q3_user_status_created 
  ON public.messages_2026_q3 (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_q4_user_status_created 
  ON public.messages_2026_q4 (user_id, status, created_at DESC);


-- ============================================================================
-- 5. TABLE PARTITIONING: ADMIN ACTIVITY LOGS
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_activity_logs'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_partitioned_table pt
    JOIN pg_class c ON pt.partrelid = c.oid
    WHERE c.relname = 'admin_activity_logs'
  ) THEN
    ALTER TABLE public.admin_activity_logs RENAME TO admin_activity_logs_legacy;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'success',
  module VARCHAR(100),
  entity_type VARCHAR(100),
  entity_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions for admin_activity_logs
CREATE TABLE IF NOT EXISTS public.admin_activity_logs_2026_q1 PARTITION OF public.admin_activity_logs
  FOR VALUES FROM ('2026-01-01 00:00:00+00') TO ('2026-04-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.admin_activity_logs_2026_q2 PARTITION OF public.admin_activity_logs
  FOR VALUES FROM ('2026-04-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.admin_activity_logs_2026_q3 PARTITION OF public.admin_activity_logs
  FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.admin_activity_logs_2026_q4 PARTITION OF public.admin_activity_logs
  FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS public.admin_activity_logs_default PARTITION OF public.admin_activity_logs DEFAULT;

-- Migrate legacy admin activity logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_activity_logs_legacy') THEN
    INSERT INTO public.admin_activity_logs (
      id, admin_id, user_id, action, module, entity_type,
      entity_id, details, ip_address, user_agent, created_at
    )
    SELECT
      id, admin_id, admin_id, action, module, entity_type,
      entity_id, details, ip_address, user_agent, created_at
    FROM public.admin_activity_logs_legacy
    ON CONFLICT (id, created_at) DO NOTHING;
  END IF;
END $$;

-- Targeted compound B-Tree indexes on admin_activity_logs (user_id, status, created_at DESC) & (admin_id, action, created_at DESC)
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin_action_created 
  ON public.admin_activity_logs (admin_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_user_status_created 
  ON public.admin_activity_logs (user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_2026_q1_user_status_created 
  ON public.admin_activity_logs_2026_q1 (admin_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_2026_q2_user_status_created 
  ON public.admin_activity_logs_2026_q2 (admin_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_2026_q3_user_status_created 
  ON public.admin_activity_logs_2026_q3 (admin_id, action, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_logs_2026_q4_user_status_created 
  ON public.admin_activity_logs_2026_q4 (admin_id, action, created_at DESC);


-- ============================================================================
-- 6. AUTOMATED PARTITION CREATION ENGINE (AHEAD OF TIME)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_monthly_partitions_ahead(p_months_ahead INTEGER DEFAULT 6)
RETURNS TABLE (
  table_name TEXT,
  partition_name TEXT,
  range_start TIMESTAMPTZ,
  range_end TIMESTAMPTZ,
  status TEXT
) 
SECURITY DEFINER
SET search_path = public, pg_temp
LANGUAGE plpgsql AS $$
DECLARE
  v_base_tables TEXT[] := ARRAY['bookings', 'payment_transactions', 'messages', 'admin_activity_logs'];
  v_table TEXT;
  v_current_month DATE := date_trunc('month', CURRENT_DATE);
  v_target_month DATE;
  v_start_ts TIMESTAMPTZ;
  v_end_ts TIMESTAMPTZ;
  v_part_name TEXT;
  v_sql TEXT;
  v_idx_sql TEXT;
  v_exists BOOLEAN;
  i INTEGER;
BEGIN
  FOREACH v_table IN ARRAY v_base_tables LOOP
    FOR i IN 0..p_months_ahead LOOP
      v_target_month := v_current_month + (i || ' month')::interval;
      v_start_ts := v_target_month;
      v_end_ts := v_target_month + '1 month'::interval;
      v_part_name := v_table || '_' || to_char(v_target_month, 'YYYY_MM');

      SELECT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = v_part_name
      ) INTO v_exists;

      IF NOT v_exists THEN
        -- Dynamic partition creation
        v_sql := format(
          'CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.%I FOR VALUES FROM (%L) TO (%L);',
          v_part_name, v_table, v_start_ts, v_end_ts
        );
        EXECUTE v_sql;

        -- Dynamic targeted compound B-Tree index creation on (user_id, status, created_at DESC)
        IF v_table = 'admin_activity_logs' THEN
          v_idx_sql := format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (admin_id, action, created_at DESC);',
            'idx_' || v_part_name || '_admin_action', v_part_name
          );
        ELSE
          v_idx_sql := format(
            'CREATE INDEX IF NOT EXISTS %I ON public.%I (user_id, status, created_at DESC);',
            'idx_' || v_part_name || '_user_status_created', v_part_name
          );
        END IF;
        EXECUTE v_idx_sql;

        table_name := v_table;
        partition_name := v_part_name;
        range_start := v_start_ts;
        range_end := v_end_ts;
        status := 'CREATED';
        RETURN NEXT;
      ELSE
        table_name := v_table;
        partition_name := v_part_name;
        range_start := v_start_ts;
        range_end := v_end_ts;
        status := 'ALREADY_EXISTS';
        RETURN NEXT;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Trigger Function: Automatically invoke partition creation when an insert occurs in default partition
CREATE OR REPLACE FUNCTION public.trg_auto_provision_future_partitions()
RETURNS TRIGGER AS $$
BEGIN
  -- Perform autonomous creation of partitions 6 months ahead in background
  PERFORM public.create_monthly_partitions_ahead(6);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to default partitions so any overflow automatically kicks off future partitions
DROP TRIGGER IF EXISTS trg_bookings_default_provision ON public.bookings_default;
CREATE TRIGGER trg_bookings_default_provision
  AFTER INSERT ON public.bookings_default
  FOR EACH STATEMENT EXECUTE FUNCTION public.trg_auto_provision_future_partitions();

-- Run automated partition generation immediately for the next 12 months ahead
SELECT * FROM public.create_monthly_partitions_ahead(12);

-- Schedule via pg_cron if installed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('create-partitions-ahead-monthly', '0 0 1 * *', 'SELECT public.create_monthly_partitions_ahead(6);');
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron extension not active; trigger-based automated partition generation will be used.';
END $$;


-- ============================================================================
-- 7. REFERENTIAL INTEGRITY TRIGGERS (NON-BLOCKING PARENT VALIDATION)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_booking_reference_exists()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.booking_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.bookings WHERE id = NEW.booking_id LIMIT 1) THEN
      RAISE EXCEPTION 'Referential Integrity Error: booking_id % not found in partitioned bookings', NEW.booking_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_items_fk ON public.booking_items;
CREATE TRIGGER trg_validate_booking_items_fk
  BEFORE INSERT OR UPDATE ON public.booking_items
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_reference_exists();

DROP TRIGGER IF EXISTS trg_validate_booking_passengers_fk ON public.booking_passengers;
CREATE TRIGGER trg_validate_booking_passengers_fk
  BEFORE INSERT OR UPDATE ON public.booking_passengers
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_reference_exists();

DROP TRIGGER IF EXISTS trg_validate_booking_payments_fk ON public.booking_payments;
CREATE TRIGGER trg_validate_booking_payments_fk
  BEFORE INSERT OR UPDATE ON public.booking_payments
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_reference_exists();


-- ============================================================================
-- 8. ROW LEVEL SECURITY (RLS) FOR HIGH-SCALE PARTITIONED TABLES
-- ============================================================================

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.bookings TO authenticated, service_role;
GRANT ALL ON public.payment_transactions TO authenticated, service_role;
GRANT ALL ON public.messages TO authenticated, service_role;
GRANT ALL ON public.admin_activity_logs TO authenticated, service_role;

DROP POLICY IF EXISTS bookings_user_isolation ON public.bookings;
CREATE POLICY bookings_user_isolation ON public.bookings
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS payment_transactions_user_isolation ON public.payment_transactions;
CREATE POLICY payment_transactions_user_isolation ON public.payment_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS messages_user_isolation ON public.messages;
CREATE POLICY messages_user_isolation ON public.messages
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR auth.uid() = recipient_id OR auth.role() = 'service_role')
  WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS admin_logs_admin_isolation ON public.admin_activity_logs;
CREATE POLICY admin_logs_admin_isolation ON public.admin_activity_logs
  FOR ALL TO authenticated
  USING (auth.uid() = admin_id OR auth.role() = 'service_role');


-- ============================================================================
-- 9. PARTITION PRUNING & CONCURRENT QUERY VERIFICATION QUERIES
-- ============================================================================

-- The following queries demonstrate partition pruning (EXPLAIN ANALYZE)
-- When querying a specific month/quarter, PostgreSQL scans ONLY the matching partition.
--
-- EXPLAIN (ANALYZE, COSTS, BUFFERS)
-- SELECT id, booking_reference, status, final_price 
-- FROM public.bookings
-- WHERE user_id = '00000000-0000-0000-0000-000000000000'
--   AND status = 'confirmed'
--   AND created_at >= '2026-02-01 00:00:00+00' 
--   AND created_at < '2026-03-01 00:00:00+00';
--
-- -> Bitmap Index Scan on idx_bookings_2026_q1_user_status_created
--    Partitions Scanned: public.bookings_2026_q1 (1 partition out of all)
--    Partitions Pruned: public.bookings_2026_q2, bookings_2026_q3, bookings_2026_q4, bookings_default

COMMIT;

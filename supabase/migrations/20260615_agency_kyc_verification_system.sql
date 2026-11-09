-- ============================================================================
-- AGENCY KYC VERIFICATION SYSTEM WITH ZERO-TRUST RLS & AUDIT INTEGRITY
-- Migration Version: 20260615_agency_kyc_verification_system.sql
-- Description:
--   1. kyc_submissions table with state machine check constraint
--   2. kyc_documents table with document type validation
--   3. kyc_checks table for automated vision & rule check results
--   4. kyc_audit_log table for immutable state-change tracking
--   5. agencies table columns: verified_at, verified_by, trade_licence_number
--   6. Unique index on normalized trade licence number across agencies
--   7. Zero-trust Row-Level Security (RLS) policies:
--      - Agency staff read and create only their own agency's draft and submitted data, cannot change status
--      - Admins read all and change status
--      - kyc_checks and kyc_audit_log writable ONLY by service_role
-- ============================================================================

-- 1. Alter agencies table with verification attributes
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade_licence_number TEXT;

-- 2. Create Unique Index on normalized trade licence number across agencies
-- Strips whitespace, dashes, slashes, and non-alphanumeric characters to enforce uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_normalized_trade_licence
ON public.agencies (
  regexp_replace(upper(trim(COALESCE(trade_licence_number, license_number))), '[^A-Z0-9]', '', 'g')
)
WHERE COALESCE(trade_licence_number, license_number) IS NOT NULL
  AND regexp_replace(upper(trim(COALESCE(trade_licence_number, license_number))), '[^A-Z0-9]', '', 'g') <> '';

-- 3. kyc_submissions table
CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'in_review', 'needs_changes', 'verified', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_agency_id ON public.kyc_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_kyc_submissions_status_submitted_at ON public.kyc_submissions(status, submitted_at ASC);

-- 4. kyc_documents table
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('trade_licence', 'tin', 'owner_id', 'address_proof')),
  r2_key TEXT NOT NULL,
  mime TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL,
  expires_on DATE NULL,
  extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kyc_documents_submission_doc_type UNIQUE (submission_id, doc_type)
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_submission ON public.kyc_documents(submission_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_expires_on ON public.kyc_documents(expires_on) WHERE expires_on IS NOT NULL;

-- 5. kyc_checks table
CREATE TABLE IF NOT EXISTS public.kyc_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.kyc_documents(id) ON DELETE CASCADE,
  check_name TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'warn', 'fail')),
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_checks_document_id ON public.kyc_checks(document_id);

-- 6. kyc_audit_log table
CREATE TABLE IF NOT EXISTS public.kyc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.kyc_submissions(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_audit_log_submission ON public.kyc_audit_log(submission_id, created_at DESC);

-- ============================================================================
-- 7. ZERO-TRUST ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable and Force RLS on all 4 tables
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions FORCE ROW LEVEL SECURITY;

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.kyc_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_checks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.kyc_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_audit_log FORCE ROW LEVEL SECURITY;

-- Revoke dangerous direct public/anon access
REVOKE ALL ON public.kyc_submissions FROM anon;
REVOKE ALL ON public.kyc_documents FROM anon;
REVOKE ALL ON public.kyc_checks FROM anon;
REVOKE ALL ON public.kyc_audit_log FROM anon;

-- Grant standard permissions to authenticated role (subject to RLS)
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kyc_documents TO authenticated;
GRANT SELECT ON public.kyc_checks TO authenticated;
GRANT SELECT ON public.kyc_audit_log TO authenticated;

-- Function & Trigger: Prevent agency staff from mutating kyc_submissions.status
CREATE OR REPLACE FUNCTION public.check_kyc_submission_status_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT (public.is_admin(auth.uid()) OR current_user = 'service_role') THEN
      RAISE EXCEPTION 'Agency staff are not permitted to alter submission status directly.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_kyc_status_mutation ON public.kyc_submissions;
CREATE TRIGGER trg_check_kyc_status_mutation
  BEFORE UPDATE ON public.kyc_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_kyc_submission_status_mutation();

-- ----------------------------------------------------------------------------
-- RLS POLICIES: kyc_submissions
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agencies read own kyc submissions" ON public.kyc_submissions;
CREATE POLICY "Agencies read own kyc submissions"
  ON public.kyc_submissions
  FOR SELECT
  TO authenticated
  USING (
    public.is_agency_member(agency_id, auth.uid())
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Agencies create own draft submissions" ON public.kyc_submissions;
CREATE POLICY "Agencies create own draft submissions"
  ON public.kyc_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_agency_member(agency_id, auth.uid())
    AND status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS "Admins full management on kyc submissions" ON public.kyc_submissions;
CREATE POLICY "Admins full management on kyc submissions"
  ON public.kyc_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- RLS POLICIES: kyc_documents
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agencies read own kyc documents" ON public.kyc_documents;
CREATE POLICY "Agencies read own kyc documents"
  ON public.kyc_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions s
      WHERE s.id = kyc_documents.submission_id
        AND (public.is_agency_member(s.agency_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Agencies insert draft kyc documents" ON public.kyc_documents;
CREATE POLICY "Agencies insert draft kyc documents"
  ON public.kyc_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions s
      WHERE s.id = kyc_documents.submission_id
        AND public.is_agency_member(s.agency_id, auth.uid())
        AND s.status IN ('draft', 'needs_changes')
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Agencies update draft kyc documents" ON public.kyc_documents;
CREATE POLICY "Agencies update draft kyc documents"
  ON public.kyc_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions s
      WHERE s.id = kyc_documents.submission_id
        AND public.is_agency_member(s.agency_id, auth.uid())
        AND s.status IN ('draft', 'needs_changes')
    )
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions s
      WHERE s.id = kyc_documents.submission_id
        AND public.is_agency_member(s.agency_id, auth.uid())
        AND s.status IN ('draft', 'needs_changes')
    )
    OR public.is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins delete kyc documents" ON public.kyc_documents;
CREATE POLICY "Admins delete kyc documents"
  ON public.kyc_documents
  FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- RLS POLICIES: kyc_checks
-- Writable ONLY by service_role. Agency staff and admins can SELECT.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agencies and admins read kyc checks" ON public.kyc_checks;
CREATE POLICY "Agencies and admins read kyc checks"
  ON public.kyc_checks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kyc_documents d
      JOIN public.kyc_submissions s ON s.id = d.submission_id
      WHERE d.id = kyc_checks.document_id
        AND (public.is_agency_member(s.agency_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- No INSERT, UPDATE, or DELETE policies for authenticated role.
-- Only service_role can write to kyc_checks.

-- ----------------------------------------------------------------------------
-- RLS POLICIES: kyc_audit_log
-- Writable ONLY by service_role. Agency staff and admins can SELECT.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Agencies and admins read kyc audit log" ON public.kyc_audit_log;
CREATE POLICY "Agencies and admins read kyc audit log"
  ON public.kyc_audit_log
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.kyc_submissions s
      WHERE s.id = kyc_audit_log.submission_id
        AND (public.is_agency_member(s.agency_id, auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

-- No INSERT, UPDATE, or DELETE policies for authenticated role.
-- Only service_role can write to kyc_audit_log.

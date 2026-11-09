-- ============================================================================
-- Migration: 20260615_collaborative_group_trips.sql
-- Module: Collaborative Group Trips with Live Itinerary, Proposals, Voting,
--         and Zero-Float Integer Paisa Expense Tracking
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. GROUP TRIPS TABLE
CREATE TABLE IF NOT EXISTS public.group_trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BDT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_group_trips_owner ON public.group_trips(owner_id);

-- 2. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
  trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_trip ON public.group_members(trip_id);

-- 3. TRIP ITEMS TABLE (ITINERARY WITH OPTIMISTIC VERSIONING)
CREATE TABLE IF NOT EXISTS public.trip_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  start_time TIME WITHOUT TIME ZONE NULL,
  title TEXT NOT NULL,
  location JSONB NULL,
  cost_paisa BIGINT NULL CHECK (cost_paisa IS NULL OR cost_paisa >= 0),
  version INT NOT NULL DEFAULT 1,
  updated_by UUID NULL,
  order_index INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_items_trip_day ON public.trip_items(trip_id, day, order_index);

-- 4. TRIP PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.trip_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  closes_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_proposals_trip ON public.trip_proposals(trip_id, status);

-- 5. TRIP VOTES TABLE
CREATE TABLE IF NOT EXISTS public.trip_votes (
  proposal_id UUID NOT NULL REFERENCES public.trip_proposals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  vote SMALLINT NOT NULL CHECK (vote IN (-1, 0, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (proposal_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_votes_proposal ON public.trip_votes(proposal_id);

-- 6. TRIP EXPENSES TABLE (INTEGER PAISA ONLY)
CREATE TABLE IF NOT EXISTS public.trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  paid_by UUID NOT NULL,
  amount_paisa BIGINT NOT NULL CHECK (amount_paisa > 0),
  description TEXT NOT NULL,
  split JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_expenses_trip ON public.trip_expenses(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_expenses_paid_by ON public.trip_expenses(paid_by);

-- 7. TRIP INVITES TABLE
CREATE TABLE IF NOT EXISTS public.trip_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.group_trips(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  max_uses INT NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses INT NOT NULL DEFAULT 0 CHECK (uses >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_invites_lookup ON public.trip_invites(token_hash);

-- ============================================================================
-- HELPER SECURITY-DEFINER FUNCTION: is_trip_member
-- Not exposed to anon or PUBLIC
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_trip_member(
  p_trip_id UUID,
  p_min_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_role TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_role
  FROM public.group_members
  WHERE trip_id = p_trip_id AND user_id = v_user_id;

  IF v_role IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_min_role = 'viewer' THEN
    RETURN v_role IN ('owner', 'editor', 'viewer');
  ELSIF p_min_role = 'editor' THEN
    RETURN v_role IN ('owner', 'editor');
  ELSIF p_min_role = 'owner' THEN
    RETURN v_role = 'owner';
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Secure function: explicitly revoke from anon and public, grant only to authenticated and service_role
REVOKE ALL ON FUNCTION public.is_trip_member(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_trip_member(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_trip_member(UUID, TEXT) TO authenticated, service_role;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS): ENABLE & FORCE ON ALL TABLES
-- Revoke all permissions from anon
-- ============================================================================

ALTER TABLE public.group_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_trips FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_trips FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_trips TO authenticated, service_role;

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.group_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_members TO authenticated, service_role;

ALTER TABLE public.trip_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_items FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_items FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_items TO authenticated, service_role;

ALTER TABLE public.trip_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_proposals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_proposals FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_proposals TO authenticated, service_role;

ALTER TABLE public.trip_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_votes FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_votes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_votes TO authenticated, service_role;

ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_expenses FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_expenses FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO authenticated, service_role;

ALTER TABLE public.trip_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invites FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.trip_invites FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_invites TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- POLICIES: group_trips
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can select group_trips" ON public.group_trips;
CREATE POLICY "Members can select group_trips" ON public.group_trips
  FOR SELECT TO authenticated
  USING (public.is_trip_member(id, 'viewer'));

DROP POLICY IF EXISTS "Authenticated users can create group_trips" ON public.group_trips;
CREATE POLICY "Authenticated users can create group_trips" ON public.group_trips
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = owner_id);

DROP POLICY IF EXISTS "Editors and owners can update group_trips" ON public.group_trips;
CREATE POLICY "Editors and owners can update group_trips" ON public.group_trips
  FOR UPDATE TO authenticated
  USING (public.is_trip_member(id, 'editor'))
  WITH CHECK (public.is_trip_member(id, 'editor'));

DROP POLICY IF EXISTS "Owners can delete group_trips" ON public.group_trips;
CREATE POLICY "Owners can delete group_trips" ON public.group_trips
  FOR DELETE TO authenticated
  USING (public.is_trip_member(id, 'owner'));

-- ----------------------------------------------------------------------------
-- POLICIES: group_members
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view co-members" ON public.group_members;
CREATE POLICY "Members can view co-members" ON public.group_members
  FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, 'viewer'));

DROP POLICY IF EXISTS "Owners can insert group_members" ON public.group_members;
CREATE POLICY "Owners can insert group_members" ON public.group_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(trip_id, 'owner'));

DROP POLICY IF EXISTS "Owners can update group_members" ON public.group_members;
CREATE POLICY "Owners can update group_members" ON public.group_members
  FOR UPDATE TO authenticated
  USING (public.is_trip_member(trip_id, 'owner'))
  WITH CHECK (public.is_trip_member(trip_id, 'owner'));

DROP POLICY IF EXISTS "Owners can remove members or member can leave" ON public.group_members;
CREATE POLICY "Owners can remove members or member can leave" ON public.group_members
  FOR DELETE TO authenticated
  USING (public.is_trip_member(trip_id, 'owner') OR (SELECT auth.uid()) = user_id);

-- ----------------------------------------------------------------------------
-- POLICIES: trip_items (Viewers CANNOT write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view trip_items" ON public.trip_items;
CREATE POLICY "Members can view trip_items" ON public.trip_items
  FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, 'viewer'));

DROP POLICY IF EXISTS "Editors and owners can insert trip_items" ON public.trip_items;
CREATE POLICY "Editors and owners can insert trip_items" ON public.trip_items
  FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Editors and owners can update trip_items" ON public.trip_items;
CREATE POLICY "Editors and owners can update trip_items" ON public.trip_items
  FOR UPDATE TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'))
  WITH CHECK (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Editors and owners can delete trip_items" ON public.trip_items;
CREATE POLICY "Editors and owners can delete trip_items" ON public.trip_items
  FOR DELETE TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'));

-- ----------------------------------------------------------------------------
-- POLICIES: trip_proposals (Viewers CANNOT write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view proposals" ON public.trip_proposals;
CREATE POLICY "Members can view proposals" ON public.trip_proposals
  FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, 'viewer'));

DROP POLICY IF EXISTS "Editors and owners can create proposals" ON public.trip_proposals;
CREATE POLICY "Editors and owners can create proposals" ON public.trip_proposals
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = creator_id AND
    public.is_trip_member(trip_id, 'editor')
  );

DROP POLICY IF EXISTS "Editors and owners can update proposals" ON public.trip_proposals;
CREATE POLICY "Editors and owners can update proposals" ON public.trip_proposals
  FOR UPDATE TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'))
  WITH CHECK (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Owners can delete proposals" ON public.trip_proposals;
CREATE POLICY "Owners can delete proposals" ON public.trip_proposals
  FOR DELETE TO authenticated
  USING (public.is_trip_member(trip_id, 'owner'));

-- ----------------------------------------------------------------------------
-- POLICIES: trip_votes (Viewers CANNOT write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view votes" ON public.trip_votes;
CREATE POLICY "Members can view votes" ON public.trip_votes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_proposals p
      WHERE p.id = proposal_id AND public.is_trip_member(p.trip_id, 'viewer')
    )
  );

DROP POLICY IF EXISTS "Editors and owners can insert own votes" ON public.trip_votes;
CREATE POLICY "Editors and owners can insert own votes" ON public.trip_votes
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.trip_proposals p
      WHERE p.id = proposal_id AND public.is_trip_member(p.trip_id, 'editor')
    )
  );

DROP POLICY IF EXISTS "Editors and owners can update own votes" ON public.trip_votes;
CREATE POLICY "Editors and owners can update own votes" ON public.trip_votes
  FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.trip_proposals p
      WHERE p.id = proposal_id AND public.is_trip_member(p.trip_id, 'editor')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.trip_proposals p
      WHERE p.id = proposal_id AND public.is_trip_member(p.trip_id, 'editor')
    )
  );

DROP POLICY IF EXISTS "Users can delete own votes" ON public.trip_votes;
CREATE POLICY "Users can delete own votes" ON public.trip_votes
  FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id AND
    EXISTS (
      SELECT 1 FROM public.trip_proposals p
      WHERE p.id = proposal_id AND public.is_trip_member(p.trip_id, 'editor')
    )
  );

-- ----------------------------------------------------------------------------
-- POLICIES: trip_expenses (Viewers CANNOT write)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view expenses" ON public.trip_expenses;
CREATE POLICY "Members can view expenses" ON public.trip_expenses
  FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, 'viewer'));

DROP POLICY IF EXISTS "Editors and owners can insert expenses" ON public.trip_expenses;
CREATE POLICY "Editors and owners can insert expenses" ON public.trip_expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = paid_by AND
    public.is_trip_member(trip_id, 'editor')
  );

DROP POLICY IF EXISTS "Editors and owners can update expenses" ON public.trip_expenses;
CREATE POLICY "Editors and owners can update expenses" ON public.trip_expenses
  FOR UPDATE TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'))
  WITH CHECK (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Editors and owners can delete expenses" ON public.trip_expenses;
CREATE POLICY "Editors and owners can delete expenses" ON public.trip_expenses
  FOR DELETE TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'));

-- ----------------------------------------------------------------------------
-- POLICIES: trip_invites
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Editors and owners can view invites" ON public.trip_invites;
CREATE POLICY "Editors and owners can view invites" ON public.trip_invites
  FOR SELECT TO authenticated
  USING (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Editors and owners can create invites" ON public.trip_invites;
CREATE POLICY "Editors and owners can create invites" ON public.trip_invites
  FOR INSERT TO authenticated
  WITH CHECK (public.is_trip_member(trip_id, 'editor'));

DROP POLICY IF EXISTS "Owners can update or delete invites" ON public.trip_invites;
CREATE POLICY "Owners can update or delete invites" ON public.trip_invites
  FOR ALL TO authenticated
  USING (public.is_trip_member(trip_id, 'owner'))
  WITH CHECK (public.is_trip_member(trip_id, 'owner'));

-- ============================================================================
-- DATABASE FUNCTIONS
-- ============================================================================

-- Function 1: accept_proposal(proposal_id)
-- Atomically copies the winner proposal into trip_items
CREATE OR REPLACE FUNCTION public.accept_proposal(p_proposal_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_proposal RECORD;
  v_item_id UUID;
  v_caller UUID := auth.uid();
  v_day DATE;
  v_start_time TIME WITHOUT TIME ZONE;
  v_title TEXT;
  v_cost_paisa BIGINT;
  v_location JSONB;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Lock proposal row for atomic transition
  SELECT * INTO v_proposal
  FROM public.trip_proposals
  WHERE id = p_proposal_id
  FOR UPDATE;

  IF v_proposal IS NULL THEN
    RAISE EXCEPTION 'Proposal not found';
  END IF;

  -- Validate caller has editor or owner role
  IF NOT public.is_trip_member(v_proposal.trip_id, 'editor') THEN
    RAISE EXCEPTION 'Permission denied: only editors or owners can accept proposals';
  END IF;

  IF v_proposal.status = 'accepted' THEN
    RAISE EXCEPTION 'Proposal has already been accepted';
  END IF;

  -- Extract item fields from proposal details JSONB
  v_title := COALESCE(v_proposal.details->>'title', v_proposal.title);
  
  IF (v_proposal.details->>'day') IS NOT NULL THEN
    v_day := (v_proposal.details->>'day')::date;
  ELSE
    SELECT start_date INTO v_day FROM public.group_trips WHERE id = v_proposal.trip_id;
  END IF;

  IF (v_proposal.details->>'start_time') IS NOT NULL AND (v_proposal.details->>'start_time') <> '' THEN
    v_start_time := (v_proposal.details->>'start_time')::time;
  ELSE
    v_start_time := NULL;
  END IF;

  IF (v_proposal.details->>'cost_paisa') IS NOT NULL THEN
    v_cost_paisa := (v_proposal.details->>'cost_paisa')::bigint;
  ELSE
    v_cost_paisa := NULL;
  END IF;

  v_location := v_proposal.details->'location';

  -- Insert into trip_items
  INSERT INTO public.trip_items (
    trip_id,
    day,
    start_time,
    title,
    location,
    cost_paisa,
    version,
    updated_by,
    created_at,
    updated_at
  ) VALUES (
    v_proposal.trip_id,
    COALESCE(v_day, CURRENT_DATE),
    v_start_time,
    v_title,
    v_location,
    v_cost_paisa,
    1,
    v_caller,
    NOW(),
    NOW()
  ) RETURNING id INTO v_item_id;

  -- Mark proposal as accepted
  UPDATE public.trip_proposals
  SET status = 'accepted'
  WHERE id = p_proposal_id;

  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_proposal(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_proposal(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.accept_proposal(UUID) TO authenticated, service_role;

-- Function 2: join_trip(token)
-- Validates expiry and uses, adds the member, and returns trip_id
CREATE OR REPLACE FUNCTION public.join_trip(p_token TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_invite RECORD;
  v_token_hash TEXT;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required to join trip';
  END IF;

  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Invite token cannot be empty';
  END IF;

  v_token_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  -- Lock invite row to prevent concurrent reuse race conditions
  SELECT * INTO v_invite
  FROM public.trip_invites
  WHERE (token_hash = v_token_hash OR token_hash = trim(p_token))
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or nonexistent invite link';
  END IF;

  IF v_invite.expires_at < NOW() THEN
    RAISE EXCEPTION 'This invite link has expired';
  END IF;

  IF v_invite.uses >= v_invite.max_uses THEN
    RAISE EXCEPTION 'This invite link has reached its maximum allowed uses';
  END IF;

  -- Increment use count
  UPDATE public.trip_invites
  SET uses = uses + 1
  WHERE id = v_invite.id;

  -- Add member with 'editor' role if not already member
  INSERT INTO public.group_members (
    trip_id,
    user_id,
    role,
    joined_at
  ) VALUES (
    v_invite.trip_id,
    v_caller,
    'editor',
    NOW()
  )
  ON CONFLICT (trip_id, user_id) DO NOTHING;

  RETURN v_invite.trip_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_trip(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.join_trip(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.join_trip(TEXT) TO authenticated, service_role;

-- Function 3: update_trip_item_with_version(item_id, day, start_time, title, location, cost_paisa, expected_version, order_index)
-- Ensures optimistic concurrency control and rejects stale mutations
CREATE OR REPLACE FUNCTION public.update_trip_item_with_version(
  p_item_id UUID,
  p_day DATE,
  p_start_time TIME WITHOUT TIME ZONE,
  p_title TEXT,
  p_location JSONB,
  p_cost_paisa BIGINT,
  p_expected_version INT,
  p_order_index INT DEFAULT 0
)
RETURNS public.trip_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item public.trip_items;
  v_caller UUID := auth.uid();
  v_trip_id UUID;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT trip_id INTO v_trip_id
  FROM public.trip_items
  WHERE id = p_item_id;

  IF v_trip_id IS NULL THEN
    RAISE EXCEPTION 'Trip item not found';
  END IF;

  IF NOT public.is_trip_member(v_trip_id, 'editor') THEN
    RAISE EXCEPTION 'Permission denied: viewers cannot modify itinerary';
  END IF;

  UPDATE public.trip_items
  SET
    day = p_day,
    start_time = p_start_time,
    title = p_title,
    location = p_location,
    cost_paisa = p_cost_paisa,
    order_index = p_order_index,
    version = version + 1,
    updated_by = v_caller,
    updated_at = NOW()
  WHERE id = p_item_id AND version = p_expected_version
  RETURNING * INTO v_item;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Conflict: Version mismatch. The itinerary item was modified by another member.';
  END IF;

  RETURN v_item;
END;
$$;

REVOKE ALL ON FUNCTION public.update_trip_item_with_version(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT, JSONB, BIGINT, INT, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_trip_item_with_version(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT, JSONB, BIGINT, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_trip_item_with_version(UUID, DATE, TIME WITHOUT TIME ZONE, TEXT, JSONB, BIGINT, INT, INT) TO authenticated, service_role;

-- ============================================================================
-- REALTIME PUBLICATION
-- Explicit requirement: Add all tables except invites to the realtime publication.
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_trips;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_proposals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_votes;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_expenses;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    -- trip_invites intentionally omitted as per requirement.
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ZERO-TRUST ROW-LEVEL SECURITY (RLS) & DATABASE HARDENING MIGRATION
-- Migration Version: 20260609_zero_trust_security_hardening.sql
-- Description: Enforces strict deny-by-default RLS, RBAC separation of roles
-- (Users, Agencies, Hotel Staff, Admins), revokes insecure demo/anon access,
-- creates secure hotel_staff and hotel_id linkage, and provides parameterized RPCs.
-- ============================================================================

-- Step 1: REVOKE INSECURE ANON PRIVILEGES & DROP INSECURE DEMO POLICIES
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public FROM anon;

-- Drop insecure anon policies from 20260608f_allow_community_anon_demo_interactions.sql
DROP POLICY IF EXISTS post_comments_anon_insert ON public.post_comments;
DROP POLICY IF EXISTS post_comments_anon_delete ON public.post_comments;
DROP POLICY IF EXISTS post_likes_anon_all ON public.post_likes;
DROP POLICY IF EXISTS saved_posts_anon_all ON public.saved_posts;
DROP POLICY IF EXISTS user_follows_anon_all ON public.user_follows;
DROP POLICY IF EXISTS posts_anon_insert ON public.posts;
DROP POLICY IF EXISTS posts_anon_delete ON public.posts;
DROP POLICY IF EXISTS post_media_anon_insert ON public.post_media;
DROP POLICY IF EXISTS stories_anon_insert ON public.stories;
DROP POLICY IF EXISTS stories_anon_delete ON public.stories;
DROP POLICY IF EXISTS groups_anon_insert ON public.groups;
DROP POLICY IF EXISTS group_members_anon_all ON public.group_members;

-- Drop insecure policies from 20260608h and 20260608i
DROP POLICY IF EXISTS "Public device tokens policy" ON public.user_device_tokens;
DROP POLICY IF EXISTS user_settings_all ON public.user_settings;
DROP POLICY IF EXISTS user_addresses_all ON public.user_addresses;
REVOKE ALL ON public.user_device_tokens FROM anon;
REVOKE ALL ON public.user_settings FROM anon;
REVOKE ALL ON public.user_addresses FROM anon;

-- Drop insecure "FOR ALL USING (true)" policies from 20260608_comprehensive_travel_platform_schema.sql
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "User preferences policy" ON public.user_preferences;
DROP POLICY IF EXISTS "User saved items policy" ON public.user_saved_items;
DROP POLICY IF EXISTS "Loyalty accounts policy" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Loyalty transactions policy" ON public.loyalty_points_transactions;
DROP POLICY IF EXISTS "User coupons policy" ON public.user_coupons;
DROP POLICY IF EXISTS "Support tickets policy" ON public.support_tickets;
DROP POLICY IF EXISTS "Ticket messages policy" ON public.ticket_messages;
DROP POLICY IF EXISTS "Service chats policy" ON public.service_chats;
DROP POLICY IF EXISTS "Chat messages policy" ON public.chat_messages;
DROP POLICY IF EXISTS "AI conversations policy" ON public.ai_conversations;
DROP POLICY IF EXISTS "AI messages policy" ON public.ai_messages;
DROP POLICY IF EXISTS "Notifications policy" ON public.notifications;
DROP POLICY IF EXISTS "Wallets policy" ON public.shopno_wallets;
DROP POLICY IF EXISTS "Wallet transactions policy" ON public.shopno_wallet_transactions;

-- Step 2: SECURE POSTGRESQL FUNCTIONS (SECURITY DEFINER with strict search_path)

CREATE SCHEMA IF NOT EXISTS app_private;

-- Administrative check function (avoids trusting client-supplied JWT claims)
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users
    WHERE user_id = check_user_id
      AND status = 'active'
  );
END;
$$;

-- Also provide under app_private schema for backward compatibility
CREATE OR REPLACE FUNCTION app_private.is_admin(check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN public.is_admin(check_user_id);
END;
$$;

-- Agency membership check function
CREATE OR REPLACE FUNCTION public.is_agency_member(check_agency_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF check_agency_id IS NULL OR check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.agencies
    WHERE id = check_agency_id AND owner_user_id = check_user_id
  ) OR EXISTS (
    SELECT 1 FROM public.agency_team_members
    WHERE agency_id = check_agency_id AND user_id = check_user_id AND status = 'active'
  ) OR public.is_admin(check_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION app_private.is_agency_member(check_agency_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  RETURN public.is_agency_member(check_agency_id, check_user_id);
END;
$$;

-- Step 3: HOTEL STAFF INFRASTRUCTURE & RESERVATION MATCHING
CREATE TABLE IF NOT EXISTS public.hotel_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'manager', 'receptionist', 'staff')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(hotel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_hotel_staff_user ON public.hotel_staff(user_id, hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_staff_hotel ON public.hotel_staff(hotel_id, status);

-- Add hotel_id to bookings table to link reservations directly to hotels
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS hotel_id UUID REFERENCES public.hotels(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_hotel_id ON public.bookings(hotel_id, created_at DESC);

-- Hotel staff check function
CREATE OR REPLACE FUNCTION public.is_hotel_staff(check_hotel_id UUID, check_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF check_hotel_id IS NULL OR check_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.hotel_staff
    WHERE hotel_id = check_hotel_id AND user_id = check_user_id AND status = 'active'
  ) OR public.is_admin(check_user_id);
END;
$$;

-- Grant function execute permissions
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_agency_member(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hotel_staff(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_agency_member(UUID, UUID) TO authenticated;

-- Step 4: DYNAMIC ENFORCEMENT OF ROW LEVEL SECURITY ACROSS ALL TABLES
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- Step 5: STRICT DENY-BY-DEFAULT POLICIES WITH ROLE SEPARATION

-- 5A. USER DATA ISOLATION (auth.uid() = user_id)
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- User Preferences
DROP POLICY IF EXISTS "User preferences isolated policy" ON public.user_preferences;
CREATE POLICY "User preferences isolated policy" ON public.user_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- User Payment Methods
DROP POLICY IF EXISTS "User payment methods isolated" ON public.user_payment_methods;
CREATE POLICY "User payment methods isolated" ON public.user_payment_methods
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- User Saved Items
DROP POLICY IF EXISTS "User saved items isolated" ON public.user_saved_items;
CREATE POLICY "User saved items isolated" ON public.user_saved_items
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- User Devices
DROP POLICY IF EXISTS "User devices isolated" ON public.user_devices;
CREATE POLICY "User devices isolated" ON public.user_devices
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Loyalty Accounts & Points
DROP POLICY IF EXISTS "Loyalty accounts read isolated" ON public.loyalty_accounts;
CREATE POLICY "Loyalty accounts read isolated" ON public.loyalty_accounts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Loyalty accounts admin mutation" ON public.loyalty_accounts;
CREATE POLICY "Loyalty accounts admin mutation" ON public.loyalty_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Loyalty transactions read isolated" ON public.loyalty_points_transactions;
CREATE POLICY "Loyalty transactions read isolated" ON public.loyalty_points_transactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.loyalty_accounts 
      WHERE loyalty_accounts.id = loyalty_points_transactions.account_id 
        AND (loyalty_accounts.user_id = auth.uid() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Loyalty transactions admin mutation" ON public.loyalty_points_transactions;
CREATE POLICY "Loyalty transactions admin mutation" ON public.loyalty_points_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- User Coupons
DROP POLICY IF EXISTS "User coupons isolated" ON public.user_coupons;
CREATE POLICY "User coupons isolated" ON public.user_coupons
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- User Settings & Addresses
DROP POLICY IF EXISTS user_settings_all ON public.user_settings;
DROP POLICY IF EXISTS "User settings isolated" ON public.user_settings;
CREATE POLICY "User settings isolated" ON public.user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS user_addresses_all ON public.user_addresses;
DROP POLICY IF EXISTS "User addresses isolated" ON public.user_addresses;
CREATE POLICY "User addresses isolated" ON public.user_addresses
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- User Device Tokens (FCM)
DROP POLICY IF EXISTS "Public device tokens policy" ON public.user_device_tokens;
DROP POLICY IF EXISTS "User device tokens isolated" ON public.user_device_tokens;
CREATE POLICY "User device tokens isolated" ON public.user_device_tokens
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Traveler Details
DROP POLICY IF EXISTS "Traveler details isolated" ON public.traveler_details;
CREATE POLICY "Traveler details isolated" ON public.traveler_details
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Invoices & Vouchers
DROP POLICY IF EXISTS "Invoices read isolated" ON public.invoices;
CREATE POLICY "Invoices read isolated" ON public.invoices
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Vouchers read isolated" ON public.vouchers;
CREATE POLICY "Vouchers read isolated" ON public.vouchers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- Support Tickets & Chat
DROP POLICY IF EXISTS "Support tickets isolated" ON public.support_tickets;
CREATE POLICY "Support tickets isolated" ON public.support_tickets
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Ticket messages isolated" ON public.ticket_messages;
CREATE POLICY "Ticket messages isolated" ON public.ticket_messages
  FOR ALL TO authenticated
  USING (
    sender_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = ticket_messages.ticket_id AND (support_tickets.user_id = auth.uid() OR public.is_admin()))
  )
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM public.support_tickets WHERE support_tickets.id = ticket_messages.ticket_id AND (support_tickets.user_id = auth.uid() OR public.is_admin()))
  );

-- Notifications
DROP POLICY IF EXISTS "Notifications isolated" ON public.notifications;
CREATE POLICY "Notifications isolated" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Notifications update isolated" ON public.notifications;
CREATE POLICY "Notifications update isolated" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- 5B. WALLET SECURITY (Deny direct client mutations, enforce owner read)
DROP POLICY IF EXISTS "Shopno wallets owner read" ON public.shopno_wallets;
CREATE POLICY "Shopno wallets owner read" ON public.shopno_wallets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Shopno wallets admin write" ON public.shopno_wallets;
CREATE POLICY "Shopno wallets admin write" ON public.shopno_wallets
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Wallet transactions owner read" ON public.shopno_wallet_transactions;
CREATE POLICY "Wallet transactions owner read" ON public.shopno_wallet_transactions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.shopno_wallets WHERE shopno_wallets.id = shopno_wallet_transactions.wallet_id AND shopno_wallets.user_id = auth.uid()) OR
    public.is_admin()
  );

DROP POLICY IF EXISTS "Wallet transactions admin write" ON public.shopno_wallet_transactions;
CREATE POLICY "Wallet transactions admin write" ON public.shopno_wallet_transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5C. SEPARATION OF ROLES ON BOOKINGS & RESERVATIONS
-- Regular users can only see/update their own bookings (user_id = auth.uid())
-- Agencies can only see/update bookings associated with their agency_id
-- Hotel staff can only see/update reservations matching their property hotel_id
-- Admins can view/mutate any booking via is_admin()

DROP POLICY IF EXISTS "Bookings role separation select" ON public.bookings;
CREATE POLICY "Bookings role separation select" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR (hotel_id IS NOT NULL AND public.is_hotel_staff(hotel_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings role separation insert" ON public.bookings;
CREATE POLICY "Bookings role separation insert" ON public.bookings
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings role separation update" ON public.bookings;
CREATE POLICY "Bookings role separation update" ON public.bookings
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR (hotel_id IS NOT NULL AND public.is_hotel_staff(hotel_id))
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR (hotel_id IS NOT NULL AND public.is_hotel_staff(hotel_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Bookings admin delete" ON public.bookings;
CREATE POLICY "Bookings admin delete" ON public.bookings
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- Booking Items & Passengers & Payments
DROP POLICY IF EXISTS "Booking items role separation" ON public.booking_items;
CREATE POLICY "Booking items role separation" ON public.booking_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_items.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Booking passengers role separation" ON public.booking_passengers;
CREATE POLICY "Booking passengers role separation" ON public.booking_passengers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_passengers.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_passengers.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  );

DROP POLICY IF EXISTS "Booking payments role separation" ON public.booking_payments;
CREATE POLICY "Booking payments role separation" ON public.booking_payments
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_payments.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_payments.booking_id
        AND (
          bookings.user_id = auth.uid()
          OR (bookings.agency_id IS NOT NULL AND public.is_agency_member(bookings.agency_id))
          OR (bookings.hotel_id IS NOT NULL AND public.is_hotel_staff(bookings.hotel_id))
          OR public.is_admin()
        )
    )
  );

-- 5D. HOTEL STAFF ROLE SEPARATION
DROP POLICY IF EXISTS "Hotel staff view policy" ON public.hotel_staff;
CREATE POLICY "Hotel staff view policy" ON public.hotel_staff
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_hotel_staff(hotel_id)
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Hotel staff mutation policy" ON public.hotel_staff;
CREATE POLICY "Hotel staff mutation policy" ON public.hotel_staff
  FOR ALL TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.hotel_staff hs 
      WHERE hs.hotel_id = hotel_staff.hotel_id 
        AND hs.user_id = auth.uid() 
        AND hs.role IN ('owner', 'manager')
        AND hs.status = 'active'
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.hotel_staff hs 
      WHERE hs.hotel_id = hotel_staff.hotel_id 
        AND hs.user_id = auth.uid() 
        AND hs.role IN ('owner', 'manager')
        AND hs.status = 'active'
    )
  );

-- Hotel Rooms & Availability: Staff can manage rooms for their property
DROP POLICY IF EXISTS "Public can view hotel rooms" ON public.hotel_rooms;
CREATE POLICY "Public can view hotel rooms" ON public.hotel_rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage hotel rooms" ON public.hotel_rooms;
CREATE POLICY "Staff can manage hotel rooms" ON public.hotel_rooms
  FOR ALL TO authenticated
  USING (public.is_hotel_staff(hotel_id) OR public.is_admin())
  WITH CHECK (public.is_hotel_staff(hotel_id) OR public.is_admin());

DROP POLICY IF EXISTS "Public can view hotel availability" ON public.hotel_room_availability;
CREATE POLICY "Public can view hotel availability" ON public.hotel_room_availability FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can manage hotel availability" ON public.hotel_room_availability;
CREATE POLICY "Staff can manage hotel availability" ON public.hotel_room_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.hotel_rooms 
      WHERE hotel_rooms.id = hotel_room_availability.room_id 
        AND (public.is_hotel_staff(hotel_rooms.hotel_id) OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.hotel_rooms 
      WHERE hotel_rooms.id = hotel_room_availability.room_id 
        AND (public.is_hotel_staff(hotel_rooms.hotel_id) OR public.is_admin())
    )
  );

-- 5E. AGENCY PORTAL & CHATS ROLE SEPARATION
-- Service chats & messages between users and agencies
DROP POLICY IF EXISTS "Service chats role separation" ON public.service_chats;
CREATE POLICY "Service chats role separation" ON public.service_chats
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR public.is_admin()
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (agency_id IS NOT NULL AND public.is_agency_member(agency_id))
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Chat messages role separation" ON public.chat_messages;
CREATE POLICY "Chat messages role separation" ON public.chat_messages
  FOR ALL TO authenticated
  USING (
    sender_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.service_chats
      WHERE service_chats.id = chat_messages.chat_id
        AND (service_chats.user_id = auth.uid() OR (service_chats.agency_id IS NOT NULL AND public.is_agency_member(service_chats.agency_id)) OR public.is_admin())
    )
  )
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.service_chats
      WHERE service_chats.id = chat_messages.chat_id
        AND (service_chats.user_id = auth.uid() OR (service_chats.agency_id IS NOT NULL AND public.is_agency_member(service_chats.agency_id)) OR public.is_admin())
    )
  );

-- Agency Messages
DROP POLICY IF EXISTS "Agency messages role separation" ON public.agency_messages;
CREATE POLICY "Agency messages role separation" ON public.agency_messages
  FOR ALL TO authenticated
  USING (
    sender_user_id = auth.uid()
    OR recipient_user_id = auth.uid()
    OR public.is_agency_member(agency_id)
    OR public.is_admin()
  )
  WITH CHECK (
    sender_user_id = auth.uid()
    OR public.is_agency_member(agency_id)
    OR public.is_admin()
  );

-- 5F. ADMIN SCREENS SECURITY DEFINER AUTHORIZATION
-- All admin management tables must be verified by is_admin(auth.uid())

DROP POLICY IF EXISTS "Admin users select" ON public.admin_users;
CREATE POLICY "Admin users select" ON public.admin_users
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admin users mutate" ON public.admin_users;
CREATE POLICY "Admin users mutate" ON public.admin_users
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin activity logs admin only" ON public.admin_activity_logs;
CREATE POLICY "Admin activity logs admin only" ON public.admin_activity_logs
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin security events admin only" ON public.admin_security_events;
CREATE POLICY "Admin security events admin only" ON public.admin_security_events
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "System settings admin only" ON public.system_settings;
CREATE POLICY "System settings admin only" ON public.system_settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- KYC Documents: Private access only for owner or verified admin
DROP POLICY IF EXISTS "KYC documents owner or admin read" ON public.kyc_documents;
CREATE POLICY "KYC documents owner or admin read" ON public.kyc_documents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "KYC documents owner insert" ON public.kyc_documents;
CREATE POLICY "KYC documents owner insert" ON public.kyc_documents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "KYC documents admin mutate" ON public.kyc_documents;
CREATE POLICY "KYC documents admin mutate" ON public.kyc_documents
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5G. COMMUNITY FEED AUTHENTICATED MUTATION POLICIES (Replacing Insecure Anon Demo)
DROP POLICY IF EXISTS "Posts authenticated insert" ON public.posts;
CREATE POLICY "Posts authenticated insert" ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Posts owner or admin mutate" ON public.posts;
CREATE POLICY "Posts owner or admin mutate" ON public.posts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Posts owner or admin delete" ON public.posts;
CREATE POLICY "Posts owner or admin delete" ON public.posts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Post comments authenticated insert" ON public.post_comments;
CREATE POLICY "Post comments authenticated insert" ON public.post_comments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Post comments owner or admin delete" ON public.post_comments;
CREATE POLICY "Post comments owner or admin delete" ON public.post_comments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Post likes authenticated manage" ON public.post_likes;
CREATE POLICY "Post likes authenticated manage" ON public.post_likes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Saved posts authenticated manage" ON public.saved_posts;
CREATE POLICY "Saved posts authenticated manage" ON public.saved_posts
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "User follows authenticated manage" ON public.user_follows;
CREATE POLICY "User follows authenticated manage" ON public.user_follows
  FOR ALL TO authenticated
  USING (follower_id = auth.uid())
  WITH CHECK (follower_id = auth.uid());

-- Step 6: PARAMETERIZED, SANITIZED RPC FUNCTIONS (PREVENT SQL INJECTION)

-- Safe atomic wallet payment RPC with row locking
CREATE OR REPLACE FUNCTION public.process_wallet_payment(
  p_booking_id UUID,
  p_amount NUMERIC,
  p_reference TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_transaction_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: authenticated session required' USING ERRCODE = '42501';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount: payment amount must be greater than zero' USING ERRCODE = '22003';
  END IF;

  -- Lock the user wallet row for update to prevent concurrent double-spend race condition
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.shopno_wallets
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found for current user' USING ERRCODE = 'P0002';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient wallet balance. Current: %, Required: %', v_balance, p_amount USING ERRCODE = 'P0001';
  END IF;

  -- Deduct from wallet balance
  UPDATE public.shopno_wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Record transaction
  INSERT INTO public.shopno_wallet_transactions (
    wallet_id,
    user_id,
    amount,
    transaction_type,
    status,
    description,
    reference
  ) VALUES (
    v_wallet_id,
    v_user_id,
    p_amount,
    'payment',
    'completed',
    'Payment for booking ' || COALESCE(p_booking_id::TEXT, 'Direct'),
    p_reference
  ) RETURNING id INTO v_transaction_id;

  -- Update booking payment status if booking_id provided
  IF p_booking_id IS NOT NULL THEN
    UPDATE public.booking_payments
    SET payment_status = 'completed',
        transaction_id = v_transaction_id::TEXT,
        processed_at = NOW(),
        updated_at = NOW()
    WHERE booking_id = p_booking_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'remaining_balance', v_balance - p_amount
  );
END;
$$;

-- Payment Replay-Protection & Nonce Registry Table
CREATE TABLE IF NOT EXISTS public.payment_security_nonces (
  nonce TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.payment_security_nonces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_security_nonces FORCE ROW LEVEL SECURITY;

CREATE POLICY "Payment nonces admin or system only" ON public.payment_security_nonces
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- RPC to verify single-use payment nonce with 5-minute replay window
CREATE OR REPLACE FUNCTION public.verify_payment_nonce(
  p_nonce TEXT,
  p_timestamp BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_current_ms BIGINT := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
  v_diff_ms BIGINT;
  v_user_id UUID := auth.uid();
BEGIN
  IF p_nonce IS NULL OR LENGTH(TRIM(p_nonce)) < 16 THEN
    RETURN FALSE;
  END IF;

  v_diff_ms := ABS(v_current_ms - p_timestamp);
  -- Reject requests older than 5 minutes (300,000 ms)
  IF v_diff_ms > 300000 THEN
    RETURN FALSE;
  END IF;

  -- Attempt to insert nonce; if duplicate, conflict indicates replay attack
  BEGIN
    INSERT INTO public.payment_security_nonces (nonce, user_id, timestamp)
    VALUES (p_nonce, v_user_id, p_timestamp);
    RETURN TRUE;
  EXCEPTION WHEN unique_violation THEN
    RETURN FALSE;
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_wallet_payment(UUID, NUMERIC, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_payment_nonce(TEXT, BIGINT) TO authenticated;

COMMIT;

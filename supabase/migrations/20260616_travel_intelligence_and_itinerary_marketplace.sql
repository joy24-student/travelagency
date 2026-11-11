-- ============================================================================
-- MIGRATION: 20260616_travel_intelligence_and_itinerary_marketplace.sql
-- DESCRIPTION: Travel Intelligence (Disruption Engine) & Itinerary Marketplace
-- (One-Click Clone, Creator Studio, Multi-Service Booking Saga)
-- ============================================================================

-- Ensure required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CREATOR ECONOMY & PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.creator_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  location TEXT DEFAULT 'Bangladesh',
  verified BOOLEAN DEFAULT FALSE,
  badges TEXT[] DEFAULT ARRAY['Traveler']::TEXT[],
  total_clones INT DEFAULT 0,
  total_saves INT DEFAULT 0,
  total_views INT DEFAULT 0,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  commission_rate NUMERIC(5, 2) DEFAULT 5.00,
  payout_details JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON public.creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_handle ON public.creator_profiles(handle);

-- Creator Analytics
CREATE TABLE IF NOT EXISTS public.creator_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- view, save, clone, booking_conversion
  itinerary_id UUID,
  cloning_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  earnings_bdt NUMERIC(12, 2) DEFAULT 0.00,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_analytics_creator ON public.creator_analytics(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_analytics_created_at ON public.creator_analytics(created_at);

-- ============================================================================
-- 2. ITINERARY MARKETPLACE & ITINERARY BUILDER
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image TEXT NOT NULL,
  destination TEXT NOT NULL,
  destination_country TEXT DEFAULT 'Bangladesh' NOT NULL,
  start_location TEXT DEFAULT 'Dhaka',
  end_location TEXT DEFAULT 'Dhaka',
  duration_days INT DEFAULT 3 NOT NULL,
  estimated_budget NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  travel_category TEXT DEFAULT 'adventure' NOT NULL, -- budget, luxury, family, couple, solo, adventure, photography, weekend
  difficulty_level TEXT DEFAULT 'easy', -- easy, moderate, challenging
  visibility TEXT DEFAULT 'public' NOT NULL, -- public, unlisted, private
  is_featured BOOLEAN DEFAULT FALSE,
  clone_count INT DEFAULT 0 NOT NULL,
  save_count INT DEFAULT 0 NOT NULL,
  view_count INT DEFAULT 0 NOT NULL,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  review_count INT DEFAULT 0 NOT NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  highlights TEXT[] DEFAULT ARRAY[]::TEXT[],
  included_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_services TEXT[] DEFAULT ARRAY[]::TEXT[],
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itineraries_creator_id ON public.itineraries(creator_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_destination ON public.itineraries(destination);
CREATE INDEX IF NOT EXISTS idx_itineraries_visibility ON public.itineraries(visibility);
CREATE INDEX IF NOT EXISTS idx_itineraries_category ON public.itineraries(travel_category);
CREATE INDEX IF NOT EXISTS idx_itineraries_clone_count ON public.itineraries(clone_count DESC);
CREATE INDEX IF NOT EXISTS idx_itineraries_is_featured ON public.itineraries(is_featured);

-- Itinerary Days (Day-by-Day schedule)
CREATE TABLE IF NOT EXISTS public.itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  day_start_time TEXT DEFAULT '09:00 AM',
  cover_image TEXT,
  stops_count INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(itinerary_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_days_itinerary_id ON public.itinerary_days(itinerary_id);

-- Itinerary Items (Timeline activities, stops, transit)
CREATE TABLE IF NOT EXISTS public.itinerary_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_day_id UUID NOT NULL REFERENCES public.itinerary_days(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  subtitle TEXT,
  category TEXT NOT NULL, -- transport, hotel, restaurant, attraction, activity, shopping, guide, boat, transfer, other
  start_time TEXT,
  end_time TEXT,
  duration_minutes INT,
  transit_instruction TEXT, -- e.g. "Take bus 15, 125, 86 - 2 stops", "Walk 533m"
  location_name TEXT,
  address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  estimated_cost NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  image_url TEXT,
  order_index INT DEFAULT 0 NOT NULL,
  booking_required BOOLEAN DEFAULT FALSE,
  provider_type TEXT, -- flight, train, bus, hotel, activity, guide
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_day ON public.itinerary_items(itinerary_day_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_order ON public.itinerary_items(itinerary_day_id, order_index);

-- Itinerary Media Gallery
CREATE TABLE IF NOT EXISTS public.itinerary_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image', -- image, video
  caption TEXT,
  order_index INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Itinerary Saves / Bookmarks
CREATE TABLE IF NOT EXISTS public.itinerary_saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(itinerary_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_itinerary_saves_user ON public.itinerary_saves(user_id);

-- Itinerary Clones (Private copies personalized by users)
CREATE TABLE IF NOT EXISTS public.itinerary_clones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  original_creator_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  cloning_user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  travel_start_date DATE NOT NULL,
  travel_end_date DATE,
  traveler_count INT DEFAULT 1 NOT NULL,
  adults_count INT DEFAULT 1 NOT NULL,
  children_count INT DEFAULT 0 NOT NULL,
  target_budget NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  preferred_hotel_category TEXT DEFAULT 'standard', -- budget, standard, boutique, luxury
  transport_preference TEXT DEFAULT 'balanced', -- public, private, express, balanced
  pace_of_travel TEXT DEFAULT 'moderate', -- relaxed, moderate, fast_paced
  dietary_preferences TEXT[] DEFAULT ARRAY[]::TEXT[],
  accessibility_needs TEXT[] DEFAULT ARRAY[]::TEXT[],
  customized_schedule JSONB NOT NULL, -- personalized day-by-day JSON snapshot
  ai_optimizations JSONB DEFAULT '[]'::jsonb, -- changes made by AI (budget trade-offs)
  status TEXT DEFAULT 'draft' NOT NULL, -- draft, customized, quoted, booked, completed
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_clones_cloning_user ON public.itinerary_clones(cloning_user_id);
CREATE INDEX IF NOT EXISTS idx_itinerary_clones_original ON public.itinerary_clones(original_itinerary_id);

-- Creator Attribution & Royalties
CREATE TABLE IF NOT EXISTS public.creator_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  original_itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  clone_id UUID REFERENCES public.itinerary_clones(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  commission_amount NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BDT',
  payout_status TEXT DEFAULT 'pending', -- pending, escrowed, paid, forfeited
  escrow_release_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_creator_attributions_creator ON public.creator_attributions(creator_id);

-- ============================================================================
-- 3. PERSONALIZATION & QUOTATION SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itinerary_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clone_id UUID NOT NULL REFERENCES public.itinerary_clones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  total_base_price NUMERIC(12, 2) NOT NULL,
  total_taxes NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  total_service_fees NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  total_discount NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
  final_payable_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  status TEXT DEFAULT 'valid' NOT NULL, -- valid, expired, converted
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_quotes_clone ON public.itinerary_quotes(clone_id);

CREATE TABLE IF NOT EXISTS public.itinerary_quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.itinerary_quotes(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- flight, train, bus, hotel, activity, guide, boat
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  service_title TEXT NOT NULL,
  quantity INT DEFAULT 1 NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL,
  total_price NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  availability_status TEXT DEFAULT 'verified' NOT NULL, -- verified, requires_manual_confirmation, unavailable
  inventory_verification_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itinerary_quote_items_quote ON public.itinerary_quote_items(quote_id);

-- ============================================================================
-- 4. MULTI-SERVICE BOOKING SAGA & ORCHESTRATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.trip_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  itinerary_clone_id UUID REFERENCES public.itinerary_clones(id) ON DELETE SET NULL,
  booking_reference TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'DRAFT' NOT NULL, 
  -- DRAFT, QUOTED, RESERVING, PARTIALLY_CONFIRMED, CONFIRMED, PAYMENT_PENDING, FAILED, CANCELLED, REFUND_PENDING, REFUNDED
  total_amount NUMERIC(12, 2) NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  payment_method TEXT, -- bkash, nagad, rocket, card, wallet
  payment_status TEXT DEFAULT 'unpaid', -- unpaid, authorized, captured, refunded
  payment_transaction_id TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trip_bookings_user ON public.trip_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_ref ON public.trip_bookings(booking_reference);
CREATE INDEX IF NOT EXISTS idx_trip_bookings_status ON public.trip_bookings(status);

-- Individual service bookings inside the parent saga
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_booking_id UUID NOT NULL REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL, -- flight, train, bus, hotel, activity, guide, boat
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  service_reference TEXT,
  status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, RESERVING, RESERVED, CONFIRMED, FAILED, CANCELLED
  unit_price NUMERIC(12, 2) NOT NULL,
  quantity INT DEFAULT 1 NOT NULL,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  details JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  cancellation_policy JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_service_bookings_trip ON public.service_bookings(trip_booking_id);

-- Booking Compensations (Rollback on partial saga failure)
CREATE TABLE IF NOT EXISTS public.booking_compensations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_booking_id UUID NOT NULL REFERENCES public.trip_bookings(id) ON DELETE CASCADE,
  service_booking_id UUID REFERENCES public.service_bookings(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- cancel_reservation, refund_amount, notify_supplier
  status TEXT DEFAULT 'PENDING' NOT NULL, -- PENDING, EXECUTED, FAILED, MANUAL_REVIEW_REQUIRED
  amount_refunded NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BDT',
  provider_response JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_booking_compensations_trip ON public.booking_compensations(trip_booking_id);

-- Provider Status Logs
CREATE TABLE IF NOT EXISTS public.provider_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_code TEXT NOT NULL,
  service_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- search, quote, reserve, confirm, cancel
  status_code INT,
  is_success BOOLEAN NOT NULL,
  latency_ms INT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_logs_provider ON public.provider_status_logs(provider_code);
CREATE INDEX IF NOT EXISTS idx_provider_logs_created_at ON public.provider_status_logs(created_at);

-- ============================================================================
-- 5. TRAVEL DISRUPTION INTELLIGENCE ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journey_monitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  trip_booking_id UUID REFERENCES public.trip_bookings(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL, -- flight, train, bus, hotel, ferry
  provider_code TEXT NOT NULL, -- BG, 2A, BR, GREEN_LINE, etc.
  service_number TEXT NOT NULL, -- BG-433, 701 Subarna, etc.
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  scheduled_departure TIMESTAMPTZ NOT NULL,
  scheduled_arrival TIMESTAMPTZ NOT NULL,
  estimated_departure TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  current_status TEXT DEFAULT 'on_time' NOT NULL, -- on_time, delayed, cancelled, gate_change, rescheduled
  delay_minutes INT DEFAULT 0 NOT NULL,
  terminal TEXT,
  gate TEXT,
  platform TEXT,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  notification_enabled BOOLEAN DEFAULT TRUE NOT NULL,
  max_alternative_budget NUMERIC(12, 2),
  preferred_transport_types TEXT[] DEFAULT ARRAY['flight', 'train', 'bus']::TEXT[],
  last_checked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
  confidence_score NUMERIC(3, 2) DEFAULT 1.00,
  data_source TEXT DEFAULT 'authorized_feed',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_journey_monitors_user ON public.journey_monitors(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_monitors_active ON public.journey_monitors(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_journey_monitors_service ON public.journey_monitors(service_type, service_number);

-- Disruption Events (Immutable, Idempotent Event Log)
CREATE TABLE IF NOT EXISTS public.disruption_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.journey_monitors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, 
  -- FLIGHT_DELAYED, FLIGHT_CANCELLED, FLIGHT_GATE_CHANGED, TRAIN_DELAYED, TRAIN_CANCELLED, 
  -- BUS_CANCELLED, ROUTE_DISRUPTED, WEATHER_WARNING, CONNECTION_AT_RISK, HOTEL_CHECKIN_AT_RISK
  severity TEXT DEFAULT 'medium' NOT NULL, -- low, medium, high, critical
  previous_state JSONB DEFAULT '{}'::jsonb,
  new_state JSONB DEFAULT '{}'::jsonb,
  delay_minutes INT DEFAULT 0,
  source TEXT NOT NULL, -- amadeus, aviationstack, bangladesh_railway, weather, admin_override
  confidence NUMERIC(3, 2) DEFAULT 1.00 NOT NULL,
  dedup_hash TEXT UNIQUE NOT NULL, -- SHA256(monitor_id + event_type + delay_minutes + event_timestamp::date)
  event_timestamp TIMESTAMPTZ NOT NULL,
  processing_status TEXT DEFAULT 'pending' NOT NULL, -- pending, analyzed, notified, action_taken, resolved
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disruption_events_user ON public.disruption_events(user_id);
CREATE INDEX IF NOT EXISTS idx_disruption_events_monitor ON public.disruption_events(monitor_id);
CREATE INDEX IF NOT EXISTS idx_disruption_events_status ON public.disruption_events(processing_status);

-- Disruption Impacts (Downstream Connection & Hotel Conflicts)
CREATE TABLE IF NOT EXISTS public.disruption_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.disruption_events(id) ON DELETE CASCADE,
  affected_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  affected_service_type TEXT NOT NULL, -- hotel, connecting_train, connecting_flight, transfer
  impact_summary TEXT NOT NULL,
  connection_missed BOOLEAN DEFAULT FALSE,
  hotel_checkin_missed BOOLEAN DEFAULT FALSE,
  severity TEXT DEFAULT 'medium' NOT NULL,
  ai_explanation TEXT,
  requires_user_approval BOOLEAN DEFAULT TRUE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE NOT NULL,
  resolution_type TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disruption_impacts_event ON public.disruption_impacts(event_id);

-- Alternative Recommendations (Real, Verified Transport & Hotel Options)
CREATE TABLE IF NOT EXISTS public.alternative_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.disruption_events(id) ON DELETE CASCADE,
  transport_type TEXT NOT NULL, -- flight, train, bus, hotel_reschedule, ferry
  title TEXT NOT NULL,
  operator_name TEXT NOT NULL,
  route_description TEXT NOT NULL,
  departure_time TIMESTAMPTZ,
  arrival_time TIMESTAMPTZ,
  duration_minutes INT,
  estimated_price NUMERIC(12, 2),
  price_difference NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'BDT' NOT NULL,
  verified_availability BOOLEAN DEFAULT FALSE NOT NULL,
  verification_timestamp TIMESTAMPTZ,
  reliability_score NUMERIC(3, 2) DEFAULT 0.90,
  booking_action TEXT NOT NULL, -- instant_book, search, request_confirmation, contact_hotel
  action_payload JSONB DEFAULT '{}'::jsonb,
  user_decision TEXT DEFAULT 'pending' NOT NULL, -- pending, accepted, rejected, expired
  user_decision_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_alternative_recs_event ON public.alternative_recommendations(event_id);

-- Disruption Timeline / Audit Trail
CREATE TABLE IF NOT EXISTS public.disruption_timeline_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monitor_id UUID NOT NULL REFERENCES public.journey_monitors(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.disruption_events(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  entry_type TEXT NOT NULL, -- scheduled, detected_change, ai_analyzed, notification_sent, alternative_presented, user_action, confirmed
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disruption_timeline_monitor ON public.disruption_timeline_entries(monitor_id);

-- Notification Delivery Logs & Preferences
CREATE TABLE IF NOT EXISTS public.travel_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  critical_disruptions_push BOOLEAN DEFAULT TRUE NOT NULL,
  critical_disruptions_sms BOOLEAN DEFAULT TRUE NOT NULL,
  critical_disruptions_email BOOLEAN DEFAULT TRUE NOT NULL,
  delay_threshold_minutes INT DEFAULT 30 NOT NULL,
  quiet_hours_enabled BOOLEAN DEFAULT FALSE NOT NULL,
  quiet_hours_start TEXT DEFAULT '23:00',
  quiet_hours_end TEXT DEFAULT '06:00',
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.disruption_events(id) ON DELETE SET NULL,
  channel TEXT NOT NULL, -- push, in_app, sms, email
  recipient TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivery_status TEXT DEFAULT 'sent' NOT NULL, -- pending, sent, failed, delivered
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_logs_user ON public.notification_delivery_logs(user_id);

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_clones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itinerary_quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_compensations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_monitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruption_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruption_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alternative_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disruption_timeline_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

-- 6.1 Creator Profiles
CREATE POLICY "Public can view creator profiles"
  ON public.creator_profiles FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Users can manage their own creator profile"
  ON public.creator_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.2 Itineraries
CREATE POLICY "Public can view public itineraries"
  ON public.itineraries FOR SELECT
  USING (visibility = 'public' AND deleted_at IS NULL);

CREATE POLICY "Creators can view and manage their own itineraries"
  ON public.itineraries FOR ALL
  USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- 6.3 Itinerary Days & Items (Read with itinerary, edit with creator)
CREATE POLICY "Public can view days of public itineraries"
  ON public.itinerary_days FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_days.itinerary_id
      AND (i.visibility = 'public' OR i.creator_id = auth.uid())
    )
  );

CREATE POLICY "Creators can manage days of their itineraries"
  ON public.itinerary_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.itineraries i
      WHERE i.id = itinerary_days.itinerary_id
      AND i.creator_id = auth.uid()
    )
  );

CREATE POLICY "Public can view items of public itinerary days"
  ON public.itinerary_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = itinerary_items.itinerary_day_id
      AND (i.visibility = 'public' OR i.creator_id = auth.uid())
    )
  );

CREATE POLICY "Creators can manage items of their itineraries"
  ON public.itinerary_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.itinerary_days d
      JOIN public.itineraries i ON i.id = d.itinerary_id
      WHERE d.id = itinerary_items.itinerary_day_id
      AND i.creator_id = auth.uid()
    )
  );

-- 6.4 Itinerary Saves
CREATE POLICY "Users can view and manage their saves"
  ON public.itinerary_saves FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6.5 Itinerary Clones (Strict User Privacy)
CREATE POLICY "Users can view and manage their own clones"
  ON public.itinerary_clones FOR ALL
  USING (auth.uid() = cloning_user_id)
  WITH CHECK (auth.uid() = cloning_user_id);

-- 6.6 Trip Bookings & Service Bookings (Traveler Privacy)
CREATE POLICY "Users can view and manage their own trip bookings"
  ON public.trip_bookings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own service bookings"
  ON public.service_bookings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.trip_bookings tb
      WHERE tb.id = service_bookings.trip_booking_id
      AND tb.user_id = auth.uid()
    )
  );

-- 6.7 Journey Monitors & Disruption Events (Traveler Privacy)
CREATE POLICY "Users can view and manage their journey monitors"
  ON public.journey_monitors FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view disruption events for their monitored journeys"
  ON public.disruption_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view impacts for their disruptions"
  ON public.disruption_impacts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.disruption_events de
      WHERE de.id = disruption_impacts.event_id
      AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view and act on alternatives for their disruptions"
  ON public.alternative_recommendations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.disruption_events de
      WHERE de.id = alternative_recommendations.event_id
      AND de.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view timeline entries for their journeys"
  ON public.disruption_timeline_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.journey_monitors jm
      WHERE jm.id = disruption_timeline_entries.monitor_id
      AND jm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their notification preferences"
  ON public.travel_notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their notification delivery logs"
  ON public.notification_delivery_logs FOR SELECT
  USING (auth.uid() = user_id);

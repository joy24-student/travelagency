-- ============================================================================
-- 20260616_verified_marketplace.sql
-- Verified Local Guide & Boatman Marketplace Schema
-- Supporting Cox's Bazar, Sundarbans, Bandarban, Sylhet, Sajek
-- Compliant with Image 1 (GPS Tracking Workflow) and Image 2 (Relational Blueprint)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 1. PROVIDER PROFILES (Extends user profiles with professional credentials)
CREATE TABLE IF NOT EXISTS provider_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_category TEXT NOT NULL CHECK (
    provider_category IN (
      'tour_guide',
      'local_guide',
      'boatman',
      'trekking_guide',
      'nature_guide',
      'photographer',
      'adventure_operator'
    )
  ),
  business_name TEXT,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_phone TEXT,
  email TEXT,
  avatar_url TEXT,
  bio TEXT NOT NULL DEFAULT '',
  bio_bn TEXT,
  experience_years INTEGER NOT NULL DEFAULT 1 CHECK (experience_years >= 0),
  daily_rate NUMERIC(10, 2) NOT NULL DEFAULT 1500.00 CHECK (daily_rate >= 0),
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 250.00 CHECK (hourly_rate >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  primary_destination TEXT NOT NULL CHECK (
    primary_destination IN (
      'Cox''s Bazar',
      'Sundarbans',
      'Bandarban',
      'Sylhet',
      'Sajek',
      'Dhaka Heritage',
      'Rangamati',
      'Sreemangal'
    )
  ),
  covered_destinations TEXT[] NOT NULL DEFAULT '{}',
  languages TEXT[] NOT NULL DEFAULT '{"Bangla", "English"}',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  badge TEXT NOT NULL DEFAULT 'Rising Star' CHECK (
    badge IN ('Top Rated', 'Local Expert', 'Rising Star', 'Verified Guide', 'Master Boatman')
  ),
  verification_status TEXT NOT NULL DEFAULT 'draft' CHECK (
    verification_status IN (
      'draft',
      'submitted',
      'under_review',
      'additional_information_required',
      'approved',
      'rejected',
      'suspended',
      'expired'
    )
  ),
  nid_verified BOOLEAN NOT NULL DEFAULT FALSE,
  license_verified BOOLEAN NOT NULL DEFAULT FALSE,
  boat_permit_verified BOOLEAN NOT NULL DEFAULT FALSE,
  police_clearance_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating >= 1.00 AND rating <= 5.00),
  reviews_count INTEGER NOT NULL DEFAULT 0 CHECK (reviews_count >= 0),
  total_trips INTEGER NOT NULL DEFAULT 0 CHECK (total_trips >= 0),
  admin_notes TEXT,
  rejection_reason TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_provider_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_profiles_dest ON provider_profiles(primary_destination);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_category ON provider_profiles(provider_category);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_status ON provider_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_profiles_rating ON provider_profiles(rating DESC);

-- 2. PROVIDER DOCUMENTS (Identity, BRTA/Tourist Police licenses, Vessel seaworthiness)
CREATE TABLE IF NOT EXISTS provider_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'nid_front',
      'nid_back',
      'passport',
      'tourist_police_license',
      'tour_guide_cert',
      'boat_registration',
      'boat_fitness_cert',
      'police_clearance',
      'first_aid_cert',
      'other'
    )
  ),
  document_number TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  mime_type TEXT,
  expiry_date DATE,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    verification_status IN ('pending', 'verified', 'rejected', 'expired')
  ),
  rejection_reason TEXT,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_docs_provider ON provider_documents(provider_id);

-- 3. PROVIDER LICENSES
CREATE TABLE IF NOT EXISTS provider_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  issuing_authority TEXT NOT NULL,
  issue_date DATE,
  expiry_date DATE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. PROVIDER SERVICES & PACKAGES
CREATE TABLE IF NOT EXISTS provider_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT NOT NULL,
  description_bn TEXT,
  category TEXT NOT NULL CHECK (
    category IN (
      'day_tour',
      'boat_safari',
      'trekking_expedition',
      'wildlife_tracking',
      'sunset_cruise',
      'photography_walk',
      'cultural_walk',
      'custom_package'
    )
  ),
  destination TEXT NOT NULL,
  price_model TEXT NOT NULL DEFAULT 'daily' CHECK (price_model IN ('hourly', 'daily', 'fixed_package', 'per_person')),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  duration_hours NUMERIC(4, 1) NOT NULL DEFAULT 8.0,
  max_capacity INTEGER NOT NULL DEFAULT 4 CHECK (max_capacity >= 1),
  included_services TEXT[] NOT NULL DEFAULT '{}',
  excluded_services TEXT[] NOT NULL DEFAULT '{}',
  meeting_point TEXT NOT NULL,
  meeting_point_lat DOUBLE PRECISION,
  meeting_point_lng DOUBLE PRECISION,
  cancellation_policy TEXT NOT NULL DEFAULT 'Free cancellation up to 24 hours before tour start.',
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_provider_services_prov ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_dest ON provider_services(destination);
CREATE INDEX IF NOT EXISTS idx_provider_services_price ON provider_services(price);

-- 5. PROVIDER SERVICE MEDIA
CREATE TABLE IF NOT EXISTS provider_service_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES provider_services(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 6. PROVIDER AVAILABILITY (Date & Slot Scheduling)
CREATE TABLE IF NOT EXISTS provider_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '08:00:00',
  end_time TIME NOT NULL DEFAULT '18:00:00',
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  booking_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_provider_availability_slot UNIQUE (provider_id, available_date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_provider_avail_date ON provider_availability(provider_id, available_date);

-- 7. PROVIDER PORTFOLIO & PAST EXPERIENCES
CREATE TABLE IF NOT EXISTS provider_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. MARKETPLACE BOOKINGS
CREATE TABLE IF NOT EXISTS marketplace_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_reference TEXT NOT NULL UNIQUE,
  traveler_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES provider_services(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN (
      'pending',
      'confirmed',
      'check_in_pending',
      'in_progress',
      'completed',
      'cancelled',
      'disputed',
      'refunded'
    )
  ),
  tour_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:00:00',
  duration_days INTEGER NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  number_of_guests INTEGER NOT NULL DEFAULT 1 CHECK (number_of_guests >= 1),
  total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
  platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  provider_earnings NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (provider_earnings >= 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  meeting_point TEXT NOT NULL,
  special_requests TEXT,
  otp_code VARCHAR(6) NOT NULL,
  otp_verified_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mkt_bookings_traveler ON marketplace_bookings(traveler_id);
CREATE INDEX IF NOT EXISTS idx_mkt_bookings_provider ON marketplace_bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_mkt_bookings_date ON marketplace_bookings(tour_date);
CREATE INDEX IF NOT EXISTS idx_mkt_bookings_status ON marketplace_bookings(status);

-- 9. BOOKING PARTICIPANTS
CREATE TABLE IF NOT EXISTS marketplace_booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  age INTEGER,
  gender TEXT,
  emergency_contact TEXT,
  is_lead BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. TRIP SESSIONS (State machine for live trips & OTP start)
CREATE TABLE IF NOT EXISTS trip_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
  traveler_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'checked_in', 'active', 'paused', 'completed', 'aborted')
  ),
  otp_code_entered VARCHAR(6),
  otp_verified BOOLEAN NOT NULL DEFAULT FALSE,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  current_latitude DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  last_ping_at TIMESTAMPTZ,
  total_distance_km NUMERIC(8, 3) NOT NULL DEFAULT 0.000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_session_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_sessions_provider ON trip_sessions(provider_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_traveler ON trip_sessions(traveler_id);
CREATE INDEX IF NOT EXISTS idx_trip_sessions_status ON trip_sessions(status);

-- 11. TRIP LOCATIONS (Geospatial Breadcrumbs & Live Tracking)
CREATE TABLE IF NOT EXISTS trip_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trip_sessions(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  altitude DOUBLE PRECISION,
  accuracy DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  heading DOUBLE PRECISION,
  battery_level NUMERIC(4, 2),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  location_point geography(Point, 4326) GENERATED ALWAYS AS (
    ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
  ) STORED
);

CREATE INDEX IF NOT EXISTS idx_trip_locations_session_time ON trip_locations(session_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_trip_locations_geom ON trip_locations USING GIST(location_point);

-- 12. TRIP EMERGENCY EVENTS (SOS Panic & Incident Dispatch)
CREATE TABLE IF NOT EXISTS trip_emergency_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES trip_sessions(id) ON DELETE CASCADE,
  triggered_by UUID NOT NULL REFERENCES auth.users(id),
  event_type TEXT NOT NULL DEFAULT 'sos_panic' CHECK (
    event_type IN ('sos_panic', 'route_deviation', 'prolonged_stationary', 'medical_assistance', 'weather_hazard')
  ),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  accuracy DOUBLE PRECISION,
  address_context TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'acknowledged', 'dispatched', 'resolved', 'false_alarm')
  ),
  notes TEXT,
  dispatch_target TEXT DEFAULT '999_and_contacts',
  trusted_contacts_notified BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_emergency_session ON trip_emergency_events(session_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status ON trip_emergency_events(status);

-- 13. REVIEWS & RATINGS
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE RESTRICT,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating NUMERIC(2, 1) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
  title TEXT,
  comment TEXT NOT NULL,
  photos TEXT[] NOT NULL DEFAULT '{}',
  is_verified_booking BOOLEAN NOT NULL DEFAULT TRUE,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_mkt_review_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_mkt_reviews_provider ON marketplace_reviews(provider_id);

-- 14. BOOKING DISPUTES
CREATE TABLE IF NOT EXISTS marketplace_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE CASCADE,
  raised_by UUID NOT NULL REFERENCES auth.users(id),
  reason TEXT NOT NULL CHECK (
    reason IN (
      'provider_no_show',
      'traveler_no_show',
      'unprofessional_behavior',
      'route_aborted_early',
      'safety_concern',
      'overcharging',
      'other'
    )
  ),
  description TEXT NOT NULL,
  evidence_urls TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'under_investigation', 'resolved_refunded', 'resolved_rejected', 'settled')
  ),
  resolution_notes TEXT,
  refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_disputes_booking ON marketplace_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON marketplace_disputes(status);

-- 15. PROVIDER PAYOUTS
CREATE TABLE IF NOT EXISTS marketplace_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE RESTRICT,
  booking_id UUID NOT NULL REFERENCES marketplace_bookings(id) ON DELETE RESTRICT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BDT',
  payout_method TEXT NOT NULL CHECK (payout_method IN ('bkash', 'nagad', 'bank_transfer')),
  payout_account TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')
  ),
  transaction_ref TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payouts_provider ON marketplace_payouts(provider_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON marketplace_payouts(status);

-- 16. SAVED PROVIDERS (Traveler Favorites)
CREATE TABLE IF NOT EXISTS saved_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES provider_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_saved_provider UNIQUE (user_id, provider_id)
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_service_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_providers ENABLE ROW LEVEL SECURITY;

-- 1. Public Read for Approved Providers & Published Services
CREATE POLICY "Public read approved provider profiles"
  ON provider_profiles FOR SELECT
  USING (verification_status = 'approved' OR auth.uid() = user_id OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Providers can update own profile"
  ON provider_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can apply as provider"
  ON provider_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read published provider services"
  ON provider_services FOR SELECT
  USING (is_published = TRUE OR auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id));

CREATE POLICY "Providers can manage own services"
  ON provider_services FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id));

CREATE POLICY "Public read provider availability"
  ON provider_availability FOR SELECT
  USING (TRUE);

CREATE POLICY "Providers can manage own availability"
  ON provider_availability FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id));

-- 2. Sensitive Documents: Strictly Provider + Admin
CREATE POLICY "Providers read own documents"
  ON provider_documents FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id) OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Providers insert own documents"
  ON provider_documents FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id));

-- 3. Bookings: Traveler + Provider + Admin
CREATE POLICY "Booking parties can read booking"
  ON marketplace_bookings FOR SELECT
  USING (
    auth.uid() = traveler_id OR 
    auth.uid() IN (SELECT user_id FROM provider_profiles WHERE id = provider_id) OR
    auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Travelers create bookings"
  ON marketplace_bookings FOR INSERT
  WITH CHECK (auth.uid() = traveler_id);

-- 4. Trip Locations: Strictly Active Parties + Trusted Contacts
CREATE POLICY "Trip locations read by session participants"
  ON trip_locations FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM trip_sessions 
      WHERE traveler_id = auth.uid() 
         OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Providers insert trip locations"
  ON trip_locations FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM trip_sessions 
      WHERE provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    )
  );

-- 5. Emergency Events: Read and Insert by Trip Participants and Admins
CREATE POLICY "Emergency events visible to trip participants and admins"
  ON trip_emergency_events FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM trip_sessions 
      WHERE traveler_id = auth.uid() 
         OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    ) OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Trip participants can trigger emergency"
  ON trip_emergency_events FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM trip_sessions 
      WHERE traveler_id = auth.uid() 
         OR provider_id IN (SELECT id FROM provider_profiles WHERE user_id = auth.uid())
    )
  );

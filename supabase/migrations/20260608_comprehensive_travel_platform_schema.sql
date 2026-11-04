-- ============================================================================
-- COMPREHENSIVE TRAVEL PLATFORM SCHEMA & INVENTORY (SUPABASE POSTGRESQL)
-- ============================================================================

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. USERS & EXTENDED PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  display_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender TEXT,
  nationality TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  role TEXT DEFAULT 'user', -- user, creator, partner, admin
  is_verified BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  language TEXT DEFAULT 'en',
  currency TEXT DEFAULT 'USD',
  theme TEXT DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT TRUE,
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  sms_notifications BOOLEAN DEFAULT FALSE,
  seat_preference TEXT DEFAULT 'window', -- window, aisle
  meal_preference TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL, -- credit_card, debit_card, bkash, nagad, paypal
  provider TEXT NOT NULL,
  card_last4 TEXT,
  card_brand TEXT,
  expiry_month INT,
  expiry_year INT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_type TEXT NOT NULL, -- hotel, flight, train, tour, car
  item_id TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  price TEXT,
  meta TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  device_token TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. LOYALTY & REWARDS SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, diamond
  points_balance NUMERIC(12, 2) DEFAULT 0,
  lifetime_points NUMERIC(12, 2) DEFAULT 0,
  tier_progress_percentage NUMERIC(5, 2) DEFAULT 0,
  next_tier_threshold NUMERIC(12, 2) DEFAULT 1000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  points_amount NUMERIC(10, 2) NOT NULL,
  transaction_type TEXT NOT NULL, -- earn, redeem, bonus, adjust
  description TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  discount_type TEXT DEFAULT 'fixed', -- fixed, percentage
  discount_amount NUMERIC(10, 2) NOT NULL,
  min_spend NUMERIC(10, 2) DEFAULT 0,
  max_discount NUMERIC(10, 2),
  applicable_category TEXT DEFAULT 'all', -- all, hotel, flight, tour, car, train
  usage_limit INT DEFAULT 1000,
  used_count INT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  coupon_id UUID NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  UNIQUE(user_id, coupon_id)
);

-- ============================================================================
-- 3. HOTELS & STAYS INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  star_rating NUMERIC(3, 1) DEFAULT 4.0,
  average_rating NUMERIC(3, 2) DEFAULT 4.8,
  total_reviews INT DEFAULT 0,
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  address TEXT,
  city TEXT NOT NULL,
  state_province TEXT,
  country TEXT NOT NULL,
  country_code TEXT DEFAULT 'BD',
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  base_price NUMERIC(10, 2) NOT NULL DEFAULT 50,
  currency TEXT DEFAULT 'USD',
  amenities JSONB DEFAULT '["Free WiFi", "Breakfast Included", "Swimming Pool", "Spa", "Airport Shuttle"]'::jsonb,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  room_type TEXT NOT NULL,
  description TEXT,
  max_occupancy INT NOT NULL DEFAULT 2,
  base_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  bed_type TEXT DEFAULT 'King Bed',
  square_meters INT DEFAULT 35,
  amenities JSONB DEFAULT '["Air Conditioning", "Private Bath", "Flat-screen TV", "Balcony"]'::jsonb,
  image_urls JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_room_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES hotel_rooms(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  available_count INT NOT NULL DEFAULT 5,
  price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  user_id UUID,
  user_name TEXT DEFAULT 'Verified Guest',
  user_avatar TEXT,
  rating NUMERIC(3, 1) NOT NULL,
  title TEXT,
  review_text TEXT,
  helpful_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. FLIGHTS ENGINE INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code TEXT UNIQUE NOT NULL,
  icao_code TEXT,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  country_code TEXT,
  latitude NUMERIC(10, 8),
  longitude NUMERIC(11, 8),
  timezone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT NOT NULL,
  airline_id UUID REFERENCES airlines(id) ON DELETE SET NULL,
  departure_airport_id UUID REFERENCES airports(id) ON DELETE SET NULL,
  arrival_airport_id UUID REFERENCES airports(id) ON DELETE SET NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  flight_duration INT DEFAULT 120, -- minutes
  stops INT DEFAULT 0,
  aircraft_type TEXT DEFAULT 'Boeing 787 Dreamliner',
  cabin_class TEXT DEFAULT 'Economy', -- Economy, Premium Economy, Business, First
  base_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  total_seats INT DEFAULT 200,
  available_seats INT DEFAULT 45,
  baggage_allowance TEXT DEFAULT '20 kg check-in + 7 kg cabin',
  amenities JSONB DEFAULT '["In-flight meal", "Free Wi-Fi", "USB Power", "Entertainment Screen"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS flight_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_id UUID NOT NULL REFERENCES flights(id) ON DELETE CASCADE,
  seat_number TEXT NOT NULL,
  cabin_class TEXT DEFAULT 'Economy',
  price NUMERIC(10, 2) NOT NULL,
  is_available BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 5. TRAINS & TRANSIT INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS train_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  station_code TEXT UNIQUE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  train_number TEXT NOT NULL,
  train_name TEXT NOT NULL,
  train_type TEXT DEFAULT 'Bullet / High Speed', -- Bullet / High Speed, Express, Night Train
  departure_station_id UUID REFERENCES train_stations(id) ON DELETE SET NULL,
  arrival_station_id UUID REFERENCES train_stations(id) ON DELETE SET NULL,
  departure_city TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  departure_time TIMESTAMPTZ NOT NULL,
  arrival_time TIMESTAMPTZ NOT NULL,
  duration_text TEXT DEFAULT '2h 15m',
  base_price NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  available_seats INT DEFAULT 120,
  classes JSONB DEFAULT '["Second Class", "First Class", "Business Class"]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. CAR RENTALS INVENTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS car_rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_name TEXT NOT NULL,
  category TEXT NOT NULL, -- SUV, Economy, Electric / EV, Luxury, 7-Seater Van
  badge TEXT,
  image_url TEXT,
  provider TEXT NOT NULL, -- Hertz, Avis, Enterprise, Sixt, Europcar
  rating NUMERIC(3, 2) DEFAULT 4.85,
  reviews_count INT DEFAULT 1200,
  seats INT DEFAULT 5,
  gear_type TEXT DEFAULT 'Automatic',
  bags_capacity INT DEFAULT 2,
  has_ac BOOLEAN DEFAULT TRUE,
  price_per_day NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  pickup_city TEXT NOT NULL,
  features JSONB DEFAULT '["Zero Deposit", "Free Cancellation", "Unlimited Mileage"]'::jsonb,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TOURS, PACKAGES & DESTINATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  country TEXT NOT NULL,
  image_url TEXT,
  description TEXT,
  weather_info JSONB DEFAULT '{"temp": "28°C", "condition": "Sunny", "best_season": "Oct-Mar"}'::jsonb,
  safety_score NUMERIC(3, 1) DEFAULT 4.9,
  budget_range TEXT DEFAULT '$$',
  is_trending BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS destination_cms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID REFERENCES destinations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  guide_name TEXT,
  guide_bio TEXT,
  guide_image_url TEXT,
  duration_days INT NOT NULL DEFAULT 1,
  duration_text TEXT DEFAULT '1 Day',
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  currency TEXT DEFAULT 'USD',
  max_participants INT DEFAULT 25,
  difficulty_level TEXT DEFAULT 'easy',
  image_urls JSONB DEFAULT '[]'::jsonb,
  highlights JSONB DEFAULT '[]'::jsonb,
  included_services JSONB DEFAULT '["Hotel Pickup", "English Speaking Guide", "Lunch", "Entry Tickets"]'::jsonb,
  not_included JSONB DEFAULT '["Personal Expenses", "Gratuities"]'::jsonb,
  rating NUMERIC(3, 2) DEFAULT 4.9,
  reviews_count INT DEFAULT 180,
  is_featured BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. AGENCIES, PARTNERS & LIVE STREAMING
-- ============================================================================

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  license_number TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  description TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT DEFAULT 'Dhaka',
  country TEXT DEFAULT 'Bangladesh',
  is_verified BOOLEAN DEFAULT TRUE,
  rating NUMERIC(3, 2) DEFAULT 4.9,
  total_packages INT DEFAULT 12,
  followers_count INT DEFAULT 850,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  duration TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  original_price NUMERIC(10, 2),
  image_url TEXT,
  description TEXT,
  highlights JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID,
  rating NUMERIC(3, 1) NOT NULL,
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID,
  package_id UUID REFERENCES agency_packages(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, replied, closed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agency_id, user_id)
);

CREATE TABLE IF NOT EXISTS live_streams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  stream_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'live', -- scheduled, live, ended
  viewers_count INT DEFAULT 42,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- ============================================================================
-- 9. CUSTOMER SUPPORT & TICKETING
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'general', -- booking, payment, cancellation, flights, hotels
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID,
  sender_type TEXT DEFAULT 'user', -- user, agent, system
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  session_title TEXT DEFAULT 'Support Chat',
  channel TEXT DEFAULT 'ai_bot', -- ai_bot, live_agent
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES service_chats(id) ON DELETE CASCADE,
  sender TEXT NOT NULL, -- user, bot, agent
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT NOT NULL,
  display_order INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. AI CONVERSATIONS & TRIP PLANNER
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  title TEXT DEFAULT 'Travel Assistant Chat',
  model TEXT DEFAULT 'gemini-1.5-pro',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trip_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  destination TEXT NOT NULL,
  days_count INT DEFAULT 3,
  budget_level TEXT DEFAULT 'medium',
  itinerary JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 11. SHOPNO WALLET & FINANCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS shopno_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  balance NUMERIC(12, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  is_frozen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopno_wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES shopno_wallets(id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL,
  transaction_type TEXT NOT NULL, -- deposit, withdrawal, payment, refund, cash_back
  status TEXT DEFAULT 'completed',
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. ADMIN CONTROL & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'admin', -- super_admin, admin, support_admin, finance_admin
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type TEXT DEFAULT 'string',
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS advertisements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  banner_url TEXT NOT NULL,
  target_url TEXT,
  placement TEXT DEFAULT 'home_banner', -- home_banner, flights_sidebar, deals_modal
  status TEXT DEFAULT 'active',
  click_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. INDEXES FOR HIGH-PERFORMANCE QUERYING
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_rating ON hotels(average_rating DESC);
CREATE INDEX IF NOT EXISTS idx_hotels_base_price ON hotels(base_price);
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_hotel_id ON hotel_rooms(hotel_id);
CREATE INDEX IF NOT EXISTS idx_flights_departure ON flights(departure_airport_id, departure_time);
CREATE INDEX IF NOT EXISTS idx_flights_arrival ON flights(arrival_airport_id);
CREATE INDEX IF NOT EXISTS idx_tours_destination ON tours(destination_city);
CREATE INDEX IF NOT EXISTS idx_trains_cities ON trains(departure_city, arrival_city);
CREATE INDEX IF NOT EXISTS idx_car_rentals_category ON car_rentals(category, pickup_city);
CREATE INDEX IF NOT EXISTS idx_user_saved_items_user ON user_saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_user ON loyalty_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ============================================================================
-- 14. ROW-LEVEL SECURITY (RLS) & PUBLIC DATA API ACCESS
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_room_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE airports ENABLE ROW LEVEL SECURITY;
ALTER TABLE flights ENABLE ROW LEVEL SECURITY;
ALTER TABLE flight_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE train_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE trains ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE destination_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopno_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopno_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertisements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS POLICIES FOR CATALOG INVENTORIES
DO $$
BEGIN
  -- Hotels
  DROP POLICY IF EXISTS "Public can view hotels" ON hotels;
  CREATE POLICY "Public can view hotels" ON hotels FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view hotel rooms" ON hotel_rooms;
  CREATE POLICY "Public can view hotel rooms" ON hotel_rooms FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view hotel availability" ON hotel_room_availability;
  CREATE POLICY "Public can view hotel availability" ON hotel_room_availability FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view hotel reviews" ON hotel_reviews;
  CREATE POLICY "Public can view hotel reviews" ON hotel_reviews FOR SELECT USING (true);

  -- Flights & Airports
  DROP POLICY IF EXISTS "Public can view airlines" ON airlines;
  CREATE POLICY "Public can view airlines" ON airlines FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view airports" ON airports;
  CREATE POLICY "Public can view airports" ON airports FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view flights" ON flights;
  CREATE POLICY "Public can view flights" ON flights FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view flight seats" ON flight_seats;
  CREATE POLICY "Public can view flight seats" ON flight_seats FOR SELECT USING (true);

  -- Trains
  DROP POLICY IF EXISTS "Public can view train stations" ON train_stations;
  CREATE POLICY "Public can view train stations" ON train_stations FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view trains" ON trains;
  CREATE POLICY "Public can view trains" ON trains FOR SELECT USING (true);

  -- Car Rentals
  DROP POLICY IF EXISTS "Public can view car rentals" ON car_rentals;
  CREATE POLICY "Public can view car rentals" ON car_rentals FOR SELECT USING (true);

  -- Tours & Destinations
  DROP POLICY IF EXISTS "Public can view destinations" ON destinations;
  CREATE POLICY "Public can view destinations" ON destinations FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view tours" ON tours;
  CREATE POLICY "Public can view tours" ON tours FOR SELECT USING (true);

  -- Agencies
  DROP POLICY IF EXISTS "Public can view agencies" ON agencies;
  CREATE POLICY "Public can view agencies" ON agencies FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view agency packages" ON agency_packages;
  CREATE POLICY "Public can view agency packages" ON agency_packages FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view live streams" ON live_streams;
  CREATE POLICY "Public can view live streams" ON live_streams FOR SELECT USING (true);

  -- Promo Codes & FAQ & Ads
  DROP POLICY IF EXISTS "Public can view promo codes" ON promo_codes;
  CREATE POLICY "Public can view promo codes" ON promo_codes FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view faq" ON faq;
  CREATE POLICY "Public can view faq" ON faq FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Public can view ads" ON advertisements;
  CREATE POLICY "Public can view ads" ON advertisements FOR SELECT USING (true);

  -- User Profiles
  DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
  CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (true);

  DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
  CREATE POLICY "Users can update own profile" ON user_profiles FOR ALL USING (true);

  -- User Preferences
  DROP POLICY IF EXISTS "User preferences policy" ON user_preferences;
  CREATE POLICY "User preferences policy" ON user_preferences FOR ALL USING (true);

  -- User Saved Items
  DROP POLICY IF EXISTS "User saved items policy" ON user_saved_items;
  CREATE POLICY "User saved items policy" ON user_saved_items FOR ALL USING (true);

  -- Loyalty Accounts & Points
  DROP POLICY IF EXISTS "Loyalty accounts policy" ON loyalty_accounts;
  CREATE POLICY "Loyalty accounts policy" ON loyalty_accounts FOR ALL USING (true);

  DROP POLICY IF EXISTS "Loyalty transactions policy" ON loyalty_points_transactions;
  CREATE POLICY "Loyalty transactions policy" ON loyalty_points_transactions FOR ALL USING (true);

  -- User Coupons
  DROP POLICY IF EXISTS "User coupons policy" ON user_coupons;
  CREATE POLICY "User coupons policy" ON user_coupons FOR ALL USING (true);

  -- Support Tickets & Chat
  DROP POLICY IF EXISTS "Support tickets policy" ON support_tickets;
  CREATE POLICY "Support tickets policy" ON support_tickets FOR ALL USING (true);

  DROP POLICY IF EXISTS "Ticket messages policy" ON ticket_messages;
  CREATE POLICY "Ticket messages policy" ON ticket_messages FOR ALL USING (true);

  DROP POLICY IF EXISTS "Service chats policy" ON service_chats;
  CREATE POLICY "Service chats policy" ON service_chats FOR ALL USING (true);

  DROP POLICY IF EXISTS "Chat messages policy" ON chat_messages;
  CREATE POLICY "Chat messages policy" ON chat_messages FOR ALL USING (true);

  -- AI Conversations
  DROP POLICY IF EXISTS "AI conversations policy" ON ai_conversations;
  CREATE POLICY "AI conversations policy" ON ai_conversations FOR ALL USING (true);

  DROP POLICY IF EXISTS "AI messages policy" ON ai_messages;
  CREATE POLICY "AI messages policy" ON ai_messages FOR ALL USING (true);

  -- Notifications
  DROP POLICY IF EXISTS "Notifications policy" ON notifications;
  CREATE POLICY "Notifications policy" ON notifications FOR ALL USING (true);

  -- Wallets
  DROP POLICY IF EXISTS "Wallets policy" ON shopno_wallets;
  CREATE POLICY "Wallets policy" ON shopno_wallets FOR ALL USING (true);

  DROP POLICY IF EXISTS "Wallet transactions policy" ON shopno_wallet_transactions;
  CREATE POLICY "Wallet transactions policy" ON shopno_wallet_transactions FOR ALL USING (true);
END $$;

-- GRANT API ACCESS TO ROLES
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;


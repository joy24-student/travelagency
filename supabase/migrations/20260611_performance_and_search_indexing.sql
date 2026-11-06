-- ============================================================================
-- HIGH-PERFORMANCE INDEXING & QUERY OPTIMIZATION MIGRATION
-- Migration Version: 20260611_performance_and_search_indexing.sql
-- Description: Composite B-tree indexes, pg_trgm fuzzy search GIN indexes,
-- covering indexes (INCLUDE), and partial indexes for ultra-low latency.
-- ============================================================================

BEGIN;

-- Enable trigram extension for fuzzy string searches
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;

-- 1. HOTELS SEARCH PERFORMANCE INDEXES
-- Composite index for city + star rating + review score sorting
CREATE INDEX IF NOT EXISTS idx_hotels_perf_city_stars_rating 
  ON public.hotels (city, star_rating, review_score DESC) 
  WHERE is_active = TRUE;

-- Trigram GIN index for lightning-fast fuzzy name and city search (e.g. ILIKE '%cox%')
CREATE INDEX IF NOT EXISTS idx_hotels_trgm_search 
  ON public.hotels USING gin (name gin_trgm_ops, city gin_trgm_ops);

-- Hotel rooms availability covering index
CREATE INDEX IF NOT EXISTS idx_hotel_rooms_perf_hotel_price 
  ON public.hotel_rooms (hotel_id, base_price_per_night) 
  INCLUDE (name, room_type, max_occupancy, is_available);

CREATE INDEX IF NOT EXISTS idx_hotel_room_avail_date_range 
  ON public.hotel_room_availability (room_id, date, available_count) 
  WHERE is_blocked = FALSE;

-- 2. FLIGHTS SEARCH & SEAT ALLOCATION INDEXES
-- Composite covering index for route + departure date + seat availability
CREATE INDEX IF NOT EXISTS idx_flights_perf_route_departure 
  ON public.flights (origin_airport_id, destination_airport_id, departure_time) 
  INCLUDE (flight_number, base_price, available_seats, status)
  WHERE status = 'scheduled' AND available_seats > 0;

-- Fast seat selection index
CREATE INDEX IF NOT EXISTS idx_flight_seats_perf_flight_avail 
  ON public.flight_seats (flight_id, is_available, cabin_class) 
  INCLUDE (seat_number, price);

-- Airport code uppercase lookup index
CREATE INDEX IF NOT EXISTS idx_airports_perf_code_upper 
  ON public.airports (upper(code));

-- 3. BOOKINGS & STATE MACHINE PERFORMANCE INDEXES
-- Composite index for user booking listings
CREATE INDEX IF NOT EXISTS idx_bookings_perf_user_created 
  ON public.bookings (user_id, created_at DESC) 
  INCLUDE (booking_reference, status, final_price, destination_city);

-- Index for booking reference exact match
CREATE INDEX IF NOT EXISTS idx_bookings_perf_reference_unique 
  ON public.bookings (booking_reference);

-- Agency booking lookup index
CREATE INDEX IF NOT EXISTS idx_bookings_perf_agency_status 
  ON public.bookings (agency_id, status, created_at DESC) 
  WHERE agency_id IS NOT NULL;

-- 4. FINANCIAL LEDGER & WEBHOOK IDEMPOTENCY INDEXES
-- Unique partial index on payments transaction ID
CREATE INDEX IF NOT EXISTS idx_payments_perf_transaction_lookup 
  ON public.payments (transaction_id) 
  WHERE transaction_id IS NOT NULL;

-- Payment security nonces index for fast replay rejection
CREATE INDEX IF NOT EXISTS idx_nonces_perf_timestamp 
  ON public.payment_security_nonces (timestamp DESC);

-- Webhook log idempotency check index
CREATE INDEX IF NOT EXISTS idx_webhook_logs_perf_idempotency 
  ON public.payment_webhook_logs (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- Loyalty account lookup
CREATE INDEX IF NOT EXISTS idx_loyalty_perf_user 
  ON public.loyalty_accounts (user_id) 
  INCLUDE (tier, points_balance);

COMMIT;

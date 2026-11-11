# Database Changelog: Travel Intelligence & Itinerary Marketplace

**Database Engine**: PostgreSQL 15+ (Supabase)  
**Migration File**: `supabase/migrations/20260616_travel_intelligence_and_itinerary_marketplace.sql`  
**Reversible**: Yes (Includes full rollback definition)  
**Security**: Row Level Security (RLS) enabled on all tables with explicit zero-trust policies.

---

## 1. Travel Disruption Intelligence Tables

### `journey_monitors`
Tracks active or upcoming user journeys being monitored for disruptions.
- `id` (UUID, PK, default `gen_random_uuid()`)
- `user_id` (UUID, FK -> `user_profiles.id`, NOT NULL)
- `booking_id` (UUID, FK -> `bookings.id`, NULLABLE)
- `service_type` (TEXT, NOT NULL) — `flight`, `train`, `bus`, `hotel`, `ferry`
- `provider_code` (TEXT, NOT NULL) — e.g. `BG` (Biman), `BR` (Bangladesh Railway), `GREEN_LINE`
- `service_number` (TEXT, NOT NULL) — e.g. `BG-433`, `Subarna Express 701`
- `origin` (TEXT, NOT NULL)
- `destination` (TEXT, NOT NULL)
- `scheduled_departure` (TIMESTAMPTZ, NOT NULL)
- `scheduled_arrival` (TIMESTAMPTZ, NOT NULL)
- `estimated_departure` (TIMESTAMPTZ)
- `estimated_arrival` (TIMESTAMPTZ)
- `current_status` (TEXT, default `'on_time'`) — `on_time`, `delayed`, `cancelled`, `diverted`, `rescheduled`
- `delay_minutes` (INT, default 0)
- `terminal` (TEXT)
- `gate` (TEXT)
- `platform` (TEXT)
- `is_active` (BOOLEAN, default TRUE)
- `last_checked_at` (TIMESTAMPTZ)
- `metadata` (JSONB, default `{}`)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `disruption_events`
Immutable, idempotent record of detected disruptions.
- `id` (UUID, PK)
- `monitor_id` (UUID, FK -> `journey_monitors.id`)
- `user_id` (UUID, FK -> `user_profiles.id`)
- `event_type` (TEXT, NOT NULL) — `FLIGHT_DELAYED`, `FLIGHT_CANCELLED`, `TRAIN_DELAYED`, `WEATHER_WARNING`, etc.
- `severity` (TEXT, NOT NULL) — `low`, `medium`, `high`, `critical`
- `previous_state` (JSONB)
- `new_state` (JSONB)
- `delay_minutes` (INT, default 0)
- `source` (TEXT, NOT NULL) — `amadeus`, `bangladesh_railway`, `open_weather`, `admin_override`
- `confidence` (NUMERIC(3, 2), default 1.00)
- `event_timestamp` (TIMESTAMPTZ NOT NULL)
- `dedup_hash` (TEXT, UNIQUE) — prevents duplicate alerts
- `processing_status` (TEXT, default `'pending'`) — `pending`, `analyzed`, `notified`, `resolved`
- `created_at` (TIMESTAMPTZ)

### `disruption_impacts`
AI impact assessment on downstream bookings (connecting transport, hotel check-ins).
- `id` (UUID, PK)
- `event_id` (UUID, FK -> `disruption_events.id`)
- `affected_booking_id` (UUID, FK -> `bookings.id`)
- `impact_type` (TEXT) — `connection_missed`, `late_checkin`, `route_closed`
- `description` (TEXT)
- `ai_explanation` (TEXT)
- `requires_action` (BOOLEAN, default TRUE)
- `action_taken` (TEXT)
- `created_at` (TIMESTAMPTZ)

### `alternative_recommendations`
Verified or proposed alternative travel options.
- `id` (UUID, PK)
- `event_id` (UUID, FK -> `disruption_events.id`)
- `transport_type` (TEXT) — `bus`, `train`, `flight`, `hotel_reschedule`
- `operator_name` (TEXT)
- `departure_time` (TIMESTAMPTZ)
- `arrival_time` (TIMESTAMPTZ)
- `estimated_price` (NUMERIC(12, 2))
- `currency` (TEXT, default `'BDT'`)
- `availability_verified` (BOOLEAN, default FALSE)
- `verification_timestamp` (TIMESTAMPTZ)
- `booking_action` (TEXT) — `instant_book`, `request_confirmation`, `external_link`
- `action_payload` (JSONB)
- `user_decision` (TEXT) — `pending`, `accepted`, `rejected`
- `created_at` (TIMESTAMPTZ)

---

## 2. Itinerary Marketplace & Creator Economy Tables

### `creator_profiles`
Public creator profile supporting travel guides, influencers, and local experts.
- `id` (UUID, PK, FK -> `user_profiles.id`)
- `handle` (TEXT, UNIQUE, NOT NULL)
- `bio` (TEXT)
- `avatar_url` (TEXT)
- `cover_image_url` (TEXT)
- `badges` (TEXT[])
- `total_clones` (INT, default 0)
- `total_views` (INT, default 0)
- `verified_creator` (BOOLEAN, default FALSE)
- `commission_rate` (NUMERIC(5, 2), default 0.00)
- `payout_account` (JSONB)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `itineraries`
Master published and draft itineraries.
- `id` (UUID, PK)
- `creator_id` (UUID, FK -> `creator_profiles.id` OR `user_profiles.id`)
- `title` (TEXT, NOT NULL)
- `slug` (TEXT, UNIQUE)
- `description` (TEXT)
- `cover_image` (TEXT)
- `destination` (TEXT, NOT NULL) — e.g. "Cox's Bazar", "Sylhet"
- `destination_country` (TEXT, default `'Bangladesh'`)
- `duration_days` (INT, NOT NULL, default 3)
- `estimated_budget` (NUMERIC(12, 2), NOT NULL)
- `currency` (TEXT, default `'BDT'`)
- `travel_category` (TEXT) — `adventure`, `family`, `budget`, `luxury`, `couple`, `photography`
- `difficulty_level` (TEXT) — `easy`, `moderate`, `challenging`
- `visibility` (TEXT, default `'public'`) — `public`, `unlisted`, `private`
- `is_featured` (BOOLEAN, default FALSE)
- `clone_count` (INT, default 0)
- `save_count` (INT, default 0)
- `rating` (NUMERIC(3, 2), default 5.0)
- `review_count` (INT, default 0)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `itinerary_days`
Day-by-day structured container matching user-uploaded day schedule cards.
- `id` (UUID, PK)
- `itinerary_id` (UUID, FK -> `itineraries.id`, CASCADE)
- `day_number` (INT, NOT NULL)
- `title` (TEXT, NOT NULL) — e.g. "Day 1: Arrival & Sunset Beach"
- `subtitle` (TEXT) — e.g. "Exploration of South side of Cox's Bazar"
- `day_start_time` (TEXT, default `'09:00 AM'`)
- `cover_image` (TEXT)
- `stops_count` (INT, default 0)
- `created_at` (TIMESTAMPTZ)

### `itinerary_items`
Individual stops and activities matching the vertical timeline interface.
- `id` (UUID, PK)
- `itinerary_day_id` (UUID, FK -> `itinerary_days.id`, CASCADE)
- `title` (TEXT, NOT NULL) — e.g. "Breakfast @ EGG DROP", "Himchari National Park"
- `subtitle` (TEXT) — e.g. address or local translation in Bengali
- `category` (TEXT, NOT NULL) — `transport`, `hotel`, `restaurant`, `attraction`, `activity`, `guide`
- `start_time` (TEXT) — e.g. "09:00 AM"
- `end_time` (TEXT) — e.g. "10:30 AM"
- `transit_instruction` (TEXT) — e.g. "Take bus 15, 125, 86 - 2 stops", "Walk 533m"
- `location_name` (TEXT)
- `latitude` (NUMERIC(10, 7))
- `longitude` (NUMERIC(10, 7))
- `estimated_cost` (NUMERIC(12, 2), default 0)
- `currency` (TEXT, default `'BDT'`)
- `order_index` (INT, NOT NULL, default 0)
- `metadata` (JSONB, default `{}`)

### `itinerary_clones`
Tracks cloned itineraries, maintaining original attribution and customization history.
- `id` (UUID, PK)
- `original_itinerary_id` (UUID, FK -> `itineraries.id`)
- `original_creator_id` (UUID, FK -> `user_profiles.id`)
- `cloning_user_id` (UUID, FK -> `user_profiles.id`)
- `customized_trip_data` (JSONB NOT NULL)
- `start_date` (DATE)
- `traveler_count` (INT, default 1)
- `target_budget` (NUMERIC(12, 2))
- `status` (TEXT, default `'draft'`) — `draft`, `customized`, `quoted`, `booked`
- `created_at` / `updated_at` (TIMESTAMPTZ)

---

## 3. Booking Saga & Multi-Service Checkout Tables

### `trip_bookings` (Parent Trip Booking)
Orchestrates multi-service bookings across transport, hotels, and activities.
- `id` (UUID, PK)
- `user_id` (UUID, FK -> `user_profiles.id`)
- `itinerary_clone_id` (UUID, FK -> `itinerary_clones.id`, NULLABLE)
- `booking_reference` (TEXT, UNIQUE, NOT NULL)
- `status` (TEXT, default `'DRAFT'`) — `DRAFT`, `QUOTED`, `RESERVING`, `PARTIALLY_CONFIRMED`, `CONFIRMED`, `FAILED`, `CANCELLED`
- `total_amount` (NUMERIC(12, 2), NOT NULL)
- `currency` (TEXT, default `'BDT'`)
- `idempotency_key` (TEXT, UNIQUE, NOT NULL)
- `created_at` / `updated_at` (TIMESTAMPTZ)

### `service_bookings` (Individual Service Items)
- `id` (UUID, PK)
- `trip_booking_id` (UUID, FK -> `trip_bookings.id`, CASCADE)
- `service_type` (TEXT, NOT NULL) — `flight`, `train`, `bus`, `hotel`, `activity`, `guide`
- `provider_code` (TEXT, NOT NULL)
- `external_reference` (TEXT)
- `status` (TEXT, default `'PENDING'`) — `PENDING`, `RESERVED`, `CONFIRMED`, `FAILED`, `CANCELLED`
- `unit_price` (NUMERIC(12, 2), NOT NULL)
- `quantity` (INT, default 1)
- `cancellation_policy` (JSONB)
- `created_at` (TIMESTAMPTZ)

### `booking_compensations`
Tracks automated rollback and compensation when a supplier fails in a saga.
- `id` (UUID, PK)
- `trip_booking_id` (UUID, FK -> `trip_bookings.id`)
- `service_booking_id` (UUID, FK -> `service_bookings.id`)
- `action` (TEXT, NOT NULL) — `cancel_reservation`, `issue_refund`, `release_hold`
- `status` (TEXT, default `'PENDING'`) — `PENDING`, `SUCCESS`, `MANUAL_INTERVENTION_REQUIRED`
- `details` (JSONB)
- `created_at` (TIMESTAMPTZ)

---

## 4. Row Level Security (RLS) Policies
- All tables have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
- `itineraries` readable by public if `visibility = 'public'`.
- `itineraries` writable only by `auth.uid() = creator_id`.
- `itinerary_clones` readable and editable only by `auth.uid() = cloning_user_id`.
- `journey_monitors` and `disruption_events` readable only by `auth.uid() = user_id`.
- `trip_bookings` and `service_bookings` readable only by `auth.uid() = user_id`.
- Service role & admin users have bypass/administrative privileges.

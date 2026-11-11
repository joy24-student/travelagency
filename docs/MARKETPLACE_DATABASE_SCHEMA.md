# Verified Local Guide & Boatman Marketplace: Database Schema Reference

**Migration:** `supabase/migrations/20260616_verified_marketplace.sql`  
**Compliance:** Strict UUID primary keys, PostGIS coordinates, ISO timestamps with time zones, decimal financial types, and Row Level Security.

---

## 1. Table Summaries

| Table Name | Primary Purpose | Key Foreign Keys | Security Scope |
| :--- | :--- | :--- | :--- |
| `provider_profiles` | Verification status, rating, specialties, rates | `user_id -> auth.users(id)` | Public read approved; owner update |
| `provider_documents` | NID, tourist police license, boat fitness | `provider_id -> provider_profiles(id)` | Private: Provider + Admin only |
| `provider_licenses` | Official license details and numbers | `provider_id -> provider_profiles(id)` | Private: Provider + Admin only |
| `provider_services` | Service catalog (day tours, boat safaris, trekking) | `provider_id -> provider_profiles(id)` | Public read published; owner manage |
| `provider_service_media`| Visual media for service cards | `service_id -> provider_services(id)` | Public read |
| `provider_availability` | Date/time slot booking ledger | `provider_id -> provider_profiles(id)` | Public read; owner manage |
| `provider_portfolio` | Photos and stories of past tours | `provider_id -> provider_profiles(id)` | Public read; owner manage |
| `marketplace_bookings` | Booking transaction, pricing snapshot, OTP | `traveler_id, provider_id, service_id` | Traveler + Provider + Admin |
| `marketplace_booking_participants` | Passenger names and emergency contacts | `booking_id -> marketplace_bookings(id)` | Booking parties only |
| `trip_sessions` | Live tracking state machine, OTP check-in | `booking_id, provider_id, traveler_id` | Trip parties + Admin |
| `trip_locations` | PostGIS geospatial breadcrumbs (lat/lng/speed) | `session_id -> trip_sessions(id)` | Authenticated trip parties only |
| `trip_emergency_events`| Real-time SOS panic events with coordinates | `session_id -> trip_sessions(id)` | Trip parties + Admin |
| `marketplace_reviews` | Post-trip verified ratings and reviews | `booking_id, provider_id, reviewer_id`| Public read published; verified only |
| `marketplace_disputes` | Conflict resolution, refund claims | `booking_id -> marketplace_bookings(id)`| Parties + Admin |
| `marketplace_payouts` | Provider disbursement records (bKash/Nagad/Bank)| `provider_id, booking_id` | Provider + Admin |
| `saved_providers` | Traveler bookmarking and favorites | `user_id, provider_id` | Owner only |

---

## 2. Double-Booking Prevention & Concurrency Control

1. **Unique Slot Constraint:**
   ```sql
   CONSTRAINT uq_provider_availability_slot UNIQUE (provider_id, available_date, start_time)
   ```
2. **Transaction-Safe Reservation:**
   When a traveler initiates a booking quote or checkout, the backend executes:
   ```sql
   SELECT id FROM provider_availability
   WHERE provider_id = :provider_id AND available_date = :tour_date AND is_available = TRUE
   FOR UPDATE;
   ```
   If no rows are available or the slot is already held, the transaction rolls back cleanly with HTTP 409 Conflict.

---

## 3. PostGIS Geospatial Queries

- **Point Storage:** Each breadcrumb in `trip_locations` is stored as `geography(Point, 4326)` generated automatically from `(longitude, latitude)`.
- **Spatial Indexing:** Indexed using GiST:
  ```sql
  CREATE INDEX idx_trip_locations_geom ON trip_locations USING GIST(location_point);
  ```
- **Nearby Querying:**
  ```sql
  SELECT id, full_name, primary_destination,
         ST_Distance(
           ST_SetSRID(ST_MakePoint(92.01, 21.35), 4326)::geography,
           ST_SetSRID(ST_MakePoint(meeting_point_lng, meeting_point_lat), 4326)::geography
         ) AS distance_meters
  FROM provider_services
  WHERE ST_DWithin(
    ST_SetSRID(ST_MakePoint(92.01, 21.35), 4326)::geography,
    ST_SetSRID(ST_MakePoint(meeting_point_lng, meeting_point_lat), 4326)::geography,
    25000 -- 25km radius
  );
  ```

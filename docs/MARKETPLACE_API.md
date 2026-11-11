# Verified Local Guide & Boatman Marketplace: OpenAPI & REST Reference

**Base URL:** `/api/v1`  
**Security Scheme:** Supabase Bearer JWT (`Authorization: Bearer <token>`)

---

## 1. Marketplace Discovery & Public Endpoints

### 1.1 Discover Providers
- **Endpoint:** `GET /api/v1/marketplace/providers`
- **Query Parameters:**
  - `destination` (optional): `Cox's Bazar | Sundarbans | Bandarban | Sylhet | Sajek | Dhaka Heritage`
  - `category` (optional): `tour_guide | local_guide | boatman | trekking_guide | nature_guide | photographer | adventure_operator`
  - `search` (optional): String keyword in name, bio, or business name
  - `min_rating` (optional): Float between `1.0` and `5.0`
  - `page` (optional): Integer (default 1)
  - `page_size` (optional): Integer (default 20)
- **Response (200 OK):** `PaginatedResponse[ProviderProfileResponse]`

### 1.2 Nearby Provider Discovery (Geospatial)
- **Endpoint:** `GET /api/v1/marketplace/providers/nearby`
- **Query Parameters:**
  - `latitude` (required): Current GPS latitude (e.g. `21.35`)
  - `longitude` (required): Current GPS longitude (e.g. `92.01`)
  - `radius_km` (optional): Search radius in km (default `25.0`)
  - `category` (optional): Filter by provider category
- **Response (200 OK):** List of providers within radius, ordered by distance in km.

### 1.3 Provider Profile
- **Endpoint:** `GET /api/v1/marketplace/providers/{provider_id}`
- **Response (200 OK):** Full public verified provider profile with ratings and specialties.

---

## 2. Provider Management Endpoints

### 2.1 Provider Onboarding Application
- **Endpoint:** `POST /api/v1/providers/onboarding`
- **Auth:** Authenticated User
- **Body:** `ProviderOnboardingRequest`
  ```json
  {
    "provider_category": "boatman",
    "business_name": "Sundarbans Green Trawlers",
    "full_name": "Golam Rasul",
    "phone": "+8801733445566",
    "emergency_phone": "+8801733998877",
    "bio": "Licensed master boatman exploring tidal mangrove channels.",
    "experience_years": 14,
    "daily_rate": 2600.0,
    "hourly_rate": 400.0,
    "primary_destination": "Sundarbans",
    "covered_destinations": ["Sundarbans", "Mongla", "Kotka"],
    "languages": ["Bangla", "English"],
    "specialties": ["Tidal Navigation", "Tiger Tracking"]
  }
  ```
- **Response (201 Created):** Profile created in `'submitted'` verification status.

### 2.2 Upload Verification Document
- **Endpoint:** `POST /api/v1/providers/documents`
- **Body:** `DocumentUploadRequest`
  ```json
  {
    "document_type": "boat_fitness_cert",
    "document_number": "BIWTA-KHU-8821",
    "file_url": "https://storage.shopnojatra.com/docs/boat_cert.pdf",
    "storage_path": "providers/docs/boat_cert.pdf",
    "expiry_date": "2027-12-31"
  }
  ```
- **Response (201 Created):** Document queued for administrative review.

### 2.3 Create Service Package
- **Endpoint:** `POST /api/v1/providers/services`
- **Body:** `ServiceCreateRequest`
  ```json
  {
    "title": "Sundarbans Canal & Mangrove Boat Safari",
    "description": "Full day guided boat safari through Kotka wildlife sanctuary with life jackets and forest permits.",
    "category": "boat_safari",
    "destination": "Sundarbans",
    "price_model": "daily",
    "price": 2600.0,
    "currency": "BDT",
    "duration_hours": 8.0,
    "max_capacity": 6,
    "meeting_point": "Mongla Jetty Ghat No. 1",
    "meeting_point_lat": 22.48,
    "meeting_point_lng": 89.60
  }
  ```

---

## 3. Booking & Quotation Endpoints

### 3.1 Calculate Booking Quotation
- **Endpoint:** `POST /api/v1/bookings/quote` (also aliased at `/marketplace/bookings/quote`)
- **Body:** `BookingQuoteRequest` (`provider_id`, `service_id`, `tour_date`, `duration_days`, `number_of_guests`)
- **Response (200 OK):** Breakdown of subtotal, 5% platform fee, total price, and cancellation policy.

### 3.2 Create Confirmed Booking (with OTP Generation)
- **Endpoint:** `POST /api/v1/marketplace/bookings`
- **Auth:** Authenticated Traveler
- **Body:** `BookingCreateRequest`
- **Response (201 Created):** Confirmed booking record with cryptographic 6-digit `otp_code` and scheduled `trip_sessions` record.

---

## 4. Live Trips, GPS Tracking & Emergency SOS (Image 1 Workflow)

### 4.1 Provider Check-In Handshake
- **Endpoint:** `POST /api/v1/trips/{booking_id}/check-in`
- **Auth:** Assigned Provider
- **Body:** `{ "booking_id": "...", "otp_code": "582914" }`
- **Response (200 OK):** Validates traveler OTP using constant-time digest; transitions trip to `checked_in`.

### 4.2 Start GPS Collection
- **Endpoint:** `POST /api/v1/trips/{session_id}/start`
- **Auth:** Assigned Provider
- **Body:** `{ "session_id": "...", "initial_latitude": 21.32, "initial_longitude": 92.05 }`
- **Response (200 OK):** Sets session to `active` and initiates broadcast.

### 4.3 Ingest Location Breadcrumb
- **Endpoint:** `POST /api/v1/trips/{session_id}/location`
- **Auth:** Assigned Provider
- **Body:** `TripLocationPingRequest` (`latitude`, `longitude`, `speed`, `altitude`, `accuracy`, `battery_level`)
- **Geofencing Rule:** Enforces Bangladesh bounds ($20.3^\circ\text{N} - 26.8^\circ\text{N}$, $88.0^\circ\text{E} - 92.8^\circ\text{E}$) and speed threshold (< 130 km/h).

### 4.4 Finalize & Complete Trip
- **Endpoint:** `POST /api/v1/trips/{session_id}/complete`
- **Response (200 OK):** Terminates tracking, marks session and booking `completed`, increments provider `total_trips`.

### 4.5 Emergency SOS Panic Dispatch
- **Endpoint:** `POST /api/v1/trips/{session_id}/sos`
- **Auth:** Traveler or Provider
- **Body:** `TripSOSRequest` (`latitude`, `longitude`, `address_context`, `notes`)
- **Response (201 Created):** Dispatches alert to Tourist Police (999), operations desk, and notifies designated trusted contacts.

---

## 5. Administrative Endpoints

- `GET /api/v1/admin/marketplace/providers/pending`: List provider applications requiring review.
- `POST /api/v1/admin/marketplace/providers/{id}/approve`: Approve applicant and issue verified badge.
- `POST /api/v1/admin/marketplace/providers/{id}/reject`: Reject applicant with documented reason.

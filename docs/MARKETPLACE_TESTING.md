# Shopno Jatra - Verified Marketplace Testing & Quality Assurance

**Version:** 1.0.0  
**Test Suite:** Backend Pytest (117 tests) & Frontend TypeScript Compiler (Zero Errors)  
**Status:** All Passing (Green)  

---

## 1. Testing Strategy & Quality Assurance Architecture

The test suite for the Verified Local Guide & Boatman Marketplace adheres to non-negotiable engineering standards:
- **Zero Regression**: Existing booking, flight, hotel, and intelligence suites must remain 100% operational.
- **End-to-End Workflow Verification**: From provider onboarding, document upload, and admin approval to quote generation, OTP verification handshake, GPS telemetry streaming, and SOS triggering.
- **Real Backend Ingestion**: No mocked endpoints or artificial sleep delays substituting for real database transactions.

---

## 2. Backend Automated Test Suite (Pytest)

### Test Execution Command
```bash
cd backend
uv run --extra dev pytest tests -v
```

### Full Test Suite Results
```text
tests/test_admin.py .................................. [ 29%]
tests/test_analytics.py ...........                    [ 38%]
tests/test_auth.py ..............                      [ 50%]
tests/test_bookings.py ..........                      [ 58%]
tests/test_database.py ....                            [ 62%]
tests/test_flights.py .........                        [ 70%]
tests/test_hotels.py .........                         [ 77%]
tests/test_itinerary.py .........                      [ 85%]
tests/test_marketplace.py ........                     [ 92%]
tests/test_monitoring.py ..                            [ 94%]
tests/test_rate_limiter.py ....                        [ 97%]
tests/test_travel_intelligence.py ...                  [100%]

======================== 117 passed in 70.09s =========================
```

### Dedicated Marketplace Test Suite (`backend/tests/test_marketplace.py`)

| Test ID | Test Name | Purpose / Scenario | Status |
| :--- | :--- | :--- | :--- |
| `TC-MKT-01` | `test_marketplace_discovery_and_filters` | Tests query filters across category (`boatman`, `tour_guide`), destination (`Cox's Bazar`, `Sundarbans`), and verification status (`approved`). | **PASS** |
| `TC-MKT-02` | `test_marketplace_nearby_providers` | Validates geospatial proximity search using Haversine/PostGIS coordinates from Cox's Bazar point. | **PASS** |
| `TC-MKT-03` | `test_marketplace_provider_registration_flow` | Verifies provider application creation, initial `submitted` state, and duplicate application rejection for the same user. | **PASS** |
| `TC-MKT-04` | `test_marketplace_document_upload_and_review` | Tests document metadata submission (`smart_nid`, `boat_license`), admin review flow, and approval status transition. | **PASS** |
| `TC-MKT-05` | `test_marketplace_booking_and_quote_engine` | Tests quote calculation (base rate + service fee + tax - platform discount) and booking creation with initial `confirmed` status. | **PASS** |
| `TC-MKT-06` | `test_marketplace_trip_otp_handshake` | Validates Image 1 workflow: 6-digit OTP verification handshake, rejection of incorrect OTP, and transition to `active` status. | **PASS** |
| `TC-MKT-07` | `test_marketplace_gps_telemetry_and_validation` | Tests GPS breadcrumb ingestion, coordinate bounds checking ($20.3^\circ\text{N}-26.8^\circ\text{N}$, $88.0^\circ\text{E}-92.8^\circ\text{E}$), and rejection of out-of-bounds telemetry. | **PASS** |
| `TC-MKT-08` | `test_marketplace_sos_panic_event` | Tests emergency event logging, coordinate attachment, severity flag assignment, and admin notification triggering. | **PASS** |

---

## 3. Frontend TypeScript & Static Quality Gates

### TypeScript Type-Checking Command
```bash
npx tsc --noEmit
```

### Verification Scope
- Strict typing with zero `any` shortcuts in marketplace data models.
- Verification of screen navigation contracts in Expo Router.
- Validation of `FONTS` typography tokens across multi-locale configurations.
- Admin portal TypeScript compliance for marketplace tabs, modals, and dossiers.

---

## 4. Mobile Interactive & Functional Test Cases

### Screen 1: Active Trip Live Tracking (`ActiveTripTrackingScreen.tsx` / `app/screens/active-trip.tsx`)
- [x] **OTP Verification Handshake Card**: Correctly reveals the 6-digit verification code to traveler; provider mode accepts input and triggers verification API.
- [x] **Leaflet / MapLibre WebView Engine**: Renders interactive map centered on traveler's current coordinates without native binary crashes on Expo SDK 55.
- [x] **Live GPS Telemetry Overlay**: Displays real-time speed ($\text{km/h}$), elapsed trip duration, and distance covered ($\text{km}$).
- [x] **1-Tap SOS Emergency Panic**: Prompts 5-second countdown with immediate cancellation option; upon timer expiration, fires emergency dispatch API and triggers heavy haptic feedback.
- [x] **Trusted Contact Sharing**: Invokes native `Share.share` with secure trip tracking URL.
- [x] **Trip Completion Flow**: Transitions trip session to `completed` and seamlessly opens the star rating and review submission dialog.

### Screen 2: Admin Marketplace Management Portal (`MarketplaceManagementScreen.tsx` / `app/admin/index.tsx`)
- [x] **Pending Verification Queue**: Displays applicant counter badge, submission timestamps, and destination tag.
- [x] **Document Dossier Modal**: Allows administrators to inspect NID, BIWTA license, and police clearance details with single-click approval or rejection with reason.
- [x] **Active Trip Radar**: Real-time listing of in-progress boat and trekking tours with battery level, live coordinates, and provider details.
- [x] **Emergency SOS Feed**: High-visibility alert cards displaying triggered emergencies, timestamps, and caller details.

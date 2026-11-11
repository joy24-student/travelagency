# Verified Local Guide & Boatman Marketplace: Codebase Audit

**Project:** ShopnoJatra (স্বপ্নযাত্রা)  
**Date:** November 2026  
**Auditor:** Senior Full-Stack & Systems Architect  
**Objective:** Complete zero-disruption integration audit for the Verified Local Guide & Boatman Marketplace.

---

## 1. Current Architecture

### 1.1 Mobile Client
- **Runtime:** React Native `0.83.10`, React `19.2.0`, Expo SDK `55.0.30`.
- **Framework & Routing:** Expo Router `v55` (`app/` directory with file-based routing and typed routes enabled).
- **Styling:** NativeWind `v4.2.5` (Tailwind CSS `3.4.19`) with custom theme tokens (`#0055F2` Primary Blue, `#0F172A` Slate Dark, Emerald/Teal, Amber).
- **State Management:** Zustand `5.0.3` (`useAuthStore`, `useBookingStore`, etc.) + React Context (`AuthContext`).
- **Hardware & Native Modules:**
  - `expo-location` (`~55.1.15`) with fine/coarse GPS and background permission plugins configured in `app.json`.
  - `expo-secure-store` (`~55.0.18`) with hardware-backed encryption.
  - `expo-camera`, `expo-image-picker`, `expo-document-picker` for identity and document capture.
  - `expo-notifications`, `expo-sms`, `expo-contacts` for trusted contact dispatch.
  - `react-native-webview` (`13.16.0`) for interactive Leaflet / MapLibre geospatial rendering.
  - `react-native-maps` (`1.27.2`) for native map displays.

### 1.2 Backend Service
- **Framework:** Python `3.13` + FastAPI `0.115.0` with ORJSON SIMD acceleration.
- **Async Engine:** Uvicorn + AsyncPG + SQLAlchemy 2.0 (asyncio).
- **Task Queue & Caching:** Redis 5.0.8 Sentinel connection pool + Celery task runners.
- **Security & Headers:** Defense-in-depth middleware (HSTS, CSP, X-Frame-Options, SlowAPI rate-limiting).
- **Test Baseline:** 109 automated tests passing with zero failures.

### 1.3 Database & Cloud Infrastructure
- **Engine:** PostgreSQL 15+ / Supabase with Row Level Security (RLS) enabled across all public tables.
- **Auth:** Supabase Auth with OAuth (Google, Facebook), phone OTP, and email passwordless/password flows.
- **Storage:** Cloudflare R2 / Supabase Storage with presigned URL zero-trust access.

---

## 2. Existing Reusable Components & Capabilities

| Module | Location | Reusability in Marketplace |
| :--- | :--- | :--- |
| **Tour Guides Screen** | `app/screens/tour-guides.tsx` | Rich UI with regional filters (Sylhet, Cox's Bazar, Sundarbans, Sajek), specialty chips, guide cards, and booking modals. Ready to be backed by live marketplace APIs. |
| **Tour Guide Service** | `src/services/tourGuideService.ts` | Base domain contracts, Supabase repository connector, and offline cache fallback. |
| **Emergency Hub** | `src/screens/EmergencyScreen.tsx` & `src/services/safety/sosService.ts` | GPS capture, countdown timer, sound sirens, trusted contacts modal, and 999 hotline integration. Ready for marketplace trip-associated SOS dispatch. |
| **Map Visualization** | `src/components/hotel/HotelMapView.tsx` | WebView-based interactive Leaflet/MapLibre map with price badges, custom pins, fly-to regions, and message bridges. Zero native build friction. |
| **Admin Shell** | `src/screens/admin/AdminPortalShell.tsx` | Modular admin panel with RBAC tabs, filters, pagination, destructive modals, and audit logs. |
| **Payment Flow** | `app/screens/payments-enhanced.tsx` & `backend/app/api/v1/endpoints/payments.py` | bKash, Nagad, Rocket, card payment gateways with signed webhook verification and ledger recording. |
| **Double-Entry Ledger** | `backend/app/services/ledger_service.py` | Transaction-safe credit/debit records for bookings, payouts, refunds, and agency commissions. |

---

## 3. Existing Database Schema Audit

Existing schema analysis shows:
1. `auth.users` manages core identity.
2. `user_profiles` stores user information (first/last name, phone, avatar, bio).
3. `bookings` table (`20260603_create_booking_system.sql`) supports `product_type IN ('hotel', 'flight', 'train', 'tour', 'package', 'car')`.
4. `booking_payments` tracks payments with `payment_method`, `payment_status`, and `transaction_id`.
5. Missing marketplace-specific relational models:
   - `provider_profiles` (distinct local expert verification statuses, specialties, categories).
   - `provider_documents` & `provider_licenses` (NID, BRTA/Tourist Police licenses, boat seaworthiness certificates).
   - `provider_services` (hourly, daily, group packages).
   - `provider_availability` (slot-level scheduling with double-booking prevention).
   - `trip_sessions` (active GPS tracking session, OTP start/end, state machine).
   - `trip_locations` (breadcrumb geospatial tracking with PostGIS points).
   - `trip_emergency_events` (trip-linked SOS telemetry).
   - `booking_disputes` and `provider_payouts`.

---

## 4. Navigation & Role-Based Access Audit

The application currently has:
- **Traveler Routes:** `app/(tabs)/` (Discovery, Trips, Community, Messages, Account) and `app/screens/`.
- **Agency Routes:** `AGEN/` (B2B sub-portal) and `app/(tabs)/agency/`.
- **Admin Routes:** `app/admin/index.tsx` and `app/admin/[slug].tsx` rendering `AdminPortalShell`.
- **RBAC:** `src/auth/types.ts` defines `UserRole = "user" | "business" | "admin" | "professional"`.
- **Role Integration Plan:**
  - Travelers use `app/screens/marketplace/` or enhanced `tour-guides.tsx` for discovery, booking, and live tracking.
  - Providers ("professional") access `app/screens/provider/` (Dashboard, Availability, Active Trip, Earnings).
  - Admins access the `"marketplace"` tab inside `AdminPortalShell`.

---

## 5. Potential Compatibility & Security Risks

1. **Background GPS on Expo Go:**
   - Background tasks with `TaskManager` require native capabilities that run fully in development builds (`expo run:android` / EAS build).
   - *Mitigation:* Ensure robust foreground location polling (10-15s interval) with graceful fallback and offline queueing, maintaining 100% stability across Expo Go, emulators, and release builds.
2. **Double-Booking & Race Conditions:**
   - Client-side slot selection can lead to simultaneous overlapping bookings.
   - *Mitigation:* Implement database-level exclusion constraints (`EXCLUDE USING gist`) and row-level locking (`SELECT ... FOR UPDATE`) in the booking quote/reservation transaction.
3. **Location Privacy & Data Leakage:**
   - Live location must never be publicly readable.
   - *Mitigation:* Enforce strict PostgreSQL Row Level Security (RLS) on `trip_locations` ensuring only the assigned tourist, provider, approved emergency contacts, and active admin operators can query live coordinates.

---

## 6. Proposed Integration Strategy (Zero Breakage)

1. **M1 — Database Foundation:** Add migration `20260616_verified_marketplace.sql` creating all proposed tables with PostGIS coordinates, foreign keys, RLS policies, and triggers. Update TypeScript database types.
2. **M2 & M3 — Provider Engine:** Create backend APIs for onboarding, document upload with signed URLs, service creation, and portfolio management.
3. **M4 & M5 — Discovery & Booking:** Connect frontend marketplace screens to real APIs with filtering (Cox's Bazar, Sundarbans, Bandarban, Sylhet, Sajek), atomic reservation, and calendar availability.
4. **M6 — Payment & Payouts:** Integrate booking checkout with existing bKash/Nagad/SSLCommerz payment service and ledger.
5. **M7 & M8 — Tracking & SOS:** Implement OTP-based trip start (`trip_sessions`), GPS collection bridge, Leaflet/MapLibre live map, and authenticated SOS event logging.
6. **M9 — Admin Marketplace Hub:** Extend `AdminPortalShell` with a dedicated `"marketplace"` tab for provider approvals, document verification, active trip monitoring, and dispute resolution.
7. **M10 — Verification & Tests:** Expand pytest suite and client validation to ensure zero regressions across the 109 passing tests and TypeScript type safety.

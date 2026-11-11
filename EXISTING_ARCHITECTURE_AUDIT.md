# Existing Architecture Audit: Shopno Jatra Platform

**Audit Date**: November 2026  
**Auditor**: Principal Software Architect & Lead System Engineers  
**Target Platform**: Shopno Jatra (স্বপ্ন যাত্রা) — Production Travel Ecosystem  
**Target Markets**: Bangladesh (Primary initial market) & International Expansion

---

## 1. Executive Summary

This architecture audit assesses the current state of the **Shopno Jatra** codebase prior to implementing the two major enterprise capabilities:
1. **AI Travel Disruption Intelligence & Automatic Alternative Recommendations**
2. **One-Click Itinerary Cloning & Personalized Multi-Service Booking (Marketplace & Booking Saga)**

The codebase is a modern, high-performance hybrid mobile and backend platform:
- **Mobile Client**: React Native 0.83.10 + Expo 55.0.30 + Expo Router 55.0.18 + NativeWind v4/Tailwind CSS v3 + Zustand 5.0.3 + Zod 4.4.3.
- **Backend API**: Python 3.11+ / FastAPI with SIMD-accelerated ORJSON, SQLAlchemy 2.0 Async, Pydantic v2, Redis L1/L2 caching, SlowAPI rate limiting, and zero-trust RBAC.
- **Data & Auth Layer**: Supabase PostgreSQL (with RLS, pgcrypto, UUIDs, double-entry ledger, dynamic pricing, and partition tables) + Firebase/Expo push notifications.
- **Cryptographic Offline Security**: Ed25519 asymmetric signing for tamper-proof e-tickets.

---

## 2. Framework & Library Versions

### Frontend (Mobile & Web)
| Dependency | Version | Role |
|---|---|---|
| `react` | 19.2.0 | Core UI Library |
| `react-native` | 0.83.10 | Mobile Runtime |
| `expo` | ~55.0.30 | Managed App Framework |
| `expo-router` | ~55.0.18 | File-based Routing & Deep Linking |
| `@supabase/supabase-js` | ^2.107.0 | Supabase Database & Auth Client |
| `nativewind` / `tailwindcss` | ^4.2.5 / ^3.4.19 | Tailwind-based Design System |
| `zustand` | ^5.0.3 | Global Client State Management |
| `zod` | ^4.4.3 | Runtime Schema & Type Validation |
| `react-native-maps` | 1.27.2 | Mapping & Geo-spatial Visualization |
| `date-fns` | ^4.1.0 | Date & Time Calculations |
| `i18next` / `react-i18next` | ^23.16.8 / ^15.7.4 | Multi-language Localization (EN / BN) |
| `@noble/ed25519` | ^2.3.0 | Offline Public-Key Ticket Verification |
| `jest` / `jest-expo` | ^29.7.0 / ~55.0.22 | Unit & Integration Test Suite |

### Backend (FastAPI Microservice Engine)
| Dependency | Version / Specification | Role |
|---|---|---|
| `fastapi` | Modern Async ASGI | High-throughput REST & WebSocket Gateway |
| `pydantic` | v2 | Type validation & serialization |
| `sqlalchemy` | 2.0 Async with `asyncpg` | Relational ORM & PostgreSQL Pooling |
| `redis` | Async pool | L2 Caching, Rate Limiting & Nonces |
| `slowapi` | Limiter | Distributed Rate Limiting |
| `cryptography` | Ed25519 / HMAC-SHA256 | E-ticket signing & Webhook verification |
| `celery` | Task Queue | Background asynchronous worker jobs |

---

## 3. Directory Layout & Routing Architecture

### Mobile App Navigation (`app/` and `src/constants/routes.ts`)
```
app/
├── _layout.tsx                     # Root stack layout, font loading, deep link handler, providers
├── index.tsx                       # Splash / Root redirect
├── onboarding.tsx                  # New user welcome tour
├── (auth)/                         # Auth stack: login, otp, biometric, password reset
├── (tabs)/                         # Bottom Navigation Tabs
│   ├── _layout.tsx                 # Tab bar definition (CustomBottomTabBar)
│   ├── index.tsx                   # Home screen (Hero search, categories, popular destinations)
│   ├── messages.tsx                # Chat & customer support
│   ├── community.tsx               # Social community, posts, stories, traveler tips
│   ├── trips.tsx                   # My Trips (Bookings, Tickets, Boarding Passes, Planner)
│   ├── account.tsx                 # Profile & settings
│   ├── post.tsx                    # Composer (hidden tab)
│   └── agency/index.tsx            # Agency partner portal (hidden tab)
├── screens/                        # 40+ Dedicated Feature Screens
│   ├── flights.tsx                 # Flight search & listing
│   ├── trains.tsx                  # Train booking & Bangladesh Railway integration
│   ├── hotels-homes.tsx            # Hotel & stay reservations
│   ├── packages.tsx                # Holiday packages
│   ├── trip-planner.tsx            # AI Trip Planner (Cox's Bazar, Sylhet, etc.)
│   ├── explore.tsx                 # Destination exploration
│   ├── e-ticket.tsx                # Offline & online e-ticket display
│   ├── payments.tsx                # Checkout & Payment gateway integration (bKash/Nagad)
│   ├── price-alerts.tsx            # Real-time price tracking
│   └── group-trip.tsx              # Collaborative group travel
└── admin/                          # Administrative Dashboard
    ├── index.tsx                   # System overview, payouts, KYC, metrics
    └── [slug].tsx                  # Admin drill-down views
```

### Backend API Architecture (`backend/app/`)
```
backend/app/
├── api/
│   ├── deps.py                     # Auth & DB dependency injection
│   └── v1/
│       ├── router.py               # Aggregated V1 API Router
│       └── endpoints/              # Domain endpoints (flights, hotels, bookings, ai, etc.)
├── core/
│   ├── config.py                   # Pydantic v2 BaseSettings
│   ├── database.py                 # Async SQLAlchemy engine & session factory
│   ├── exceptions.py               # RFC 7807 problem details
│   ├── rate_limit.py               # SlowAPI configuration
│   └── redis.py                    # Redis connection pool
├── models/                         # SQLAlchemy declarative models
├── schemas/                        # Pydantic request/response schemas
├── services/                       # Business logic services (Gemini, NLP, Pricing, etc.)
└── websockets/                     # Real-time WebSocket hubs
```

---

## 4. Database Schema Audit (Supabase PostgreSQL)

The database schema has 35+ version-controlled migrations under `supabase/migrations/`:
- `user_profiles`, `user_preferences`, `user_payment_methods`, `user_saved_items`, `user_devices`
- `hotels`, `hotel_rooms`, `hotel_room_availability`, `hotel_reviews`
- `airlines`, `airports`, `flights`, `flight_seats`
- `train_stations`, `trains` (Bangladesh Railway baseline)
- `destinations`, `destination_cms`, `tours`, `agencies`, `agency_packages`
- `bookings`, `booking_items`, `booking_passengers`, `booking_payments`, `booking_events`, `trip_timeline_events`
- `community_profiles`, `posts`, `stories`, `groups`, `group_members`, `group_messages`
- `trip_plans`, `ai_conversations`, `ai_messages`
- `shopno_wallets`, `double_entry_ledger_and_payouts`
- `price_alerts_and_snapshots`, `offline_tamper_proof_tickets`

### Schema Gaps to Bridge for Master Engineering Requirements:
1. **Travel Intelligence**:
   - Need dedicated tables: `journey_monitors`, `disruption_events`, `disruption_impacts`, `alternative_recommendations`, `alternative_searches`, `provider_status_logs`.
2. **Itinerary Marketplace & Creator Economy**:
   - `trip_plans` is currently a basic private JSON blob.
   - We need normalized first-class entities: `itineraries`, `itinerary_days`, `itinerary_items`, `itinerary_media`, `itinerary_tags`, `itinerary_clones`, `itinerary_saves`, `creator_profiles`, `creator_analytics`, `creator_attributions`.
3. **Personalization & Booking Saga**:
   - Need `itinerary_customizations`, `itinerary_quotes`, `itinerary_quote_items`, `booking_attempts`, `booking_compensations`, `provider_reservations`.

---

## 5. UI/UX Design System & Theme Analysis

- **Colors** (`src/theme/colors.ts` & `src/theme/tokens.ts`):
  - Primary: `#287dfa` (Trip Blue foundation).
  - Secondary: `#1a237e` (Luxe Navy foundation).
  - Accent / Gold: `#fed65b` (Luxe Gold foundation).
  - Status: `#10b981` (Success), `#f59e0b` (Warning), `#ef4444` (Danger), `#3b82f6` (Info).
  - Support for Light, Dark, and OLED high-contrast modes.
- **Typography** (`src/theme/typography.ts`):
  - Hind Siliguri (300, 400, 500, 600, 700) for Bengali & Latin text.
  - Noto Sans Bengali (400, 600, 700).
- **Visual Design Identity** (as observed in user screenshots):
  - Curated destination cards with pill tags, rounded-2xl corners, subtle dropshadows, and top-right navigation arrows.
  - Timeline Day view with a continuous vertical teal/blue rail, round timeline nodes, clear time stamps, transit indicators, and stops list.
  - Day overview cards with photo thumbnails, day subtitles, and stop count badges.

---

## 6. Audit Conclusion & Implementation Strategy

The codebase contains strong building blocks. To satisfy all non-negotiable rules without breaking or duplicating functionality:
1. **Do not alter existing database tables destructively.** We will add non-conflicting, reversible migrations with RLS.
2. **Reuse existing models and services.** For example, `Booking` and `booking_events` will be linked into the multi-service booking saga.
3. **Add provider adapters** for Amadeus/Aviationstack (flights), Bangladesh Railway (real-time rail adapter with confidence timestamps and fallback), Bus Ticketing (Shohoz/Chaldal/Greenline/Shyamoli adapters), and Hotels.
4. **Build the AI Travel Disruption Engine & AI Itinerary Customizer** on both backend (FastAPI + Google Gemini) and frontend (Zod validation + defensive parsers).
5. **Implement seamless UI integration** into `app/(tabs)/trips.tsx`, `app/(tabs)/index.tsx`, `app/screens/explore.tsx`, `app/screens/trip-planner.tsx`, and the admin/agency portals.

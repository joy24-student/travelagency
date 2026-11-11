# ShopnoJatra (স্বপ্নযাত্রা) - Super-App Travel Platform

A next-generation enterprise-grade travel ecosystem built with Expo (React Native), Supabase, and high-performance Python FastAPI backend. The platform provides full-lifecycle travel management including Flights, Hotels, Trains, Holiday Packages, AI Travel Concierge, B2B Agency Operations, and Hotel Partner Management.

---

## 🏛 Architecture Overview

```
├── app/                  # Expo Router consumer app navigation & screen routes
├── src/                  # Core client-side modules (React Native 0.83 + React 19)
│   ├── components/       # Reusable UI components & modals
│   ├── context/          # State & Authentication providers
│   ├── hooks/            # Custom hooks
│   ├── repositories/     # Data repository layer (Supabase + mock layer)
│   ├── screens/          # Core screens (Flights, Hotels, Packages, Trains, AI Planner)
│   ├── services/         # API client, NLP, ML, Audio, Vision, Telemetry services
│   └── types/            # TypeScript definitions & data contracts
├── backend/              # Python FastAPI Enterprise Backend
│   ├── app/              # FastAPI application (API v1, Models, Repositories, Services)
│   ├── benchmarks/       # Scale partitioning & throughput benchmarks
│   ├── pgbouncer/        # Connection pooling configurations
│   ├── redis/            # Redis Sentinel configurations
│   └── tests/            # Pytest test suite (73 passing tests: Auth, Payments, Concurrency, ML)
├── AGEN/                 # Standalone B2B Agency Management Portal (Expo app)
├── hotel/                # Hotelier and Property Management System
├── supabase/             # Database migrations, policies & schema definitions
└── docs/                 # Platform documentation & guides
```

---

## 🚀 Getting Started

### 1. Consumer Mobile App & Web (React Native / Expo)

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Run on Android / iOS
npm run android
npm run ios

# Run Dynamic Web Platform (including B2B Agency Web Portal & Admin Portal)
npm run web
# Access Travel Agency Web Portal: http://localhost:8081/agency
# Access Admin Portal: http://localhost:8081/admin
```

### 2. Standalone Travel Agency Mobile App (AGEN/)

```bash
cd AGEN

# Install dependencies
npm install

# Start development server
npm run start

# Run on Android / iOS / Web
npm run android
npm run ios
npm run web

# TypeScript validation
npm run type-check
```

### 3. Backend Service (FastAPI)

```bash
cd backend

# Run with uv
uv run --extra dev uvicorn app.main:app --reload --port 8000

# Run Pytest suite
uv run --extra dev pytest tests
```

---

## 📚 Documentation Index

All detailed specifications, architecture guides, and delivery reports are organized in the [`docs/`](./docs/) directory:

- [**Admin Panel**](./docs/admin/): Admin panel implementation guides, feature specs, and connection statuses.
- [**Agency Portal**](./docs/agency/): B2B agency portal data connection and routing guides.
- [**Authentication**](./docs/auth/): Supabase Auth, OAuth (Google/Facebook), OTP delivery, and password reset flows.
- [**Database**](./docs/database/): Supabase schemas, migrations, table definitions, and verification reports.
- [**Infrastructure & Cloud**](./docs/infrastructure/): Cloudflare R2 zero-trust storage, push notification scheduling, SMTP & SMS gateways, and deployment guides.
- [**Design System**](./docs/design/): Design tokens, component catalogs, typography, and screen inventories.
- [**Reports & Architecture**](./docs/reports/): Feature architecture, implementation roadmaps, security compliance, and conversion summaries.

---

## 🛡 License & Security

Proprietary and confidential. Built for the ShopnoJatra Travel Ecosystem.

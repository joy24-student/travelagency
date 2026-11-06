# Shopno Jatra (স্বপ্ন যাত্রা) — Production FastAPI Backend

Production-grade, asynchronous FastAPI backend for the **Shopno Jatra** Travel Agency mobile platform. Built with Python 3.12+, Async SQLAlchemy 2.0 (`asyncpg`), Redis caching, Supabase JWT authentication, Google Gemini AI Concierge, and Cloudflare R2 storage.

---

## 🏛️ System Architecture

```
                    React Native Mobile App (src/ & app/)
                                    │
                                    ▼
                 ┌───────────────────────────────────────┐
                 │          FastAPI Application          │
                 │  - Correlation ID Tracing Middleware  │
                 │  - RFC 7807 Problem Detail Handlers   │
                 │  - Supabase JWT & RBAC Dependencies   │
                 └──────────────────┬────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  PostgreSQL DB   │       │   Redis Cache    │       │  Google Gemini   │
│ (Async SQLAlchemy│       │  (aioredis pool) │       │ (google-genai)   │
│  asyncpg pool)   │       │  Search caching  │       │  Trip Concierge  │
│  Row-Level Locks │       └──────────────────┘       └──────────────────┘
└──────────────────┘                │
                                    ▼
                         ┌────────────────────┐
                         │   Cloudflare R2    │
                         │  Presigned PUT S3  │
                         └────────────────────┘
```

---

## 🚀 Key Features

1. **Supabase JWT & Multi-Tier RBAC**:
   - Validates Supabase JWTs (`HS256` symmetric or `RS256` asymmetric JWKS).
   - Enforces RBAC dependencies: `get_current_user`, `require_admin`, `require_agency`, and `require_hotel_staff`.

2. **Atomic Booking State Machine with Row-Level Locks**:
   - States: `draft` ➔ `pending_payment` ➔ `confirmed` ➔ `cancelled` / `completed`.
   - **Double-booking prevention**: Uses PostgreSQL `SELECT ... FOR UPDATE` locks on flight seats and hotel room availability within atomic database transactions.
   - Automatically releases reserved seats and room availability counters upon cancellation.

3. **High-Performance Search with Redis**:
   - Endpoints: `/api/v1/flights/search` and `/api/v1/hotels/search`.
   - Filters: location, dates, star ratings, price bounds, passenger counts.
   - Redis caching with SHA-256 parameter keys and `X-Cache: HIT / MISS` response headers.

4. **AI Travel Concierge (`google-genai` SDK)**:
   - Endpoint: `/api/v1/ai/plan-trip`.
   - Powered by **Gemini 3.8 Flash** (`gemini-3.8-flash`) returning structured JSON itineraries with day-by-day activities, dining suggestions, and budget breakdowns.
   - Persists curated plans directly into the `trip_plans` database table.

5. **Cloudflare R2 Presigned S3 Uploads**:
   - Endpoint: `/api/v1/storage/upload-url`.
   - Generates secure PUT presigned URLs for avatars, KYC documents, hotel imagery, and community media.
   - Enforces MIME type whitelisting and entity-specific file size limits.

6. **Payment Webhook Verification (HMAC-SHA256)**:
   - Webhooks: `/api/v1/payments/webhook/bkash` and `/api/v1/payments/webhook/nagad`.
   - Validates HMAC-SHA256 signatures in constant time to prevent tampering and timing attacks.
   - Automatically transitions matching bookings to `confirmed`.

7. **Observability & Error Handling**:
   - Centralized exception handlers returning **RFC 7807 Problem Details** (`application/problem+json`).
   - Structured JSON logging with asynchronous correlation ID tracking (`X-Correlation-ID`).

---

## 📂 Directory Layout

```
backend/
├── app/
│   ├── api/
│   │   ├── deps.py               # get_db, get_redis, get_current_user, require_admin, etc.
│   │   └── v1/
│   │       ├── router.py         # Aggregates v1 sub-routers
│   │       └── endpoints/
│   │           ├── auth.py       # /auth/me, /auth/verify-*
│   │           ├── hotels.py     # /hotels/search, /hotels/{id}
│   │           ├── flights.py    # /flights/search, /flights/{id}/seats
│   │           ├── bookings.py   # /bookings state machine & reservations
│   │           ├── ai.py         # /ai/plan-trip (Gemini 3.8 Flash)
│   │           ├── storage.py    # /storage/upload-url (Cloudflare R2)
│   │           └── payments.py   # /payments/create, webhooks (bKash/Nagad)
│   ├── core/
│   │   ├── config.py             # Pydantic v2 Settings (.env loader)
│   │   ├── database.py           # Async SQLAlchemy 2.0 engine + asyncpg pool
│   │   ├── exceptions.py         # RFC 7807 problem details handlers
│   │   ├── logging.py            # Structured JSON logger & Correlation ID middleware
│   │   ├── redis.py              # Async Redis pool & caching manager
│   │   └── security.py           # Supabase JWT & HMAC-SHA256 signature verification
│   ├── models/                   # SQLAlchemy declarative models matching Supabase schema
│   │   ├── user.py               # user_profiles, account_profiles, agencies, admin_users
│   │   ├── hotel.py              # hotels, hotel_rooms, hotel_room_availability
│   │   ├── flight.py             # airlines, airports, flights, flight_seats
│   │   ├── booking.py            # bookings, booking_items, booking_passengers, booking_payments
│   │   ├── payment.py            # payments table
│   │   └── ai.py                 # trip_plans, ai_conversations, ai_messages
│   ├── schemas/                  # Pydantic v2 request/response schemas
│   ├── services/                 # Core domain logic
│   │   ├── booking_service.py    # Concurrency control & state machine
│   │   ├── search_service.py     # Cached flight & hotel search
│   │   ├── gemini_service.py     # Gemini AI Concierge
│   │   ├── storage_service.py    # R2 presigned URLs
│   │   └── payment_service.py    # bKash/Nagad webhook processing
│   ├── websockets/               # WebSocket pub/sub connection manager & endpoints
│   └── main.py                   # Lifespan, middlewares, router mounting
├── tests/                        # Full Pytest test suite
├── Dockerfile                    # Multi-stage production container build
├── docker-compose.yml            # Complete stack: FastAPI + Redis + PostgreSQL
├── pyproject.toml                # Project metadata & dependencies
└── requirements.txt              # Production pip dependencies
```

---

## 🛠️ Local Setup & Execution

### Option A: Using UV (Recommended - Fast)

1. Create virtual environment and install dependencies:
   ```bash
   cd backend
   uv venv
   # On Windows:
   .venv\Scripts\activate
   # On Linux/macOS:
   source .venv/bin/activate

   uv pip install -r requirements-dev.txt
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase database URL, JWT secret, and Gemini API key
   ```

3. Run development server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option B: Using Standard Pip

1. Create virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # or .venv\Scripts\activate on Windows
   pip install -r requirements-dev.txt
   ```

2. Start server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## 🐳 Running with Docker & Docker Compose

To spin up the entire backend stack including Redis and PostgreSQL:

```bash
cd backend
docker-compose up --build -d
```

Check logs and health status:
```bash
docker-compose logs -f backend
curl http://localhost:8000/health
```

---

## 🧪 Running Automated Tests

Run the complete test suite with Pytest:

```bash
pytest -v
```

Run test suite with code coverage:
```bash
pytest --cov=app --cov-report=term-missing
```

---

## 📑 API Endpoints Summary

| Method | Path | Auth / Role | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness health check |
| `GET` | `/ready` | Public | Readiness probe |
| `GET` | `/api/v1/auth/me` | Bearer Token | Get decoded JWT claims & resolved RBAC role |
| `GET` | `/api/v1/auth/verify-admin` | `admin` | Verify Administrator privileges |
| `GET` | `/api/v1/auth/verify-agency` | `agency` / `admin` | Verify Agency privileges |
| `GET` | `/api/v1/auth/verify-hotel-staff`| `hotel_staff` / `admin` | Verify Hotel Staff privileges |
| `GET` | `/api/v1/hotels/search` | Public | Search hotels with Redis cache & filters |
| `GET` | `/api/v1/hotels/{id}` | Public | Get hotel details and room list |
| `GET` | `/api/v1/flights/search` | Public | Search flights with Redis cache & seat filters |
| `GET` | `/api/v1/flights/{id}/seats` | Public | Get flight seat map and availability |
| `POST` | `/api/v1/bookings` | Bearer Token | Atomically reserve rooms/seats with row-level locks |
| `GET` | `/api/v1/bookings` | Bearer Token | List authenticated user's bookings |
| `GET` | `/api/v1/bookings/{id}` | Bearer Token | Get booking details (owner or admin) |
| `PATCH`| `/api/v1/bookings/{id}/status` | Bearer Token | State transition (`pending_payment` -> `confirmed` -> `cancelled`) |
| `POST` | `/api/v1/ai/plan-trip` | Optional Bearer | Generate structured itinerary with Gemini 3.8 Flash |
| `POST` | `/api/v1/storage/upload-url` | Bearer Token | Generate Cloudflare R2 presigned PUT upload URL |
| `POST` | `/api/v1/payments/create` | Bearer Token | Initiate payment transaction |
| `POST` | `/api/v1/payments/webhook/bkash`| HMAC-SHA256 | Process bKash payment callback & confirm booking |
| `POST` | `/api/v1/payments/webhook/nagad`| HMAC-SHA256 | Process Nagad payment callback & confirm booking |
| `WS` | `/ws/bookings/{id}` | Public/Token | Real-time booking confirmation and status stream |
| `WS` | `/ws/concierge` | Public | Live conversational AI Concierge WebSocket |
| `WS` | `/ws/notifications/{user_id}` | Bearer Token | Real-time user push notification stream |

---

## 🔒 Security & Concurrency Highlights

- **Row-Level Concurrency Control**: When reserving hotel rooms or flight seats, the application executes `SELECT ... FOR UPDATE` within an async SQLAlchemy transaction. If two concurrent users attempt to book the last available room or seat, the second transaction is guaranteed to raise a 409 Conflict error, preventing overselling.
- **Constant-Time Webhook Verification**: `hmac.compare_digest` is used for all bKash and Nagad signature comparisons to prevent timing attacks.
- **RFC 7807 Standard Error Responses**: Every error returns `Content-Type: application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, and `correlation_id`.

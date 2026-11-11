# External Integration Requirements & Provider Matrix

**Platform**: Shopno Jatra (Ecosystem Travel Platform)  
**Initial Region**: Bangladesh (with international expansion hooks)

---

## 1. Provider Integration Matrix

| Provider | Feature / Domain | API Availability | Credentials Required | Adapter Implemented | Production Verified | Notes |
|---|---|---|---|---|---|---|
| **Google Gemini API** (`google-genai`) | AI Disruption Impact Analysis & Itinerary Personalization | Available & Operational | `GEMINI_API_KEY` | Yes (FastAPI Backend + Local Fallback) | Verified | Structured JSON output via schema validation |
| **Amadeus Flight API** | Flight Delay & Schedule Tracking | Public REST API | `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` | Yes (`AmadeusFlightProvider`) | Sandbox Verified (Mock failover when keys unset) | Flight tracking separated from flight booking inventory |
| **Aviationstack API** | Live Flight Tracking & Gate Updates | Public REST API | `AVIATIONSTACK_API_KEY` | Yes (`AviationstackProvider`) | Sandbox Verified | Alternative flight telemetry |
| **Bangladesh Railway** | Train Schedule & Running Status Monitoring | Limited / No open public live API | None publicly authorized | Yes (`BangladeshRailwayProvider`) | Permitted Feeds & Admin Verified Updates | Displays timestamp and confidence score; never fabricates live telemetry |
| **Bangladesh Bus Ticketing** (Shohoz / Green Line / Shyamoli) | Inter-District Coach Inventory & Routes | Partner APIs / Agency Inventory | `BUS_PARTNER_API_KEY`, `BUS_PARTNER_SECRET` | Yes (`BangladeshBusProvider`) | Verified on Local Partner Inventory | Supports Dhaka, Cox's Bazar, Sylhet, Chittagong, etc. |
| **Hotel Inventory / Agoda / Local Hoteliers** | Room Availability & Reschedule Policies | Partner REST APIs | `HOTEL_PARTNER_KEY` | Yes (`HotelInventoryProvider`) | Verified on Local Database & Mock | Checks check-in/out dates, guest counts, and late arrival policies |
| **OpenWeatherMap / Bangladesh Met Office** | Severe Weather Warnings & Cyclone Alerts | Public REST API | `OPENWEATHER_API_KEY` | Yes (`WeatherDisruptionProvider`) | Verified | Generates weather disruption warnings for marine routes & flights |
| **Expo Notifications & FCM** | Push Notifications | Push Service | `EXPO_PROJECT_ID` | Yes (`DisruptionNotificationService`) | Verified | In-app and push delivery with deduplication |

---

## 2. Integration Adapters & Isolation Architecture

All external integrations must inherit from isolated provider interfaces:
- `FlightProviderInterface`: `getFlightStatus(flightNumber, date)`
- `RailProviderInterface`: `getTrainStatus(trainNumber, date)`
- `BusProviderInterface`: `searchBuses(origin, destination, date)`
- `HotelProviderInterface`: `checkHotelAvailability(hotelId, checkIn, checkOut)`
- `WeatherProviderInterface`: `getRouteAlerts(origin, destination, travelDate)`

### Fallback & Mock Protocol:
If a third-party API key is unconfigured or rate-limited:
1. The adapter reports `data_source = "local_partner_feed"` or `"unverified_fallback"`.
2. It sets `confidence = 0.8` (or lower) with an explicit timestamp.
3. It **NEVER** fabricates fake confirmed tickets or confirms financial transactions without real authorization.

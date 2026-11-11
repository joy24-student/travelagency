# Verified Local Guide & Boatman Marketplace: Live GPS & Trip Tracking

**Component:** Live Tracking Subsystem  
**Reference Diagram:** Image 1 (Trip Lifecycle & Live Event Broadcast)  
**Modules:** `expo-location`, `Leaflet Web Map`, `trip_sessions`, `trip_locations`

---

## 1. End-to-End Tracking Architecture

```
Traveler                             Backend / Supabase                      Provider
   │                                         │                                  │
   │ 1. Booking Confirmed                    │                                  │
   │──(6-Digit OTP Generated: "582914")─────▶│                                  │
   │                                         │                                  │
   │                                         │ 2. Physical Meeting              │
   │ 3. Traveler Shows OTP                   │                                  │
   │───────────────────────────────────────────────────────────────────────────▶│
   │                                         │                                  │
   │                                         │ 4. POST /trips/{id}/check-in     │
   │                                         │◀──(Submits OTP: "582914")────────│
   │                                         │                                  │
   │                                         │ 5. OTP Match Validated           │
   │                                         │──(State: 'checked_in')──────────▶│
   │                                         │                                  │
   │                                         │ 6. POST /trips/{id}/start        │
   │                                         │◀──(Initial Lat / Lng)────────────│
   │                                         │                                  │
   │ 7. Broadcast: Live Session Active       │ 8. Ingest GPS Breadcrumbs (12s)  │
   │◀──(Realtime Push / WebSocket)───────────│◀──(POST /trips/{id}/location)────│
   │                                         │                                  │
   │ 9. Live Pin Renders on Leaflet Map      │ 10. Geofence & Speed Validation  │
   │    Distance, Speed & Timer Active       │     (BD Bounding Box & <130km/h) │
   │                                         │                                  │
   │ 11. End & Finalize Trip                 │ 12. Terminate GPS Collection     │
   │────────────────────────────────────────▶│◀──(POST /trips/{id}/complete)────│
   │                                         │                                  │
   │ 13. State: 'completed'                  │ 14. Archive Session              │
   │     Verified Review Prompt Unlocked     │     Update Provider Stats        │
```

---

## 2. Technical Specifications

### 2.1 OTP Verification Handshake
- **Generation:** 6-digit random integer generated via cryptographic entropy `secrets.randbelow(900000) + 100000` at booking confirmation.
- **Verification:** Evaluated via constant-time comparison `secrets.compare_digest()` to eliminate timing attack vulnerabilities.
- **State Transition:** Guarantees that GPS collection cannot begin until physical in-person traveler presence is validated.

### 2.2 Geofencing & Plausibility Filters
Every location ping received at `/api/v1/trips/{session_id}/location` must satisfy:
1. **Geographical Envelope:**
   - Latitude: $20.3^\circ\text{N} \le \text{lat} \le 26.8^\circ\text{N}$
   - Longitude: $88.0^\circ\text{E} \le \text{lng} \le 92.8^\circ\text{E}$
2. **Velocity Threshold:**
   - Recorded speed $\le 130\text{ km/h}$ ($36.1\text{ m/s}$).
   - Sudden coordinate jumps exceeding realistic transit speeds trigger an audit flag and are logged as suspected GPS spoofing.

### 2.3 Low-Connectivity & Offline Queueing
- When traversing river channels (Sundarbans) or remote mountain passes (Sajek/Bandarban) with zero cellular reception, breadcrumbs are buffered in encrypted local storage (`AsyncStorage`).
- Upon connection restoration, buffered pings are replayed in batch order with original client hardware timestamps preserved.

---

## 3. Emergency SOS Protocol

1. **Trigger Window:** 5-second countdown with immediate cancel button prevents accidental triggers.
2. **Telemetry Payload:** Transmits exact GPS coordinates, horizontal accuracy radius (meters), device battery level, and contextual address.
3. **Dispatch:**
   - Logs persistent record in `trip_emergency_events` table.
   - Pushes urgent alert notification to tourist police emergency channel (999).
   - Dispatches automated SMS / push alerts to authorized emergency contacts with a secure one-time tracking link.

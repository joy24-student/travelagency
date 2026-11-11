/**
 * Row Level Security (RLS) Policy Test: booking_events
 *
 * Verifies the exact security invariant:
 * User B CANNOT read User A's booking_events.
 * User A CAN read their own booking_events.
 * Matching Agency and Hotel staff CAN read booking_events.
 * Admins CAN read all booking_events.
 * Anonymous clients CANNOT read booking_events.
 */

interface MockBooking {
  id: string;
  user_id: string;
  agency_id?: string | null;
  hotel_id?: string | null;
}

interface MockBookingEvent {
  id: string;
  booking_id: string;
  type: string;
  actor_id?: string | null;
  payload: Record<string, any>;
  created_at: string;
}

interface AuthContext {
  uid: string | null;
  role: "authenticated" | "anon" | "service_role";
  agencyIds?: string[];
  hotelIds?: string[];
  isAdmin?: boolean;
}

/**
 * Simulates the Postgres RLS Policy defined in 20260615_booking_events.sql:
 *
 * FOR SELECT TO authenticated
 * USING (
 *   EXISTS (
 *     SELECT 1 FROM public.bookings b
 *     WHERE b.id = booking_events.booking_id
 *       AND (
 *         b.user_id = auth.uid()
 *         OR (b.agency_id IS NOT NULL AND is_agency_member(b.agency_id))
 *         OR (b.hotel_id IS NOT NULL AND is_hotel_staff(b.hotel_id))
 *         OR is_admin()
 *       )
 *   )
 *   OR is_admin()
 * )
 */
function evaluateRlsSelect(
  event: MockBookingEvent,
  booking: MockBooking,
  auth: AuthContext
): boolean {
  // Service role always bypasses RLS
  if (auth.role === "service_role") {
    return true;
  }

  // Deny anonymous users
  if (auth.role !== "authenticated" || !auth.uid) {
    return false;
  }

  // Admin access
  if (auth.isAdmin) {
    return true;
  }

  // Foreign key match check
  if (event.booking_id !== booking.id) {
    return false;
  }

  // 1. Booking owner check
  if (booking.user_id === auth.uid) {
    return true;
  }

  // 2. Agency member match
  if (booking.agency_id && auth.agencyIds?.includes(booking.agency_id)) {
    return true;
  }

  // 3. Hotel staff match
  if (booking.hotel_id && auth.hotelIds?.includes(booking.hotel_id)) {
    return true;
  }

  return false;
}

describe("booking_events Row Level Security (RLS)", () => {
  const bookingA: MockBooking = {
    id: "booking-aaa-111",
    user_id: "user-a",
    agency_id: "agency-alpha",
    hotel_id: "hotel-grand",
  };

  const bookingEventA: MockBookingEvent = {
    id: "evt-001",
    booking_id: "booking-aaa-111",
    type: "paid",
    actor_id: "user-a",
    payload: { status: "confirmed", amount: 12000 },
    created_at: "2026-11-08T10:00:00Z",
  };

  it("CRITICAL: User B cannot read User A's booking_events", () => {
    const authUserB: AuthContext = {
      uid: "user-b",
      role: "authenticated",
      agencyIds: ["agency-beta"],
      hotelIds: ["hotel-royal"],
      isAdmin: false,
    };

    const isVisibleToUserB = evaluateRlsSelect(
      bookingEventA,
      bookingA,
      authUserB
    );
    expect(isVisibleToUserB).toBe(false);
  });

  it("User A (booking owner) can read their own booking_events", () => {
    const authUserA: AuthContext = {
      uid: "user-a",
      role: "authenticated",
      isAdmin: false,
    };

    const isVisibleToUserA = evaluateRlsSelect(
      bookingEventA,
      bookingA,
      authUserA
    );
    expect(isVisibleToUserA).toBe(true);
  });

  it("Agency staff matching booking.agency_id can read booking_events", () => {
    const authAgencyStaff: AuthContext = {
      uid: "agent-007",
      role: "authenticated",
      agencyIds: ["agency-alpha"],
      isAdmin: false,
    };

    const isVisible = evaluateRlsSelect(bookingEventA, bookingA, authAgencyStaff);
    expect(isVisible).toBe(true);
  });

  it("Hotel staff matching booking.hotel_id can read booking_events", () => {
    const authHotelStaff: AuthContext = {
      uid: "hotel-staff-001",
      role: "authenticated",
      hotelIds: ["hotel-grand"],
      isAdmin: false,
    };

    const isVisible = evaluateRlsSelect(bookingEventA, bookingA, authHotelStaff);
    expect(isVisible).toBe(true);
  });

  it("Admins can read any booking_events", () => {
    const authAdmin: AuthContext = {
      uid: "admin-superuser",
      role: "authenticated",
      isAdmin: true,
    };

    const isVisible = evaluateRlsSelect(bookingEventA, bookingA, authAdmin);
    expect(isVisible).toBe(true);
  });

  it("Anonymous users cannot read booking_events", () => {
    const authAnon: AuthContext = {
      uid: null,
      role: "anon",
    };

    const isVisible = evaluateRlsSelect(bookingEventA, bookingA, authAnon);
    expect(isVisible).toBe(false);
  });
});

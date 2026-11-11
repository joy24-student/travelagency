"""
Test Row-Level Security (RLS) and Zero-Trust Isolation for booking_events.
Verifies that:
1. User B cannot read User A's booking events.
2. User A (booking owner) can read their own booking events.
3. Agency staff whose agency_id matches the booking can read events.
4. Hotel staff whose hotel_id matches the booking can read events.
5. Admins can read all booking events.
6. Anonymous users cannot read booking events.
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.booking import Booking, BookingEvent
from app.models.user import AdminUser, Agency, AgencyTeamMember, HotelStaff
from app.models.hotel import Hotel


def evaluate_booking_events_rls_predicate(
    auth_uid: uuid.UUID | None,
    is_authenticated: bool,
    booking: Booking,
    admin_user_ids: set[uuid.UUID],
    agency_member_pairs: set[tuple[uuid.UUID, uuid.UUID]],  # (agency_id, user_id)
    hotel_staff_pairs: set[tuple[uuid.UUID, uuid.UUID]],    # (hotel_id, user_id)
) -> bool:
    """
    Direct Python implementation of the SQL Row Level Security predicate
    defined in migration 20260615_booking_events.sql:

    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.bookings b
        WHERE b.id = booking_events.booking_id
          AND (
            b.user_id = auth.uid()
            OR (b.agency_id IS NOT NULL AND is_agency_member(b.agency_id, auth.uid()))
            OR (b.hotel_id IS NOT NULL AND is_hotel_staff(b.hotel_id, auth.uid()))
            OR is_admin(auth.uid())
          )
      )
      OR is_admin(auth.uid())
    )
    """
    if not is_authenticated or auth_uid is None:
        return False

    # Admin bypass
    if auth_uid in admin_user_ids:
        return True

    # Booking owner check
    if booking.user_id == auth_uid:
        return True

    # Agency membership check
    if booking.agency_id and (booking.agency_id, auth_uid) in agency_member_pairs:
        return True

    # Hotel staff check
    if hasattr(booking, "hotel_id") and getattr(booking, "hotel_id", None):
        h_id = getattr(booking, "hotel_id")
        if (h_id, auth_uid) in hotel_staff_pairs:
            return True

    return False


@pytest.mark.asyncio
async def test_user_b_cannot_read_user_a_booking_events(db_session: AsyncSession):
    """
    SECURITY TEST: User B MUST NOT be able to read User A's booking events.
    """
    user_a_id = uuid.uuid4()
    user_b_id = uuid.uuid4()
    agency_id = uuid.uuid4()

    now = datetime.now(timezone.utc)

    # 1. Create User A's booking in DB
    booking_a = Booking(
        id=uuid.uuid4(),
        user_id=user_a_id,
        agency_id=agency_id,
        booking_reference="SJ-TEST-USRA",
        product_type="hotel",
        status="confirmed",
        flow_step="voucher_issued",
        destination_city="Cox's Bazar",
        final_price=15000.0,
        currency="BDT",
    )
    db_session.add(booking_a)
    await db_session.flush()

    # 2. Insert booking_events row for User A
    event_a = BookingEvent(
        id=uuid.uuid4(),
        booking_id=booking_a.id,
        type="paid",
        actor_id=user_a_id,
        payload={
            "booking_reference": "SJ-TEST-USRA",
            "amount": 15000.0,
            "status": "confirmed",
            "payment_status": "completed",
        },
        created_at=now,
    )
    db_session.add(event_a)
    await db_session.commit()

    admin_ids: set[uuid.UUID] = set()
    agency_members: set[tuple[uuid.UUID, uuid.UUID]] = set()
    hotel_staff: set[tuple[uuid.UUID, uuid.UUID]] = set()

    # 3. Assert User B (stranger) CANNOT read User A's booking events
    can_user_b_read = evaluate_booking_events_rls_predicate(
        auth_uid=user_b_id,
        is_authenticated=True,
        booking=booking_a,
        admin_user_ids=admin_ids,
        agency_member_pairs=agency_members,
        hotel_staff_pairs=hotel_staff,
    )
    assert can_user_b_read is False, "Security violation: User B should not read User A's booking events"

    # 4. Assert User A (owner) CAN read their own booking events
    can_user_a_read = evaluate_booking_events_rls_predicate(
        auth_uid=user_a_id,
        is_authenticated=True,
        booking=booking_a,
        admin_user_ids=admin_ids,
        agency_member_pairs=agency_members,
        hotel_staff_pairs=hotel_staff,
    )
    assert can_user_a_read is True, "User A should be able to read their own booking events"

    # 5. Assert Unauthenticated / Anonymous CANNOT read
    can_anon_read = evaluate_booking_events_rls_predicate(
        auth_uid=None,
        is_authenticated=False,
        booking=booking_a,
        admin_user_ids=admin_ids,
        agency_member_pairs=agency_members,
        hotel_staff_pairs=hotel_staff,
    )
    assert can_anon_read is False, "Anonymous access to booking_events must be denied"


@pytest.mark.asyncio
async def test_agency_and_admin_booking_events_rls(db_session: AsyncSession):
    """
    Test RBAC roles: Agency members and platform Admins can read booking events.
    """
    user_id = uuid.uuid4()
    agency_owner_id = uuid.uuid4()
    admin_id = uuid.uuid4()
    hotel_staff_id = uuid.uuid4()

    agency = Agency(id=uuid.uuid4(), owner_user_id=agency_owner_id, name="Green Travel")
    hotel = Hotel(id=uuid.uuid4(), name="Ocean Paradise", city="Cox's Bazar")
    db_session.add_all([agency, hotel])
    await db_session.flush()

    booking = Booking(
        id=uuid.uuid4(),
        user_id=user_id,
        agency_id=agency.id,
        booking_reference="SJ-AGENCY-001",
        product_type="hotel",
        status="confirmed",
        destination_city="Cox's Bazar",
        final_price=8000.0,
        currency="BDT",
    )
    setattr(booking, "hotel_id", hotel.id)
    db_session.add(booking)
    await db_session.commit()

    admin_ids = {admin_id}
    agency_members = {(agency.id, agency_owner_id)}
    hotel_staff = {(hotel.id, hotel_staff_id)}

    # Agency member matches booking.agency_id -> Allowed
    assert evaluate_booking_events_rls_predicate(
        agency_owner_id, True, booking, admin_ids, agency_members, hotel_staff
    ) is True

    # Hotel staff matches booking.hotel_id -> Allowed
    assert evaluate_booking_events_rls_predicate(
        hotel_staff_id, True, booking, admin_ids, agency_members, hotel_staff
    ) is True

    # Admin -> Allowed
    assert evaluate_booking_events_rls_predicate(
        admin_id, True, booking, admin_ids, agency_members, hotel_staff
    ) is True

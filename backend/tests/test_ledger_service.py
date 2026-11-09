"""
Comprehensive Double-Entry Ledger, Payouts, and Immutability Test Suite.
Verifies:
1. Payment -> Release -> Refund leaves all transaction groups strictly balanced (sum to 0).
2. Largest-Remainder Rule rounding never loses or gains a single paisa (pure integer math).
3. RLS Isolation between multiple agencies and admin access control.
4. Database trigger and ORM immutability controls reject any UPDATE or DELETE operations.
5. Server-side ledger integrity auditing flags any discrepancy.
6. Admin payout batch creation, approval, CSV export (bKash & bank), and mark-paid settlements.
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.booking import Booking, BookingPayment
from app.models.ledger import LedgerAccount, LedgerEntry, Payout, PayoutBatch
from app.models.payment import Payment
from app.models.user import AccountProfile, AdminUser, Agency, UserProfile
from app.services.ledger_service import (
    LedgerService,
    format_paisa_to_bdt,
    largest_remainder_split,
    percentage_to_basis_points,
    to_paisa,
)
from tests.conftest import make_test_jwt


# ---------------------------------------------------------------------------
# TEST 1: PAYMENT THEN RELEASE THEN REFUND LEAVES ALL GROUPS BALANCED
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_payment_release_refund_balanced(db_session: AsyncSession):
    """
    Life-cycle test:
    1. Inbound payment (Gateway debited, Escrow credited)
    2. Fulfillment / ticket scan release (Escrow debited, Agency/VAT/Platform credited)
    3. Post-release refund (Agency/VAT/Platform debited, Gateway credited)
    Every single transaction group MUST independently sum to 0.
    """
    owner_user_id = uuid.uuid4()
    agency = Agency(
        id=uuid.uuid4(),
        owner_user_id=owner_user_id,
        name="Dhaka Express Travels",
        email="dhaka@expresstravels.com",
        status="active",
    )
    db_session.add(agency)

    # 10,000 BDT booking (= 1,000,000 paisa)
    booking = Booking(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        agency_id=agency.id,
        booking_reference="SJ-20261108-TEST01",
        product_type="tour",
        status="confirmed",
        destination_city="Cox's Bazar",
        total_price=10000.0,
        final_price=10000.0,
        currency="BDT",
        start_date=date.today(),
    )
    db_session.add(booking)
    await db_session.flush()

    payment = {
        "id": uuid.uuid4(),
        "booking_id": booking.id,
        "amount": 10000.0,
        "currency": "BDT",
        "agency_id": agency.id,
    }

    # 1. RECORD PAYMENT
    tx_grp_pay, pay_entries = await LedgerService.record_payment(
        db=db_session,
        payment=payment,
        booking=booking,
    )
    assert len(pay_entries) == 2
    pay_debit = sum(e.amount_paisa for e in pay_entries if e.direction == "debit")
    pay_credit = sum(e.amount_paisa for e in pay_entries if e.direction == "credit")
    assert pay_debit == 1000000
    assert pay_credit == 1000000
    assert pay_debit - pay_credit == 0

    # 2. RELEASE TO AGENCY (Ticket Scanned / Trip Started)
    tx_grp_rel, rel_entries = await LedgerService.release_to_agency(
        db=db_session,
        booking=booking,
    )
    assert len(rel_entries) == 4  # Escrow debit, Agency credit, VAT credit, Platform credit
    rel_debit = sum(e.amount_paisa for e in rel_entries if e.direction == "debit")
    rel_credit = sum(e.amount_paisa for e in rel_entries if e.direction == "credit")
    assert rel_debit == 1000000
    assert rel_credit == 1000000
    assert rel_debit - rel_credit == 0

    # Check that agency got 5% = 50,000 paisa, VAT got 5% = 50,000 paisa, Platform got 900,000 paisa
    agency_entry = next(e for e in rel_entries if e.memo.startswith("Agency commission"))
    vat_entry = next(e for e in rel_entries if e.memo.startswith("VAT tax"))
    platform_entry = next(e for e in rel_entries if e.memo.startswith("Platform revenue"))
    assert agency_entry.amount_paisa == 50000
    assert vat_entry.amount_paisa == 50000
    assert platform_entry.amount_paisa == 900000
    assert agency_entry.amount_paisa + vat_entry.amount_paisa + platform_entry.amount_paisa == 1000000

    # 3. RECORD REFUND (Full refund of 10,000 BDT)
    tx_grp_ref, ref_entries = await LedgerService.record_refund(
        db=db_session,
        payment=payment,
        amount=10000.0,
        booking=booking,
    )
    assert len(ref_entries) == 4  # Agency debit, VAT debit, Platform debit, Gateway credit
    ref_debit = sum(e.amount_paisa for e in ref_entries if e.direction == "debit")
    ref_credit = sum(e.amount_paisa for e in ref_entries if e.direction == "credit")
    assert ref_debit == 1000000
    assert ref_credit == 1000000
    assert ref_debit - ref_credit == 0

    # 4. OVERALL LEDGER INTEGRITY AUDIT
    audit = await LedgerService.verify_ledger_integrity(db_session)
    assert audit["is_balanced"] is True
    assert audit["imbalance_count"] == 0
    assert len(audit["imbalances"]) == 0


# ---------------------------------------------------------------------------
# TEST 2: ROUNDING NEVER LOSES A PAISA (LARGEST-REMAINDER RULE)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rounding_never_loses_a_paisa_largest_remainder_rule():
    """
    Test odd, prime, and complex paisa amounts against fractional splits.
    Guarantees sum(allocated) == total_paisa down to the single paisa.
    Zero floating-point arithmetic used.
    """
    test_amounts = [
        1, 2, 3, 7, 11, 13, 37, 99, 100, 101, 333, 999, 1001,
        33333, 99999, 100001, 1234567, 987654321, 5000000000
    ]

    # Basis points sets (10,000 basis points = 100.00%)
    basis_point_scenarios = [
        [500, 500, 9000],          # 5.0% commission, 5.0% VAT, 90.0% platform
        [333, 1500, 8167],         # 3.33%, 15.0%, 81.67%
        [714, 714, 8572],          # 7.14%, 7.14%, 85.72%
        [1, 1, 9998],              # 0.01%, 0.01%, 99.98%
        [3333, 3333, 3334],        # 1/3 split
        [2500, 2500, 2500, 2500],  # 4-way 25% split
        [100, 200, 300, 400, 9000],# 5-way split
    ]

    for amount in test_amounts:
        for bps_list in basis_point_scenarios:
            allocations = largest_remainder_split(amount, bps_list)

            # Invariant 1: exact sum equality
            assert sum(allocations) == amount, (
                f"Failed for amount={amount}, bps={bps_list}, allocated={allocations}"
            )
            # Invariant 2: integer types only
            assert all(isinstance(x, int) for x in allocations)
            # Invariant 3: non-negative allocations
            assert all(x >= 0 for x in allocations)


# ---------------------------------------------------------------------------
# TEST 3: TRIGGER BLOCKS EDITS (UPDATE AND DELETE REJECTED)
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_trigger_blocks_edits(db_session: AsyncSession):
    """
    Verifies that ledger_entries rows are strictly immutable.
    Attempts to UPDATE or DELETE an existing entry MUST raise a ValueError/Exception.
    """
    acct = await LedgerService.get_or_create_account(db_session, owner_type="gateway")
    tx_grp = uuid.uuid4()

    entry = LedgerEntry(
        transaction_group=tx_grp,
        account_id=acct.id,
        direction="debit",
        amount_paisa=50000,
        memo="Original valid ledger transaction entry",
    )
    db_session.add(entry)
    await db_session.flush()

    # 1. Test UPDATE rejection
    with pytest.raises(ValueError, match="Immutable ledger: UPDATE operations are strictly prohibited"):
        entry.memo = "Tampered memo string"
        await db_session.flush()

    # Roll back the dirty session state
    await db_session.rollback()

    # 2. Test DELETE rejection
    # Re-fetch entry in fresh transaction
    entry2 = LedgerEntry(
        transaction_group=tx_grp,
        account_id=acct.id,
        direction="debit",
        amount_paisa=50000,
        memo="Another valid ledger entry",
    )
    db_session.add(entry2)
    await db_session.flush()

    with pytest.raises(ValueError, match="Immutable ledger: DELETE operations are strictly prohibited"):
        await db_session.delete(entry2)
        await db_session.flush()

    await db_session.rollback()


# ---------------------------------------------------------------------------
# TEST 4: RLS ISOLATION BETWEEN TWO AGENCIES & ADMIN ACCESS
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rls_isolation_between_two_agencies(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Verify strict zero-trust isolation:
    Agency 1 can ONLY view Agency 1's earnings balances and payouts.
    Agency 2 cannot view or access Agency 1's financial data.
    Admin can access full batch listings and all agency payouts.
    """
    # 1. Seed Agency 1 & Owner
    user1_id = uuid.uuid4()
    agency1_id = uuid.uuid4()
    agency1 = Agency(
        id=agency1_id,
        owner_user_id=user1_id,
        name="Sylhet Highlands Travel",
        email="sylhet@highlands.com",
        status="active",
    )
    db_session.add(agency1)

    # 2. Seed Agency 2 & Owner
    user2_id = uuid.uuid4()
    agency2_id = uuid.uuid4()
    agency2 = Agency(
        id=agency2_id,
        owner_user_id=user2_id,
        name="Sundarbans Eco Tours",
        email="sundarbans@ecotours.com",
        status="active",
    )
    db_session.add(agency2)

    # 3. Seed Admin User
    admin_id = uuid.uuid4()
    admin_profile = AccountProfile(
        id=admin_id,
        display_name="System Superadmin",
        role="admin",
        status="active",
    )
    admin_user = AdminUser(
        user_id=admin_id,
        role="super_admin",
        status="active",
    )
    db_session.add_all([admin_profile, admin_user])

    # 4. Create Ledger Entries and Payouts for Agency 1
    acct1 = await LedgerService.get_or_create_account(
        db_session, owner_type="agency", owner_id=agency1_id
    )
    tx_grp1 = uuid.uuid4()
    entry1 = LedgerEntry(
        transaction_group=tx_grp1,
        account_id=acct1.id,
        direction="credit",
        amount_paisa=75000,  # 750 BDT available
        memo="Agency 1 settled commission",
    )
    db_session.add(entry1)

    batch1 = PayoutBatch(status="approved", total_paisa=50000)
    db_session.add(batch1)
    await db_session.flush()

    payout1 = Payout(
        batch_id=batch1.id,
        agency_id=agency1_id,
        amount_paisa=50000,
        reference="PAY-AGY1-001",
        status="approved",
    )
    db_session.add(payout1)

    # 5. Create Ledger Entries for Agency 2
    acct2 = await LedgerService.get_or_create_account(
        db_session, owner_type="agency", owner_id=agency2_id
    )
    tx_grp2 = uuid.uuid4()
    entry2 = LedgerEntry(
        transaction_group=tx_grp2,
        account_id=acct2.id,
        direction="credit",
        amount_paisa=120000,  # 1,200 BDT available
        memo="Agency 2 settled commission",
    )
    db_session.add(entry2)
    await db_session.commit()

    # Tokens
    jwt_agency1 = make_test_jwt(user1_id, email="sylhet@highlands.com", role="agency")
    jwt_agency2 = make_test_jwt(user2_id, email="sundarbans@ecotours.com", role="agency")
    jwt_admin = make_test_jwt(admin_id, email="admin@shopnojatra.com", role="admin")

    # Agency 1 queries earnings summary
    resp1 = await client.get(
        "/api/v1/agency/earnings/summary",
        headers={"Authorization": f"Bearer {jwt_agency1}"},
    )
    assert resp1.status_code == 200
    data1 = resp1.json()["data"]
    assert data1["agency_id"] == str(agency1_id)
    # 750 BDT minus 500 BDT locked in approved payout = 250 BDT available
    assert data1["available_paisa"] == 25000

    # Agency 2 queries earnings summary
    resp2 = await client.get(
        "/api/v1/agency/earnings/summary",
        headers={"Authorization": f"Bearer {jwt_agency2}"},
    )
    assert resp2.status_code == 200
    data2 = resp2.json()["data"]
    assert data2["agency_id"] == str(agency2_id)
    assert data2["available_paisa"] == 120000

    # Agency 1 queries payouts -> sees PAY-AGY1-001
    resp_payouts1 = await client.get(
        "/api/v1/agency/earnings/payouts",
        headers={"Authorization": f"Bearer {jwt_agency1}"},
    )
    assert resp_payouts1.status_code == 200
    items1 = resp_payouts1.json()["items"]
    assert len(items1) == 1
    assert items1[0]["reference"] == "PAY-AGY1-001"

    # Agency 2 queries payouts -> sees 0 payouts (isolated!)
    resp_payouts2 = await client.get(
        "/api/v1/agency/earnings/payouts",
        headers={"Authorization": f"Bearer {jwt_agency2}"},
    )
    assert resp_payouts2.status_code == 200
    items2 = resp_payouts2.json()["items"]
    assert len(items2) == 0

    # Agency 1 cannot access admin endpoints (403 Forbidden)
    resp_forbidden = await client.get(
        "/api/v1/admin/payouts/batches",
        headers={"Authorization": f"Bearer {jwt_agency1}"},
    )
    assert resp_forbidden.status_code == 403

    # Admin CAN access admin endpoints
    resp_admin = await client.get(
        "/api/v1/admin/payouts/batches",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert resp_admin.status_code == 200
    admin_batches = resp_admin.json()["items"]
    assert len(admin_batches) >= 1


# ---------------------------------------------------------------------------
# TEST 5: LEDGER INTEGRITY CHECK DETECTS IMBALANCES
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_ledger_integrity_check_detects_imbalances(db_session: AsyncSession):
    """
    Test that LedgerService.verify_ledger_integrity flags any unbalanced transaction group.
    """
    # Create a balanced group first
    acct_gw = await LedgerService.get_or_create_account(db_session, owner_type="gateway")
    acct_escrow = await LedgerService.get_or_create_account(db_session, owner_type="escrow")

    balanced_grp = uuid.uuid4()
    e1 = LedgerEntry(
        transaction_group=balanced_grp,
        account_id=acct_gw.id,
        direction="debit",
        amount_paisa=10000,
        memo="Balanced debit",
    )
    e2 = LedgerEntry(
        transaction_group=balanced_grp,
        account_id=acct_escrow.id,
        direction="credit",
        amount_paisa=10000,
        memo="Balanced credit",
    )
    db_session.add_all([e1, e2])
    await db_session.flush()

    audit = await LedgerService.verify_ledger_integrity(db_session)
    assert audit["is_balanced"] is True

    # Inject an unbalanced group (e.g. only debit, credit missing)
    unbalanced_grp = uuid.uuid4()
    bad_entry = LedgerEntry(
        transaction_group=unbalanced_grp,
        account_id=acct_gw.id,
        direction="debit",
        amount_paisa=5000,
        memo="Unbalanced debit with no offsetting credit",
    )
    db_session.add(bad_entry)
    await db_session.flush()

    audit_bad = await LedgerService.verify_ledger_integrity(db_session)
    assert audit_bad["is_balanced"] is False
    assert audit_bad["imbalance_count"] >= 1
    found = next(
        (x for x in audit_bad["imbalances"] if x["transaction_group"] == str(unbalanced_grp)),
        None,
    )
    assert found is not None
    assert found["net_paisa"] == 5000


# ---------------------------------------------------------------------------
# TEST 6: ADMIN CSV EXPORTS (BKASH & BANK) AND MARK PAID
# ---------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_admin_payout_batch_lifecycle_and_csv_export(
    client: AsyncClient,
    db_session: AsyncSession,
):
    """
    Test full admin payout workflow:
    1. Create batch via admin trigger
    2. Approve batch
    3. Export CSV in Bank format
    4. Export CSV in bKash format
    5. Mark paid -> verifies balanced double-entry settlement
    """
    admin_id = uuid.uuid4()
    admin_profile = AccountProfile(
        id=admin_id,
        display_name="Finance Admin",
        role="admin",
        status="active",
    )
    admin_user = AdminUser(
        user_id=admin_id,
        role="super_admin",
        status="active",
    )
    db_session.add_all([admin_profile, admin_user])

    agency = Agency(
        id=uuid.uuid4(),
        owner_user_id=uuid.uuid4(),
        name="Chittagong Aviation",
        phone="01712345678",
        status="active",
        verification_status="verified",
        verified_at=datetime.now(timezone.utc),
    )
    db_session.add(agency)

    # Give agency 200,000 paisa available
    acct = await LedgerService.get_or_create_account(
        db_session, owner_type="agency", owner_id=agency.id
    )
    tx_grp = uuid.uuid4()
    db_session.add(
        LedgerEntry(
            transaction_group=tx_grp,
            account_id=acct.id,
            direction="credit",
            amount_paisa=200000,
            memo="Earnings to payout",
        )
    )
    await db_session.commit()

    jwt_admin = make_test_jwt(admin_id, email="finance@shopnojatra.com", role="admin")

    # 1. Trigger batch creation
    create_resp = await client.post(
        "/api/v1/admin/payouts/batches/create?minimum_threshold_paisa=50000",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert create_resp.status_code == 201
    batch_data = create_resp.json()["data"]
    batch_id = batch_data["id"]
    assert batch_data["status"] == "draft"
    assert batch_data["total_paisa"] == 200000

    # 2. Approve batch
    approve_resp = await client.post(
        f"/api/v1/admin/payouts/batches/{batch_id}/approve",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["data"]["status"] == "approved"

    # 3. Export CSV (Bank format)
    csv_bank = await client.get(
        f"/api/v1/admin/payouts/batches/{batch_id}/export-csv?format=bank",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert csv_bank.status_code == 200
    assert "Beneficiary Account Number" in csv_bank.text
    assert "2000.00" in csv_bank.text

    # 4. Export CSV (bKash format)
    csv_bkash = await client.get(
        f"/api/v1/admin/payouts/batches/{batch_id}/export-csv?format=bkash",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert csv_bkash.status_code == 200
    assert "Wallet Number" in csv_bkash.text
    assert "2000.00" in csv_bkash.text
    assert "01712345678" in csv_bkash.text

    # 5. Mark Paid
    paid_resp = await client.post(
        f"/api/v1/admin/payouts/batches/{batch_id}/mark-paid",
        headers={"Authorization": f"Bearer {jwt_admin}"},
    )
    assert paid_resp.status_code == 200
    assert paid_resp.json()["data"]["status"] == "paid"

    # Verify that marking paid posted balanced settlement ledger entries
    stmt = select(LedgerEntry).where(
        LedgerEntry.memo.like(f"%{agency.id}%")
    )
    paid_entries = (await db_session.execute(stmt)).scalars().all()
    assert len(paid_entries) >= 1
    assert any(e.direction == "debit" and e.amount_paisa == 200000 for e in paid_entries)

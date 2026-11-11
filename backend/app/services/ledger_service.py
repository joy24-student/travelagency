"""
Double-Entry Ledger Service & Agency Financial Settlement Engine.
Enforces strict double-entry balance, zero-float integer paisa arithmetic,
and the largest-remainder rule for exact rounding with zero paisa loss.
"""

import logging
import uuid
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.agency import AgencyCommission
from app.models.user import Agency
from app.models.booking import Booking
from app.models.ledger import LedgerAccount, LedgerEntry, Payout, PayoutBatch
from app.models.payment import Payment, PaymentTransaction

logger = logging.getLogger(__name__)

# Base units for integer percentage arithmetic (10,000 basis points = 100.00%)
BASIS_POINTS_DIVISOR = 10000


def to_paisa(amount: Union[int, str, Decimal, float, Any]) -> int:
    """
    Convert a monetary value to integer paisa without float-to-float conversions.
    1 BDT = 100 paisa.
    """
    if isinstance(amount, int):
        return amount * 100
    # Convert string / Decimal representation safely
    d = Decimal(str(amount))
    return int((d * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def format_paisa_to_bdt(paisa: int) -> str:
    """
    Format integer paisa as BDT currency string without using floating point.
    Example: 100050 -> '1,000.50'
    """
    is_neg = paisa < 0
    abs_paisa = abs(paisa)
    bdt = abs_paisa // 100
    rem = abs_paisa % 100
    prefix = "-" if is_neg else ""
    return f"{prefix}{bdt:,}.{rem:02d}"


def percentage_to_basis_points(percentage_val: Union[int, str, float, Decimal]) -> int:
    """
    Convert a percentage value (e.g. 5.0 or 5.25) to integer basis points
    without floating point inaccuracies.
    5.0% -> 500 basis points (out of 10,000).
    """
    d = Decimal(str(percentage_val))
    return int((d * Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def largest_remainder_split(total_paisa: int, basis_points_list: List[int]) -> List[int]:
    """
    Distribute total_paisa across buckets defined by basis_points_list
    using the Largest-Remainder Rule (Hare-Niemeyer method).
    Guarantees sum(allocated) == total_paisa down to the exact paisa,
    with zero loss or creation of currency. Pure integer arithmetic.
    """
    if total_paisa <= 0:
        return [0] * len(basis_points_list)

    total_bps = sum(basis_points_list)
    if total_bps <= 0:
        return [0] * len(basis_points_list)

    # 1. Integer floor allocations and remainder calculation
    quotients = []
    remainders = []
    for bps in basis_points_list:
        exact_scaled = total_paisa * bps
        q = exact_scaled // total_bps
        r = exact_scaled % total_bps
        quotients.append(q)
        remainders.append(r)

    # 2. Determine leftover paisa to distribute
    allocated_sum = sum(quotients)
    leftover = total_paisa - allocated_sum

    # 3. Sort indices by remainder descending (tiebreak on index)
    sorted_indices = sorted(
        range(len(basis_points_list)),
        key=lambda i: (remainders[i], -i),
        reverse=True,
    )

    # 4. Distribute 1 paisa to highest remainder buckets
    for i in range(leftover):
        target_idx = sorted_indices[i % len(sorted_indices)]
        quotients[target_idx] += 1

    assert sum(quotients) == total_paisa, "Largest-remainder invariant violated"
    return quotients


class LedgerService:

    @staticmethod
    async def get_or_create_account(
        db: AsyncSession,
        owner_type: str,
        owner_id: Optional[uuid.UUID] = None,
        currency: str = "BDT",
    ) -> LedgerAccount:
        """
        Idempotently find or create a ledger account.
        Supported owner_types: 'platform', 'agency', 'escrow', 'gateway', 'vat'.
        """
        valid_types = {"platform", "agency", "escrow", "gateway", "vat"}
        if owner_type not in valid_types:
            raise BadRequestError(f"Invalid ledger account owner_type: '{owner_type}'")

        stmt = select(LedgerAccount).where(
            LedgerAccount.owner_type == owner_type,
            LedgerAccount.currency == currency,
        )
        if owner_id is not None:
            stmt = stmt.where(LedgerAccount.owner_id == owner_id)
        else:
            stmt = stmt.where(LedgerAccount.owner_id.is_(None))

        res = await db.execute(stmt)
        account = res.scalar_one_or_none()

        if not account:
            account = LedgerAccount(
                owner_type=owner_type,
                owner_id=owner_id,
                currency=currency,
            )
            db.add(account)
            await db.flush()

        return account

    @staticmethod
    async def record_payment(
        db: AsyncSession,
        payment: Union[Payment, PaymentTransaction, Dict[str, Any]],
        booking: Optional[Booking] = None,
    ) -> Tuple[uuid.UUID, List[LedgerEntry]]:
        """
        Record inbound customer payment:
        Debit Gateway account (cash receivable), Credit Escrow account (funds held until fulfillment).
        Ensures strict double-entry balance (sum to zero).
        """
        payment_id: Optional[uuid.UUID] = None
        booking_id: Optional[uuid.UUID] = None
        amount_paisa: int = 0
        agency_id: Optional[uuid.UUID] = None
        currency: str = settings.DEFAULT_CURRENCY

        if isinstance(payment, dict):
            payment_id = payment.get("id")
            booking_id = payment.get("booking_id")
            raw_amount = payment.get("amount", 0)
            amount_paisa = to_paisa(raw_amount)
            agency_id = payment.get("agency_id")
            currency = payment.get("currency", currency)
        else:
            payment_id = getattr(payment, "id", None)
            booking_id = getattr(payment, "booking_id", None)
            raw_amount = getattr(payment, "amount", None)
            if raw_amount is None:
                raw_amount = getattr(payment, "original_amount", 0)
            amount_paisa = to_paisa(raw_amount)
            currency = getattr(payment, "currency", currency)

        if booking:
            booking_id = booking.id
            agency_id = booking.agency_id
            if not amount_paisa:
                amount_paisa = to_paisa(booking.final_price)
            currency = booking.currency

        if amount_paisa <= 0:
            raise BadRequestError(f"Invalid payment amount: {amount_paisa} paisa (must be > 0)")

        # Ensure system accounts
        gateway_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="gateway",
            owner_id=None,
            currency=currency,
        )
        escrow_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="escrow",
            owner_id=agency_id,
            currency=currency,
        )

        transaction_group = uuid.uuid4()
        memo_ref = f"booking:{booking_id}" if booking_id else f"payment:{payment_id}"

        debit_entry = LedgerEntry(
            transaction_group=transaction_group,
            account_id=gateway_account.id,
            direction="debit",
            amount_paisa=amount_paisa,
            booking_id=booking_id,
            payment_id=payment_id,
            memo=f"Payment received via gateway for {memo_ref}",
        )
        credit_entry = LedgerEntry(
            transaction_group=transaction_group,
            account_id=escrow_account.id,
            direction="credit",
            amount_paisa=amount_paisa,
            booking_id=booking_id,
            payment_id=payment_id,
            memo=f"Escrow hold pending travel completion for {memo_ref}",
        )

        db.add_all([debit_entry, credit_entry])
        await db.flush()

        logger.info(
            f"[Ledger] Recorded payment tx_group={transaction_group} amount={amount_paisa} paisa "
            f"booking={booking_id} agency={agency_id}"
        )
        return transaction_group, [debit_entry, credit_entry]

    @staticmethod
    async def release_to_agency(
        db: AsyncSession,
        booking: Booking,
    ) -> Optional[Tuple[uuid.UUID, List[LedgerEntry]]]:
        """
        Release escrowed funds upon ticket scan or trip departure date passing.
        Debit Escrow account, Credit Agency account, Credit VAT account, Credit Platform account.
        Uses Largest-Remainder Rule to guarantee perfect integer allocation down to the paisa.
        """
        if not booking.agency_id:
            logger.info(f"[Ledger] Booking {booking.booking_reference} has no agency assigned; skipping agency release.")
            return None

        # Idempotency check: verify this booking hasn't already had escrow released
        existing_stmt = select(LedgerEntry).where(
            LedgerEntry.booking_id == booking.id,
            LedgerEntry.memo.like("Release escrow%"),
        ).limit(1)
        existing_res = await db.execute(existing_stmt)
        if existing_res.scalar_one_or_none():
            logger.info(f"[Ledger] Escrow for booking {booking.booking_reference} already released.")
            return None

        total_paisa = to_paisa(booking.final_price)
        if total_paisa <= 0:
            return None

        # Percentages from parameterized settings (NO hardcoded literals)
        comm_bps = percentage_to_basis_points(settings.AGENCY_COMMISSION_PERCENTAGE)
        vat_bps = percentage_to_basis_points(settings.VAT_TAX_PERCENTAGE)
        platform_bps = BASIS_POINTS_DIVISOR - (comm_bps + vat_bps)
        if platform_bps < 0:
            platform_bps = 0

        # Exact split using largest-remainder rule
        allocations = largest_remainder_split(
            total_paisa=total_paisa,
            basis_points_list=[comm_bps, vat_bps, platform_bps],
        )
        agency_paisa = allocations[0]
        vat_paisa = allocations[1]
        platform_paisa = allocations[2]

        # Accounts
        escrow_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="escrow",
            owner_id=booking.agency_id,
            currency=booking.currency,
        )
        agency_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="agency",
            owner_id=booking.agency_id,
            currency=booking.currency,
        )
        vat_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="vat",
            owner_id=None,
            currency=booking.currency,
        )
        platform_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="platform",
            owner_id=None,
            currency=booking.currency,
        )

        transaction_group = uuid.uuid4()
        entries: List[LedgerEntry] = []

        # Debit Escrow (clear the liability)
        entries.append(
            LedgerEntry(
                transaction_group=transaction_group,
                account_id=escrow_account.id,
                direction="debit",
                amount_paisa=total_paisa,
                booking_id=booking.id,
                memo=f"Release escrow for booking {booking.booking_reference}",
            )
        )

        # Credit Agency available earnings
        if agency_paisa > 0:
            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=agency_account.id,
                    direction="credit",
                    amount_paisa=agency_paisa,
                    booking_id=booking.id,
                    memo=f"Agency commission for booking {booking.booking_reference}",
                )
            )

        # Credit VAT tax liability
        if vat_paisa > 0:
            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=vat_account.id,
                    direction="credit",
                    amount_paisa=vat_paisa,
                    booking_id=booking.id,
                    memo=f"VAT tax on booking {booking.booking_reference}",
                )
            )

        # Credit Platform net margin
        if platform_paisa > 0:
            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=platform_account.id,
                    direction="credit",
                    amount_paisa=platform_paisa,
                    booking_id=booking.id,
                    memo=f"Platform revenue for booking {booking.booking_reference}",
                )
            )

        # Verify double-entry balance
        debit_sum = sum(e.amount_paisa for e in entries if e.direction == "debit")
        credit_sum = sum(e.amount_paisa for e in entries if e.direction == "credit")
        assert debit_sum == credit_sum, f"Unbalanced release: debit={debit_sum} credit={credit_sum}"

        db.add_all(entries)

        # Mark agency_commissions status if exists
        comm_stmt = select(AgencyCommission).where(
            AgencyCommission.booking_id == booking.id,
            AgencyCommission.agency_id == booking.agency_id,
        )
        comm_res = await db.execute(comm_stmt)
        comm_obj = comm_res.scalar_one_or_none()
        if comm_obj:
            comm_obj.status = "credited"

        await db.flush()

        logger.info(
            f"[Ledger] Released escrow for booking {booking.booking_reference}: "
            f"agency={agency_paisa} vat={vat_paisa} platform={platform_paisa}"
        )
        return transaction_group, entries

    @staticmethod
    async def record_refund(
        db: AsyncSession,
        payment: Union[Payment, PaymentTransaction, Dict[str, Any]],
        amount: Union[int, str, Decimal, float],
        booking: Optional[Booking] = None,
    ) -> Tuple[uuid.UUID, List[LedgerEntry]]:
        """
        Record refund transaction:
        - If funds are still in escrow: Debit Escrow, Credit Gateway.
        - If funds were already released to agency: Proportional debit to Agency, VAT, and Platform,
          and Credit Gateway using Largest-Remainder Rule.
        Always leaves transaction group strictly balanced (sum to zero).
        """
        amount_paisa = to_paisa(amount)
        if amount_paisa <= 0:
            raise BadRequestError(f"Refund amount must be positive: {amount_paisa} paisa")

        payment_id = getattr(payment, "id", None) if not isinstance(payment, dict) else payment.get("id")
        booking_id = getattr(payment, "booking_id", None) if not isinstance(payment, dict) else payment.get("booking_id")
        currency = getattr(payment, "currency", settings.DEFAULT_CURRENCY) if not isinstance(payment, dict) else payment.get("currency", settings.DEFAULT_CURRENCY)

        if booking:
            booking_id = booking.id
            currency = booking.currency

        # Determine whether release already occurred for this booking
        already_released = False
        if booking_id:
            check_stmt = select(LedgerEntry).where(
                LedgerEntry.booking_id == booking_id,
                LedgerEntry.memo.like("Release escrow%"),
            ).limit(1)
            check_res = await db.execute(check_stmt)
            already_released = check_res.scalar_one_or_none() is not None

        gateway_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="gateway",
            owner_id=None,
            currency=currency,
        )

        transaction_group = uuid.uuid4()
        entries: List[LedgerEntry] = []

        if not already_released:
            # Funds are still in escrow -> Reverse escrow hold
            agency_id = booking.agency_id if booking else None
            escrow_account = await LedgerService.get_or_create_account(
                db=db,
                owner_type="escrow",
                owner_id=agency_id,
                currency=currency,
            )
            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=escrow_account.id,
                    direction="debit",
                    amount_paisa=amount_paisa,
                    booking_id=booking_id,
                    payment_id=payment_id,
                    memo=f"Refund drawn from escrow for booking {booking_id}",
                )
            )
            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=gateway_account.id,
                    direction="credit",
                    amount_paisa=amount_paisa,
                    booking_id=booking_id,
                    payment_id=payment_id,
                    memo=f"Gateway refund payout for booking {booking_id}",
                )
            )
        else:
            # Funds were released -> Proportional reversal across Agency, VAT, and Platform
            agency_id = booking.agency_id if booking else None
            agency_account = await LedgerService.get_or_create_account(
                db=db,
                owner_type="agency",
                owner_id=agency_id,
                currency=currency,
            )
            vat_account = await LedgerService.get_or_create_account(
                db=db,
                owner_type="vat",
                owner_id=None,
                currency=currency,
            )
            platform_account = await LedgerService.get_or_create_account(
                db=db,
                owner_type="platform",
                owner_id=None,
                currency=currency,
            )

            comm_bps = percentage_to_basis_points(settings.AGENCY_COMMISSION_PERCENTAGE)
            vat_bps = percentage_to_basis_points(settings.VAT_TAX_PERCENTAGE)
            platform_bps = BASIS_POINTS_DIVISOR - (comm_bps + vat_bps)
            if platform_bps < 0:
                platform_bps = 0

            allocations = largest_remainder_split(
                total_paisa=amount_paisa,
                basis_points_list=[comm_bps, vat_bps, platform_bps],
            )
            agency_refund = allocations[0]
            vat_refund = allocations[1]
            platform_refund = allocations[2]

            if agency_refund > 0:
                entries.append(
                    LedgerEntry(
                        transaction_group=transaction_group,
                        account_id=agency_account.id,
                        direction="debit",
                        amount_paisa=agency_refund,
                        booking_id=booking_id,
                        payment_id=payment_id,
                        memo=f"Reversal of agency commission due to refund for {booking_id}",
                    )
                )
            if vat_refund > 0:
                entries.append(
                    LedgerEntry(
                        transaction_group=transaction_group,
                        account_id=vat_account.id,
                        direction="debit",
                        amount_paisa=vat_refund,
                        booking_id=booking_id,
                        payment_id=payment_id,
                        memo=f"Reversal of VAT tax due to refund for {booking_id}",
                    )
                )
            if platform_refund > 0:
                entries.append(
                    LedgerEntry(
                        transaction_group=transaction_group,
                        account_id=platform_account.id,
                        direction="debit",
                        amount_paisa=platform_refund,
                        booking_id=booking_id,
                        payment_id=payment_id,
                        memo=f"Reversal of platform revenue due to refund for {booking_id}",
                    )
                )

            entries.append(
                LedgerEntry(
                    transaction_group=transaction_group,
                    account_id=gateway_account.id,
                    direction="credit",
                    amount_paisa=amount_paisa,
                    booking_id=booking_id,
                    payment_id=payment_id,
                    memo=f"Gateway refund payout for booking {booking_id}",
                )
            )

        # Verify balance
        debit_sum = sum(e.amount_paisa for e in entries if e.direction == "debit")
        credit_sum = sum(e.amount_paisa for e in entries if e.direction == "credit")
        assert debit_sum == credit_sum, f"Unbalanced refund: debit={debit_sum} credit={credit_sum}"

        db.add_all(entries)
        await db.flush()

        logger.info(f"[Ledger] Recorded refund tx_group={transaction_group} amount={amount_paisa} paisa")
        return transaction_group, entries

    @staticmethod
    async def validate_agency_payout_eligibility(db: AsyncSession, agency_id: uuid.UUID) -> Agency:
        """
        Enforce Zero-Trust KYC gate: Block payouts in ledger service until verified_at is set.
        """
        agency = await db.get(Agency, agency_id)
        if not agency:
            raise NotFoundError("Agency", agency_id)

        if not agency.verified_at:
            raise BadRequestError(
                f"Agency payout blocked: Agency '{agency.name}' ({agency_id}) is not KYC verified. "
                "Compliance policy strictly requires verified_at timestamp before disbursing ledger payouts."
            )
        return agency

    @staticmethod
    async def create_payout_batch(
        db: AsyncSession,
        created_by: Optional[uuid.UUID] = None,
        minimum_threshold_paisa: Optional[int] = None,
    ) -> PayoutBatch:
        """
        Aggregate qualifying agency available balances into a new PayoutBatch.
        Respects minimum payout threshold from settings.
        All calculations in pure integer paisa.
        """
        threshold = (
            minimum_threshold_paisa
            if minimum_threshold_paisa is not None
            else settings.MINIMUM_PAYOUT_THRESHOLD_PAISA
        )

        # Query all agency accounts
        acct_stmt = select(LedgerAccount).where(
            LedgerAccount.owner_type == "agency",
            LedgerAccount.owner_id.is_not(None),
        )
        acct_res = await db.execute(acct_stmt)
        agency_accounts = acct_res.scalars().all()

        qualifying_payouts: List[Dict[str, Any]] = []

        for acct in agency_accounts:
            agency_id = acct.owner_id
            # Zero-Trust Compliance Gate: Block payouts in the ledger service until verified_at is set
            agency = await db.get(Agency, agency_id)
            if not agency or not agency.verified_at:
                logger.warning(
                    f"[Ledger] Skipping agency {agency_id} ({agency.name if agency else 'Unknown'}) "
                    f"from payout batch: KYC verification pending (verified_at is not set)."
                )
                continue

            balances = await LedgerService.get_agency_balances(db, agency_id)
            avail_paisa = balances["available_paisa"]

            if avail_paisa >= threshold:
                qualifying_payouts.append({
                    "agency_id": agency_id,
                    "amount_paisa": avail_paisa,
                    "reference": f"PAY-{uuid.uuid4().hex[:8].upper()}",
                })

        total_batch_paisa = sum(item["amount_paisa"] for item in qualifying_payouts)

        batch = PayoutBatch(
            status="draft",
            total_paisa=total_batch_paisa,
            created_by=created_by,
        )
        batch.payouts = []
        db.add(batch)
        await db.flush()

        for item in qualifying_payouts:
            payout = Payout(
                batch=batch,
                agency_id=item["agency_id"],
                amount_paisa=item["amount_paisa"],
                reference=item["reference"],
                status="draft",
            )
            batch.payouts.append(payout)
            db.add(payout)

        await db.flush()
        logger.info(
            f"[Ledger] Created payout batch {batch.id}: count={len(qualifying_payouts)} "
            f"total={total_batch_paisa} paisa threshold={threshold}"
        )
        return batch

    @staticmethod
    async def get_agency_balances(db: AsyncSession, agency_id: uuid.UUID) -> Dict[str, Any]:
        """
        Calculate pending, available, and paid balances for an agency.
        Computed 100% on the server in integer paisa with zero client calculation.
        """
        # 1. Pending: sum of active escrow credits for this agency's bookings not yet released
        pending_stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount_paisa), 0)
        ).join(
            LedgerAccount, LedgerEntry.account_id == LedgerAccount.id
        ).where(
            LedgerAccount.owner_type == "escrow",
            LedgerAccount.owner_id == agency_id,
            LedgerEntry.direction == "credit",
        )
        pending_credits = (await db.execute(pending_stmt)).scalar() or 0

        pending_debited_stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount_paisa), 0)
        ).join(
            LedgerAccount, LedgerEntry.account_id == LedgerAccount.id
        ).where(
            LedgerAccount.owner_type == "escrow",
            LedgerAccount.owner_id == agency_id,
            LedgerEntry.direction == "debit",
        )
        pending_debits = (await db.execute(pending_debited_stmt)).scalar() or 0
        net_escrow_paisa = pending_credits - pending_debits
        if net_escrow_paisa < 0:
            net_escrow_paisa = 0

        # Agency pending share is based on AGENCY_COMMISSION_PERCENTAGE
        comm_bps = percentage_to_basis_points(settings.AGENCY_COMMISSION_PERCENTAGE)
        agency_pending_paisa = (net_escrow_paisa * comm_bps) // BASIS_POINTS_DIVISOR

        # 2. Available balance: ledger credits minus ledger debits on agency account
        avail_credits_stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount_paisa), 0)
        ).join(
            LedgerAccount, LedgerEntry.account_id == LedgerAccount.id
        ).where(
            LedgerAccount.owner_type == "agency",
            LedgerAccount.owner_id == agency_id,
            LedgerEntry.direction == "credit",
        )
        agency_credits = (await db.execute(avail_credits_stmt)).scalar() or 0

        avail_debits_stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount_paisa), 0)
        ).join(
            LedgerAccount, LedgerEntry.account_id == LedgerAccount.id
        ).where(
            LedgerAccount.owner_type == "agency",
            LedgerAccount.owner_id == agency_id,
            LedgerEntry.direction == "debit",
        )
        agency_debits = (await db.execute(avail_debits_stmt)).scalar() or 0
        raw_available = agency_credits - agency_debits

        # Subtract any amounts reserved in pending draft or approved batches
        locked_payouts_stmt = select(
            func.coalesce(func.sum(Payout.amount_paisa), 0)
        ).where(
            Payout.agency_id == agency_id,
            Payout.status.in_(["draft", "approved"]),
        )
        locked_payouts = (await db.execute(locked_payouts_stmt)).scalar() or 0
        available_paisa = max(0, raw_available - locked_payouts)

        # 3. Paid out balance: completed payouts
        paid_stmt = select(
            func.coalesce(func.sum(Payout.amount_paisa), 0)
        ).where(
            Payout.agency_id == agency_id,
            Payout.status == "paid",
        )
        paid_paisa = (await db.execute(paid_stmt)).scalar() or 0

        return {
            "agency_id": str(agency_id),
            "currency": settings.DEFAULT_CURRENCY,
            "pending_paisa": agency_pending_paisa,
            "available_paisa": available_paisa,
            "paid_paisa": paid_paisa,
            "pending_bdt": format_paisa_to_bdt(agency_pending_paisa),
            "available_bdt": format_paisa_to_bdt(available_paisa),
            "paid_bdt": format_paisa_to_bdt(paid_paisa),
        }

    @staticmethod
    async def verify_ledger_integrity(db: AsyncSession) -> Dict[str, Any]:
        """
        Verify that every single transaction_group in the ledger sums to zero.
        Detects and reports any imbalance across debits and credits.
        """
        net_expr = func.sum(
            case(
                (LedgerEntry.direction == "debit", LedgerEntry.amount_paisa),
                else_=-LedgerEntry.amount_paisa,
            )
        )
        stmt = (
            select(
                LedgerEntry.transaction_group,
                net_expr.label("net_paisa"),
                func.count(LedgerEntry.id).label("entry_count"),
            )
            .group_by(LedgerEntry.transaction_group)
            .having(net_expr != 0)
        )
        res = await db.execute(stmt)
        imbalanced = res.all()

        is_balanced = len(imbalanced) == 0
        imbalances_list = []
        for row in imbalanced:
            imbalances_list.append({
                "transaction_group": str(row[0]),
                "net_paisa": int(row[1]),
                "entry_count": int(row[2]),
            })

        if not is_balanced:
            logger.critical(
                f"[LEDGER INTEGRITY BREACH] Found {len(imbalances_list)} unbalanced transaction groups: {imbalances_list}"
            )
        else:
            logger.info("[LEDGER INTEGRITY AUDIT] All transaction groups perfectly balanced at zero.")

        return {
            "is_balanced": is_balanced,
            "imbalance_count": len(imbalances_list),
            "imbalances": imbalances_list,
        }

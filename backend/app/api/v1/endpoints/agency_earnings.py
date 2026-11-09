"""
Agency Financial Portal: Earnings, Balances, Payouts, & Monthly Tax Invoices.
Server-side integer paisa calculations; zero money math computed on the client.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, require_agency
from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.models.booking import Booking
from app.models.ledger import LedgerAccount, LedgerEntry, Payout
from app.models.user import Agency
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.user import CurrentUser
from app.services.ledger_service import LedgerService, format_paisa_to_bdt, percentage_to_basis_points

router = APIRouter(prefix="/agency/earnings", tags=["Agency Earnings"])


class AgencyBalancesResponse(BaseModel):
    agency_id: str
    currency: str
    pending_paisa: int
    available_paisa: int
    paid_paisa: int
    pending_bdt: str
    available_bdt: str
    paid_bdt: str


class AgencyPayoutItem(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    amount_paisa: int
    amount_bdt: str
    reference: Optional[str]
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None


class MonthlyStatementResponse(BaseModel):
    month: str
    agency_id: str
    agency_name: str
    currency: str
    gross_volume_paisa: int
    gross_volume_bdt: str
    commission_rate_pct: str
    vat_rate_pct: str
    commission_paisa: int
    commission_bdt: str
    vat_paisa: int
    vat_bdt: str
    net_earnings_paisa: int
    net_earnings_bdt: str
    booking_count: int
    payout_count: int
    invoice_number: str
    invoice_date: str


@router.get("/summary", response_model=StandardResponse[AgencyBalancesResponse])
async def get_earnings_summary(
    current_user: CurrentUser = Depends(require_agency),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieve current agency balance breakdown: Pending, Available, Paid.
    All calculations performed on backend with integer paisa precision.
    """
    agency_id = current_user.agency_id
    if not agency_id:
        # Fallback to agency owned by user
        stmt = select(Agency.id).where(Agency.owner_user_id == current_user.id).limit(1)
        res = await db.execute(stmt)
        agency_id = res.scalar_one_or_none()

    if not agency_id:
        raise BadRequestError("No associated agency found for this account")

    balances = await LedgerService.get_agency_balances(db, agency_id)

    return StandardResponse[AgencyBalancesResponse](
        success=True,
        message="Agency financial balances retrieved",
        data=AgencyBalancesResponse(**balances),
    )


@router.get("/payouts", response_model=PaginatedResponse[AgencyPayoutItem])
async def list_agency_payouts(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_agency),
    db: AsyncSession = Depends(get_db),
):
    """List historical agency payouts with filtering."""
    agency_id = current_user.agency_id
    if not agency_id:
        stmt = select(Agency.id).where(Agency.owner_user_id == current_user.id).limit(1)
        agency_id = (await db.execute(stmt)).scalar_one_or_none()

    if not agency_id:
        raise BadRequestError("No associated agency found for this account")

    offset = (page - 1) * page_size
    stmt = select(Payout).where(Payout.agency_id == agency_id)
    if status_filter:
        stmt = stmt.where(Payout.status == status_filter)

    count_stmt = select(func.count(Payout.id)).where(Payout.agency_id == agency_id)
    if status_filter:
        count_stmt = count_stmt.where(Payout.status == status_filter)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(Payout.created_at.desc()).offset(offset).limit(page_size)
    payouts = (await db.execute(stmt)).scalars().all()

    items = [
        AgencyPayoutItem(
            id=p.id,
            batch_id=p.batch_id,
            amount_paisa=p.amount_paisa,
            amount_bdt=format_paisa_to_bdt(p.amount_paisa),
            reference=p.reference,
            status=p.status,
            created_at=p.created_at,
            paid_at=p.paid_at,
        )
        for p in payouts
    ]

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[AgencyPayoutItem](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.get("/statement", response_model=StandardResponse[MonthlyStatementResponse])
async def get_monthly_statement(
    month: Optional[str] = Query(None, description="Month in YYYY-MM format, e.g. 2026-11"),
    current_user: CurrentUser = Depends(require_agency),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate official monthly statement & invoice data with mandatory VAT line.
    Calculates gross booking volume, agency commission, VAT tax line, and net payable.
    """
    agency_id = current_user.agency_id
    if not agency_id:
        stmt = select(Agency.id).where(Agency.owner_user_id == current_user.id).limit(1)
        agency_id = (await db.execute(stmt)).scalar_one_or_none()

    if not agency_id:
        raise BadRequestError("No associated agency found for this account")

    agency_stmt = select(Agency).where(Agency.id == agency_id)
    agency = (await db.execute(agency_stmt)).scalar_one_or_none()
    agency_name = agency.name if agency else "Partner Agency"

    # Default to current month if not specified
    now = datetime.now(timezone.utc)
    target_month = month or now.strftime("%Y-%m")

    # Aggregate ledger entries for this agency in target month
    acct_stmt = select(LedgerAccount.id).where(
        LedgerAccount.owner_type == "agency",
        LedgerAccount.owner_id == agency_id,
    )
    agency_acct_ids = (await db.execute(acct_stmt)).scalars().all()

    total_commission_paisa = 0
    booking_count = 0
    if agency_acct_ids:
        comm_entries_stmt = select(
            func.coalesce(func.sum(LedgerEntry.amount_paisa), 0),
            func.count(LedgerEntry.id),
        ).where(
            LedgerEntry.account_id.in_(agency_acct_ids),
            LedgerEntry.direction == "credit",
        )
        row = (await db.execute(comm_entries_stmt)).one()
        total_commission_paisa = row[0] or 0
        booking_count = row[1] or 0

    comm_bps = percentage_to_basis_points(settings.AGENCY_COMMISSION_PERCENTAGE)
    vat_bps = percentage_to_basis_points(settings.VAT_TAX_PERCENTAGE)

    # Compute gross volume from commission: (commission * 10000) // comm_bps
    if comm_bps > 0:
        gross_volume_paisa = (total_commission_paisa * 10000) // comm_bps
    else:
        gross_volume_paisa = total_commission_paisa

    # VAT tax line: exact integer paisa
    vat_paisa = (gross_volume_paisa * vat_bps) // 10000

    # Payout count in month
    payout_count_stmt = select(func.count(Payout.id)).where(Payout.agency_id == agency_id)
    payout_count = (await db.execute(payout_count_stmt)).scalar() or 0

    invoice_number = f"INV-{target_month.replace('-', '')}-{agency_id.hex[:6].upper()}"

    return StandardResponse[MonthlyStatementResponse](
        success=True,
        message="Monthly statement and invoice generated",
        data=MonthlyStatementResponse(
            month=target_month,
            agency_id=str(agency_id),
            agency_name=agency_name,
            currency=settings.DEFAULT_CURRENCY,
            gross_volume_paisa=gross_volume_paisa,
            gross_volume_bdt=format_paisa_to_bdt(gross_volume_paisa),
            commission_rate_pct=f"{settings.AGENCY_COMMISSION_PERCENTAGE:.1f}%",
            vat_rate_pct=f"{settings.VAT_TAX_PERCENTAGE:.1f}%",
            commission_paisa=total_commission_paisa,
            commission_bdt=format_paisa_to_bdt(total_commission_paisa),
            vat_paisa=vat_paisa,
            vat_bdt=format_paisa_to_bdt(vat_paisa),
            net_earnings_paisa=total_commission_paisa,
            net_earnings_bdt=format_paisa_to_bdt(total_commission_paisa),
            booking_count=booking_count,
            payout_count=payout_count,
            invoice_number=invoice_number,
            invoice_date=now.strftime("%Y-%m-%d"),
        ),
    )

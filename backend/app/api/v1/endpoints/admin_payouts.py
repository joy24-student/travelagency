"""
Admin Payout Management & Disbursement Router.
Provides endpoints for:
- Listing and creating payout disbursement batches.
- Approving payout batches.
- Exporting banking-compliant CSVs (BEFTN/RTGS & bKash B2B Bulk).
- Marking batches as paid and executing ledger settlement entries.
All endpoints protected by require_admin dependency.
"""

import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db, require_admin
from app.core.config import settings
from app.core.exceptions import BadRequestError, NotFoundError
from app.models.agency import AgencyBankAccount
from app.models.ledger import LedgerAccount, LedgerEntry, Payout, PayoutBatch
from app.models.user import Agency
from app.schemas.common import PaginatedResponse, StandardResponse
from app.schemas.user import CurrentUser
from app.services.ledger_service import LedgerService, format_paisa_to_bdt

router = APIRouter(prefix="/admin/payouts", tags=["Admin Payouts"])


class PayoutItemResponse(BaseModel):
    id: uuid.UUID
    batch_id: uuid.UUID
    agency_id: uuid.UUID
    agency_name: Optional[str] = None
    amount_paisa: int
    amount_bdt: str
    reference: Optional[str] = None
    status: str
    created_at: datetime
    paid_at: Optional[datetime] = None


class PayoutBatchResponse(BaseModel):
    id: uuid.UUID
    status: str
    total_paisa: int
    total_bdt: str
    payout_count: int
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    paid_at: Optional[datetime] = None
    payouts: Optional[List[PayoutItemResponse]] = None


@router.get("/batches", response_model=PaginatedResponse[PayoutBatchResponse])
async def list_payout_batches(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """List payout batches with pagination and status filtering."""
    offset = (page - 1) * page_size
    stmt = select(PayoutBatch).options(selectinload(PayoutBatch.payouts))

    if status_filter:
        stmt = stmt.where(PayoutBatch.status == status_filter)

    count_stmt = select(func.count(PayoutBatch.id))
    if status_filter:
        count_stmt = count_stmt.where(PayoutBatch.status == status_filter)

    total = (await db.execute(count_stmt)).scalar() or 0
    stmt = stmt.order_by(PayoutBatch.created_at.desc()).offset(offset).limit(page_size)
    batches = (await db.execute(stmt)).scalars().all()

    items = []
    for b in batches:
        items.append(
            PayoutBatchResponse(
                id=b.id,
                status=b.status,
                total_paisa=b.total_paisa,
                total_bdt=format_paisa_to_bdt(b.total_paisa),
                payout_count=len(b.payouts),
                created_by=b.created_by,
                created_at=b.created_at,
                paid_at=b.paid_at,
            )
        )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse[PayoutBatchResponse](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1,
    )


@router.post("/batches/create", response_model=StandardResponse[PayoutBatchResponse], status_code=status.HTTP_201_CREATED)
async def trigger_payout_batch(
    minimum_threshold_paisa: Optional[int] = Query(None),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Admin trigger to aggregate available balances into a new draft payout batch."""
    batch = await LedgerService.create_payout_batch(
        db=db,
        created_by=current_user.id,
        minimum_threshold_paisa=minimum_threshold_paisa,
    )
    b_id = batch.id
    b_status = batch.status
    b_total = batch.total_paisa
    b_count = len(batch.payouts)
    b_creator = batch.created_by
    b_created = batch.created_at
    b_paid = batch.paid_at
    await db.commit()

    return StandardResponse[PayoutBatchResponse](
        success=True,
        message=f"Payout batch {b_id} created successfully with {b_count} payouts",
        data=PayoutBatchResponse(
            id=b_id,
            status=b_status,
            total_paisa=b_total,
            total_bdt=format_paisa_to_bdt(b_total),
            payout_count=b_count,
            created_by=b_creator,
            created_at=b_created,
            paid_at=b_paid,
        ),
    )


@router.get("/batches/{batch_id}", response_model=StandardResponse[PayoutBatchResponse])
async def get_payout_batch(
    batch_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retrieve full batch details including itemized agency payouts."""
    stmt = (
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )
    batch = (await db.execute(stmt)).scalar_one_or_none()
    if not batch:
        raise NotFoundError("PayoutBatch", batch_id)

    # Fetch agency names for presentation
    agency_ids = [p.agency_id for p in batch.payouts]
    agencies_stmt = select(Agency.id, Agency.name).where(Agency.id.in_(agency_ids))
    agencies_map = dict((await db.execute(agencies_stmt)).all())

    payout_items = [
        PayoutItemResponse(
            id=p.id,
            batch_id=p.batch_id,
            agency_id=p.agency_id,
            agency_name=agencies_map.get(p.agency_id, "Unknown Agency"),
            amount_paisa=p.amount_paisa,
            amount_bdt=format_paisa_to_bdt(p.amount_paisa),
            reference=p.reference,
            status=p.status,
            created_at=p.created_at,
            paid_at=p.paid_at,
        )
        for p in batch.payouts
    ]

    return StandardResponse[PayoutBatchResponse](
        success=True,
        message="Payout batch details retrieved",
        data=PayoutBatchResponse(
            id=batch.id,
            status=batch.status,
            total_paisa=batch.total_paisa,
            total_bdt=format_paisa_to_bdt(batch.total_paisa),
            payout_count=len(batch.payouts),
            created_by=batch.created_by,
            created_at=batch.created_at,
            paid_at=batch.paid_at,
            payouts=payout_items,
        ),
    )


@router.post("/batches/{batch_id}/approve", response_model=StandardResponse[PayoutBatchResponse])
async def approve_payout_batch(
    batch_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Approve a draft payout batch for financial processing."""
    stmt = (
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )
    batch = (await db.execute(stmt)).scalar_one_or_none()
    if not batch:
        raise NotFoundError("PayoutBatch", batch_id)

    if batch.status != "draft":
        raise BadRequestError(f"Cannot approve batch in '{batch.status}' status (must be 'draft')")

    # Zero-Trust KYC Gate: Verify every agency in the payout batch has verified_at set
    for p in batch.payouts:
        agency = await db.get(Agency, p.agency_id)
        if not agency or not agency.verified_at:
            raise BadRequestError(
                f"Cannot approve payout batch: Agency '{agency.name if agency else p.agency_id}' is not KYC verified. "
                "verified_at timestamp is strictly required before payouts can be approved."
            )

    batch.status = "approved"
    for p in batch.payouts:
        p.status = "approved"

    b_id = batch.id
    b_status = batch.status
    b_total = batch.total_paisa
    b_count = len(batch.payouts)
    b_creator = batch.created_by
    b_created = batch.created_at
    b_paid = batch.paid_at
    await db.commit()

    return StandardResponse[PayoutBatchResponse](
        success=True,
        message="Payout batch approved successfully",
        data=PayoutBatchResponse(
            id=b_id,
            status=b_status,
            total_paisa=b_total,
            total_bdt=format_paisa_to_bdt(b_total),
            payout_count=b_count,
            created_by=b_creator,
            created_at=b_created,
            paid_at=b_paid,
        ),
    )


@router.get("/batches/{batch_id}/export-csv")
async def export_batch_csv(
    batch_id: uuid.UUID,
    export_format: str = Query("bank", pattern="^(bank|bkash)$", alias="format"),
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Export payout batch CSV for BEFTN / RTGS corporate banking upload or bKash B2B Bulk Disbursement.
    """
    stmt = (
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )
    batch = (await db.execute(stmt)).scalar_one_or_none()
    if not batch:
        raise NotFoundError("PayoutBatch", batch_id)

    # Agency lookup and bank accounts
    agency_ids = [p.agency_id for p in batch.payouts]
    agencies_stmt = select(Agency).where(Agency.id.in_(agency_ids))
    agencies_map = {a.id: a for a in (await db.execute(agencies_stmt)).scalars().all()}

    bank_stmt = select(AgencyBankAccount).where(
        AgencyBankAccount.agency_id.in_(agency_ids),
        AgencyBankAccount.is_primary == True,
    )
    bank_map = {b.agency_id: b for b in (await db.execute(bank_stmt)).scalars().all()}

    output = io.StringIO()
    writer = csv.writer(output)

    if export_format == "bkash":
        # bKash Corporate Bulk Disbursement format
        writer.writerow(["Wallet Number", "Amount", "Reference", "Memo"])
        for p in batch.payouts:
            agency = agencies_map.get(p.agency_id)
            wallet = agency.phone if agency and agency.phone else "01700000000"
            amount_bdt = f"{p.amount_paisa // 100}.{p.amount_paisa % 100:02d}"
            ref = p.reference or f"PAY-{p.id.hex[:8].upper()}"
            writer.writerow([wallet, amount_bdt, ref, "ShopnoJatra Agency Settlement"])
    else:
        # Standard Bangladesh Bank BEFTN/NPSB/RTGS Corporate Bank format
        writer.writerow([
            "Beneficiary Account Number",
            "Beneficiary Account Name",
            "Bank Name",
            "Routing Number",
            "Amount BDT",
            "Payment Reference",
            "Narrative",
        ])
        for p in batch.payouts:
            agency = agencies_map.get(p.agency_id)
            bank_acct = bank_map.get(p.agency_id)
            acct_num = bank_acct.account_number if bank_acct else "0000000000"
            bank_name = bank_acct.bank_name if bank_acct else "City Bank Limited"
            routing = bank_acct.routing_number if bank_acct and bank_acct.routing_number else "225271891"
            agency_name = agency.name if agency else "Partner Agency"
            amount_bdt = f"{p.amount_paisa // 100}.{p.amount_paisa % 100:02d}"
            ref = p.reference or f"PAY-{p.id.hex[:8].upper()}"
            writer.writerow([acct_num, agency_name, bank_name, routing, amount_bdt, ref, "Settlement"])

    csv_data = output.getvalue()
    filename = f"payout-batch-{batch.id.hex[:8]}-{export_format}.csv"

    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Content-Length": str(len(csv_data)),
        },
    )


@router.post("/batches/{batch_id}/mark-paid", response_model=StandardResponse[PayoutBatchResponse])
async def mark_payout_batch_paid(
    batch_id: uuid.UUID,
    current_user: CurrentUser = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark an approved payout batch as paid upon bank / bKash confirmation.
    Executes balanced double-entry ledger settlement records:
    Debit Agency account, Credit Gateway/Bank account.
    """
    stmt = (
        select(PayoutBatch)
        .options(selectinload(PayoutBatch.payouts))
        .where(PayoutBatch.id == batch_id)
    )
    batch = (await db.execute(stmt)).scalar_one_or_none()
    if not batch:
        raise NotFoundError("PayoutBatch", batch_id)

    if batch.status not in ("approved", "draft"):
        raise BadRequestError(f"Cannot mark batch in status '{batch.status}' as paid (must be 'approved' or 'draft')")

    now = datetime.now(timezone.utc)
    batch.status = "paid"
    batch.paid_at = now

    gateway_account = await LedgerService.get_or_create_account(
        db=db,
        owner_type="gateway",
        owner_id=None,
        currency=settings.DEFAULT_CURRENCY,
    )

    # For each payout, update status and post double-entry ledger settlement
    for p in batch.payouts:
        p.status = "paid"
        p.paid_at = now

        agency_account = await LedgerService.get_or_create_account(
            db=db,
            owner_type="agency",
            owner_id=p.agency_id,
            currency=settings.DEFAULT_CURRENCY,
        )

        payout_tx_group = uuid.uuid4()
        entry_agency = LedgerEntry(
            transaction_group=payout_tx_group,
            account_id=agency_account.id,
            direction="debit",
            amount_paisa=p.amount_paisa,
            memo=f"Payout settlement {p.reference} to agency {p.agency_id}",
        )
        entry_gateway = LedgerEntry(
            transaction_group=payout_tx_group,
            account_id=gateway_account.id,
            direction="credit",
            amount_paisa=p.amount_paisa,
            memo=f"Disbursement from gateway for payout {p.reference}",
        )
        db.add_all([entry_agency, entry_gateway])

    b_id = batch.id
    b_status = batch.status
    b_total = batch.total_paisa
    b_count = len(batch.payouts)
    b_creator = batch.created_by
    b_created = batch.created_at
    b_paid = batch.paid_at
    await db.commit()

    return StandardResponse[PayoutBatchResponse](
        success=True,
        message="Payout batch successfully marked paid and ledger settlement entries finalized",
        data=PayoutBatchResponse(
            id=b_id,
            status=b_status,
            total_paisa=b_total,
            total_bdt=format_paisa_to_bdt(b_total),
            payout_count=b_count,
            created_by=b_creator,
            created_at=b_created,
            paid_at=b_paid,
        ),
    )

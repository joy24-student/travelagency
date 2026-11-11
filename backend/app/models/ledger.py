"""
Double-Entry Ledger and Agency Payout Models.
Immutable transaction audit logging with paisa-level precision and strict zero-trust accounting.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import BigInteger, CheckConstraint, DateTime, ForeignKey, Index, Text, event, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import UUIDMixin


class LedgerAccount(Base, UUIDMixin):
    """
    Corresponds to public.ledger_accounts.
    Stores double-entry ledger accounts categorized by owner_type:
    platform, agency, escrow, gateway, vat.
    """
    __tablename__ = "ledger_accounts"

    owner_type: Mapped[str] = mapped_column(Text, nullable=False)
    owner_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True, nullable=True)
    currency: Mapped[str] = mapped_column(Text, default="BDT", nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint(
            "owner_type IN ('platform', 'agency', 'escrow', 'gateway', 'vat')",
            name="chk_ledger_accounts_owner_type",
        ),
        Index("idx_ledger_accounts_lookup", "owner_type", "owner_id", "currency"),
    )


class LedgerEntry(Base, UUIDMixin):
    """
    Corresponds to public.ledger_entries.
    Immutable transaction entry in a balanced double-entry transaction group.
    UPDATE and DELETE are strictly rejected by both DB trigger and ORM listeners.
    """
    __tablename__ = "ledger_entries"

    transaction_group: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("ledger_accounts.id", ondelete="RESTRICT"),
        index=True,
        nullable=False,
    )
    direction: Mapped[str] = mapped_column(Text, nullable=False)  # 'debit' or 'credit'
    amount_paisa: Mapped[int] = mapped_column(BigInteger, nullable=False)
    booking_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("bookings.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("payment_transactions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    memo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )

    __table_args__ = (
        CheckConstraint("direction IN ('debit', 'credit')", name="chk_ledger_entries_direction"),
        CheckConstraint("amount_paisa > 0", name="chk_ledger_entries_amount_positive"),
        Index("idx_ledger_entries_tx_grp", "transaction_group"),
        Index("idx_ledger_entries_acct_created", "account_id", "created_at"),
    )


class PayoutBatch(Base, UUIDMixin):
    """
    Corresponds to public.payout_batches.
    Weekly or on-demand disbursement batches for aggregated agency earnings.
    """
    __tablename__ = "payout_batches"

    status: Mapped[str] = mapped_column(Text, default="draft", nullable=False, index=True)
    total_paisa: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    created_by: Mapped[Optional[uuid.UUID]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    payouts: Mapped[List["Payout"]] = relationship(
        "Payout",
        back_populates="batch",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'approved', 'paid', 'failed')",
            name="chk_payout_batches_status",
        ),
        CheckConstraint("total_paisa >= 0", name="chk_payout_batches_total_positive"),
    )


class Payout(Base, UUIDMixin):
    """
    Corresponds to public.payouts.
    Replaces the missing agency_payments table. Represents an individual payout to an agency.
    """
    __tablename__ = "payouts"

    batch_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("payout_batches.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    agency_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("agencies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    amount_paisa: Mapped[int] = mapped_column(BigInteger, nullable=False)
    reference: Mapped[Optional[str]] = mapped_column(Text, unique=True, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="draft", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
    )
    paid_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    batch: Mapped["PayoutBatch"] = relationship("PayoutBatch", back_populates="payouts")

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft', 'approved', 'paid', 'failed')",
            name="chk_payouts_status",
        ),
        CheckConstraint("amount_paisa > 0", name="chk_payouts_amount_positive"),
    )


# ---------------------------------------------------------------------------
# IMMUTABILITY ENFORCEMENT: ORM listeners matching DB triggers
# ---------------------------------------------------------------------------
@event.listens_for(LedgerEntry, "before_update")
def reject_ledger_entry_update(mapper, connection, target):
    raise ValueError("Immutable ledger: UPDATE operations are strictly prohibited on ledger_entries")


@event.listens_for(LedgerEntry, "before_delete")
def reject_ledger_entry_delete(mapper, connection, target):
    raise ValueError("Immutable ledger: DELETE operations are strictly prohibited on ledger_entries")

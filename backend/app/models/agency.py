"""
Agency Financials and Commissions Models.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class AgencyCommission(Base, TimestampMixin, UUIDMixin):
    """
    Corresponds to public.agency_commissions.
    Tracks commissions credited to partner agencies upon confirmed bookings.
    """
    __tablename__ = "agency_commissions"

    agency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    commission_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=5.0)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    status: Mapped[str] = mapped_column(Text, default="credited", index=True)  # pending, credited, paid_out, reversed
    transaction_reference: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    metadata_json: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class AgencyBankAccount(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.agency_bank_accounts."""
    __tablename__ = "agency_bank_accounts"

    agency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False, index=True)
    bank_name: Mapped[str] = mapped_column(Text, nullable=False)
    branch_name: Mapped[Optional[str]] = mapped_column(Text)
    account_number: Mapped[str] = mapped_column(Text, nullable=False)
    routing_number: Mapped[Optional[str]] = mapped_column(Text)
    is_primary: Mapped[bool] = mapped_column(default=True)

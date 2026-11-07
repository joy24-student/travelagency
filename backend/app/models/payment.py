"""
Payment and Financial Transaction Models.
Includes Idempotency tracking and Security Nonces to prevent replay attacks.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Payment(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.payments."""
    __tablename__ = "payments"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    original_amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    fee: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    method: Mapped[str] = mapped_column(Text, nullable=False)  # bkash, nagad, rocket, stripe, card, wallet
    phone: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text)
    reference: Mapped[Optional[str]] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="pending", index=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(Text, unique=True, index=True)
    gateway_response: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class PaymentTransaction(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.payment_transactions."""
    __tablename__ = "payment_transactions"

    booking_payment_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    booking_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    method: Mapped[str] = mapped_column(Text, nullable=False)
    gateway: Mapped[str] = mapped_column(Text, nullable=False)
    provider_transaction_id: Mapped[Optional[str]] = mapped_column(Text, index=True)
    status: Mapped[str] = mapped_column(Text, default="pending", index=True)
    provider_response: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    initiated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))


class PaymentSecurityNonce(Base):
    """
    Corresponds to public.payment_security_nonces.
    Prevents replay attacks within a strict time-window.
    """
    __tablename__ = "payment_security_nonces"

    nonce: Mapped[str] = mapped_column(Text, primary_key=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(index=True)
    timestamp: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


class PaymentWebhookLog(Base, UUIDMixin):
    """
    Corresponds to public.payment_webhook_logs.
    Audit log of all inbound payment webhook callbacks.
    """
    __tablename__ = "payment_webhook_logs"

    provider: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    provider_transaction_id: Mapped[Optional[str]] = mapped_column(Text, index=True)
    signature_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    idempotency_key: Mapped[Optional[str]] = mapped_column(Text, unique=True, index=True)
    payload_hash: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, default="received", index=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)
    client_ip: Mapped[Optional[str]] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    processed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))

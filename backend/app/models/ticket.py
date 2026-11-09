"""
Ticket and TicketScan Domain Models.
Supports offline-capable, tamper-proof e-tickets with Ed25519 cryptographic signatures.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Ticket(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.tickets."""
    __tablename__ = "tickets"

    booking_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True
    )
    passenger_name: Mapped[str] = mapped_column(Text, nullable=False)
    service_type: Mapped[str] = mapped_column(Text, nullable=False)
    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    seat: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False, index=True)
    signature: Mapped[str] = mapped_column(Text, nullable=False)

    scans: Mapped[List["TicketScan"]] = relationship(
        "TicketScan", back_populates="ticket", cascade="all, delete-orphan"
    )


class TicketScan(Base, UUIDMixin):
    """Corresponds to public.ticket_scans."""
    __tablename__ = "ticket_scans"

    ticket_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scanned_by: Mapped[Optional[uuid.UUID]] = mapped_column(index=True, nullable=True)
    scanner_device_id: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    result: Mapped[str] = mapped_column(Text, nullable=False)
    scanned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    synced_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True
    )

    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="scans")

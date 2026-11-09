"""
Price Alerts and Route Fare Price Snapshot Models.
"""

from datetime import date, datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class PriceAlert(Base, TimestampMixin, UUIDMixin):
    """
    Corresponds to public.price_alerts.
    Stores user fare monitoring alerts with target prices or percentage drops.
    All prices are strictly maintained as integer paisa (1 BDT = 100 paisa).
    """
    __tablename__ = "price_alerts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    service_type: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        default="flight",
    )  # flight, bus, launch, train, hotel
    origin: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    date_flex_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    target_price_paisa: Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    drop_percent: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    status: Mapped[str] = mapped_column(
        Text,
        default="active",
        nullable=False,
        index=True,
    )  # active, triggered, paused, expired
    last_notified_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class PriceSnapshot(Base, UUIDMixin):
    """
    Corresponds to public.price_snapshots.
    Historical price snapshots sampled across transport routes and inventory providers.
    """
    __tablename__ = "price_snapshots"

    route_key: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    travel_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    lowest_price_paisa: Mapped[int] = mapped_column(BigInteger, nullable=False)
    source: Mapped[str] = mapped_column(Text, nullable=False, default="internal_inventory")
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

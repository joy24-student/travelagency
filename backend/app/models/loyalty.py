"""
Loyalty and Rewards Models.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class LoyaltyAccount(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.loyalty_accounts."""
    __tablename__ = "loyalty_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(unique=True, index=True, nullable=False)
    tier: Mapped[str] = mapped_column(Text, default="bronze")  # bronze, silver, gold, diamond
    points_balance: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    lifetime_points: Mapped[float] = mapped_column(Numeric(12, 2), default=0.0)
    tier_progress_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0.0)
    next_tier_threshold: Mapped[float] = mapped_column(Numeric(12, 2), default=1000.0)

    transactions: Mapped[list["LoyaltyPointsTransaction"]] = relationship(
        "LoyaltyPointsTransaction", back_populates="account", cascade="all, delete-orphan"
    )


class LoyaltyPointsTransaction(Base, UUIDMixin):
    """Corresponds to public.loyalty_points_transactions."""
    __tablename__ = "loyalty_points_transactions"

    loyalty_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("loyalty_accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    points_amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    transaction_type: Mapped[str] = mapped_column(Text, nullable=False)  # earn, redeem, bonus, adjust
    description: Mapped[Optional[str]] = mapped_column(Text)
    reference_id: Mapped[Optional[str]] = mapped_column(Text, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    account: Mapped["LoyaltyAccount"] = relationship("LoyaltyAccount", back_populates="transactions")

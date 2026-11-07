"""
AI Travel Concierge, Itinerary, and Conversation Models.
"""

import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy import DateTime, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class TripPlan(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.trip_plans."""
    __tablename__ = "trip_plans"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    destination: Mapped[str] = mapped_column(Text, nullable=False)
    start_date: Mapped[Optional[str]] = mapped_column(Text)
    end_date: Mapped[Optional[str]] = mapped_column(Text)
    duration_days: Mapped[int] = mapped_column(Integer, default=3)
    budget: Mapped[Optional[float]] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(Text, default="BDT")
    interests: Mapped[Dict[str, Any]] = mapped_column(JSON, default=list)
    itinerary_data: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    summary: Mapped[Optional[str]] = mapped_column(Text)
    is_saved: Mapped[bool] = mapped_column(default=True)


class AiConversation(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.ai_conversations."""
    __tablename__ = "ai_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, default="Trip Planning Session")
    context: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)


class AiMessage(Base, UUIDMixin):
    """Corresponds to public.ai_messages."""
    __tablename__ = "ai_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

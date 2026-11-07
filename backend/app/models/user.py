"""
User, Agency, and Hotel Staff Models.
Maps cleanly to Supabase PostgreSQL schema.
"""

import uuid
from datetime import date, datetime
from typing import Any, Dict, Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class UserProfile(Base, TimestampMixin):
    """Corresponds to public.user_profiles."""
    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    first_name: Mapped[Optional[str]] = mapped_column(Text)
    last_name: Mapped[Optional[str]] = mapped_column(Text)
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    email: Mapped[Optional[str]] = mapped_column(Text, index=True)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    bio: Mapped[Optional[str]] = mapped_column(Text)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(Text)
    nationality: Mapped[Optional[str]] = mapped_column(Text)
    passport_number: Mapped[Optional[str]] = mapped_column(Text)
    passport_expiry: Mapped[Optional[date]] = mapped_column(Date)
    role: Mapped[str] = mapped_column(Text, default="user", nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    profile_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class AccountProfile(Base, TimestampMixin):
    """Corresponds to public.account_profiles."""
    __tablename__ = "account_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True)
    display_name: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    avatar_url: Mapped[Optional[str]] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text, default="user", nullable=False)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    profile_metadata: Mapped[Dict[str, Any]] = mapped_column("metadata", JSON, default=dict)


class AdminUser(Base, TimestampMixin):
    """Corresponds to public.admin_users."""
    __tablename__ = "admin_users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, default="admin", nullable=False)
    status: Mapped[str] = mapped_column(Text, default="active", nullable=False)
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)


class Agency(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.agencies."""
    __tablename__ = "agencies"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False, unique=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    slug: Mapped[Optional[str]] = mapped_column(Text, unique=True)
    type: Mapped[str] = mapped_column(Text, default="standard")
    email: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(Text)
    website_url: Mapped[Optional[str]] = mapped_column(Text)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    description: Mapped[Optional[str]] = mapped_column(Text)
    address: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    settings: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    verification_status: Mapped[str] = mapped_column(Text, default="pending")
    status: Mapped[str] = mapped_column(Text, default="active")
    rating: Mapped[float] = mapped_column(Numeric(3, 2), default=0.0)

    team_members: Mapped[list["AgencyTeamMember"]] = relationship("AgencyTeamMember", back_populates="agency")


class AgencyTeamMember(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.agency_team_members."""
    __tablename__ = "agency_team_members"

    agency_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("agencies.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, default="staff")
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)
    status: Mapped[str] = mapped_column(Text, default="active")

    agency: Mapped["Agency"] = relationship("Agency", back_populates="team_members")


class HotelStaff(Base, TimestampMixin, UUIDMixin):
    """Corresponds to public.hotel_staff."""
    __tablename__ = "hotel_staff"

    hotel_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("hotels.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(index=True, nullable=False)
    role: Mapped[str] = mapped_column(Text, default="front_desk")
    status: Mapped[str] = mapped_column(Text, default="active")
    permissions: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict)

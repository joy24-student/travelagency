"""
User and Security Authentication Schemas.
"""

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserRole(str, Enum):
    USER = "user"
    CREATOR = "creator"
    PARTNER = "partner"
    AGENCY = "agency"
    HOTEL_STAFF = "hotel_staff"
    ADMIN = "admin"


class CurrentUser(BaseModel):
    """Authenticated user context resolved from Supabase JWT & DB RBAC."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: Optional[str] = None
    role: UserRole = UserRole.USER
    roles: List[str] = Field(default_factory=list)
    agency_id: Optional[uuid.UUID] = None
    hotel_id: Optional[uuid.UUID] = None
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "user"
    is_verified: bool = False

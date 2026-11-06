"""
Pydantic v2 schemas for Users, Authentication, and RBAC contexts.
"""

import uuid
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import EmailStr, Field

from app.schemas.common import BaseSchema


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"
    AGENCY = "agency"
    HOTEL_STAFF = "hotel_staff"
    CREATOR = "creator"
    PARTNER = "partner"


class CurrentUser(BaseSchema):
    """Authenticated user context resolved from JWT and DB."""
    id: uuid.UUID
    email: Optional[str] = None
    role: UserRole = UserRole.USER
    roles: List[str] = Field(default_factory=list)
    agency_id: Optional[uuid.UUID] = None
    is_active: bool = True
    metadata: Dict[str, Any] = Field(default_factory=dict)


class UserProfileResponse(BaseSchema):
    id: uuid.UUID
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_verified: bool

"""
FastAPI Dependencies: Database Sessions, Redis, Supabase Zero-Trust Auth & RBAC.
"""

import logging
import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.redis import get_redis
from app.core.security import decode_supabase_jwt
from app.repositories.user_repository import UserRepository
from app.schemas.user import CurrentUser, UserRole

# HTTP Bearer scheme
security_bearer = HTTPBearer(auto_error=False)
logger = logging.getLogger(__name__)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Validate Supabase JWT from Bearer Authorization header and resolve RBAC context.
    Enforces Zero-Trust claim verification and database-backed permission validation.
    """
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Missing Authorization Bearer token")

    payload = await decode_supabase_jwt(credentials.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Token missing valid subject identifier ('sub')")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Token subject is not a valid UUID")

    email = payload.get("email")
    app_metadata = payload.get("app_metadata", {})
    user_metadata = payload.get("user_metadata", {})

    roles = []
    base_role = app_metadata.get("role") or user_metadata.get("role") or "user"
    roles.append(base_role)

    user_repo = UserRepository(db)

    # 1. Admin Verification
    is_admin = await user_repo.is_admin(user_uuid)
    if is_admin:
        roles.append(UserRole.ADMIN.value)

    # 2. Agency Association
    agency_id = await user_repo.get_user_agency_id(user_uuid)
    if agency_id:
        roles.append(UserRole.AGENCY.value)

    # 3. Hotel Staff Association
    hotel_id = await user_repo.get_user_hotel_id(user_uuid)
    if hotel_id:
        roles.append(UserRole.HOTEL_STAFF.value)

    # 4. Check user profile for extra role tags
    profile = await user_repo.get_user_profile(user_uuid)
    if profile and profile.role:
        roles.append(profile.role)

    # Resolve primary role with strict hierarchy
    if UserRole.ADMIN.value in roles or is_admin:
        primary_role = UserRole.ADMIN
    elif UserRole.AGENCY.value in roles or agency_id:
        primary_role = UserRole.AGENCY
    elif UserRole.HOTEL_STAFF.value in roles or hotel_id:
        primary_role = UserRole.HOTEL_STAFF
    elif UserRole.CREATOR.value in roles:
        primary_role = UserRole.CREATOR
    elif UserRole.PARTNER.value in roles:
        primary_role = UserRole.PARTNER
    else:
        primary_role = UserRole.USER

    return CurrentUser(
        id=user_uuid,
        email=email,
        role=primary_role,
        roles=list(set(roles)),
        agency_id=agency_id,
        hotel_id=hotel_id,
        is_active=True,
        metadata={**user_metadata, **app_metadata},
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[CurrentUser]:
    """Optional user dependency for public endpoints with personalized experiences."""
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except AuthenticationError:
        # User provided an explicit token that is invalid or expired.
        # Do NOT silently downgrade to anonymous - re-raise so client knows session expired.
        raise
    except Exception as exc:
        logger.warning(f"Unexpected non-auth exception during optional user lookup: {exc}", exc_info=True)
        return None


# RBAC Role Guards
def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current authenticated user has Administrator privileges."""
    if current_user.role != UserRole.ADMIN and UserRole.ADMIN.value not in current_user.roles:
        raise PermissionDeniedError("Administrator privileges required for this endpoint")
    return current_user


def require_agency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current user belongs to a registered Agency or is an Admin."""
    is_agency = (
        current_user.role in (UserRole.AGENCY, UserRole.ADMIN)
        or current_user.agency_id is not None
        or UserRole.AGENCY.value in current_user.roles
    )
    if not is_agency:
        raise PermissionDeniedError("Agency partner access required for this operation")
    return current_user


def require_hotel_staff(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current user is Hotel Staff, Hotel Manager, or Admin."""
    is_staff = (
        current_user.role in (UserRole.HOTEL_STAFF, UserRole.ADMIN, UserRole.AGENCY)
        or current_user.hotel_id is not None
        or UserRole.HOTEL_STAFF.value in current_user.roles
        or "hotel_staff" in current_user.roles
    )
    if not is_staff:
        raise PermissionDeniedError("Hotel staff or management access required")
    return current_user

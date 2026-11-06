"""
FastAPI Dependencies: Database Sessions, Redis, Supabase Authentication & RBAC.
"""

import uuid
from typing import AsyncGenerator, Optional
from fastapi import Depends, Header, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import AuthenticationError, PermissionDeniedError
from app.core.redis import get_redis
from app.core.security import decode_supabase_jwt
from app.models.user import AccountProfile, AdminUser, Agency, AgencyTeamMember, UserProfile
from app.schemas.user import CurrentUser, UserRole

# HTTP Bearer scheme
security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """
    Validate Supabase JWT from Bearer Authorization header and resolve RBAC context.
    """
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Missing Authorization Bearer token")

    payload = await decode_supabase_jwt(credentials.credentials)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Token missing valid subject identifier")

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Token subject is not a valid UUID")

    email = payload.get("email")
    app_metadata = payload.get("app_metadata", {})
    user_metadata = payload.get("user_metadata", {})

    # Start with token role claim or metadata
    roles = []
    base_role = app_metadata.get("role") or user_metadata.get("role") or "user"
    roles.append(base_role)

    # 1. Check if user is in admin_users table
    admin_stmt = select(AdminUser).where(AdminUser.user_id == user_uuid, AdminUser.status == "active")
    admin_res = await db.execute(admin_stmt)
    is_admin = admin_res.scalar_one_or_none() is not None
    if is_admin:
        roles.append(UserRole.ADMIN.value)

    # 2. Check if user belongs to an Agency (owner or team member)
    agency_id: Optional[uuid.UUID] = None
    agency_owner_stmt = select(Agency.id).where(Agency.owner_user_id == user_uuid, Agency.status == "active")
    agency_owner_res = await db.execute(agency_owner_stmt)
    owned_agency_id = agency_owner_res.scalar_one_or_none()

    if owned_agency_id:
        agency_id = owned_agency_id
        roles.append(UserRole.AGENCY.value)
    else:
        # Check team member
        member_stmt = select(AgencyTeamMember.agency_id).where(
            AgencyTeamMember.user_id == user_uuid, AgencyTeamMember.status == "active"
        )
        member_res = await db.execute(member_stmt)
        member_agency_id = member_res.scalar_one_or_none()
        if member_agency_id:
            agency_id = member_agency_id
            roles.append(UserRole.AGENCY.value)

    # 3. Check account_profiles / user_profiles table for roles like hotel_staff
    profile_stmt = select(UserProfile.role).where(UserProfile.id == user_uuid)
    profile_res = await db.execute(profile_stmt)
    profile_role = profile_res.scalar_one_or_none()
    if profile_role:
        roles.append(profile_role)

    # Determine highest priority primary role
    if UserRole.ADMIN.value in roles or is_admin:
        primary_role = UserRole.ADMIN
    elif UserRole.AGENCY.value in roles or agency_id:
        primary_role = UserRole.AGENCY
    elif UserRole.HOTEL_STAFF.value in roles or "hotel_staff" in roles:
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
        is_active=True,
        metadata={**user_metadata, **app_metadata},
    )


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> Optional[CurrentUser]:
    """
    Optional user dependency for public endpoints that offer personalization when logged in.
    """
    if not credentials or not credentials.credentials:
        return None
    try:
        return await get_current_user(credentials=credentials, db=db)
    except Exception:
        return None


# RBAC Role Requirements
def require_admin(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current authenticated user has Administrator privileges."""
    if current_user.role != UserRole.ADMIN and UserRole.ADMIN.value not in current_user.roles:
        raise PermissionDeniedError("Administrator privileges required for this endpoint")
    return current_user


def require_agency(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current user is an Agency owner, manager, or Administrator."""
    is_agency = (
        current_user.role in (UserRole.AGENCY, UserRole.ADMIN)
        or current_user.agency_id is not None
        or UserRole.AGENCY.value in current_user.roles
    )
    if not is_agency:
        raise PermissionDeniedError("Agency partner access required for this operation")
    return current_user


def require_hotel_staff(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Enforces that the current user is Hotel Staff, Hotel Partner, or Administrator."""
    is_staff = (
        current_user.role in (UserRole.HOTEL_STAFF, UserRole.ADMIN, UserRole.AGENCY)
        or "hotel_staff" in current_user.roles
        or "hotel_manager" in current_user.roles
    )
    if not is_staff:
        raise PermissionDeniedError("Hotel staff or management access required")
    return current_user

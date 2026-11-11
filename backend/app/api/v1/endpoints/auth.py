"""
Authentication and Identity Verification Endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, security_bearer
from app.core.database import get_db
from app.core.security import decode_supabase_jwt
from app.models.user import UserProfile
from app.schemas.common import StandardResponse
from app.schemas.user import CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


class CheckEmailRequest(BaseModel):
    email: EmailStr


class CheckEmailResponse(BaseModel):
    exists: bool
    email: str


@router.post("/check-email", response_model=StandardResponse[CheckEmailResponse])
async def check_email_exists(
    req: CheckEmailRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Check if an email is registered without triggering Supabase Auth brute-force
    or rate limit counters. Returns clean boolean existence indicator.
    """
    clean_email = req.email.strip().lower()

    # 1. Check user_profiles table
    stmt = select(UserProfile.id).where(UserProfile.email.ilike(clean_email))
    res = await db.execute(stmt)
    found = res.scalar_one_or_none() is not None

    # 2. Check auth.users directly if database allows
    if not found:
        try:
            auth_stmt = text("SELECT 1 FROM auth.users WHERE LOWER(email) = :email LIMIT 1")
            auth_res = await db.execute(auth_stmt, {"email": clean_email})
            found = auth_res.scalar_one_or_none() is not None
        except Exception:
            pass

    return StandardResponse[CheckEmailResponse](
        success=True,
        message="Email status resolved successfully",
        data=CheckEmailResponse(exists=found, email=clean_email),
    )


@router.get("/me", response_model=StandardResponse[CurrentUser])
async def get_current_user_profile(
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Retrieve authenticated user profile, resolved roles, and agency/hotel associations.
    """
    return StandardResponse[CurrentUser](
        success=True,
        message="User identity resolved successfully",
        data=current_user,
    )


@router.get("/inspect-claims", response_model=StandardResponse[dict])
async def inspect_jwt_claims(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    current_user: CurrentUser = Depends(get_current_user),
):
    """
    Introspect verified Supabase JWT claims, audiences, and resolved RBAC security context.
    Essential for Zero-Trust auditing and mobile SDK client debugging.
    """
    raw_claims = {}
    if credentials and credentials.credentials:
        raw_claims = await decode_supabase_jwt(credentials.credentials)

    return StandardResponse[dict](
        success=True,
        message="JWT claims successfully inspected and verified",
        data={
            "subject": str(current_user.id),
            "email": current_user.email,
            "resolved_role": current_user.role.value,
            "all_roles": current_user.roles,
            "agency_id": str(current_user.agency_id) if current_user.agency_id else None,
            "hotel_id": str(current_user.hotel_id) if current_user.hotel_id else None,
            "token_issuer": raw_claims.get("iss"),
            "token_audience": raw_claims.get("aud"),
            "token_expiration": raw_claims.get("exp"),
            "app_metadata": raw_claims.get("app_metadata", {}),
            "user_metadata": raw_claims.get("user_metadata", {}),
        },
    )

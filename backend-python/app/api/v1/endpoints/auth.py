"""
Authentication and Identity Verification Endpoints.
"""

from typing import Optional
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps import get_current_user, security_bearer
from app.core.security import decode_supabase_jwt
from app.schemas.common import StandardResponse
from app.schemas.user import CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication & Identity"])


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

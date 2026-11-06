"""
Authentication and Current User Profile Endpoints.
"""

from fastapi import APIRouter, Depends

from app.api.deps import get_current_user, require_admin, require_agency, require_hotel_staff
from app.schemas.user import CurrentUser

router = APIRouter(prefix="/auth", tags=["Authentication & RBAC"])


@router.get("/me", response_model=CurrentUser, summary="Get Current Authenticated User Context")
async def get_me(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    """Returns the validated JWT claims, roles, and agency links for the current user."""
    return current_user


@router.get("/verify-admin", response_model=CurrentUser, summary="Verify Administrator Access")
async def verify_admin(current_user: CurrentUser = Depends(require_admin)) -> CurrentUser:
    """Protected endpoint accessible only by Administrators."""
    return current_user


@router.get("/verify-agency", response_model=CurrentUser, summary="Verify Agency Partner Access")
async def verify_agency(current_user: CurrentUser = Depends(require_agency)) -> CurrentUser:
    """Protected endpoint accessible by Travel Agency managers, owners, and Administrators."""
    return current_user


@router.get("/verify-hotel-staff", response_model=CurrentUser, summary="Verify Hotel Staff Access")
async def verify_hotel_staff(current_user: CurrentUser = Depends(require_hotel_staff)) -> CurrentUser:
    """Protected endpoint accessible by Hotel Staff, Managers, and Administrators."""
    return current_user

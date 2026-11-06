"""
AI Travel Concierge API Endpoints powered by Google Gemini API.
"""

from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_optional_user
from app.schemas.ai import PlanTripRequest, StructuredTripPlan
from app.schemas.user import CurrentUser
from app.services.gemini_service import GeminiConciergeService

router = APIRouter(prefix="/ai", tags=["AI Travel Concierge"])


@router.post(
    "/plan-trip",
    response_model=StructuredTripPlan,
    status_code=status.HTTP_200_OK,
    summary="Generate Structured Travel Itinerary with Google Gemini",
)
async def plan_trip(
    request: PlanTripRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
) -> StructuredTripPlan:
    """
    Generate an intelligent, day-by-day structured itinerary and itemized budget breakdown
    using Google Gemini API (gemini-3.8-flash via google-genai SDK).
    Optionally saves the generated plan to the user's trip_plans table if authenticated.
    """
    user_id = current_user.id if current_user else None

    itinerary = await GeminiConciergeService.generate_itinerary(
        db=db,
        request=request,
        user_id=user_id,
    )
    return itinerary

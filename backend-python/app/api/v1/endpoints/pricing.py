"""
Dynamic Pricing and Fare Surge API Endpoints.
Allows mobile and web clients to retrieve real-time fair surge quotes,
transparent breakdowns, and verify 15-minute price guarantees.
"""

from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, status

from app.schemas.common import StandardResponse
from app.schemas.surge import (
    SurgeCalculationRequest,
    SurgeQuoteResponse,
    VerifyQuoteRequest,
    VerifyQuoteResponse,
)
from app.services.surge_service import SurgePricingService

router = APIRouter(prefix="/pricing", tags=["Dynamic Pricing & Demand Elasticity"])


@router.post(
    "/surge-quote",
    response_model=StandardResponse[SurgeQuoteResponse],
    summary="Calculate Fair Dynamic Pricing Quote",
    description=(
        "Calculates real-time demand elasticity multiplier for bus seats, launch cabins, "
        "and holiday stays. Strictly enforces fair price ceiling (max 1.25x), "
        "transparent explanations, and provides a 15-minute price lock token."
    ),
)
async def calculate_surge_quote(payload: SurgeCalculationRequest) -> StandardResponse[SurgeQuoteResponse]:
    quote = SurgePricingService.calculate_surge_quote(payload)
    return StandardResponse(
        success=True,
        message="Dynamic fair price quote generated successfully with 15-minute price guarantee.",
        data=quote,
    )


@router.post(
    "/verify-quote",
    response_model=StandardResponse[VerifyQuoteResponse],
    summary="Verify Price Lock Guarantee",
    description="Validates that a 15-minute locked price quote has not expired and has not been tampered with.",
)
async def verify_quote(
    payload: VerifyQuoteRequest,
    expires_at: datetime = Query(..., description="ISO 8601 timestamp of quote expiration"),
) -> StandardResponse[VerifyQuoteResponse]:
    result = SurgePricingService.verify_quote(
        quote_id=payload.quote_id,
        signature=payload.signature,
        product_id=payload.product_id,
        final_price=payload.final_price,
        expires_at=expires_at,
    )
    return StandardResponse(
        success=result.valid and not result.is_expired,
        message=result.message,
        data=result,
    )

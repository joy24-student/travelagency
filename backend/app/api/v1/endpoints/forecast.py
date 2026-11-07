"""
Price Forecasting and Predictive Analytics Endpoints.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.rate_limit import limiter
from app.schemas.common import StandardResponse
from app.services.price_forecast import (
    PriceForecastRequest,
    PriceForecastResult,
    PriceForecastService,
)

router = APIRouter(prefix="/forecast", tags=["Price Forecasting & Predictive Analytics"])


@router.post("/predict", response_model=StandardResponse[PriceForecastResult])
@limiter.limit("60/minute")
async def predict_price_trend(
    request: Request,
    forecast_request: PriceForecastRequest,
):
    """
    Predict price fluctuations over next 14 days with confidence intervals and BUY_NOW/WAIT advice.
    """
    result = PriceForecastService.predict(forecast_request)
    return StandardResponse[PriceForecastResult](
        success=True,
        message="Price forecast successfully generated",
        data=result,
    )


@router.get("/flight/{flight_id}", response_model=StandardResponse[PriceForecastResult])
@limiter.limit("60/minute")
async def get_flight_price_forecast(
    request: Request,
    flight_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Compute 14-day flight fare forecast based on current route pricing, seat occupancy, and velocity.
    """
    result = await PriceForecastService.forecast_flight_by_id(db=db, flight_id=flight_id)
    return StandardResponse[PriceForecastResult](
        success=True,
        message="Flight price forecast retrieved",
        data=result,
    )


@router.get("/hotel/{hotel_id}", response_model=StandardResponse[PriceForecastResult])
@limiter.limit("60/minute")
async def get_hotel_price_forecast(
    request: Request,
    hotel_id: uuid.UUID,
    room_id: Optional[uuid.UUID] = Query(None, description="Optional specific hotel room ID"),
    db: AsyncSession = Depends(get_db),
):
    """
    Compute 14-day hotel room price forecast using room inventory velocity and seasonality.
    """
    result = await PriceForecastService.forecast_hotel_by_id(db=db, hotel_id=hotel_id, room_id=room_id)
    return StandardResponse[PriceForecastResult](
        success=True,
        message="Hotel price forecast retrieved",
        data=result,
    )

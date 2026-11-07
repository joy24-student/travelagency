"""
Unit and Integration Tests for Price Forecasting & Predictive Analytics Service.
"""

import uuid
from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.flight import Airline, Airport, Flight
from app.models.hotel import Hotel, HotelRoom
from app.services.price_forecast import (
    ConfidenceIntervalEngine,
    HoltLinearSmoother,
    LinearTrendRegressor,
    OccupancyVelocityModel,
    PriceForecastRequest,
    PriceForecastResult,
    PriceForecastService,
    RecommendationHeuristicEngine,
    RecommendationVerdict,
)
import numpy as np


def test_holt_linear_smoother():
    """Verify double exponential smoothing tracks trend and dampens correctly."""
    series = np.array([100.0, 102.0, 105.0, 107.0, 110.0, 114.0, 118.0])
    smoother = HoltLinearSmoother(alpha=0.4, beta=0.2, phi=0.95)
    forecasts, sigma_e, level, trend = smoother.fit_and_forecast(series, horizon=14)

    assert len(forecasts) == 14
    assert forecasts[0] > series[-1]  # Upward trend continuation
    assert sigma_e > 0.0
    # Damping test: increment between successive steps should decrease
    inc1 = forecasts[1] - forecasts[0]
    inc13 = forecasts[13] - forecasts[12]
    assert inc13 < inc1


def test_linear_trend_regressor():
    """Verify OLS regression calculates accurate slope and projections."""
    series = np.array([500.0, 520.0, 540.0, 560.0, 580.0])
    forecasts, slope, reg_std = LinearTrendRegressor.fit_and_forecast(series, horizon=14)

    assert len(forecasts) == 14
    assert pytest.approx(slope, abs=0.1) == 20.0
    assert pytest.approx(forecasts[0], abs=0.1) == 600.0


def test_occupancy_velocity_model_surge():
    """Verify rapid occupancy depletion drives dynamic pricing surge."""
    mults = OccupancyVelocityModel.calculate_multipliers(
        base_occupancy=0.85,
        occupancy_velocity=0.035,
        days_to_departure=5,
        horizon=14,
        is_flight=True,
    )
    assert len(mults) == 14
    assert all(m >= 1.0 for m in mults)
    # Multiplier should grow over the horizon as remaining seats deplete
    assert mults[-1] > mults[0]


def test_occupancy_velocity_model_distress_discount():
    """Verify low occupancy and stagnant booking paces trigger promotional markdown."""
    mults = OccupancyVelocityModel.calculate_multipliers(
        base_occupancy=0.20,
        occupancy_velocity=0.002,
        days_to_departure=7,
        horizon=14,
        is_flight=True,
    )
    assert len(mults) == 14
    # Distress inventory should allow lower dynamic multipliers
    assert any(m < 1.0 for m in mults)


def test_confidence_interval_expansion():
    """Verify 95% confidence intervals envelope point forecasts and expand with horizon."""
    point_forecasts = np.linspace(6000.0, 7500.0, 14)
    lower, upper, uncertainties = ConfidenceIntervalEngine.calculate_intervals(
        point_forecasts=point_forecasts,
        current_price=6000.0,
        sigma_e=120.0,
        z_score=1.96,
    )

    for i in range(14):
        assert lower[i] < point_forecasts[i] < upper[i]
        assert uncertainties[i] > 0.0

    # Uncertainty should expand as horizon increases
    assert uncertainties[-1] > uncertainties[0]


def test_deterministic_heuristic_buy_now():
    """Verify surge >15% yields BUY_NOW."""
    # Create point forecast with >15% surge
    forecasts = np.array([5100, 5200, 5400, 5600, 5800, 6000, 6200, 6300, 6400, 6500, 6600, 6700, 6800, 7000])
    verdict, reason, best_wait, low_p, high_d, high_p = RecommendationHeuristicEngine.evaluate(
        current_price=5000.0,
        point_forecasts=forecasts,
        occupancy_rate=0.75,
        occupancy_velocity=0.03,
        trend_slope=120.0,
        confidence_score=0.88,
        is_flight=True,
    )
    assert verdict == RecommendationVerdict.BUY_NOW
    assert "Book now" in reason or "surge" in reason.lower()
    assert best_wait == 0


def test_deterministic_heuristic_wait():
    """Verify expected price drop yields WAIT."""
    forecasts = np.array([4900, 4800, 4650, 4600, 4700, 4750, 4800, 4850, 4900, 4950, 5000, 5050, 5100, 5150])
    verdict, reason, best_wait, low_p, high_d, high_p = RecommendationHeuristicEngine.evaluate(
        current_price=5000.0,
        point_forecasts=forecasts,
        occupancy_rate=0.40,
        occupancy_velocity=0.005,
        trend_slope=-20.0,
        confidence_score=0.85,
        is_flight=True,
    )
    assert verdict == RecommendationVerdict.WAIT
    assert best_wait > 0
    assert "Wait" in reason or "drop" in reason.lower()


def test_deterministic_heuristic_stable():
    """Verify flat price fluctuation yields STABLE."""
    forecasts = np.array([5010, 5020, 5005, 5030, 5015, 5025, 5010, 5020, 5035, 5020, 5015, 5030, 5020, 5025])
    verdict, reason, best_wait, low_p, high_d, high_p = RecommendationHeuristicEngine.evaluate(
        current_price=5000.0,
        point_forecasts=forecasts,
        occupancy_rate=0.55,
        occupancy_velocity=0.008,
        trend_slope=1.0,
        confidence_score=0.92,
        is_flight=True,
    )
    assert verdict == RecommendationVerdict.STABLE
    assert "stable" in reason.lower()


@pytest.mark.asyncio
async def test_forecast_flight_db_integration(db_session: AsyncSession):
    """Integration test with mocked database Flight record."""
    # Seed airline, airports, and flight
    airline = Airline(code="BS", name="US-Bangla Airlines", country="Bangladesh")
    db_session.add(airline)
    await db_session.flush()

    origin = Airport(code="DAC", name="Hazrat Shahjalal Intl", city="Dhaka")
    dest = Airport(code="CXB", name="Cox's Bazar Airport", city="Cox's Bazar")
    db_session.add_all([origin, dest])
    await db_session.flush()

    flight = Flight(
        flight_number="BS-141",
        airline_id=airline.id,
        origin_airport_id=origin.id,
        destination_airport_id=dest.id,
        departure_time=datetime.now(timezone.utc) + timedelta(days=12),
        arrival_time=datetime.now(timezone.utc) + timedelta(days=12, hours=1),
        duration_minutes=60,
        base_price=4800.00,
        currency="BDT",
        total_seats=180,
        available_seats=45,  # 75% occupied
        status="scheduled",
    )
    db_session.add(flight)
    await db_session.commit()

    # Call service
    result = await PriceForecastService.forecast_flight_by_id(db_session, flight.id)
    assert isinstance(result, PriceForecastResult)
    assert result.current_price == 4800.00
    assert result.item_id == str(flight.id)
    assert len(result.daily_forecasts) == 14
    assert result.verdict in [RecommendationVerdict.BUY_NOW, RecommendationVerdict.WAIT, RecommendationVerdict.STABLE]


@pytest.mark.asyncio
async def test_forecast_hotel_db_integration(db_session: AsyncSession):
    """Integration test with database Hotel record."""
    hotel = Hotel(
        name="Sayeman Beach Resort",
        city="Cox's Bazar",
        country="Bangladesh",
        star_rating=5,
        review_score=4.8,
    )
    db_session.add(hotel)
    await db_session.flush()

    room = HotelRoom(
        hotel_id=hotel.id,
        name="Ocean View Deluxe",
        room_type="deluxe",
        base_price_per_night=8500.00,
        currency="BDT",
        is_available=True,
    )
    db_session.add(room)
    await db_session.commit()

    result = await PriceForecastService.forecast_hotel_by_id(db_session, hotel.id)
    assert isinstance(result, PriceForecastResult)
    assert result.current_price == 8500.00
    assert result.item_id == str(hotel.id)
    assert len(result.daily_forecasts) == 14

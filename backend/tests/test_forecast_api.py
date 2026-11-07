"""
FastAPI End-to-End Endpoint Tests for Price Forecasting.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_predict_endpoint_buy_now():
    """Test POST /api/v1/forecast/predict with surge inputs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "item_type": "flight",
            "current_price": 5500.0,
            "currency": "BDT",
            "total_capacity": 180,
            "available_capacity": 25,
            "occupancy_velocity": 0.045,
            "days_to_departure": 5,
        }
        res = await client.post("/api/v1/forecast/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        forecast = data["data"]
        assert forecast["verdict"] == "BUY_NOW"
        assert len(forecast["daily_forecasts"]) == 14
        assert forecast["current_price"] == 5500.0
        assert forecast["lowest_predicted_price"] > 0
        assert forecast["highest_predicted_price"] >= forecast["current_price"]


@pytest.mark.asyncio
async def test_predict_endpoint_wait_for_drop():
    """Test POST /api/v1/forecast/predict with price drop inputs."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "item_type": "flight",
            "current_price": 12000.0,
            "currency": "BDT",
            "historical_prices": [12500, 12400, 12300, 12200, 12100, 12000],
            "total_capacity": 180,
            "available_capacity": 140,
            "occupancy_velocity": 0.002,
            "days_to_departure": 12,
        }
        res = await client.post("/api/v1/forecast/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        forecast = data["data"]
        assert forecast["verdict"] == "WAIT"
        assert forecast["best_time_to_book_days"] > 0
        assert "drop" in forecast["recommendation_reason"].lower() or "wait" in forecast["recommendation_reason"].lower()


@pytest.mark.asyncio
async def test_predict_endpoint_stable():
    """Test POST /api/v1/forecast/predict with stable pricing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "item_type": "hotel",
            "current_price": 4500.0,
            "currency": "BDT",
            "historical_prices": [4500, 4510, 4490, 4505, 4500],
            "total_capacity": 30,
            "available_capacity": 15,
            "occupancy_velocity": 0.005,
            "days_to_departure": 35,
        }
        res = await client.post("/api/v1/forecast/predict", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        forecast = data["data"]
        assert forecast["verdict"] == "STABLE"
        assert "stable" in forecast["recommendation_reason"].lower()

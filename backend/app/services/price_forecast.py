"""
Predictive Analytics & Time-Series Price Forecasting Engine.
Shopno Jatra Aviation and Hospitality Revenue Intelligence.

Features:
1. Double Exponential Smoothing (Holt's Linear Trend with Damping) & Regression Ensemble.
2. Seat / Room Occupancy Velocity & Dynamic Pricing Elasticity Adjustments.
3. Expanding Horizon 95% Confidence Intervals & Uncertainty Quantification.
4. Deterministic Recommendation Heuristic: BUY_NOW (>15% surge expected), WAIT (drop likely), STABLE.
"""

import math
import uuid
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.flight import Flight, FlightSeat
from app.models.hotel import Hotel, HotelRoom, HotelRoomAvailability


class RecommendationVerdict(str, Enum):
    BUY_NOW = "BUY_NOW"
    WAIT = "WAIT"
    STABLE = "STABLE"


class DailyForecastPoint(BaseModel):
    day: int = Field(..., ge=1, le=14, description="Forecast step in days (1 to 14)")
    date: str = Field(..., description="Target calendar date YYYY-MM-DD")
    predicted_price: float = Field(..., description="Expected price point in currency units")
    lower_bound: float = Field(..., description="95% Confidence Interval lower bound")
    upper_bound: float = Field(..., description="95% Confidence Interval upper bound")
    uncertainty: float = Field(..., ge=0.0, description="Relative prediction interval uncertainty metric")
    predicted_change_percent: float = Field(..., description="Percentage change from current base price")


class PriceForecastResult(BaseModel):
    item_id: Optional[str] = Field(None, description="UUID or identifier of the flight or hotel")
    item_type: str = Field("flight", description="'flight' | 'hotel' | 'general'")
    currency: str = Field("BDT", description="Pricing currency")
    current_price: float = Field(..., description="Current observed base price")
    verdict: RecommendationVerdict = Field(..., description="Deterministic advice: BUY_NOW, WAIT, or STABLE")
    recommendation_reason: str = Field(..., description="Detailed algorithmic explanation of the decision")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score [0.0 - 1.0]")
    uncertainty_metric: float = Field(..., ge=0.0, description="Average uncertainty index over 14-day horizon")
    predicted_change_percent: float = Field(..., description="Projected peak/target change % relative to current")
    lowest_predicted_price: float = Field(..., description="Minimum projected price within 14-day window")
    lowest_price_day: int = Field(..., ge=1, le=14, description="Day index of lowest price")
    highest_predicted_price: float = Field(..., description="Maximum projected price within 14-day window")
    highest_price_day: int = Field(..., ge=1, le=14, description="Day index of highest price")
    best_time_to_book_days: int = Field(..., description="Recommended days to wait before booking (0 = immediate)")
    occupancy_rate: float = Field(..., ge=0.0, le=1.0, description="Current occupancy ratio [0.0 - 1.0]")
    occupancy_velocity: float = Field(..., description="Occupancy velocity (% seats/rooms booked per day)")
    historical_trend_slope: float = Field(..., description="Estimated linear trend slope per day")
    daily_forecasts: List[DailyForecastPoint] = Field(..., description="14-day daily forecast trajectory")


class PriceForecastRequest(BaseModel):
    item_id: Optional[str] = None
    item_type: str = Field("flight", description="'flight' | 'hotel'")
    current_price: float = Field(..., gt=0, description="Current price")
    currency: str = Field("BDT", description="Currency code")
    historical_prices: Optional[List[float]] = Field(None, description="Past daily prices (e.g. past 7-30 days)")
    total_capacity: Optional[int] = Field(180, gt=0, description="Total seat or room capacity")
    available_capacity: Optional[int] = Field(60, ge=0, description="Available seats or rooms")
    occupancy_velocity: Optional[float] = Field(None, description="Rate of occupancy depletion per day (e.g. 0.03 = 3%/day)")
    days_to_departure: Optional[int] = Field(21, ge=1, description="Days remaining until departure or check-in")


# ============================================================================
# Time-Series Forecasting Pipeline Classes
# ============================================================================

class HoltLinearSmoother:
    """
    Double Exponential Smoothing with Trend Damping (Gardner & McKenzie).
    Tracks level and trend while dampening explosive projections over 14 days.
    """

    def __init__(self, alpha: float = 0.35, beta: float = 0.15, phi: float = 0.95):
        """
        :param alpha: Level smoothing parameter (0 < alpha < 1)
        :param beta: Trend smoothing parameter (0 < beta < 1)
        :param phi: Trend damping parameter (0 < phi <= 1)
        """
        self.alpha = alpha
        self.beta = beta
        self.phi = phi

    def fit_and_forecast(
        self, series: np.ndarray, horizon: int = 14
    ) -> Tuple[np.ndarray, float, float, float]:
        """
        Fits Holt's linear trend with damping and generates multi-step forecasts.
        Returns:
            - forecasts (horizon,)
            - residual_std (sigma_e)
            - final_level (l_T)
            - final_trend (b_T)
        """
        n = len(series)
        if n < 2:
            base_val = float(series[0]) if n == 1 else 1000.0
            return np.full(horizon, base_val), base_val * 0.03, base_val, 0.0

        # Initialization
        level = float(series[0])
        trend = float(series[1] - series[0]) if n > 1 else 0.0
        residuals = []

        for t in range(1, n):
            y_t = series[t]
            pred = level + self.phi * trend
            residual = y_t - pred
            residuals.append(residual)

            new_level = self.alpha * y_t + (1 - self.alpha) * (level + self.phi * trend)
            new_trend = self.beta * (new_level - level) + (1 - self.beta) * self.phi * trend
            level = new_level
            trend = new_trend

        # Residual Standard Error (degrees of freedom n - 2)
        if len(residuals) > 1:
            sigma_e = float(np.std(residuals, ddof=1))
        else:
            sigma_e = float(abs(residuals[0])) if residuals else level * 0.03

        # Guard against zero variance in synthetic or flat data
        sigma_e = max(sigma_e, level * 0.02)

        # Generate h-step ahead forecasts anchored on the current actual observed price
        forecasts = np.zeros(horizon, dtype=float)
        cumulative_damping = 0.0
        anchor_level = float(series[-1])
        for h in range(1, horizon + 1):
            cumulative_damping += self.phi ** h
            forecasts[h - 1] = anchor_level + cumulative_damping * trend

        return forecasts, sigma_e, level, trend


class LinearTrendRegressor:
    """
    Ordinary Least Squares (OLS) Regression over the historical time indices.
    Used in ensemble with Holt-Winters to provide robust linear drift stabilization.
    """

    @staticmethod
    def fit_and_forecast(series: np.ndarray, horizon: int = 14) -> Tuple[np.ndarray, float, float]:
        """
        Returns:
            - forecasts (horizon,)
            - slope (drift per day)
            - reg_std (residual standard deviation)
        """
        n = len(series)
        if n < 2:
            val = float(series[0]) if n == 1 else 1000.0
            return np.full(horizon, val), 0.0, val * 0.03

        x = np.arange(n, dtype=float)
        # OLS slope and intercept
        x_mean = np.mean(x)
        y_mean = np.mean(series)
        numerator = np.sum((x - x_mean) * (series - y_mean))
        denominator = np.sum((x - x_mean) ** 2)

        slope = numerator / denominator if denominator != 0 else 0.0
        intercept = y_mean - slope * x_mean

        in_sample_preds = intercept + slope * x
        residuals = series - in_sample_preds
        reg_std = float(np.std(residuals, ddof=1)) if n > 2 else float(np.std(residuals))
        reg_std = max(reg_std, y_mean * 0.02)

        future_x = np.arange(n, n + horizon, dtype=float)
        forecasts = intercept + slope * future_x
        return forecasts, float(slope), float(reg_std)


class OccupancyVelocityModel:
    """
    Aviation & Hospitality Revenue Management Yield Elasticity.
    Applies non-linear dynamic pricing multipliers based on seat/room occupancy velocity.
    """

    @staticmethod
    def calculate_multipliers(
        base_occupancy: float,
        occupancy_velocity: float,
        days_to_departure: int,
        horizon: int = 14,
        is_flight: bool = True,
    ) -> np.ndarray:
        """
        Computes the daily dynamic pricing elasticity multiplier vector (horizon,).
        """
        multipliers = np.zeros(horizon, dtype=float)
        urgency_k = 2.4 if is_flight else 1.8

        for h in range(1, horizon + 1):
            # Projected occupancy as time advances
            proj_occ = min(0.99, max(0.05, base_occupancy + occupancy_velocity * h))

            # Days remaining until flight/stay at forecast day h
            rem_lead_time = max(1, days_to_departure - h)
            lead_time_urgency = math.exp(-rem_lead_time / 30.0)  # Rises as departure nears

            if occupancy_velocity > 0.015 or proj_occ > 0.75:
                # Upward surge curve: non-linear function of occupancy scarcity and velocity
                scarcity_ratio = proj_occ / (1.001 - proj_occ)
                # Calibrated surge increment
                surge = (
                    urgency_k
                    * max(0.0, occupancy_velocity)
                    * (scarcity_ratio ** 0.45)
                    * (1.0 + 0.6 * lead_time_urgency)
                    * (h / 14.0)
                )
                mult = 1.0 + surge
            elif proj_occ < 0.45 and occupancy_velocity <= 0.005 and rem_lead_time <= 14:
                # Distress inventory dynamic markdown: airlines/hotels discount to stimulate fill
                discount_potential = (0.50 - proj_occ) * 0.35 * (1.0 - rem_lead_time / 20.0)
                mult = max(0.80, 1.0 - discount_potential)
            else:
                # Moderate/organic growth
                mult = 1.0 + (occupancy_velocity * 0.5 * (h / 14.0))

            multipliers[h - 1] = float(mult)

        return multipliers


class ConfidenceIntervalEngine:
    """
    Forecast standard error expanding with horizon step h (Box-Jenkins / Hyndman variance formula).
    Computes upper and lower 95% confidence intervals and relative uncertainty metric.
    """

    @staticmethod
    def calculate_intervals(
        point_forecasts: np.ndarray,
        current_price: float,
        sigma_e: float,
        alpha: float = 0.35,
        beta: float = 0.15,
        z_score: float = 1.96,
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """
        Returns:
            - lower_bounds (horizon,)
            - upper_bounds (horizon,)
            - uncertainties (horizon,)
        """
        horizon = len(point_forecasts)
        lower_bounds = np.zeros(horizon, dtype=float)
        upper_bounds = np.zeros(horizon, dtype=float)
        uncertainties = np.zeros(horizon, dtype=float)

        var_sum = 0.0
        for h in range(1, horizon + 1):
            if h > 1:
                weight = alpha + (h - 1) * alpha * beta
                var_sum += weight ** 2

            # Expanding standard deviation of h-step forecast
            sigma_h = sigma_e * math.sqrt(1.0 + var_sum)
            # Add small horizon drift uncertainty
            sigma_h = max(sigma_h, current_price * 0.02 * math.sqrt(h))

            margin = z_score * sigma_h
            y_pred = point_forecasts[h - 1]

            # Lower bound cannot realistically drop below 20% of base fare in dynamic airline markets
            lower = max(current_price * 0.20, y_pred - margin)
            upper = y_pred + margin
            uncertainty = (upper - lower) / (2.0 * max(1.0, y_pred))

            lower_bounds[h - 1] = round(float(lower), 2)
            upper_bounds[h - 1] = round(float(upper), 2)
            uncertainties[h - 1] = round(float(uncertainty), 4)

        return lower_bounds, upper_bounds, uncertainties


class RecommendationHeuristicEngine:
    """
    Deterministic Decision Engine:
    - BUY_NOW: Price expected to surge >15%, or rapid occupancy depletion threatens availability.
    - WAIT: Price drop likely (minimum predicted < current price by >5% or soft demand discounting).
    - STABLE: Minor fluctuations within bounds (-5% to +15%).
    """

    @staticmethod
    def evaluate(
        current_price: float,
        point_forecasts: np.ndarray,
        occupancy_rate: float,
        occupancy_velocity: float,
        trend_slope: float,
        confidence_score: float,
        is_flight: bool = True,
    ) -> Tuple[RecommendationVerdict, str, int, float, int, float]:
        """
        Returns:
            - verdict (BUY_NOW | WAIT | STABLE)
            - reason (str)
            - lowest_day (1..14)
            - lowest_price (float)
            - highest_day (1..14)
            - highest_price (float)
        """
        highest_idx = int(np.argmax(point_forecasts))
        highest_price = float(point_forecasts[highest_idx])
        highest_day = highest_idx + 1

        lowest_idx = int(np.argmin(point_forecasts))
        lowest_price = float(point_forecasts[lowest_idx])
        lowest_day = lowest_idx + 1

        end_price = float(point_forecasts[-1])

        max_surge_pct = (highest_price - current_price) / current_price * 100.0
        max_drop_pct = (lowest_price - current_price) / current_price * 100.0
        final_change_pct = (end_price - current_price) / current_price * 100.0

        item_label = "flight seats" if is_flight else "hotel rooms"

        # ---------------------------------------------------------
        # Rule 1: BUY_NOW
        # 1. Price expected to surge > 15% anywhere in next 14 days
        # 2. Or occupancy > 80% with rapid velocity (>2.5%/day)
        # 3. Or steady upward trajectory with >12% end surge
        # ---------------------------------------------------------
        if max_surge_pct >= 15.0:
            verdict = RecommendationVerdict.BUY_NOW
            reason = (
                f"Price surge of +{max_surge_pct:.1f}% forecasted by Day {highest_day}. "
                f"Seat occupancy velocity ({occupancy_velocity*100:.1f}%/day) is accelerating dynamic fare buckets. "
                f"Book now to lock in the lowest guaranteed fare of {current_price:,.0f} BDT."
            )
            best_days_to_wait = 0

        elif occupancy_rate >= 0.80 and occupancy_velocity >= 0.025 and max_surge_pct >= 8.0:
            verdict = RecommendationVerdict.BUY_NOW
            reason = (
                f"High occupancy ({occupancy_rate*100:.0f}%) and rapid velocity ({occupancy_velocity*100:.1f}%/day) "
                f"indicate remaining {item_label} will sell out soon, causing an imminent +{max_surge_pct:.1f}% price hike. "
                "Immediate booking strongly recommended."
            )
            best_days_to_wait = 0

        elif final_change_pct >= 14.0 and trend_slope > 0:
            verdict = RecommendationVerdict.BUY_NOW
            reason = (
                f"Consistent upward fare trend (+{final_change_pct:.1f}% over 14 days). "
                f"Postponing will increase booking costs. Buy now before prices reach {highest_price:,.0f} BDT."
            )
            best_days_to_wait = 0

        # ---------------------------------------------------------
        # Rule 2: WAIT
        # 1. Minimum predicted price drops by >= 4.5% below current
        # 2. Or low occupancy (<45%) with stagnant booking velocity
        # ---------------------------------------------------------
        elif max_drop_pct <= -4.5 and lowest_day <= 10:
            verdict = RecommendationVerdict.WAIT
            potential_savings = current_price - lowest_price
            reason = (
                f"Price drop of {abs(max_drop_pct):.1f}% (-{potential_savings:,.0f} BDT) predicted around Day {lowest_day}. "
                f"Off-peak demand and low booking velocity suggest promotional discounting. Wait for the drop."
            )
            best_days_to_wait = lowest_day

        elif occupancy_rate < 0.45 and occupancy_velocity <= 0.008 and final_change_pct <= -2.5:
            verdict = RecommendationVerdict.WAIT
            reason = (
                f"Sluggish booking velocity ({occupancy_velocity*100:.1f}%/day) and low occupancy ({occupancy_rate*100:.0f}%) "
                "indicate impending dynamic distress fare cuts. We advise waiting for lower prices."
            )
            best_days_to_wait = min(7, lowest_day)

        # ---------------------------------------------------------
        # Rule 3: STABLE
        # Price fluctuations remain within stable corridor
        # ---------------------------------------------------------
        else:
            verdict = RecommendationVerdict.STABLE
            fluctuation_band = max(abs(max_surge_pct), abs(max_drop_pct))
            reason = (
                f"Price expected to remain stable within ±{fluctuation_band:.1f}% over the next 14 days. "
                f"Inventory pace is balanced ({occupancy_rate*100:.0f}% occupied). "
                "You can book at your convenience."
            )
            best_days_to_wait = 0 if max_surge_pct > 0 else lowest_day

        return verdict, reason, best_days_to_wait, lowest_price, highest_day, highest_price


# ============================================================================
# Main Service Class
# ============================================================================

class PriceForecastService:
    """
    Comprehensive Time-Series Price Forecasting & Analytics Service.
    Seamlessly orchestrates Holt-Winters smoothing, regression, occupancy velocity,
    confidence intervals, and deterministic recommendation heuristics.
    """

    @classmethod
    def synthesize_historical_series(
        cls,
        current_price: float,
        days: int = 21,
        occupancy_rate: float = 0.60,
        trend_direction: float = 0.0,
    ) -> np.ndarray:
        """
        Synthesizes a realistic time-series when an item is newly listed and lacks 21 days of history.
        Uses geometric Brownian motion with mean-reverting drift anchored at current_price.
        """
        np.random.seed(int(current_price * 100) % 65535)
        # Construct backwards from current price
        prices = [current_price]
        drift = -trend_direction * (current_price * 0.005)
        volatility = current_price * 0.015

        for i in range(days - 1):
            shock = np.random.normal(0, volatility)
            prev_p = max(current_price * 0.5, prices[-1] + drift + shock)
            prices.append(prev_p)

        prices.reverse()
        # Force the last element to exactly equal current_price
        prices[-1] = current_price
        return np.array(prices, dtype=float)

    @classmethod
    def execute_forecast_pipeline(
        cls,
        current_price: float,
        historical_prices: Optional[List[float]] = None,
        total_capacity: int = 180,
        available_capacity: int = 60,
        occupancy_velocity: Optional[float] = None,
        days_to_departure: int = 21,
        is_flight: bool = True,
        currency: str = "BDT",
        item_id: Optional[str] = None,
        item_type: str = "flight",
    ) -> PriceForecastResult:
        """
        Executes the entire 14-day predictive analytics forecasting pipeline.
        """
        # 1. Capacity & Occupancy Velocity Calculations
        total_cap = max(1, total_capacity)
        avail_cap = max(0, min(total_cap, available_capacity))
        occupancy_rate = (total_cap - avail_cap) / total_cap

        if occupancy_velocity is None:
            # Calibrate velocity based on occupancy and days to departure
            # In aviation, booking acceleration curve peaks between 21 and 3 days before flight
            if days_to_departure <= 7:
                occupancy_velocity = 0.035 if occupancy_rate > 0.65 else 0.015
            elif days_to_departure <= 21:
                occupancy_velocity = 0.022 if occupancy_rate > 0.50 else 0.010
            else:
                occupancy_velocity = 0.008

        # 2. Historical Price Series Preparation
        if historical_prices and len(historical_prices) >= 3:
            history = np.array(historical_prices, dtype=float)
            # Ensure the current price is the latest anchor
            if abs(history[-1] - current_price) > 0.01:
                history = np.append(history, current_price)
        else:
            # Estimate trend drift from velocity
            drift_dir = 1.0 if occupancy_velocity > 0.02 else (-1.0 if occupancy_velocity < 0.008 else 0.0)
            history = cls.synthesize_historical_series(
                current_price=current_price,
                days=21,
                occupancy_rate=occupancy_rate,
                trend_direction=drift_dir,
            )

        # 3. Double Exponential Smoothing (Holt's Linear with Damping)
        smoother = HoltLinearSmoother(alpha=0.38, beta=0.18, phi=0.94)
        es_forecasts, sigma_e, final_level, final_trend = smoother.fit_and_forecast(history, horizon=14)

        # 4. Linear Trend Regression
        reg_forecasts, trend_slope, reg_std = LinearTrendRegressor.fit_and_forecast(history, horizon=14)

        # 5. Ensemble Baseline: 70% Holt's + 30% OLS Regression
        ensemble_baseline = 0.70 * es_forecasts + 0.30 * reg_forecasts

        # 6. Dynamic Occupancy Velocity Multipliers
        occ_multipliers = OccupancyVelocityModel.calculate_multipliers(
            base_occupancy=occupancy_rate,
            occupancy_velocity=occupancy_velocity,
            days_to_departure=days_to_departure,
            horizon=14,
            is_flight=is_flight,
        )

        # 7. Day-of-Week Seasonality Adjustment
        today = date.today()
        dow_multipliers = np.zeros(14, dtype=float)
        for h in range(1, 15):
            target_date = today + timedelta(days=h)
            # Friday, Saturday, Sunday have higher leisure/travel demand in Bangladesh
            dow = target_date.weekday()  # Monday=0, Sunday=6
            if dow in [4, 5]:  # Friday, Saturday
                dow_multipliers[h - 1] = 1.035
            elif dow == 6:  # Sunday
                dow_multipliers[h - 1] = 1.015
            elif dow in [1, 2]:  # Tuesday, Wednesday
                dow_multipliers[h - 1] = 0.985
            else:
                dow_multipliers[h - 1] = 1.0

        # Final Point Forecasts (horizon = 14)
        raw_forecasts = ensemble_baseline * occ_multipliers * dow_multipliers
        point_forecasts = np.maximum(current_price * 0.25, raw_forecasts)

        # 8. Confidence Intervals (95% CI) & Uncertainty Metric
        lower_bounds, upper_bounds, uncertainties = ConfidenceIntervalEngine.calculate_intervals(
            point_forecasts=point_forecasts,
            current_price=current_price,
            sigma_e=sigma_e,
            alpha=smoother.alpha,
            beta=smoother.beta,
            z_score=1.96,
        )

        avg_uncertainty = float(np.mean(uncertainties))
        confidence_score = max(0.10, min(0.98, round(1.0 - avg_uncertainty * 0.75, 2)))

        # 9. Deterministic Recommendation Heuristic
        (
            verdict,
            recommendation_reason,
            best_days_to_wait,
            lowest_price,
            highest_day,
            highest_price,
        ) = RecommendationHeuristicEngine.evaluate(
            current_price=current_price,
            point_forecasts=point_forecasts,
            occupancy_rate=occupancy_rate,
            occupancy_velocity=occupancy_velocity,
            trend_slope=trend_slope,
            confidence_score=confidence_score,
            is_flight=is_flight,
        )

        lowest_day = int(np.argmin(point_forecasts)) + 1
        predicted_target_change = (
            (highest_price - current_price) / current_price * 100.0
            if verdict == RecommendationVerdict.BUY_NOW
            else (
                (lowest_price - current_price) / current_price * 100.0
                if verdict == RecommendationVerdict.WAIT
                else (point_forecasts[-1] - current_price) / current_price * 100.0
            )
        )

        # Build Daily Forecast points
        daily_forecast_points: List[DailyForecastPoint] = []
        for h in range(1, 15):
            t_date = (today + timedelta(days=h)).isoformat()
            pred_p = round(float(point_forecasts[h - 1]), 2)
            pct_chg = round((pred_p - current_price) / current_price * 100.0, 2)
            daily_forecast_points.append(
                DailyForecastPoint(
                    day=h,
                    date=t_date,
                    predicted_price=pred_p,
                    lower_bound=float(lower_bounds[h - 1]),
                    upper_bound=float(upper_bounds[h - 1]),
                    uncertainty=float(uncertainties[h - 1]),
                    predicted_change_percent=pct_chg,
                )
            )

        return PriceForecastResult(
            item_id=item_id,
            item_type=item_type,
            currency=currency,
            current_price=round(current_price, 2),
            verdict=verdict,
            recommendation_reason=recommendation_reason,
            confidence_score=confidence_score,
            uncertainty_metric=round(avg_uncertainty, 4),
            predicted_change_percent=round(predicted_target_change, 2),
            lowest_predicted_price=round(lowest_price, 2),
            lowest_price_day=lowest_day,
            highest_predicted_price=round(highest_price, 2),
            highest_price_day=highest_day,
            best_time_to_book_days=best_days_to_wait,
            occupancy_rate=round(occupancy_rate, 4),
            occupancy_velocity=round(occupancy_velocity, 4),
            historical_trend_slope=round(trend_slope, 4),
            daily_forecasts=daily_forecast_points,
        )

    # ------------------------------------------------------------------------
    # Database Integrated Methods
    # ------------------------------------------------------------------------

    @classmethod
    async def forecast_flight_by_id(
        cls,
        db: AsyncSession,
        flight_id: Union[uuid.UUID, str],
    ) -> PriceForecastResult:
        """
        Fetches Flight entity from database, extracts dynamic seat inventory & pricing,
        and computes 14-day price fluctuation forecast.
        """
        f_uuid = uuid.UUID(str(flight_id)) if not isinstance(flight_id, uuid.UUID) else flight_id
        stmt = (
            select(Flight)
            .where(Flight.id == f_uuid)
            .options(
                selectinload(Flight.airline),
                selectinload(Flight.origin_airport),
                selectinload(Flight.destination_airport),
                selectinload(Flight.seats),
            )
        )
        res = await db.execute(stmt)
        flight = res.scalar_one_or_none()
        if not flight:
            raise NotFoundError("Flight", str(flight_id))

        # Calculate live seat availability and days to departure
        total_seats = flight.total_seats or 180
        available_seats = flight.available_seats
        if flight.seats:
            available_seats = sum(1 for s in flight.seats if s.is_available)

        now = datetime.now(timezone.utc)
        dep_time = flight.departure_time
        if dep_time.tzinfo is None:
            dep_time = dep_time.replace(tzinfo=timezone.utc)
        days_to_dep = max(1, (dep_time - now).days)

        current_price = float(flight.base_price)

        return cls.execute_forecast_pipeline(
            current_price=current_price,
            total_capacity=total_seats,
            available_capacity=available_seats,
            days_to_departure=days_to_dep,
            is_flight=True,
            currency=flight.currency or "BDT",
            item_id=str(flight.id),
            item_type="flight",
        )

    @classmethod
    async def forecast_hotel_by_id(
        cls,
        db: AsyncSession,
        hotel_id: Union[uuid.UUID, str],
        room_id: Optional[Union[uuid.UUID, str]] = None,
    ) -> PriceForecastResult:
        """
        Fetches Hotel and HotelRoom inventory from database and predicts 14-day room rate trends.
        """
        h_uuid = uuid.UUID(str(hotel_id)) if not isinstance(hotel_id, uuid.UUID) else hotel_id
        stmt = (
            select(Hotel)
            .where(Hotel.id == h_uuid)
            .options(
                selectinload(Hotel.rooms).selectinload(HotelRoom.availability_records)
            )
        )
        res = await db.execute(stmt)
        hotel = res.scalar_one_or_none()
        if not hotel:
            raise NotFoundError("Hotel", str(hotel_id))

        target_room: Optional[HotelRoom] = None
        if room_id:
            r_uuid = uuid.UUID(str(room_id)) if not isinstance(room_id, uuid.UUID) else room_id
            target_room = next((r for r in hotel.rooms if r.id == r_uuid), None)

        if not target_room and hotel.rooms:
            # Default to primary / lowest base price room
            target_room = min(hotel.rooms, key=lambda r: float(r.base_price_per_night))

        current_price = float(target_room.base_price_per_night) if target_room else 3500.0
        currency = target_room.currency if target_room else "BDT"

        # Calculate room availability from records or heuristics
        total_rooms = 25
        available_rooms = 12
        if target_room and target_room.availability_records:
            today = date.today()
            avail_records = [
                rec for rec in target_room.availability_records
                if rec.available_date >= today and not rec.is_blocked
            ]
            if avail_records:
                available_rooms = max(1, sum(rec.available_count for rec in avail_records) // len(avail_records))

        return cls.execute_forecast_pipeline(
            current_price=current_price,
            total_capacity=total_rooms,
            available_capacity=available_rooms,
            days_to_departure=14,
            is_flight=False,
            currency=currency,
            item_id=str(hotel.id),
            item_type="hotel",
        )

    @classmethod
    def predict(cls, request: PriceForecastRequest) -> PriceForecastResult:
        """
        Predicts price fluctuations directly from client request payload.
        """
        return cls.execute_forecast_pipeline(
            current_price=request.current_price,
            historical_prices=request.historical_prices,
            total_capacity=request.total_capacity or 180,
            available_capacity=request.available_capacity or 60,
            occupancy_velocity=request.occupancy_velocity,
            days_to_departure=request.days_to_departure or 21,
            is_flight=(request.item_type == "flight"),
            currency=request.currency or "BDT",
            item_id=request.item_id,
            item_type=request.item_type,
        )

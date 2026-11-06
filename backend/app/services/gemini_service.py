"""
AI Travel Concierge Service powered by Google Gemini API (google-genai SDK).
Generates detailed structured JSON itineraries tailored to budget and traveler preferences.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import AppException
from app.models.ai import TripPlan
from app.schemas.ai import (
    Activity,
    BudgetCategory,
    MealSuggestion,
    PlanTripRequest,
    StructuredTripPlan,
    TripDay,
)

logger = logging.getLogger(__name__)


SYSTEM_INSTRUCTION = """
You are the Principal AI Travel Concierge for 'Shopno Jatra' (স্বপ্ন যাত্রা), a premier travel agency platform.
Your mission is to generate comprehensive, realistic, day-by-day travel itineraries with accurate cost estimates,
practical transit tips, cultural etiquette, and authentic dining recommendations.

Rules:
1. Always tailor activities and pace strictly to the user's budget, destination, interests, and duration.
2. If the destination is in Bangladesh (e.g. Cox's Bazar, Sylhet, Sreemangal, Sajek Valley, Sundarbans), provide expert local insight into transport (e.g. Parabat Express, Green Line, domestic flights) and regional delicacies (e.g. Shutki, Kacchi, Seven-layer tea).
3. If international (e.g. Bangkok, Singapore, Istanbul, Dubai, Tokyo), provide accurate transit passes, neighborhood recommendations, and currency exchange advice.
4. Output MUST adhere strictly to the JSON schema requested.
"""


class GeminiConciergeService:

    @staticmethod
    def _get_mock_fallback_plan(request: PlanTripRequest) -> StructuredTripPlan:
        """Fallback itinerary generator for offline/local development without an active Gemini API key."""
        budget_val = request.budget or 1200.0
        currency = request.currency or "USD"

        day_1_activities = [
            Activity(
                time="10:00 AM",
                activity="Arrival and Check-in at Accommodation",
                location=f"Central {request.destination}",
                notes="Freshen up and unpack; exchange local currency if needed.",
                estimated_cost=30.0,
            ),
            Activity(
                time="02:30 PM",
                activity="Historic Walking Tour & Architectural Landmarks",
                location=f"Old {request.destination}",
                notes="Wear comfortable walking shoes and modest clothing for heritage sites.",
                estimated_cost=15.0,
            ),
            Activity(
                time="06:30 PM",
                activity="Sunset Promenade & Waterfront Leisure",
                location="City Waterfront",
                notes="Great photography spot during golden hour.",
                estimated_cost=0.0,
            ),
        ]

        day_1_meals = [
            MealSuggestion(
                meal_type="breakfast",
                suggestion="Local Cafe near hotel",
                recommended_dish="Fresh artisan bread and specialty coffee",
            ),
            MealSuggestion(
                meal_type="lunch",
                suggestion="Traditional Heritage Kitchen",
                recommended_dish="Authentic regional platter",
            ),
            MealSuggestion(
                meal_type="dinner",
                suggestion="Rooftop Bistro overlooking skyline",
                recommended_dish="Chef's signature grilled seafood",
            ),
        ]

        days = [
            TripDay(
                day=1,
                date=request.start_date,
                theme="Arrival, Local Immersion & Sunset Views",
                activities=day_1_activities,
                meals=day_1_meals,
                accommodation=f"Boutique Hotel in {request.destination}",
            )
        ]

        # Add Day 2 if multi-day
        if request.end_date != request.start_date:
            days.append(
                TripDay(
                    day=2,
                    date=request.end_date,
                    theme="Culinary Discovery, Culture & Departure",
                    activities=[
                        Activity(
                            time="09:30 AM",
                            activity="Local Art Gallery and Artisan Bazaar",
                            location="Crafts District",
                            notes="Support local artisans; haggle respectfully.",
                            estimated_cost=25.0,
                        ),
                        Activity(
                            time="03:00 PM",
                            activity="Scenic Viewpoint & Souvenir Shopping",
                            location="Panorama Point",
                            notes="Pick up traditional sweets and crafts.",
                            estimated_cost=20.0,
                        ),
                    ],
                    meals=[
                        MealSuggestion(
                            meal_type="breakfast",
                            suggestion="Bakery & Espresso Bar",
                            recommended_dish="Warm pastry with local fruit preserves",
                        ),
                        MealSuggestion(
                            meal_type="lunch",
                            suggestion="Famous Street Food Alley",
                            recommended_dish="Signature spiced noodles / local street snack",
                        ),
                        MealSuggestion(
                            meal_type="dinner",
                            suggestion="Farewell Dinner at Riverside Pavilion",
                            recommended_dish="Slow-cooked savory delicacy",
                        ),
                    ],
                    accommodation=f"Boutique Hotel in {request.destination}",
                )
            )

        budget_breakdown = [
            BudgetCategory(
                category="Accommodation",
                estimated_amount=round(budget_val * 0.40, 2),
                percentage=40.0,
                saving_tips="Book boutique guesthouses 2-3 weeks in advance for best rates.",
            ),
            BudgetCategory(
                category="Flights & Transit",
                estimated_amount=round(budget_val * 0.25, 2),
                percentage=25.0,
                saving_tips="Utilize metro lines or local rideshare rather than private airport taxis.",
            ),
            BudgetCategory(
                category="Food & Dining",
                estimated_amount=round(budget_val * 0.20, 2),
                percentage=20.0,
                saving_tips="Dine where locals queue; lunch sets are usually 40% cheaper than dinner.",
            ),
            BudgetCategory(
                category="Activities & Sightseeing",
                estimated_amount=round(budget_val * 0.10, 2),
                percentage=10.0,
                saving_tips="Purchase city museum passes online to skip ticketing lines.",
            ),
            BudgetCategory(
                category="Buffer & Contingency",
                estimated_amount=round(budget_val * 0.05, 2),
                percentage=5.0,
                saving_tips="Always keep emergency cash in local currency.",
            ),
        ]

        return StructuredTripPlan(
            title=f"Unforgettable {request.destination}: Curated Experience",
            summary=(
                f"A handcrafted {len(days)}-day journey through {request.destination} combining "
                f"{', '.join(request.interests)} tailored for a {request.travel_style} travel style."
            ),
            destination=request.destination,
            duration_days=len(days),
            total_estimated_cost=budget_val,
            currency=currency,
            days=days,
            budget_breakdown=budget_breakdown,
            tips=[
                "Carry local currency cash as some street vendors do not accept international cards.",
                "Download offline map navigation and translation apps prior to landing.",
                "Keep emergency numbers and embassy contacts handy.",
            ],
            safety_and_cultural_advice=[
                "Dress respectfully when visiting sacred temples, mosques, and heritage sites.",
                "Drink bottled or filtered water in tropical regions.",
            ],
        )

    @staticmethod
    async def generate_itinerary(
        db: Optional[AsyncSession],
        request: PlanTripRequest,
        user_id: Optional[uuid.UUID] = None,
    ) -> StructuredTripPlan:
        """
        Calls Google Gemini API (gemini-3.8-flash) using google-genai SDK to generate
        a strictly structured JSON itinerary.
        """
        api_key = settings.GEMINI_API_KEY

        # If no key is set in dev environment, return high-fidelity fallback plan
        if not api_key:
            logger.warning("GEMINI_API_KEY is not configured; using high-fidelity curated fallback generator.")
            plan = GeminiConciergeService._get_mock_fallback_plan(request)
        else:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)

                prompt = (
                    f"Create an unforgettable, detailed travel itinerary for {request.travelers} traveler(s).\n"
                    f"Destination: {request.destination}\n"
                    f"Origin: {request.origin}\n"
                    f"Dates: from {request.start_date} to {request.end_date}\n"
                    f"Interests: {', '.join(request.interests)}\n"
                    f"Travel Style: {request.travel_style}\n"
                    f"Budget: {request.budget or 'flexible'} {request.currency}\n\n"
                    f"Provide day-by-day schedules with specific times, named locations, culinary dishes, "
                    f"and an itemized budget breakdown."
                )

                # Call Gemini with structured output configuration
                response = client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=SYSTEM_INSTRUCTION,
                        response_mime_type="application/json",
                        response_schema=StructuredTripPlan,
                        temperature=0.3,
                    ),
                )

                response_text = response.text
                if not response_text:
                    raise AppException(502, "Gemini AI returned empty response")

                # Parse JSON into Pydantic model
                data = json.loads(response_text)
                plan = StructuredTripPlan.model_validate(data)

            except Exception as exc:
                logger.error(f"Error calling Gemini API: {exc}", exc_info=True)
                # Fallback gracefully
                plan = GeminiConciergeService._get_mock_fallback_plan(request)

        # Persist to database if requested and DB session available
        if request.save_to_account and db:
            try:
                # Convert dates if available
                s_date = None
                e_date = None
                try:
                    s_date = datetime.strptime(request.start_date, "%Y-%m-%d").date()
                    e_date = datetime.strptime(request.end_date, "%Y-%m-%d").date()
                except Exception:
                    pass

                trip_record = TripPlan(
                    user_id=user_id,
                    title=plan.title,
                    destination=plan.destination,
                    start_date=s_date,
                    end_date=e_date,
                    budget=plan.total_estimated_cost,
                    currency=plan.currency,
                    plan_data=plan.model_dump(mode="json"),
                )
                db.add(trip_record)
                await db.commit()
                plan.trip_plan_id = trip_record.id
                logger.info(f"Persisted AI Trip Plan {trip_record.id} for user {user_id}")
            except Exception as exc:
                logger.warning(f"Failed to persist trip plan to database: {exc}")

        return plan

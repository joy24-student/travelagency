"""
AI Travel Concierge Service powered by Google Gemini SDK (google-genai).
Asynchronously generates personalized structured JSON itineraries with defensive schema validation.
"""

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.circuit_breaker import gemini_circuit_breaker
from app.core.config import settings
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
You are the Senior AI Travel Concierge for 'Shopno Jatra' (স্বপ্ন যাত্রা), Bangladesh's premier travel ecosystem.
Your mission is to generate comprehensive, realistic, day-by-day travel itineraries with accurate cost estimates,
practical transit tips, cultural etiquette, and authentic dining recommendations.

Rules:
1. Tailor activities, pace, and dining suggestions strictly to the traveler's budget, destination, interests, and duration.
2. For Bangladesh destinations (e.g. Cox's Bazar, Sylhet, Sreemangal, Sajek Valley, Sundarbans, Bandarban), provide expert local insight into transport (e.g. Parabat Express, Green Line AC bus, domestic flights) and regional delicacies (e.g. Rupchanda fry, Loitta fry, Sylheti Satkora beef, Seven-layer tea).
3. For international destinations (e.g. Bangkok, Singapore, Kuala Lumpur, Dubai, Istanbul, Tokyo), provide accurate local transit tips and neighborhood highlights.
4. Output MUST adhere strictly to the JSON schema requested.
"""


class GeminiConciergeService:

    @staticmethod
    def _get_fallback_plan(request: PlanTripRequest) -> StructuredTripPlan:
        """Fallback itinerary generator for offline/local development or API downtime."""
        budget_val = request.budget or (request.duration_days * 3500.0)
        currency = request.currency or "BDT"

        days_list = []
        for d in range(1, request.duration_days + 1):
            if d == 1:
                theme = "Arrival, Orientation & Sunset Leisure"
                activities = [
                    Activity(
                        time="10:00 AM",
                        activity=f"Arrival in {request.destination} & Check-in",
                        location=f"Central {request.destination}",
                        notes="Unpack, freshen up, and verify local transit passes.",
                        estimated_cost=250.0,
                    ),
                    Activity(
                        time="03:00 PM",
                        activity="Walking Heritage & Cultural Tour",
                        location="Historic Center / Old Town",
                        notes="Wear comfortable walking shoes.",
                        estimated_cost=300.0,
                    ),
                    Activity(
                        time="05:30 PM",
                        activity="Golden Hour Sunset Views",
                        location="Waterfront / Viewpoint Promenade",
                        notes="Prime photography location.",
                        estimated_cost=0.0,
                    ),
                ]
            elif d == request.duration_days:
                theme = "Souvenir Shopping, Culinary Highlights & Departure"
                activities = [
                    Activity(
                        time="09:30 AM",
                        activity="Local Artisan Market & Souvenir Shopping",
                        location="Traditional Bazaar",
                        notes="Great for local crafts, tea, and textiles.",
                        estimated_cost=800.0,
                    ),
                    Activity(
                        time="02:00 PM",
                        activity="Farewell Lunch & Transit to Terminal",
                        location=f"{request.destination} Airport/Station",
                        notes="Allow ample time for departure security checks.",
                        estimated_cost=400.0,
                    ),
                ]
            else:
                theme = f"Exploration of {request.interests[0] if request.interests else 'Scenic Landmarks'}"
                activities = [
                    Activity(
                        time="08:30 AM",
                        activity="Full-day Excursion & Nature Adventure",
                        location=f"Scenic Trails of {request.destination}",
                        notes="Carry bottled water, sunscreen, and power banks.",
                        estimated_cost=900.0,
                    ),
                    Activity(
                        time="07:00 PM",
                        activity="Evening Cultural Performance or Night Market",
                        location="City Center",
                        notes="Sample street food snacks.",
                        estimated_cost=350.0,
                    ),
                ]

            meals = [
                MealSuggestion(
                    meal_type="Breakfast",
                    cuisine_or_dish="Traditional Paratha, Daal & Local Tea",
                    suggested_spot="Hotel or Local Tea Stall",
                    estimated_cost=150.0,
                ),
                MealSuggestion(
                    meal_type="Lunch",
                    cuisine_or_dish="Fresh Regional Fish Curry & Steamed Rice",
                    suggested_spot="Famous Heritage Eatery",
                    estimated_cost=450.0,
                ),
                MealSuggestion(
                    meal_type="Dinner",
                    cuisine_or_dish="Kacchi Biryani / Grilled Platter",
                    suggested_spot="Top Rated Restaurant",
                    estimated_cost=650.0,
                ),
            ]

            days_list.append(TripDay(day_number=d, theme=theme, activities=activities, meals=meals))

        return StructuredTripPlan(
            title=f"{request.duration_days}-Day Curated Discovery of {request.destination}",
            destination=request.destination,
            duration_days=request.duration_days,
            total_estimated_budget=budget_val,
            currency=currency,
            highlights=[
                f"Curated {request.destination} landmark experiences",
                "Authentic local dining & street food trail",
                "Optimized daily travel routes minimizing transit fatigue",
            ],
            days=days_list,
            budget_breakdown=[
                BudgetCategory(category="Accommodation", estimated_amount=round(budget_val * 0.40, 2)),
                BudgetCategory(category="Food & Dining", estimated_amount=round(budget_val * 0.30, 2)),
                BudgetCategory(category="Activities & Sightseeing", estimated_amount=round(budget_val * 0.20, 2)),
                BudgetCategory(category="Local Transit", estimated_amount=round(budget_val * 0.10, 2)),
            ],
            packing_tips=[
                "Comfortable walking shoes & weather-appropriate clothing",
                "Universal power adapter & mobile power bank",
                "Personal medication & refillable water container",
            ],
            safety_advisory="Keep emergency contacts saved and use verified ridesharing or hotel taxis at night.",
        )

    @staticmethod
    async def generate_itinerary(
        db: AsyncSession,
        user_id: uuid.UUID,
        request: PlanTripRequest,
    ) -> StructuredTripPlan:
        """
        Calls Google Gemini SDK (google-genai) to generate a structured itinerary.
        Defensively validates returned JSON against StructuredTripPlan schema.
        """
        api_key = settings.GEMINI_API_KEY
        plan: Optional[StructuredTripPlan] = None

        if api_key and api_key not in ("mock-gemini-api-key-for-dev", "your-google-gemini-api-key", ""):
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=api_key)

                prompt = (
                    f"Create an unforgettable, detailed {request.duration_days}-day travel itinerary for {request.destination}.\n"
                    f"Origin City: {request.origin}\n"
                    f"Travelers: {request.travelers_count} ({request.traveler_type})\n"
                    f"Budget: {request.budget or 'Moderate'} {request.currency}\n"
                    f"Interests: {', '.join(request.interests)}\n"
                    f"Ensure day-by-day activities, estimated costs in {request.currency}, authentic meal spots, "
                    f"and practical budget breakdown.\n"
                    f"Provide response strictly adhering to JSON schema."
                )

                async def _call_gemini():
                    return await client.aio.models.generate_content(
                        model=settings.GEMINI_MODEL,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            system_instruction=SYSTEM_INSTRUCTION,
                            response_mime_type="application/json",
                            response_schema=StructuredTripPlan,
                            temperature=0.7,
                        ),
                    )

                response = await gemini_circuit_breaker.call(_call_gemini)

                if response and response.text:
                    parsed_json = json.loads(response.text)
                    plan = StructuredTripPlan.model_validate(parsed_json)
                    logger.info(f"Gemini successfully generated structured itinerary for {request.destination}")
            except Exception as exc:
                logger.warning(
                    f"Gemini API call or validation failed ({exc}). Falling back to robust offline generator.",
                    exc_info=True,
                )

        if not plan:
            plan = GeminiConciergeService._get_fallback_plan(request)

        # Persist generated plan in trip_plans table if requested
        if request.save_to_account:
            try:
                db_plan = TripPlan(
                    user_id=user_id,
                    title=plan.title,
                    destination=plan.destination,
                    duration_days=plan.duration_days,
                    budget=plan.total_estimated_budget,
                    currency=plan.currency,
                    interests=request.interests,
                    itinerary_data=plan.model_dump(),
                    summary=f"{plan.duration_days}-day trip to {plan.destination}",
                    is_saved=True,
                )
                db.add(db_plan)
                await db.commit()
                logger.info(f"Persisted generated trip plan {db_plan.id} for user {user_id}")
            except Exception as save_err:
                logger.warning(f"Could not persist trip plan in database: {save_err}")

        return plan

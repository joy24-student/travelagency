"""
AI Travel Concierge and Structured Itinerary Schemas.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PlanTripRequest(BaseModel):
    destination: str = Field(..., min_length=2, description="Target city or region (e.g. Cox's Bazar, Sylhet, Tokyo)")
    origin: Optional[str] = Field("Dhaka", description="Departure city")
    duration_days: int = Field(3, ge=1, le=14, description="Number of days for itinerary")
    travelers_count: int = Field(1, ge=1, le=10, description="Total number of travelers")
    budget: Optional[float] = Field(None, ge=0, description="Total budget in currency")
    currency: Optional[str] = Field("BDT", description="Currency symbol/code")
    interests: List[str] = Field(
        default_factory=lambda: ["sightseeing", "local food", "culture"],
        description="Key interests (e.g. beaches, hiking, heritage, luxury, food)",
    )
    traveler_type: Optional[str] = Field("solo", description="solo, couple, family, friends, business")
    save_to_account: bool = Field(True, description="Whether to persist trip plan in user database")


class Activity(BaseModel):
    time: str = Field(..., description="Time of day, e.g. '09:00 AM'")
    activity: str = Field(..., description="Name or title of activity")
    location: str = Field(..., description="Place or venue name")
    notes: Optional[str] = Field(None, description="Local tips, dress code, ticketing advice")
    estimated_cost: float = Field(0.0, ge=0, description="Estimated cost for activity")


class MealSuggestion(BaseModel):
    meal_type: str = Field(..., description="Breakfast, Lunch, or Dinner")
    cuisine_or_dish: str = Field(..., description="Recommended regional dish or specialty")
    suggested_spot: Optional[str] = Field(None, description="Recommended restaurant or market")
    estimated_cost: float = Field(0.0, ge=0)


class TripDay(BaseModel):
    day_number: int = Field(..., ge=1)
    theme: str = Field(..., description="Theme for the day, e.g. 'Historic Discovery'")
    activities: List[Activity] = Field(default_factory=list)
    meals: List[MealSuggestion] = Field(default_factory=list)


class BudgetCategory(BaseModel):
    category: str = Field(..., description="Transport, Accommodation, Activities, Food, Contingency")
    estimated_amount: float = Field(..., ge=0)


class StructuredTripPlan(BaseModel):
    title: str = Field(..., description="Catchy title for the trip")
    destination: str
    duration_days: int
    total_estimated_budget: float
    currency: str
    highlights: List[str] = Field(default_factory=list)
    days: List[TripDay] = Field(default_factory=list)
    budget_breakdown: List[BudgetCategory] = Field(default_factory=list)
    packing_tips: List[str] = Field(default_factory=list)
    safety_advisory: Optional[str] = None


class ReviewInputItem(BaseModel):
    id: Optional[str] = None
    text: str = Field(..., min_length=1, description="Review or social post text")
    author: Optional[str] = None
    rating: Optional[float] = None
    created_at: Optional[str] = None


class VibeAnalysisRequest(BaseModel):
    target_id: str = Field(..., description="Hotel ID, Villa ID, or Destination Name")
    target_type: Optional[str] = Field("hotel", description="hotel or destination")
    reviews: List[ReviewInputItem] = Field(default_factory=list, description="List of reviews or social posts")


class DimensionSentimentResponse(BaseModel):
    dimension: str
    score: float
    polarity: str
    confidence: float
    mention_count: int
    snippets: List[str] = Field(default_factory=list)


class VibeTagResponse(BaseModel):
    id: str
    tag: str
    category: str
    sentiment: str
    confidence: float
    dimension_source: Optional[str] = None


class PropertyVibeResponse(BaseModel):
    target_id: str
    target_type: str
    overall_vibe_score: float
    overall_sentiment: str
    dimensions: Dict[str, DimensionSentimentResponse]
    vibe_tags: List[VibeTagResponse]
    total_reviews_analyzed: int
    authentic_reviews_count: int
    flagged_spam_count: int
    bot_percentage: float
    summary: str


class AIChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user', 'assistant', 'model', or 'system'")
    content: str = Field(..., description="Message content text")


class AIChatRequest(BaseModel):
    messages: List[AIChatMessage] = Field(..., min_length=1, description="List of previous conversation messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0)
    model: Optional[str] = Field(None, description="Optional Gemini model override")
    max_tokens: Optional[int] = Field(2048, ge=1, le=8192)


class AIChatResponse(BaseModel):
    content: str
    raw: str
    provider: str = "gemini"
    model: str
    tokens_used: Optional[int] = None


class AICompletionRequest(BaseModel):
    user_prompt: str = Field(..., min_length=1, description="User prompt text")
    system_prompt: Optional[str] = Field(None, description="System instruction prompt")
    temperature: Optional[float] = Field(0.2, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(3500, ge=1, le=8192)
    response_mime_type: Optional[str] = Field("text/plain", description="'application/json' or 'text/plain'")
    provider: Optional[str] = Field("gemini", description="Preferred AI provider")
    model: Optional[str] = Field(None, description="Optional model override")


class AICompletionResponse(BaseModel):
    text: str
    provider: str = "gemini"
    model: str
    tokens_used: Optional[int] = None

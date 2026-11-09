"""
AI Travel Concierge, Conversational Assistant and Itinerary Generator Endpoints.
All client-side AI calls are securely routed here to protect API keys and apply circuit breakers.
"""

from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime
import logging
from pydantic import BaseModel, Field

from app.api.deps import get_optional_user, get_db
from app.core.rate_limit import limiter
from app.schemas.ai import (
    AIChatRequest,
    AIChatResponse,
    AICompletionRequest,
    AICompletionResponse,
    DimensionSentimentResponse,
    PlanTripRequest,
    PropertyVibeResponse,
    StructuredTripPlan,
    VibeAnalysisRequest,
    VibeTagResponse,
)
from app.schemas.common import StandardResponse
from app.schemas.user import CurrentUser
from app.services.gemini_service import GeminiConciergeService
from app.services.nlp_service import NLPService, ParsedQueryResponse
from app.services.vibe_analyzer import VibeAnalyzerService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Travel Concierge"])


class ParseQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Unstructured user travel query in English or Banglish")
    reference_date: Optional[str] = Field(None, description="Optional reference date (ISO YYYY-MM-DD)")


@router.post("/chat", response_model=StandardResponse[AIChatResponse])
@limiter.limit("60/minute")
async def chat_with_ai(
    request: Request,
    payload: AIChatRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
):
    """
    Unified Conversational AI Chat Endpoint.
    Securely routes chat queries to Google Gemini SDK (google-genai) on the backend.
    Protects API keys and provides intelligent local failover.
    """
    response = await GeminiConciergeService.chat_completion(
        messages=payload.messages,
        temperature=payload.temperature or 0.7,
        model=payload.model,
        max_tokens=payload.max_tokens or 2048,
    )
    return StandardResponse[AIChatResponse](
        success=True,
        message="AI chat response generated successfully",
        data=response,
    )


@router.post("/complete", response_model=StandardResponse[AICompletionResponse])
@limiter.limit("60/minute")
async def complete_with_ai(
    request: Request,
    payload: AICompletionRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
):
    """
    Single-turn LLM Text / JSON Completion Endpoint.
    Used by provider adapters (GeminiProvider, etc.) to securely offload LLM prompts to the backend.
    """
    response = await GeminiConciergeService.text_completion(payload)
    return StandardResponse[AICompletionResponse](
        success=True,
        message="AI text completion generated successfully",
        data=response,
    )


@router.post("/parse-query", response_model=StandardResponse[ParsedQueryResponse])
@limiter.limit("60/minute")
async def parse_conversational_query(
    request: Request,
    payload: ParseQueryRequest,
):
    """
    Conversational search query parser for English & Banglish.
    Extracts entities (destination, budget_max, duration_days, amenities, dates, traveler_count),
    matches multi-vertical intent, and expands synonyms with pre-computed vector embeddings.
    """
    ref_dt = None
    if payload.reference_date:
        try:
            ref_dt = datetime.fromisoformat(payload.reference_date)
        except ValueError as exc:
            logger.warning(f"Invalid reference_date format '{payload.reference_date}', ignoring: {exc}")

    parsed = NLPService.parse_query(payload.query, reference_date=ref_dt)
    return StandardResponse[ParsedQueryResponse](
        success=True,
        message="Conversational query parsed successfully",
        data=parsed,
    )


@router.post("/generate-itinerary", response_model=StandardResponse[StructuredTripPlan])
@router.post("/plan-trip", response_model=StandardResponse[StructuredTripPlan])
@limiter.limit("20/minute")
async def generate_trip_itinerary(
    request: Request,
    plan_request: PlanTripRequest,
    current_user: Optional[CurrentUser] = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate customized structured day-by-day itinerary using Google Gemini SDK (google-genai).
    Features defensive JSON schema validation and persists trip plan for user.
    """
    user_id = current_user.id if current_user else None
    plan = await GeminiConciergeService.generate_itinerary(
        db=db,
        user_id=user_id,
        request=plan_request,
    )
    return StandardResponse[StructuredTripPlan](
        success=True,
        message="Travel itinerary successfully generated",
        data=plan,
    )


@router.post("/vibe-analysis", response_model=StandardResponse[PropertyVibeResponse])
@limiter.limit("60/minute")
async def analyze_property_vibes(
    request: Request,
    vibe_request: VibeAnalysisRequest,
):
    """
    Multi-dimensional aspect sentiment and vibe analysis for hotels and destinations.
    Performs linguistic perplexity spam filtering, calculates 5 travel dimension
    meters (Cleanliness, Hospitality, Value for Money, Wi-Fi / Remote Work, Scenic Serenity),
    and synthesizes dynamic vibe tags.
    """
    reviews_data = [
        {"id": r.id or f"rev-{idx}", "text": r.text}
        for idx, r in enumerate(vibe_request.reviews)
    ]

    aggregated = VibeAnalyzerService.aggregate_reviews(
        target_id=vibe_request.target_id,
        reviews=reviews_data,
        target_type=vibe_request.target_type or "hotel",
    )

    dimensions_resp = {
        dim_name: DimensionSentimentResponse(
            dimension=dim_data.dimension.value,
            score=dim_data.score,
            polarity=dim_data.polarity.value,
            confidence=dim_data.confidence,
            mention_count=dim_data.mention_count,
            snippets=dim_data.snippets,
        )
        for dim_name, dim_data in aggregated.dimensions.items()
    }

    tags_resp = [
        VibeTagResponse(
            id=t.id,
            tag=t.tag,
            category=t.category.value,
            sentiment=t.sentiment.value,
            confidence=t.confidence,
            dimension_source=t.dimension_source.value if t.dimension_source else None,
        )
        for t in aggregated.vibe_tags
    ]

    response_data = PropertyVibeResponse(
        target_id=aggregated.target_id,
        target_type=aggregated.target_type,
        overall_vibe_score=aggregated.overall_vibe_score,
        overall_sentiment=aggregated.overall_sentiment,
        dimensions=dimensions_resp,
        vibe_tags=tags_resp,
        total_reviews_analyzed=aggregated.total_reviews_analyzed,
        authentic_reviews_count=aggregated.authentic_reviews_count,
        flagged_spam_count=aggregated.flagged_spam_count,
        bot_percentage=aggregated.bot_percentage,
        summary=aggregated.summary,
    )

    return StandardResponse[PropertyVibeResponse](
        success=True,
        message="Vibe score and aspect sentiment successfully analyzed",
        data=response_data,
    )

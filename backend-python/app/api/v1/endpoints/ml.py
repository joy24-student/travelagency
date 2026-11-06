"""
FastAPI Endpoints for Machine Learning & Hybrid Recommendation Engine.
Features rate limiting, Pydantic v2 validation, and SIMD ORJSON serialization.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, Query, Request
from slowapi.util import get_remote_address

from app.core.rate_limit import limiter
from app.schemas.common import StandardResponse
from app.schemas.ml import (
    BanditArmState,
    BanditFeedbackRequest,
    CatalogItemType,
    RecommendationFeatureTaxonomy,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.ml_service import ml_recommendation_service

router = APIRouter(prefix="/ml", tags=["Machine Learning Recommendations"])


@router.post("/recommend", response_model=StandardResponse[RecommendationResponse])
@limiter.limit("60/minute")
async def get_recommendations(
    request: Request,
    rec_request: RecommendationRequest,
):
    """
    Score destinations, hotels, and tours across the 40 real-time parameters.
    Executes hybrid content-based cosine similarity and collaborative filtering,
    with Thompson Sampling multi-armed bandit fallback for cold-start users.
    Returns strictly validated confidence scores in [0.0 - 1.0].
    """
    response = await ml_recommendation_service.get_recommendations(rec_request)
    return StandardResponse[RecommendationResponse](
        success=True,
        message="Recommendations scored and retrieved successfully",
        data=response,
    )


@router.post("/cold-start", response_model=StandardResponse[RecommendationResponse])
@limiter.limit("60/minute")
async def get_cold_start_recommendations(
    request: Request,
    item_type: CatalogItemType = Query(CatalogItemType.DESTINATION, description="Catalog item type"),
    limit: int = Query(6, ge=1, le=20),
):
    """
    Cold-start recommendation endpoint powered by Thompson Sampling multi-armed bandit.
    Samples regional posterior probabilities (Cox's Bazar, Sylhet, Sajek, Sundarbans).
    """
    rec_request = RecommendationRequest(
        item_type=item_type,
        limit=limit,
        is_cold_start=True,
    )
    response = await ml_recommendation_service.get_recommendations(rec_request)
    return StandardResponse[RecommendationResponse](
        success=True,
        message="Cold-start recommendations generated via Thompson Sampling bandit",
        data=response,
    )


@router.post("/feedback", response_model=StandardResponse[Dict[str, Any]])
@limiter.limit("120/minute")
async def record_bandit_feedback(
    request: Request,
    feedback: BanditFeedbackRequest,
):
    """
    Record user interaction feedback to update Thompson Sampling Beta distributions.
    Reward signal: 1.0 for positive interactions (clicks, bookings, high dwell time),
    0.0 for bounces or impressions without interaction.
    """
    result = await ml_recommendation_service.record_feedback(feedback)
    return StandardResponse[Dict[str, Any]](
        success=True,
        message="Bandit feedback updated successfully",
        data=result,
    )


@router.get("/bandit-arms", response_model=StandardResponse[List[BanditArmState]])
@limiter.limit("60/minute")
async def get_bandit_arm_states(request: Request):
    """
    Retrieve live states (alpha, beta, expected conversion value)
    of Thompson Sampling regional bandit arms.
    """
    states = ml_recommendation_service.get_bandit_diagnostic_states()
    return StandardResponse[List[BanditArmState]](
        success=True,
        message="Bandit arm diagnostic states retrieved",
        data=states,
    )


@router.post("/vectorize", response_model=StandardResponse[Dict[str, Any]])
@limiter.limit("60/minute")
async def vectorize_taxonomy(
    request: Request,
    taxonomy: RecommendationFeatureTaxonomy,
):
    """
    Validates and vectorizes the 40-parameter taxonomy into a normalized float64 vector.
    """
    vec = taxonomy.to_vector()
    return StandardResponse[Dict[str, Any]](
        success=True,
        message="40-parameter taxonomy serialized into vector",
        data={
            "dimension": len(vec),
            "vector": vec.tolist(),
            "parameter_keys": RecommendationFeatureTaxonomy.get_parameter_keys(),
        },
    )

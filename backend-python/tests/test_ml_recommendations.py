"""
Comprehensive Test Suite for ML Recommendation Engine & Hybrid Scoring Service.
Validates:
1. 40-Parameter Feature Vector Taxonomy Construction & Normalization.
2. Cosine Similarity & Normalization (NumPy / SciPy).
3. Thompson Sampling Multi-Armed Bandit (Beta Distribution, Priors, Updates).
4. Hybrid Collaborative-Filtering & Content-Based Fusion.
5. Cold-Start Fallback for First-Time Users.
6. Strict Pydantic v2 Schema Validation & [0.0, 1.0] Bounds.
7. FastAPI HTTP Endpoints (/api/v1/ml/*).
"""

import pytest
import numpy as np
from httpx import AsyncClient, ASGITransport

from app.main import create_application
from app.schemas.ml import (
    BanditFeedbackRequest,
    CatalogItemType,
    RecommendationFeatureTaxonomy,
    RecommendationRequest,
    RecommendationResponse,
)
from app.services.ml_service import (
    FeatureVectorEngine,
    MLRecommendationService,
    ThompsonSamplingBandit,
)


# ==============================================================================
# 1. TAXONOMY & FEATURE VECTOR TESTS
# ==============================================================================

def test_feature_taxonomy_40_parameters():
    """Verify taxonomy has exactly 40 parameters with valid default values in [0.0, 1.0]."""
    taxonomy = RecommendationFeatureTaxonomy()
    keys = taxonomy.get_parameter_keys()
    assert len(keys) == 40, f"Expected 40 parameters, got {len(keys)}"

    # Convert to vector
    vec = taxonomy.to_vector()
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (40,)
    assert vec.dtype == np.float64
    assert np.all(vec >= 0.0)
    assert np.all(vec <= 1.0)


def test_feature_taxonomy_from_vector_roundtrip():
    """Verify bidirectional roundtrip serialization from vector to taxonomy."""
    original_vec = np.linspace(0.0, 1.0, 40, dtype=np.float64)
    taxonomy = RecommendationFeatureTaxonomy.from_vector(original_vec)
    reconstructed_vec = taxonomy.to_vector()
    assert np.allclose(original_vec, reconstructed_vec, atol=1e-7)


def test_feature_vector_engine_fallbacks():
    """Verify vector engine handles dictionaries, lists, and None gracefully."""
    engine = FeatureVectorEngine()

    # None input
    v_none = engine.to_vector(None)
    assert v_none.shape == (40,)

    # Dict input with partial keys
    v_dict = engine.to_vector({"budget_affinity": 0.85, "companion_type": 0.5})
    assert v_dict.shape == (40,)
    assert abs(v_dict[19] - 0.85) < 1e-5  # budget_affinity index 19

    # Truncated sequence input
    v_seq = engine.to_vector([0.5] * 10)
    assert v_seq.shape == (40,)
    assert v_seq[0] == 0.5
    assert v_seq[39] == 0.0  # padded zero


# ==============================================================================
# 2. COSINE SIMILARITY & NORMALIZATION TESTS
# ==============================================================================

def test_cosine_similarity_calculation():
    """Verify cosine similarity with SciPy/NumPy produces strictly bounded [0.0, 1.0] values."""
    engine = FeatureVectorEngine()

    # Identical vectors -> similarity should be ~1.0
    u = np.ones(40, dtype=np.float64)
    C = np.ones((5, 40), dtype=np.float64)
    sims = engine.compute_cosine_similarity(u, C)
    assert len(sims) == 5
    assert np.allclose(sims, 1.0, atol=1e-5)

    # Orthogonal vectors -> similarity should be 0.0
    u_ortho = np.zeros(40, dtype=np.float64)
    u_ortho[0] = 1.0
    C_ortho = np.zeros((3, 40), dtype=np.float64)
    C_ortho[:, 1] = 1.0
    sims_ortho = engine.compute_cosine_similarity(u_ortho, C_ortho)
    assert np.allclose(sims_ortho, 0.0, atol=1e-5)

    # Degenerate zero user vector
    u_zero = np.zeros(40, dtype=np.float64)
    sims_zero = engine.compute_cosine_similarity(u_zero, C)
    assert np.allclose(sims_zero, 0.0)


# ==============================================================================
# 3. THOMPSON SAMPLING BANDIT TESTS
# ==============================================================================

def test_thompson_sampling_regional_arms():
    """Verify bandit initializes with Cox's Bazar, Sylhet, Sajek, Sundarbans arms."""
    bandit = ThompsonSamplingBandit(random_seed=123)
    states = bandit.get_arm_states()
    arm_ids = {s.arm_id for s in states}

    expected_arms = {"coxs_bazar", "sylhet", "sajek", "sundarbans"}
    assert expected_arms.issubset(arm_ids)

    # Verify Beta posterior sampling returns floats in [0.0, 1.0]
    samples = bandit.sample_arms()
    assert len(samples) == len(expected_arms)
    for arm_id, val in samples.items():
        assert 0.0 <= val <= 1.0

    best_arm, best_score = bandit.get_best_arm()
    assert best_arm in expected_arms
    assert 0.0 <= best_score <= 1.0


def test_thompson_sampling_bayesian_updates():
    """Verify reward signals update alpha and beta parameters correctly."""
    bandit = ThompsonSamplingBandit(random_seed=42)
    initial_states = {s.arm_id: (s.alpha, s.beta) for s in bandit.get_arm_states()}

    # Positive reward update
    bandit.update("coxs_bazar", reward=1.0)
    updated_cox = next(s for s in bandit.get_arm_states() if s.arm_id == "coxs_bazar")
    assert updated_cox.alpha == initial_states["coxs_bazar"][0] + 1.0
    assert updated_cox.beta == initial_states["coxs_bazar"][1]

    # Negative reward update (bounce)
    bandit.update("sajek", reward=0.0)
    updated_sajek = next(s for s in bandit.get_arm_states() if s.arm_id == "sajek")
    assert updated_sajek.alpha == initial_states["sajek"][0]
    assert updated_sajek.beta == initial_states["sajek"][1] + 1.0


# ==============================================================================
# 4. HYBRID RECOMMENDATION SERVICE TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_cold_start_recommendation_flow():
    """Verify cold-start recommendations prioritize regional arms with valid scores."""
    service = MLRecommendationService(random_seed=99)
    req = RecommendationRequest(
        user_id="user-cold-1",
        is_cold_start=True,
        limit=5,
    )
    res = await service.get_recommendations(req)

    assert isinstance(res, RecommendationResponse)
    assert res.is_cold_start is True
    assert res.top_bandit_arm in {"coxs_bazar", "sylhet", "sajek", "sundarbans"}
    assert len(res.recommendations) > 0
    assert len(res.recommendations) <= 5

    # Check strict confidence score validation in [0.0, 1.0]
    for rec in res.recommendations:
        assert 0.0 <= rec.relevance_score <= 1.0
        assert 0.0 <= rec.content_similarity <= 1.0
        assert 0.0 <= rec.collaborative_score <= 1.0
        assert len(rec.match_reasons) > 0


@pytest.mark.asyncio
async def test_warm_user_hybrid_scoring():
    """Verify warm users with session features and history receive blended recommendations."""
    service = MLRecommendationService(random_seed=101)

    # Session features indicating luxury beach vacation with family
    session_features = RecommendationFeatureTaxonomy(
        budget_affinity=0.9,
        relaxation_wellness_affinity=0.9,
        companion_type=0.5,  # Family
        has_children=1.0,
        nature_vs_urban_affinity=0.2,
    )

    req = RecommendationRequest(
        user_id="user-warm-123",
        item_type=CatalogItemType.HOTEL,
        session_features=session_features,
        collaborative_history=["hotel-coxs-bazar-sea-pearl"],
        limit=4,
    )
    res = await service.get_recommendations(req)

    assert res.is_cold_start is False
    assert len(res.recommendations) > 0
    for rec in res.recommendations:
        assert rec.item_type == CatalogItemType.HOTEL
        assert 0.0 <= rec.relevance_score <= 1.0
        assert 0.0 <= rec.content_similarity <= 1.0
        assert 0.0 <= rec.collaborative_score <= 1.0


# ==============================================================================
# 5. FASTAPI HTTP ENDPOINT INTEGRATION TESTS
# ==============================================================================

@pytest.mark.asyncio
async def test_api_recommend_endpoint():
    """Test POST /api/v1/ml/recommend via HTTP client."""
    app = create_application()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        payload = {
            "user_id": "api-test-user",
            "limit": 4,
            "session_features": {
                "budget_affinity": 0.8,
                "adventure_index": 0.7,
            },
        }
        resp = await client.post("/api/v1/ml/recommend", json=payload)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        rec_data = data["data"]
        assert len(rec_data["recommendations"]) <= 4
        for item in rec_data["recommendations"]:
            assert 0.0 <= item["relevance_score"] <= 1.0


@pytest.mark.asyncio
async def test_api_cold_start_endpoint():
    """Test POST /api/v1/ml/cold-start endpoint."""
    app = create_application()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/api/v1/ml/cold-start?item_type=destination&limit=3")
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["is_cold_start"] is True
        assert data["data"]["top_bandit_arm"] is not None


@pytest.mark.asyncio
async def test_api_bandit_feedback_endpoint():
    """Test POST /api/v1/ml/feedback endpoint."""
    app = create_application()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        feedback = {
            "arm_id": "sajek",
            "reward": 1.0,
            "user_id": "test-user-1",
            "item_id": "dest-sajek-valley",
        }
        resp = await client.post("/api/v1/ml/feedback", json=feedback)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert "arm_states" in data["data"]

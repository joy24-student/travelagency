"""
Tests for NLP & Semantic Search Service.
Verifies entity extraction, Banglish intent matching, date normalization,
and semantic vector expansion.
"""

from datetime import datetime
import pytest
from app.services.nlp_service import NLPService, _EMBEDDING_ENGINE


@pytest.fixture
def reference_date():
    # Friday, Nov 6, 2026
    return datetime(2026, 11, 6, 12, 0, 0)


def test_entity_extraction_complex_english(reference_date):
    """
    Test extraction of complex query:
    'cheap 3-day quiet beach resort with pool next weekend for 2 adults under 6000 BDT'
    """
    query = "cheap 3-day quiet beach resort with pool next weekend for 2 adults under 6000 BDT"
    res = NLPService.parse_query(query, reference_date=reference_date)

    assert res.entities.destination == "Cox's Bazar"
    assert res.entities.budget_max == 6000.0
    assert res.entities.duration_days == 3
    assert "pool" in res.entities.amenities
    assert "quiet" in res.entities.amenities
    assert "beach" in res.entities.amenities
    assert "resort" in res.entities.amenities
    assert res.entities.traveler_count == 2
    assert res.entities.vertical == "hotels"

    assert res.entities.dates is not None
    assert res.entities.dates.relative_expression == "next weekend"
    assert res.entities.dates.start_date == "2026-11-13"
    assert res.entities.dates.end_date == "2026-11-15"


def test_bilingual_banglish_intent_matching(reference_date):
    """
    Test Banglish query:
    'shundarbon 2 diner jonno bhalo launch cabin'
    """
    query = "shundarbon 2 diner jonno bhalo launch cabin"
    res = NLPService.parse_query(query, reference_date=reference_date)

    assert res.language == "banglish"
    assert res.entities.destination == "Sundarbans"
    assert res.entities.duration_days == 2
    assert "launch cabin" in res.entities.amenities
    assert "deluxe" in res.entities.amenities
    assert res.entities.vertical == "tours"


def test_semantic_vector_expansion_quiet():
    """
    Test Requirement 3: Expand synonyms (e.g., 'quiet' -> 'peaceful', 'serene', 'isolated')
    using pre-computed embeddings.
    """
    synonyms = _EMBEDDING_ENGINE.expand_synonyms("quiet", top_k=5, min_similarity=0.7)
    synonym_names = [s[0] for s in synonyms]

    assert "peaceful" in synonym_names
    assert "serene" in synonym_names
    assert "isolated" in synonym_names
    assert synonym_names[:3] == ["peaceful", "serene", "isolated"]


def test_semantic_vector_expansion_cheap_and_cabin():
    """
    Test vector expansion for budget and accommodation terms.
    """
    syns_cheap = [s[0] for s in _EMBEDDING_ENGINE.expand_synonyms("cheap", top_k=4, min_similarity=0.7)]
    assert "budget" in syns_cheap
    assert "affordable" in syns_cheap

    syns_cabin = [s[0] for s in _EMBEDDING_ENGINE.expand_synonyms("cabin", top_k=4, min_similarity=0.7)]
    assert "launch cabin" in syns_cabin
    assert "berth" in syns_cabin


def test_banglish_numbers_and_traveler_counts():
    """
    Test Banglish traveler counts like 'dujon', '3 jon', 'ekjon'.
    """
    assert NLPService.extract_traveler_count("sajek e dujon jabo") == 2
    assert NLPService.extract_traveler_count("3 jon manush") == 3
    assert NLPService.extract_traveler_count("solo traveler ekjon") == 1
    assert NLPService.extract_traveler_count("couple trip") == 2


def test_banglish_budget_formats():
    """
    Test various budget formats including '5000 takar moddhe', '6k', etc.
    """
    max_b, _, _ = NLPService.extract_budget("5000 takar moddhe bhalo hotel")
    assert max_b == 5000.0

    max_k, _, _ = NLPService.extract_budget("under 10k budget")
    assert max_k == 10000.0

    max_suffix_k, _, _ = NLPService.extract_budget("8k bdt")
    assert max_suffix_k == 8000.0


def test_train_route_and_date_extraction(reference_date):
    """
    Test train route query with Banglish keywords:
    'dhaka theke chittagong train ticket kaalke 1 jon'
    """
    query = "dhaka theke chittagong train ticket kaalke 1 jon"
    res = NLPService.parse_query(query, reference_date=reference_date)

    assert res.entities.origin == "Dhaka"
    assert res.entities.destination == "Chittagong"
    assert res.entities.vertical == "trains"
    assert res.entities.traveler_count == 1
    assert res.entities.dates is not None
    assert res.entities.dates.start_date == "2026-11-07"


@pytest.mark.asyncio
async def test_parse_query_api_endpoint(client):
    """
    Test FastAPI POST /api/v1/ai/parse-query endpoint end-to-end.
    """
    payload = {
        "query": "shundarbon 2 diner jonno bhalo launch cabin",
        "reference_date": "2026-11-06T12:00:00",
    }
    response = await client.post("/api/v1/ai/parse-query", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["success"] is True
    assert data["data"]["entities"]["destination"] == "Sundarbans"
    assert data["data"]["entities"]["duration_days"] == 2
    assert "launch cabin" in data["data"]["entities"]["amenities"]
    assert data["data"]["entities"]["vertical"] == "tours"


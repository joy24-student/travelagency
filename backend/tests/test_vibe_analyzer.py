"""
Unit Tests for Vibe Analyzer & Sentiment Engineering Service.
Tests multi-dimensional aspect extraction, dynamic vibe tag synthesis,
linguistic perplexity, and anti-spam detection.
"""

import pytest
from app.services.vibe_analyzer import (
    AspectSentimentExtractor,
    LinguisticPerplexityDetector,
    SentimentPolarity,
    TravelDimension,
    VibeAnalyzerService,
    VibeCategory,
    VibeTagSynthesizer,
)


class TestAspectSentimentExtractor:
    """Tests for 5-dimension aspect extraction and sentiment polarity."""

    def test_cleanliness_positive_and_negative(self):
        text_pos = "The room was spotless and the bathroom was thoroughly sanitized and fresh."
        dims_pos = AspectSentimentExtractor.extract_aspects(text_pos)
        clean_pos = dims_pos[TravelDimension.CLEANLINESS.value]
        assert clean_pos.score >= 75.0
        assert clean_pos.polarity == SentimentPolarity.POSITIVE
        assert clean_pos.mention_count >= 1

        text_neg = "The sheets were dirty and stained, and there was a bad odor in the bathroom."
        dims_neg = AspectSentimentExtractor.extract_aspects(text_neg)
        clean_neg = dims_neg[TravelDimension.CLEANLINESS.value]
        assert clean_neg.score <= 40.0
        assert clean_neg.polarity == SentimentPolarity.NEGATIVE

    def test_hospitality_and_negation(self):
        # Direct positive
        text_pos = "The receptionist was very friendly and accommodating throughout our stay."
        dims_pos = AspectSentimentExtractor.extract_aspects(text_pos)
        hosp_pos = dims_pos[TravelDimension.HOSPITALITY.value]
        assert hosp_pos.score >= 70.0
        assert hosp_pos.polarity == SentimentPolarity.POSITIVE

        # Negation handling: "not friendly"
        text_neg = "The front desk staff was not helpful and the manager was rude."
        dims_neg = AspectSentimentExtractor.extract_aspects(text_neg)
        hosp_neg = dims_neg[TravelDimension.HOSPITALITY.value]
        assert hosp_neg.score <= 40.0
        assert hosp_neg.polarity == SentimentPolarity.NEGATIVE

    def test_contrastive_clause_splitting(self):
        """
        'The staff was friendly but the wifi was terribly slow.'
        Hospitality should be positive; Wi-Fi should be negative.
        """
        text = "The staff was very friendly and welcoming, but the wifi was terribly slow and dropped constantly."
        dims = AspectSentimentExtractor.extract_aspects(text)

        hosp = dims[TravelDimension.HOSPITALITY.value]
        wifi = dims[TravelDimension.WIFI_REMOTE_WORK.value]

        assert hosp.score >= 70.0
        assert hosp.polarity == SentimentPolarity.POSITIVE

        assert wifi.score <= 35.0
        assert wifi.polarity == SentimentPolarity.NEGATIVE

    def test_value_for_money_and_scenic_serenity(self):
        text = (
            "We had a breathtaking sea view from the balcony and enjoyed a peaceful sunset. "
            "However, the food was extremely overpriced and not worth the bill."
        )
        dims = AspectSentimentExtractor.extract_aspects(text)

        scenic = dims[TravelDimension.SCENIC_SERENITY.value]
        val = dims[TravelDimension.VALUE_FOR_MONEY.value]

        assert scenic.score >= 75.0
        assert scenic.polarity == SentimentPolarity.POSITIVE

        assert val.score <= 40.0
        assert val.polarity == SentimentPolarity.NEGATIVE


class TestVibeTagSynthesizer:
    """Tests for dynamic vibe tag generation."""

    def test_romantic_sunset_spot_tag(self):
        text = "Stunning golden hour and romantic sunset view from the ocean balcony."
        dims = AspectSentimentExtractor.extract_aspects(text)
        tags = VibeTagSynthesizer.synthesize_tags(dims, full_text=text)
        tag_ids = [t.id for t in tags]
        assert "romantic_sunset_spot" in tag_ids

    def test_family_friendly_tag(self):
        text = "The staff was amazingly hospitable and took wonderful care of our family and kids."
        dims = AspectSentimentExtractor.extract_aspects(text)
        tags = VibeTagSynthesizer.synthesize_tags(dims, full_text=text)
        tag_ids = [t.id for t in tags]
        assert "family_friendly" in tag_ids

    def test_backpacker_haven_tag(self):
        text = "Super affordable rates, perfect for solo budget travelers and backpackers."
        dims = AspectSentimentExtractor.extract_aspects(text)
        tags = VibeTagSynthesizer.synthesize_tags(dims, full_text=text)
        tag_ids = [t.id for t in tags]
        assert "backpacker_haven" in tag_ids

    def test_slow_internet_tag(self):
        text = "The wi-fi was crawling and unreliable, completely unusable for remote work."
        dims = AspectSentimentExtractor.extract_aspects(text)
        tags = VibeTagSynthesizer.synthesize_tags(dims, full_text=text)
        tag_ids = [t.id for t in tags]
        assert "slow_internet" in tag_ids
        slow_tag = next(t for t in tags if t.id == "slow_internet")
        assert slow_tag.category == VibeCategory.CAUTION
        assert slow_tag.sentiment == SentimentPolarity.NEGATIVE


class TestAntiSpamAndPerplexityDetector:
    """Tests for linguistic perplexity and fake review identification."""

    def test_authentic_human_review_passes(self):
        human_text = (
            "We stayed for two nights in Cox's Bazar. Check-in was fairly smooth although we waited "
            "about ten minutes. The room was clean, beds were comfy, but the shower pressure was slightly low. "
            "WiFi worked fine for checking email. Great sunset from the pool deck."
        )
        audit = LinguisticPerplexityDetector.audit_review(human_text)
        assert audit.is_spam is False
        assert audit.is_bot_generated is False
        assert audit.spam_score < 0.40
        assert audit.burstiness >= 0.15

    def test_bot_promotional_spam_detected(self):
        bot_text = (
            "Nestled in the heart of paradise, this hotel is truly a testament to luxury and elegance. "
            "From the moment we arrived, the service exceeded all our expectations. "
            "Look no further for your dream vacation, as this is the epitome of comfort and hospitality."
        )
        audit = LinguisticPerplexityDetector.audit_review(bot_text)
        assert audit.is_spam is True
        assert audit.is_promotional is True
        assert "PROMOTIONAL_BOILERPLATE" in audit.flags
        assert audit.spam_score >= 0.50

    def test_defamatory_smear_detected(self):
        smear_text = (
            "Total scam artists and thieves! Do not book here under any circumstance! "
            "They should be shut down immediately and put in prison! Absolute criminals and worst place on earth!"
        )
        audit = LinguisticPerplexityDetector.audit_review(smear_text)
        assert audit.is_spam is True
        assert audit.is_defamatory is True
        assert "DEFAMATORY_ATTACK_PATTERN" in audit.flags


class TestAggregatedVibeScore:
    """Tests for review collection aggregation and down-weighting."""

    def test_aggregation_downweights_fake_reviews(self):
        reviews = [
            {
                "id": "rev-1",
                "text": "Great stay! The room was very clean and staff were extremely helpful. Fast wifi too.",
            },
            {
                "id": "rev-2",
                "text": "Wonderful peaceful location with sunset view. Very fair prices and comfortable bed.",
            },
            {
                # Fake bot promotional review with boilerplate
                "id": "rev-spam",
                "text": "Nestled in the heart of nature, truly a testament to luxury. Exceeded all our expectations, epitome of hospitality.",
            },
            {
                # Malicious smear review with defamatory slogans
                "id": "rev-smear",
                "text": "Absolute scam artists and thieves! They should be shut down! Worst place on earth!",
            },
        ]

        aggregated = VibeAnalyzerService.aggregate_reviews("hotel-sea-pearl", reviews)

        assert aggregated.target_id == "hotel-sea-pearl"
        assert aggregated.total_reviews_analyzed == 4
        assert aggregated.flagged_spam_count >= 2
        assert aggregated.authentic_reviews_count <= 2

        # Verify dimensions were driven by authentic reviews (cleanliness & hospitality positive)
        clean_dim = aggregated.dimensions[TravelDimension.CLEANLINESS.value]
        hosp_dim = aggregated.dimensions[TravelDimension.HOSPITALITY.value]
        assert clean_dim.score >= 65.0
        assert hosp_dim.score >= 65.0

        # Check overall vibe score
        assert aggregated.overall_vibe_score >= 65.0
        assert aggregated.overall_sentiment in ("Great", "Exceptional")
        assert len(aggregated.vibe_tags) > 0


@pytest.mark.asyncio
async def test_vibe_analysis_api_endpoint(client):
    """Test the POST /api/v1/ai/vibe-analysis endpoint."""
    payload = {
        "target_id": "hotel-cox-1",
        "target_type": "hotel",
        "reviews": [
            {
                "id": "rev-1",
                "text": "The sea view from the balcony was breathtaking and the sunset was so romantic! Room was spotless.",
            },
            {
                "id": "rev-2",
                "text": "Very hospitable staff and delicious breakfast. Fast wifi for our zoom calls.",
            },
            {
                "id": "rev-bot",
                "text": "Nestled in the heart of paradise, truly a testament to luxury. Exceeded all our expectations.",
            },
        ],
    }

    response = await client.post("/api/v1/ai/vibe-analysis", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    vibe = data["data"]
    assert vibe["target_id"] == "hotel-cox-1"
    assert vibe["overall_vibe_score"] >= 70.0
    assert "Cleanliness" in vibe["dimensions"]
    assert "Hospitality" in vibe["dimensions"]
    assert "Wi-Fi / Remote Work" in vibe["dimensions"]
    assert "Scenic Serenity" in vibe["dimensions"]
    assert "Value for Money" in vibe["dimensions"]
    assert len(vibe["vibe_tags"]) > 0
    assert vibe["flagged_spam_count"] >= 1


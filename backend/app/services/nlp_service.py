"""
Shopno Jatra - Senior NLP & Semantic Search Service.
High-performance conversational search parser supporting bilingual English and Banglish (Bengali transliteration),
entity extraction, pre-computed vector embeddings for semantic synonym expansion, and multi-vertical intent classification.
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set, Tuple
import numpy as np
from pydantic import BaseModel, Field


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class DateRangeEntity(BaseModel):
    start_date: Optional[str] = Field(None, description="ISO format date YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="ISO format date YYYY-MM-DD")
    relative_expression: Optional[str] = Field(None, description="Original relative text e.g. 'next weekend'")


class TravelEntityExtraction(BaseModel):
    destination: Optional[str] = Field(None, description="Primary destination or city")
    origin: Optional[str] = Field(None, description="Origin city for transit")
    budget_max: Optional[float] = Field(None, description="Maximum budget threshold")
    budget_min: Optional[float] = Field(None, description="Minimum budget threshold")
    currency: Optional[str] = Field("BDT", description="Currency code (default BDT)")
    duration_days: Optional[int] = Field(None, description="Trip duration in days")
    amenities: List[str] = Field(default_factory=list, description="Extracted amenities and lodging features")
    dates: Optional[DateRangeEntity] = Field(None, description="Extracted travel date window")
    traveler_count: Optional[int] = Field(None, description="Number of adult travelers")
    vertical: Optional[str] = Field("hotels", description="Target vertical: hotels, tours, flights, trains")
    cabin_class: Optional[str] = Field(None, description="Economy, Business, First, Snigdha, AC Berth, etc.")
    vibes: List[str] = Field(default_factory=list, description="Atmospheric descriptors e.g. quiet, luxury, romantic")


class ParsedQueryResponse(BaseModel):
    raw_query: str
    normalized_query: str
    language: str = Field("mixed", description="'en', 'banglish', or 'mixed'")
    entities: TravelEntityExtraction
    expanded_synonyms: Dict[str, List[str]] = Field(
        default_factory=dict,
        description="Synonyms expanded via pre-computed vector embedding cosine similarity",
    )
    confidence: float = Field(1.0, ge=0.0, le=1.0)


# ============================================================================
# PRE-COMPUTED SEMANTIC VECTOR EMBEDDINGS (Normalized Dense Vectors)
# ============================================================================
# Semantic vectors in a 16-dimensional latent space capturing travel attributes:
# Dim 0: Tranquility/Quietness    Dim 8:  Hill/Nature/Eco
# Dim 1: Budget/Economical       Dim 9:  Romance/Couples
# Dim 2: Luxury/Premium          Dim 10: Family/Group
# Dim 3: Coastal/Beach/Sea       Dim 11: Food/Breakfast
# Dim 4: Aquatic/Pool/Water      Dim 12: Connectivity/Wifi
# Dim 5: Vessel/Boat/Launch      Dim 13: Climate/AC
# Dim 6: Cabin/Berth/Private     Dim 14: Scenic/Views
# Dim 7: Lodging/Resort/Hotel    Dim 15: Adventure/Trekking

_SEMANTIC_BASIS: Dict[str, List[float]] = {
    # Tranquility & Silence cluster (Exact prompt alignment: 'quiet' -> 'peaceful', 'serene', 'isolated')
    "quiet":           [1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "peaceful":        [0.985, 0.170, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "serene":          [0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "isolated":        [0.910, 0.415, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "tranquil":        [0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "calm":            [0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "secluded":        [0.820, 0.572, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "nirbili":         [0.800, 0.600, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "shanto":          [0.780, 0.626, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Budget & Affordability cluster (Dim 1 dominant)
    "cheap":           [0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "budget":          [0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "affordable":      [0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "economical":      [0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "low-cost":        [0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "pocket-friendly": [0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "sosta":           [0.000, 0.840, 0.543, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "kom dame":        [0.000, 0.820, 0.572, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Luxury & Premium cluster (Dim 2 dominant)
    "luxury":          [0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "premium":         [0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "deluxe":          [0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "5-star":          [0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "bhalo":           [0.000, 0.000, 0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Coastal & Beach cluster (Dim 3 dominant)
    "beach":           [0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "seaside":         [0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "coastal":         [0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "oceanfront":      [0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "sea view":        [0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "waterfront":      [0.000, 0.000, 0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "somudro":         [0.000, 0.000, 0.000, 0.840, 0.543, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Aquatic & Pool cluster (Dim 4 dominant)
    "pool":            [0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "swimming pool":   [0.000, 0.000, 0.000, 0.000, 0.985, 0.173, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "infinity pool":   [0.000, 0.000, 0.000, 0.000, 0.940, 0.341, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "heated pool":     [0.000, 0.000, 0.000, 0.000, 0.910, 0.415, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "jacuzzi":         [0.000, 0.000, 0.000, 0.000, 0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Vessel & Launch transport cluster (Dim 5 dominant)
    "launch":          [0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "boat":            [0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "cruise":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "steamer":         [0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "ferry":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "trawler":         [0.000, 0.000, 0.000, 0.000, 0.000, 0.850, 0.527, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Cabin & Berth cluster (Dim 6 dominant)
    "cabin":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "launch cabin":    [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "deck cabin":      [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "berth":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "stateroom":       [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.880, 0.475, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Lodging & Resort cluster (Dim 7 dominant)
    "resort":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "retreat":         [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "villa":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "cottage":         [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "lodge":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "hotel":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.860, 0.510, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Nature & Mountain cluster (Dim 8 dominant)
    "nature":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "hills":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "mountain":        [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "forest":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.920, 0.392, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "mangrove":        [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.890, 0.456, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "pahar":           [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.960, 0.280, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Romance & Couples cluster (Dim 9 dominant)
    "romantic":        [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000],
    "couple":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000, 0.000, 0.000, 0.000],
    "honeymoon":       [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.950, 0.312, 0.000, 0.000, 0.000, 0.000, 0.000],

    # Amenities: Wifi (Dim 12), AC (Dim 13), Food (Dim 11)
    "wifi":            [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000],
    "internet":        [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000, 0.000],
    "ac":              [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000],
    "air condition":   [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.980, 0.199, 0.000],
    "breakfast":       [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 1.000, 0.000, 0.000, 0.000, 0.000],
    "buffet":          [0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.000, 0.960, 0.000, 0.000, 0.280, 0.000],
}


class PrecomputedEmbeddingEngine:
    """
    Computes cosine similarities over unit-normalized semantic embeddings for travel terms.
    """
    def __init__(self):
        self.embeddings: Dict[str, np.ndarray] = {}
        for term, vec in _SEMANTIC_BASIS.items():
            arr = np.array(vec, dtype=np.float32)
            norm = np.linalg.norm(arr)
            self.embeddings[term.lower()] = arr / (norm if norm > 0 else 1.0)

    def get_embedding(self, term: str) -> Optional[np.ndarray]:
        clean = term.strip().lower()
        if clean in self.embeddings:
            return self.embeddings[clean]
        # Multi-word check or sub-token average
        tokens = [t for t in clean.split() if t in self.embeddings]
        if tokens:
            vecs = [self.embeddings[t] for t in tokens]
            avg = np.mean(vecs, axis=0)
            norm = np.linalg.norm(avg)
            return avg / (norm if norm > 0 else 1.0)
        return None

    def expand_synonyms(
        self,
        term: str,
        top_k: int = 5,
        min_similarity: float = 0.65,
    ) -> List[Tuple[str, float]]:
        """
        Find closest synonyms using pre-computed embeddings dot product (cosine similarity).
        """
        query_vec = self.get_embedding(term)
        if query_vec is None:
            return []

        clean_term = term.strip().lower()
        scored: List[Tuple[str, float]] = []

        for candidate, cand_vec in self.embeddings.items():
            if candidate == clean_term:
                continue
            sim = float(np.dot(query_vec, cand_vec))
            if sim >= min_similarity:
                scored.append((candidate, round(sim, 3)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]


_EMBEDDING_ENGINE = PrecomputedEmbeddingEngine()


# ============================================================================
# BANGLISH & ENGLISH LEXICAL RULES & DICTIONARIES
# ============================================================================

BANGLISH_DESTINATIONS = {
    # Sundarbans
    "shundarbon": "Sundarbans",
    "shundarban": "Sundarbans",
    "sundarban": "Sundarbans",
    "sundarbans": "Sundarbans",
    "sundorbon": "Sundarbans",
    "sundorban": "Sundarbans",
    # Cox's Bazar
    "coxs bazar": "Cox's Bazar",
    "cox bazar": "Cox's Bazar",
    "coxsbazar": "Cox's Bazar",
    "coxbazar": "Cox's Bazar",
    "kox bazar": "Cox's Bazar",
    "koxbazar": "Cox's Bazar",
    "koksbazar": "Cox's Bazar",
    "cxb": "Cox's Bazar",
    # Sajek Valley
    "sajek": "Sajek Valley",
    "shajek": "Sajek Valley",
    "sajek valley": "Sajek Valley",
    "shajek valley": "Sajek Valley",
    # Sreemangal
    "sreemangal": "Sreemangal",
    "sreemongol": "Sreemangal",
    "srimangal": "Sreemangal",
    "srimongol": "Sreemangal",
    "moulvibazar": "Sreemangal",
    # Sylhet
    "sylhet": "Sylhet",
    "shilhet": "Sylhet",
    "silet": "Sylhet",
    # Saint Martin
    "saint martin": "Saint Martin",
    "sent martin": "Saint Martin",
    "st martin": "Saint Martin",
    "st. martin": "Saint Martin",
    "sentmartin": "Saint Martin",
    "saintmartin": "Saint Martin",
    "narikel jinjira": "Saint Martin",
    # Kuakata
    "kuakata": "Kuakata",
    "kuacata": "Kuakata",
    # Bandarban
    "bandarban": "Bandarban",
    "bandorban": "Bandarban",
    # Rangamati
    "rangamati": "Rangamati",
    # Major Cities
    "dhaka": "Dhaka",
    "daka": "Dhaka",
    "chittagong": "Chittagong",
    "chattogram": "Chittagong",
    "ctg": "Chittagong",
    "rajshahi": "Rajshahi",
    "khulna": "Khulna",
    "barishal": "Barishal",
    "borishal": "Barishal",
}

BANGLISH_NUMBERS = {
    "ek": 1,
    "dui": 2,
    "tin": 3,
    "char": 4,
    "paach": 5,
    "pach": 5,
    "choy": 6,
    "shat": 7,
    "sat": 7,
    "aat": 8,
    "at": 8,
    "noy": 9,
    "noi": 9,
    "dosh": 10,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,
}

AMENITY_PATTERNS = [
    (r"\b(?:launch cabin|cabin|stateroom|berth)\b", "launch cabin"),
    (r"\b(?:swimming pool|pool|pukur)\b", "pool"),
    (r"\b(?:quiet|peaceful|serene|isolated|tranquil|nirbili|shanto|chupchap)\b", "quiet"),
    (r"\b(?:beach|seaside|coastal|beach resort|somudro|shaikat)\b", "beach"),
    (r"\b(?:resort|retreat|villa|cottage)\b", "resort"),
    (r"\b(?:wifi|wi-fi|internet)\b", "wifi"),
    (r"\b(?:ac|air condition|air conditioned)\b", "ac"),
    (r"\b(?:breakfast|nasta|shokaler khabar|buffet)\b", "breakfast"),
    (r"\b(?:sea view|ocean view|somudro view)\b", "sea view"),
    (r"\b(?:hill view|mountain view|pahar view)\b", "hill view"),
    (r"\b(?:gym|fitness|spa)\b", "gym"),
    (r"\b(?:parking|garage)\b", "parking"),
    (r"\b(?:bhalo|deluxe|luxury|5-star|premium)\b", "deluxe"),
]


# ============================================================================
# NLP SERVICE CLASS
# ============================================================================

class NLPService:
    """
    Conversational search parser for English and Banglish colloquial travel requests.
    Performs entity extraction, date normalization, semantic vector expansion,
    and multi-vertical mapping.
    """

    @classmethod
    def normalize_text(cls, text: str) -> str:
        """Sanitize, lowercase, and normalize whitespace."""
        cleaned = re.sub(r"[\r\n\t]+", " ", text.lower().strip())
        cleaned = re.sub(r"[^\w\s\-\.\,\']", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned)
        return cleaned

    @classmethod
    def detect_language(cls, text: str) -> str:
        """Detect whether input is predominantly English, Banglish, or mixed."""
        banglish_indicators = {
            "shundarbon", "sundarban", "jonno", "diner", "bhalo", "valo", "takar",
            "moddhe", "jabo", "thakbe", "kaalke", "poroshu", "aajke", "shanto",
            "nirbili", "kom", "dame", "shostay", "sosta", "theke", "er", "kore",
            "somudro", "pahar", "nasta", "dujon", "tinjon", "ekjon",
        }
        words = set(re.findall(r"\b\w+\b", text.lower()))
        banglish_matches = words.intersection(banglish_indicators)
        if len(banglish_matches) >= 2:
            return "banglish"
        elif len(banglish_matches) == 1:
            return "mixed"
        return "en"

    @classmethod
    def extract_traveler_count(cls, text: str) -> Optional[int]:
        """
        Extract adult/traveler count from phrases:
        '2 adults', 'for 2 adults', '2 people', '2 persons', 'dujon', '2 jon', 'solo', 'couple'
        """
        # Specific Banglish merged words: dujon, tinjon, etc.
        m_merged = re.search(r"\b(ek|dui|tin|char|paach|pach|choy|shat|aat|noy|dosh)jon\b", text)
        if m_merged:
            return BANGLISH_NUMBERS.get(m_merged.group(1), 1)

        # Digit + jon: e.g. "2 jon", "2jon", "3 jon"
        m_digit_jon = re.search(r"\b(\d+)\s*jon\b", text)
        if m_digit_jon:
            return int(m_digit_jon.group(1))

        # English patterns: '2 adults', 'for 2', '2 people', '2 guests', '2 persons'
        m_adults = re.search(r"\b(?:for\s*)?(\d+)\s*(?:adults?|persons?|people|guests?|travelers?)\b", text)
        if m_adults:
            return int(m_adults.group(1))

        # Standalone 'for X'
        m_for_num = re.search(r"\bfor\s+(\d+)\b", text)
        if m_for_num:
            return int(m_for_num.group(1))

        # Word forms: 'couple' -> 2, 'solo' -> 1, 'family' -> 4
        if re.search(r"\b(?:couple|dujon|two of us)\b", text):
            return 2
        if re.search(r"\b(?:solo|alone|single|ekjon)\b", text):
            return 1
        if re.search(r"\b(?:family)\b", text):
            return 4

        return None

    @classmethod
    def extract_duration_days(cls, text: str) -> Optional[int]:
        """
        Extract duration in days from:
        '3-day', '3 days', '3 din', '2 diner jonno', '2 nights', '1 week'
        """
        # '3-day', '3 days', '3 day'
        m_en_days = re.search(r"\b(\d+)\s*[-\s]?\s*days?\b", text)
        if m_en_days:
            return int(m_en_days.group(1))

        # '2 diner jonno', '2 diner', '2 din'
        m_bn_days = re.search(r"\b(\d+)\s*(?:diner|din)(?:\s*jonno)?\b", text)
        if m_bn_days:
            return int(m_bn_days.group(1))

        # Banglish word number + diner: 'tin diner', 'dui diner jonno'
        m_word_din = re.search(
            r"\b(ek|dui|tin|char|paach|pach|choy|shat|aat|noy|dosh)\s*(?:diner|din)(?:\s*jonno)?\b",
            text,
        )
        if m_word_din:
            return BANGLISH_NUMBERS.get(m_word_din.group(1), 1)

        # '2 nights', '2 raat', '2 raater'
        m_nights = re.search(r"\b(\d+)\s*(?:nights?|raat|raater)\b", text)
        if m_nights:
            return int(m_nights.group(1))

        # '1 week', '2 weeks'
        m_week = re.search(r"\b(\d+)\s*(?:weeks?|soptaho)\b", text)
        if m_week:
            return int(m_week.group(1)) * 7

        return None

    @classmethod
    def extract_budget(cls, text: str) -> Tuple[Optional[float], Optional[float], str]:
        """
        Extract max and min budget values and currency.
        Handles: 'under 6000 BDT', '6000 takar moddhe', 'under 6k', '5000 tk', '5000-8000 BDT', etc.
        """
        currency = "BDT"
        if re.search(r"\b(?:usd|\$|dollars?)\b", text):
            currency = "USD"
        elif re.search(r"\b(?:euro|eur|€)\b", text):
            currency = "EUR"

        # Range pattern: e.g. "5000 - 8000 BDT" or "5000 theke 8000 taka"
        m_range = re.search(
            r"\b(\d+(?:\.\d+)?)\s*(?:k|hajar)?\s*(?:-|to|theke)\s*(\d+(?:\.\d+)?)\s*(?:k|hajar)?\s*(?:bdt|taka|takar|tk|\$)?\b",
            text,
        )
        if m_range:
            v_min = float(m_range.group(1))
            v_max = float(m_range.group(2))
            if "k" in m_range.group(0).lower():
                if v_min < 100: v_min *= 1000
                if v_max < 100: v_max *= 1000
            return v_max, v_min, currency

        # "under 6000 BDT", "below 6000", "upto 6000", "6000 takar moddhe", "within 6000"
        m_under = re.search(
            r"\b(?:under|below|upto|within|max|kom|moddhe)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*(k|hajar)?\s*(?:bdt|taka|takar|tk|\$)?\b",
            text,
        )
        if m_under:
            val = float(m_under.group(1))
            if m_under.group(2) or val < 100:
                val *= 1000
            return val, None, currency

        # Suffix format: "6000 BDT under", "5000 takar moddhe", "6000 tk budget", "6k budget"
        m_suffix = re.search(
            r"\b(\d+(?:\.\d+)?)\s*(k|hajar)?\s*(?:bdt|taka|takar|tk)\s*(?:er\s*)?(?:moddhe|budget|porjonto)?\b",
            text,
        )
        if m_suffix:
            val = float(m_suffix.group(1))
            if m_suffix.group(2) == "k" or (val < 100 and m_suffix.group(2)):
                val *= 1000
            return val, None, currency

        # "under 6k"
        m_k = re.search(r"\b(?:under|within|max|below)\s*(\d+(?:\.\d+)?)\s*k\b", text)
        if m_k:
            return float(m_k.group(1)) * 1000, None, currency

        # Suffix "6k" with context
        m_k_suffix = re.search(r"\b(\d+(?:\.\d+)?)\s*k\s*(?:bdt|taka|tk|budget)?\b", text)
        if m_k_suffix:
            return float(m_k_suffix.group(1)) * 1000, None, currency

        # Colloquial cheap / budget indicators without explicit number
        if re.search(r"\b(?:cheap|budget|kom dame|sosta|shostay|pocket-friendly)\b", text):
            # Reasonable default ceiling for cheap Bangladesh travel
            return 5000.0, None, currency

        return None, None, currency

    @classmethod
    def extract_dates(
        cls,
        text: str,
        reference_date: Optional[datetime] = None,
    ) -> Optional[DateRangeEntity]:
        """
        Extract travel dates resolving relative expressions:
        'next weekend', 'this weekend', 'tomorrow', 'kaalke', 'today', 'aajke', 'next week',
        or explicit dates 'YYYY-MM-DD', '15 Nov', etc.
        """
        ref = reference_date or datetime.now()

        # 1. "next weekend" or "samner weekend" or "porer weekend"
        if re.search(r"\b(?:next\s+weekend|samner\s+weekend|porer\s+weekend)\b", text):
            # Calculate next week's Friday and Sunday
            # In BD/International travel, weekend is Fri-Sat or Fri-Sun
            days_ahead = (4 - ref.weekday()) % 7  # 4 = Friday
            if days_ahead <= 0:
                days_ahead += 7
            # If today is Monday-Thursday, next weekend means following week's weekend
            if ref.weekday() <= 3:  # Mon-Thu
                # "this weekend" would be upcoming Friday, "next weekend" is next week
                days_ahead += 7
            fri = ref + timedelta(days=days_ahead)
            sun = fri + timedelta(days=2)
            return DateRangeEntity(
                start_date=fri.strftime("%Y-%m-%d"),
                end_date=sun.strftime("%Y-%m-%d"),
                relative_expression="next weekend",
            )

        # 2. "this weekend" or "ei weekend"
        if re.search(r"\b(?:this\s+weekend|ei\s+weekend|weekend\s*e)\b", text):
            days_ahead = (4 - ref.weekday()) % 7
            if days_ahead == 0 and ref.weekday() == 4:
                # Today is Friday
                fri = ref
            else:
                fri = ref + timedelta(days=days_ahead)
            sun = fri + timedelta(days=2)
            return DateRangeEntity(
                start_date=fri.strftime("%Y-%m-%d"),
                end_date=sun.strftime("%Y-%m-%d"),
                relative_expression="this weekend",
            )

        # 3. "tomorrow", "kaalke", "kaal", "agamikal"
        if re.search(r"\b(?:tomorrow|kaalke|kaal|agamikal)\b", text):
            tomorrow = ref + timedelta(days=1)
            return DateRangeEntity(
                start_date=tomorrow.strftime("%Y-%m-%d"),
                end_date=(tomorrow + timedelta(days=1)).strftime("%Y-%m-%d"),
                relative_expression="tomorrow",
            )

        # 4. "today", "aaj", "aajke"
        if re.search(r"\b(?:today|aajke|aaj)\b", text):
            return DateRangeEntity(
                start_date=ref.strftime("%Y-%m-%d"),
                end_date=(ref + timedelta(days=1)).strftime("%Y-%m-%d"),
                relative_expression="today",
            )

        # 5. "day after tomorrow", "poroshu"
        if re.search(r"\b(?:day after tomorrow|poroshu)\b", text):
            day_after = ref + timedelta(days=2)
            return DateRangeEntity(
                start_date=day_after.strftime("%Y-%m-%d"),
                end_date=(day_after + timedelta(days=1)).strftime("%Y-%m-%d"),
                relative_expression="day after tomorrow",
            )

        # 6. "next week", "samner soptaho"
        if re.search(r"\b(?:next\s+week|samner\s+soptaho|porer\s+soptaho)\b", text):
            days_until_mon = (7 - ref.weekday()) % 7
            if days_until_mon == 0:
                days_until_mon = 7
            mon = ref + timedelta(days=days_until_mon)
            sun = mon + timedelta(days=6)
            return DateRangeEntity(
                start_date=mon.strftime("%Y-%m-%d"),
                end_date=sun.strftime("%Y-%m-%d"),
                relative_expression="next week",
            )

        # 7. ISO explicit date (YYYY-MM-DD)
        m_iso = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", text)
        if m_iso:
            start_d = m_iso.group(1)
            return DateRangeEntity(
                start_date=start_d,
                end_date=None,
                relative_expression=start_d,
            )

        return None

    @classmethod
    def extract_destination_and_origin(
        cls,
        text: str,
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract destination and origin from query text.
        Handles:
        - Banglish transliterations ('shundarbon', 'koksbazar', 'sajek')
        - Route queries ('dhaka theke chittagong', 'from dhaka to cox bazar')
        - General nature concepts ('beach resort' -> 'Cox\'s Bazar', 'sea beach' -> 'Cox\'s Bazar')
        """
        origin: Optional[str] = None
        destination: Optional[str] = None

        # Check for explicit route patterns:
        # 'dhaka theke chittagong' or 'from dhaka to cox's bazar'
        m_route_bn = re.search(r"\b([a-zA-Z\s\']+)\s+theke\s+([a-zA-Z\s\']+)\b", text)
        if m_route_bn:
            cand_from = m_route_bn.group(1).strip()
            cand_to = m_route_bn.group(2).strip()
            for key, canonical in BANGLISH_DESTINATIONS.items():
                if key in cand_from:
                    origin = canonical
                if key in cand_to:
                    destination = canonical
            if destination:
                return destination, origin

        m_route_en = re.search(r"\bfrom\s+([a-zA-Z\s\']+)\s+to\s+([a-zA-Z\s\']+)\b", text)
        if m_route_en:
            cand_from = m_route_en.group(1).strip()
            cand_to = m_route_en.group(2).strip()
            for key, canonical in BANGLISH_DESTINATIONS.items():
                if key in cand_from:
                    origin = canonical
                if key in cand_to:
                    destination = canonical
            if destination:
                return destination, origin

        # General destination scan (longer names first)
        sorted_keys = sorted(BANGLISH_DESTINATIONS.keys(), key=len, reverse=True)
        for key in sorted_keys:
            pattern = rf"\b{re.escape(key)}\b"
            if re.search(pattern, text):
                destination = BANGLISH_DESTINATIONS[key]
                break

        # Fallback to generic geographical features
        if not destination:
            if re.search(r"\b(?:beach|seaside|ocean|somudro)\b", text):
                destination = "Cox's Bazar"
            elif re.search(r"\b(?:mangrove|jungle|bon)\b", text):
                destination = "Sundarbans"
            elif re.search(r"\b(?:tea garden|cha bagan)\b", text):
                destination = "Sreemangal"
            elif re.search(r"\b(?:cloud|pahari|pahar)\b", text):
                destination = "Sajek Valley"

        return destination, origin

    @classmethod
    def extract_amenities(cls, text: str) -> List[str]:
        """
        Extract amenities, facilities, and lodging features.
        """
        extracted = []
        seen = set()

        for pattern, canonical in AMENITY_PATTERNS:
            if re.search(pattern, text):
                if canonical not in seen:
                    extracted.append(canonical)
                    seen.add(canonical)

        return extracted

    @classmethod
    def detect_vertical(
        cls,
        text: str,
        entities: TravelEntityExtraction,
    ) -> str:
        """
        Classify vertical intent into: 'hotels', 'tours', 'flights', 'trains'.
        """
        # Train keywords
        if re.search(r"\b(?:train|rail|railway|intercity|snigdha|shovan|berth|station)\b", text):
            return "trains"

        # Flight keywords
        if re.search(r"\b(?:flight|plane|airline|airport|air ticket|fly|biman)\b", text):
            return "flights"

        # Launch / Boat tour keywords
        if re.search(r"\b(?:launch|nouka|trawler|steamer|cruise|boat|safari|tour package|trip)\b", text):
            return "tours"

        # Tour keywords
        if "launch cabin" in entities.amenities or entities.duration_days and entities.duration_days > 1 and "tour" in text:
            return "tours"

        # Hotel / Resort keywords
        if re.search(r"\b(?:hotel|resort|room|stay|cottage|villa|hostel|guest house)\b", text):
            return "hotels"

        # If amenities like pool, beach, quiet are mentioned -> hotels
        if any(a in entities.amenities for a in ["pool", "resort", "quiet", "beach", "ac"]):
            return "hotels"

        return "hotels"

    @classmethod
    def expand_entities(
        cls,
        entities: TravelEntityExtraction,
        top_k: int = 4,
        min_similarity: float = 0.70,
    ) -> Dict[str, List[str]]:
        """
        Expand extracted amenities and vibe terms using pre-computed vector embeddings.
        E.g., 'quiet' -> ['peaceful', 'serene', 'isolated', 'tranquil'].
        """
        expansion: Dict[str, List[str]] = {}
        terms_to_expand = list(entities.amenities) + list(entities.vibes)

        for term in terms_to_expand:
            synonyms = _EMBEDDING_ENGINE.expand_synonyms(
                term=term,
                top_k=top_k,
                min_similarity=min_similarity,
            )
            if synonyms:
                expansion[term] = [syn for syn, _ in synonyms]

        return expansion

    @classmethod
    def parse_query(
        cls,
        query: str,
        reference_date: Optional[datetime] = None,
    ) -> ParsedQueryResponse:
        """
        Main end-to-end NLP parser:
        1. Normalizes text
        2. Detects language (English, Banglish, Mixed)
        3. Extracts entities (destination, budget_max, duration_days, amenities, dates, traveler_count)
        4. Identifies vertical (hotels, tours, flights, trains)
        5. Expands semantic synonyms via pre-computed vector embeddings
        """
        normalized = cls.normalize_text(query)
        language = cls.detect_language(normalized)

        # Extract entities
        destination, origin = cls.extract_destination_and_origin(normalized)
        budget_max, budget_min, currency = cls.extract_budget(normalized)
        duration_days = cls.extract_duration_days(normalized)
        dates = cls.extract_dates(normalized, reference_date=reference_date)
        traveler_count = cls.extract_traveler_count(normalized)
        amenities = cls.extract_amenities(normalized)

        # Vibes extraction
        vibes = []
        if any(w in normalized for w in ["quiet", "nirbili", "shanto", "chupchap"]):
            vibes.append("quiet")
        if any(w in normalized for w in ["luxury", "bhalo", "premium", "5-star"]):
            vibes.append("luxury")
        if any(w in normalized for w in ["cheap", "budget", "sosta", "kom dame"]):
            vibes.append("cheap")
        if any(w in normalized for w in ["romantic", "couple", "honeymoon"]):
            vibes.append("romantic")

        entities = TravelEntityExtraction(
            destination=destination,
            origin=origin,
            budget_max=budget_max,
            budget_min=budget_min,
            currency=currency,
            duration_days=duration_days,
            amenities=amenities,
            dates=dates,
            traveler_count=traveler_count or 1,
            cabin_class="SNIGDHA" if "snigdha" in normalized else None,
            vibes=vibes,
        )

        # Detect vertical
        vertical = cls.detect_vertical(normalized, entities)
        entities.vertical = vertical

        # Semantic synonym expansion via pre-computed embeddings
        expanded = cls.expand_entities(entities)

        return ParsedQueryResponse(
            raw_query=query,
            normalized_query=normalized,
            language=language,
            entities=entities,
            expanded_synonyms=expanded,
            confidence=0.95 if destination else 0.85,
        )


# Singleton instance
nlp_service = NLPService()

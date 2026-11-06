"""
High-Performance Hybrid Recommendation Engine & ML Service.
Engineered for Shopno Jatra Travel Ecosystem.

Key Capabilities:
1. 40-Parameter Taxonomy Feature Vectorization (NumPy / SciPy).
2. L2-Normalized Cosine Similarity for Live User Sessions vs Catalog Vectors.
3. Thompson Sampling Multi-Armed Bandit (Beta Distribution) for Cold-Start Regional Exploration.
4. Hybrid Content-Based & Item-Collaborative Fusion with Dynamic Contextual Boosting.
5. Strict Pydantic v2 Validation with Confidence Scores bounded in [0.0 - 1.0].
"""

import asyncio
import logging
import math
import time
from typing import Any, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
from scipy.spatial.distance import cdist

from app.schemas.ml import (
    BanditArmState,
    BanditFeedbackRequest,
    CatalogItem,
    CatalogItemType,
    RecommendationFeatureTaxonomy,
    RecommendationRequest,
    RecommendationResponse,
    ScoredRecommendation,
)

logger = logging.getLogger(__name__)


# ==============================================================================
# 1. THOMPSON SAMPLING MULTI-ARMED BANDIT (REGIONAL COLD-START)
# ==============================================================================

class ThompsonSamplingBandit:
    """
    Bayesian Multi-Armed Bandit using Conjugate Beta-Binomial Updating.
    Specialized for travel regional cold-start exploration across Bangladesh:
    - Cox's Bazar (World's longest natural sea beach)
    - Sylhet (Lush tea hills, Ratargul swamp forest, waterfalls)
    - Sajek Valley (Kingdom of clouds, eco-cottages, hill tracts)
    - Sundarbans (UNESCO World Heritage mangrove forest, wildlife)
    """

    DEFAULT_PRIORS: Dict[str, Dict[str, Any]] = {
        "coxs_bazar": {
            "name": "Cox's Bazar",
            "alpha": 85.0,  # Prior positive interactions (clicks, dwell, bookings)
            "beta": 25.0,   # Prior non-conversions / bounces
            "description": "Longest sea beach, marine drive, and luxury coastal resorts",
        },
        "sylhet": {
            "name": "Sylhet",
            "alpha": 72.0,
            "beta": 26.0,
            "description": "Lush green tea gardens, Ratargul freshwater swamp, and Jaflong",
        },
        "sajek": {
            "name": "Sajek Valley",
            "alpha": 78.0,
            "beta": 28.0,
            "description": "Scenic cloud valley, cliffside eco-cottages, and mountain tranquility",
        },
        "sundarbans": {
            "name": "Sundarbans",
            "alpha": 58.0,
            "beta": 26.0,
            "description": "UNESCO mangrove biosphere, Royal Bengal Tiger safari, and river cruising",
        },
    }

    def __init__(self, random_seed: Optional[int] = 42) -> None:
        self._rng = np.random.default_rng(random_seed)
        self._arms: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()
        self._pull_counts: Dict[str, int] = {}
        self._reset_to_priors()

    def _reset_to_priors(self) -> None:
        """Initializes arms with calibrated regional travel priors."""
        for arm_id, meta in self.DEFAULT_PRIORS.items():
            self._arms[arm_id] = {
                "name": meta["name"],
                "alpha": float(meta["alpha"]),
                "beta": float(meta["beta"]),
                "description": meta["description"],
            }
            self._pull_counts[arm_id] = int(meta["alpha"] + meta["beta"])

    def sample_arms(self) -> Dict[str, float]:
        """
        Draws a Monte Carlo sample from the Beta posterior theta_k ~ Beta(alpha_k, beta_k)
        for every regional arm.
        Returns mapping of arm_id -> sampled expectation in [0.0, 1.0].
        """
        samples: Dict[str, float] = {}
        for arm_id, arm in self._arms.items():
            draw = self._rng.beta(arm["alpha"], arm["beta"])
            samples[arm_id] = float(np.clip(draw, 0.0, 1.0))
        return samples

    def get_best_arm(self) -> Tuple[str, float]:
        """Draws samples and returns the winning arm (highest sampled value) and its score."""
        samples = self.sample_arms()
        best_arm = max(samples.items(), key=lambda kv: kv[1])
        return best_arm[0], best_arm[1]

    def update(self, arm_id: str, reward: float) -> None:
        """
        Updates the Beta distribution posterior based on observed feedback:
        - reward >= 0.5: success (alpha += 1.0)
        - reward < 0.5: failure/bounce (beta += 1.0)
        Supports fractional rewards for continuous engagement signals.
        """
        normalized_arm = arm_id.lower().replace(" ", "_").replace("'", "")
        if normalized_arm not in self._arms:
            # Map canonical city names
            city_map = {
                "coxs_bazar": "coxs_bazar",
                "coxsbazar": "coxs_bazar",
                "coxs_bazar_beach": "coxs_bazar",
                "sylhet": "sylhet",
                "sreemangal": "sylhet",
                "sajek": "sajek",
                "sajek_valley": "sajek",
                "sundarbans": "sundarbans",
                "khulna": "sundarbans",
            }
            normalized_arm = city_map.get(normalized_arm, "coxs_bazar")

        arm = self._arms[normalized_arm]
        r = float(np.clip(reward, 0.0, 1.0))
        # Incremental Bayesian update
        arm["alpha"] += r
        arm["beta"] += (1.0 - r)
        self._pull_counts[normalized_arm] = self._pull_counts.get(normalized_arm, 0) + 1
        logger.debug(
            f"Bandit update for {normalized_arm}: reward={r:.2f}, alpha={arm['alpha']:.1f}, beta={arm['beta']:.1f}"
        )

    def get_arm_states(self) -> List[BanditArmState]:
        """Returns diagnostic snapshots of all bandit arms."""
        states: List[BanditArmState] = []
        for arm_id, arm in self._arms.items():
            a = arm["alpha"]
            b = arm["beta"]
            expected = a / (a + b) if (a + b) > 0 else 0.5
            states.append(
                BanditArmState(
                    arm_id=arm_id,
                    region_name=arm["name"],
                    alpha=round(a, 2),
                    beta=round(b, 2),
                    expected_value=round(float(expected), 4),
                    pulls_count=self._pull_counts.get(arm_id, 0),
                )
            )
        return sorted(states, key=lambda s: s.expected_value, reverse=True)


# ==============================================================================
# 2. FEATURE VECTOR ENGINE (40-PARAMETER TAXONOMY)
# ==============================================================================

class FeatureVectorEngine:
    """
    Manages vector construction, validation, normalization, and projection
    for the 40-parameter real-time travel taxonomy.
    """

    DIMENSION: int = 40

    @classmethod
    def to_vector(
        cls,
        features: Optional[Union[RecommendationFeatureTaxonomy, Dict[str, float], Sequence[float]]] = None,
    ) -> np.ndarray:
        """
        Converts diverse input representations into a strictly validated
        (40,) float64 NumPy array with values bounded in [0.0, 1.0].
        """
        if features is None:
            # Default prior vector
            taxonomy = RecommendationFeatureTaxonomy()
            return taxonomy.to_vector()

        if isinstance(features, RecommendationFeatureTaxonomy):
            return features.to_vector()

        if isinstance(features, (list, tuple, np.ndarray)):
            arr = np.asarray(features, dtype=np.float64).flatten()
            if len(arr) != cls.DIMENSION:
                # Pad or truncate gracefully
                padded = np.zeros(cls.DIMENSION, dtype=np.float64)
                copy_len = min(len(arr), cls.DIMENSION)
                padded[:copy_len] = arr[:copy_len]
                arr = padded
            return np.clip(arr, 0.0, 1.0)

        if isinstance(features, dict):
            # Parse via Pydantic model for robust type conversion
            sanitized = {}
            for k in RecommendationFeatureTaxonomy.get_parameter_keys():
                if k in features:
                    try:
                        sanitized[k] = float(np.clip(float(features[k]), 0.0, 1.0))
                    except (ValueError, TypeError):
                        pass
            taxonomy = RecommendationFeatureTaxonomy(**sanitized)
            return taxonomy.to_vector()

        raise TypeError(f"Unsupported features type: {type(features)}")

    @classmethod
    def compute_cosine_similarity(
        cls,
        user_vector: np.ndarray,
        catalog_matrix: np.ndarray,
    ) -> np.ndarray:
        """
        Calculates cosine similarity between a live user session vector and a catalog matrix.
        Uses SciPy cdist with fallback to vectorized NumPy dot product.
        Guarantees returned similarity array has shape (N,) with values in [0.0, 1.0].
        """
        # Ensure 2D user vector shape (1, 40)
        u = np.asarray(user_vector, dtype=np.float64).reshape(1, -1)
        C = np.asarray(catalog_matrix, dtype=np.float64)

        if C.ndim != 2 or C.shape[1] != cls.DIMENSION:
            raise ValueError(f"Catalog matrix must have shape (N, {cls.DIMENSION}), got {C.shape}")

        u_norm = np.linalg.norm(u)
        if u_norm < 1e-9:
            # Degenerate / zero user vector: return zeros
            return np.zeros(C.shape[0], dtype=np.float64)

        try:
            # SciPy distance cdist: cosine distance = 1 - cosine_similarity
            distances = cdist(u, C, metric="cosine")[0]
            # Handle potential numerical precision artifacts
            similarities = 1.0 - distances
        except Exception:
            # Vectorized NumPy fallback
            c_norms = np.linalg.norm(C, axis=1)
            dot_prods = np.dot(C, u.flatten())
            denom = c_norms * u_norm
            similarities = np.where(denom > 1e-9, dot_prods / denom, 0.0)

        # Strictly clamp to [0.0, 1.0] since all features are non-negative
        return np.clip(similarities, 0.0, 1.0)


# ==============================================================================
# 3. SEED CATALOG (DESTINATIONS, HOTELS, TOURS ACROSS BANGLADESH)
# ==============================================================================

def build_seed_catalog() -> List[CatalogItem]:
    """
    Constructs a rich initial catalog of premier destinations, resorts, and tours
    spanning Cox's Bazar, Sylhet, Sajek Valley, and Sundarbans.
    """
    items: List[CatalogItem] = [
        # --- Cox's Bazar ---
        CatalogItem(
            id="dest-coxs-bazar",
            name="Cox's Bazar Long Beach & Marine Drive",
            item_type=CatalogItemType.DESTINATION,
            city="Cox's Bazar",
            region="coxs_bazar",
            description="The world's longest unbroken natural sea beach, sunset points, and ocean drive.",
            price=0.0,
            rating=4.8,
            reviews_count=1240,
            image_url="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
            tags=["beach", "sunset", "marine_drive", "seafood", "nature"],
            features=RecommendationFeatureTaxonomy(
                season=0.0,  # Peak winter
                month_of_year=0.0,
                day_of_week=0.8,
                time_of_day=0.7,
                is_holiday_or_weekend=0.9,
                temperature_celsius=0.48,
                precipitation_probability=0.05,
                humidity=0.45,
                uv_index=0.6,
                historical_dwell_time=0.85,
                search_velocity=0.9,
                click_through_rate=0.75,
                conversion_rate=0.4,
                review_sentiment_affinity=0.9,
                budget_affinity=0.6,
                discount_sensitivity=0.6,
                companion_type=0.5,  # Family / friends
                party_size=0.4,
                has_children=0.7,
                nature_vs_urban_affinity=0.25,
                adventure_index=0.4,
                relaxation_wellness_affinity=0.85,
                culinary_food_affinity=0.85,
                nightlife_entertainment_affinity=0.7,
                distance_from_origin=0.65,
                transport_accessibility=0.95,
                amenity_density_score=0.9,
            ),
        ),
        CatalogItem(
            id="hotel-coxs-bazar-sea-pearl",
            name="Sea Pearl Beach Resort & Spa",
            item_type=CatalogItemType.HOTEL,
            city="Cox's Bazar",
            region="coxs_bazar",
            description="5-Star luxury beachfront resort with private beach, water park, and ocean-facing suites.",
            price=9500.0,
            rating=4.9,
            reviews_count=850,
            image_url="https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
            tags=["5_star", "spa", "private_beach", "pool", "luxury", "family"],
            features=RecommendationFeatureTaxonomy(
                season=0.0,
                budget_affinity=0.9,
                discount_sensitivity=0.35,
                spending_velocity=0.85,
                companion_type=0.4,  # Couple / Family
                party_size=0.3,
                has_children=0.8,
                relaxation_wellness_affinity=0.95,
                culinary_food_affinity=0.9,
                amenity_density_score=0.98,
                transport_accessibility=0.9,
                cancellation_flexibility=0.85,
                inventory_scarcity_pressure=0.65,
            ),
        ),
        CatalogItem(
            id="tour-coxs-bazar-inani-himchari",
            name="Himchari Waterfalls & Inani Coral Beach Sunset Safari",
            item_type=CatalogItemType.TOUR,
            city="Cox's Bazar",
            region="coxs_bazar",
            description="Open-top 4x4 Chander Gari tour along Marine Drive, coral reefs, and Himchari hills.",
            price=2400.0,
            rating=4.7,
            reviews_count=420,
            image_url="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800",
            tags=["chander_gari", "adventure", "marine_drive", "coral_beach", "sunset"],
            features=RecommendationFeatureTaxonomy(
                season=0.0,
                budget_affinity=0.45,
                companion_type=0.7,  # Friends / family
                adventure_index=0.7,
                relaxation_wellness_affinity=0.6,
                nature_vs_urban_affinity=0.2,
                transport_accessibility=0.8,
                amenity_density_score=0.6,
            ),
        ),

        # --- Sylhet ---
        CatalogItem(
            id="dest-sylhet-ratargul",
            name="Sylhet Tea Estates & Ratargul Swamp Forest",
            item_type=CatalogItemType.DESTINATION,
            city="Sylhet",
            region="sylhet",
            description="Lush carpeted tea gardens, freshwater swamp canoeing, and crystal turquoise waters.",
            price=0.0,
            rating=4.8,
            reviews_count=980,
            image_url="https://images.unsplash.com/photo-1596895111956-bf1cf0599ce5?w=800",
            tags=["tea_garden", "swamp_forest", "canoeing", "waterfall", "nature"],
            features=RecommendationFeatureTaxonomy(
                season=0.3,  # Summer & monsoon lush green
                month_of_year=0.5,
                precipitation_probability=0.4,
                humidity=0.7,
                historical_dwell_time=0.8,
                search_velocity=0.75,
                budget_affinity=0.55,
                nature_vs_urban_affinity=0.1,  # Pure nature
                adventure_index=0.65,
                relaxation_wellness_affinity=0.9,
                cultural_heritage_affinity=0.75,
                culinary_food_affinity=0.7,  # Seven-color tea
                distance_from_origin=0.4,
                transport_accessibility=0.85,
                amenity_density_score=0.75,
            ),
        ),
        CatalogItem(
            id="hotel-sylhet-grand-sultan",
            name="Grand Sylhet Hotel & Resort",
            item_type=CatalogItemType.HOTEL,
            city="Sylhet",
            region="sylhet",
            description="5-Star opulent resort with rooftop infinity pool, golf simulator, and 360-degree hill views.",
            price=8200.0,
            rating=4.8,
            reviews_count=510,
            image_url="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800",
            tags=["5_star", "infinity_pool", "tea_hills", "spa", "fine_dining"],
            features=RecommendationFeatureTaxonomy(
                budget_affinity=0.85,
                spending_velocity=0.8,
                companion_type=0.4,
                relaxation_wellness_affinity=0.92,
                amenity_density_score=0.95,
                nature_vs_urban_affinity=0.35,
                cancellation_flexibility=0.8,
            ),
        ),
        CatalogItem(
            id="tour-sylhet-lalakhal-jaflong",
            name="Lalakhal Emerald River Boat Safari & Jaflong Zero Point",
            item_type=CatalogItemType.TOUR,
            city="Sylhet",
            region="sylhet",
            description="Cruise down the emerald-blue waters of Lalakhal and explore Khasi tribal villages.",
            price=3100.0,
            rating=4.7,
            reviews_count=360,
            image_url="https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800",
            tags=["boat_cruise", "emerald_river", "tribal_culture", "jaflong"],
            features=RecommendationFeatureTaxonomy(
                nature_vs_urban_affinity=0.15,
                adventure_index=0.7,
                relaxation_wellness_affinity=0.75,
                cultural_heritage_affinity=0.8,
                budget_affinity=0.45,
                transport_accessibility=0.7,
            ),
        ),

        # --- Sajek Valley ---
        CatalogItem(
            id="dest-sajek-valley",
            name="Sajek Valley - Kingdom of Clouds",
            item_type=CatalogItemType.DESTINATION,
            city="Sajek Valley",
            region="sajek",
            description="Floating clouds over verdant hill peaks, indigenous bamboo cottages, and starry night skies.",
            price=0.0,
            rating=4.9,
            reviews_count=1450,
            image_url="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800",
            tags=["clouds", "hills", "eco_cottage", "adventure", "stargazing"],
            features=RecommendationFeatureTaxonomy(
                season=0.1,
                month_of_year=0.1,
                day_of_week=0.9,
                historical_dwell_time=0.9,
                search_velocity=0.88,
                budget_affinity=0.45,
                discount_sensitivity=0.4,
                companion_type=0.55,  # Couples & youth friends
                nature_vs_urban_affinity=0.05,  # Raw hill nature
                adventure_index=0.8,
                relaxation_wellness_affinity=0.88,
                nightlife_entertainment_affinity=0.5,  # Campfire & acoustic music
                culinary_food_affinity=0.75,  # Bamboo chicken
                distance_from_origin=0.55,
                transport_accessibility=0.6,  # 4x4 Chander Gari military escort
                amenity_density_score=0.6,
            ),
        ),
        CatalogItem(
            id="hotel-sajek-meghpunji",
            name="Meghpunji Eco Resort",
            item_type=CatalogItemType.HOTEL,
            city="Sajek Valley",
            region="sajek",
            description="Premier cliffside wooden cottage with private glass balconies directly over the sea of clouds.",
            price=5500.0,
            rating=4.9,
            reviews_count=480,
            image_url="https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
            tags=["eco_resort", "cloud_view", "private_balcony", "cliffside", "campfire"],
            features=RecommendationFeatureTaxonomy(
                budget_affinity=0.6,
                companion_type=0.35,  # Couples / Honeymoon
                nature_vs_urban_affinity=0.05,
                relaxation_wellness_affinity=0.95,
                adventure_index=0.6,
                amenity_density_score=0.7,
                inventory_scarcity_pressure=0.9,  # High demand / scarce
            ),
        ),
        CatalogItem(
            id="tour-sajek-konglak-trek",
            name="Konglak Peak Sunrise Trek & Bamboo Cuisine Experience",
            item_type=CatalogItemType.TOUR,
            city="Sajek Valley",
            region="sajek",
            description="Early morning trek to highest peak of Sajek followed by authentic Lusai tribal bamboo dining.",
            price=1800.0,
            rating=4.8,
            reviews_count=320,
            image_url="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800",
            tags=["trekking", "sunrise", "tribal_food", "bamboo_chicken"],
            features=RecommendationFeatureTaxonomy(
                nature_vs_urban_affinity=0.05,
                adventure_index=0.85,
                cultural_heritage_affinity=0.85,
                culinary_food_affinity=0.85,
                budget_affinity=0.35,
            ),
        ),

        # --- Sundarbans ---
        CatalogItem(
            id="dest-sundarbans",
            name="Sundarbans UNESCO World Heritage Mangrove Forest",
            item_type=CatalogItemType.DESTINATION,
            city="Sundarbans",
            region="sundarbans",
            description="Largest tidal halophytic mangrove forest on earth, home of the Royal Bengal Tiger and spotted deer.",
            price=0.0,
            rating=4.9,
            reviews_count=790,
            image_url="https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=800",
            tags=["unesco", "mangrove", "bengal_tiger", "boat_safari", "ecotourism"],
            features=RecommendationFeatureTaxonomy(
                season=0.0,  # Winter safari
                month_of_year=0.0,
                historical_dwell_time=0.85,
                search_velocity=0.65,
                budget_affinity=0.7,
                nature_vs_urban_affinity=0.02,  # Untouched wild
                adventure_index=0.9,
                relaxation_wellness_affinity=0.75,
                cultural_heritage_affinity=0.7,
                distance_from_origin=0.5,
                transport_accessibility=0.55,  # Water vessel journey
                amenity_density_score=0.55,
            ),
        ),
        CatalogItem(
            id="hotel-sundarbans-tiger-camp",
            name="Sundarbans Eco Safari Cruise Ship & Lodge",
            item_type=CatalogItemType.HOTEL,
            city="Sundarbans",
            region="sundarbans",
            description="Luxury river cruise ship cabins with panoramic river decks, armed forest guards, and naturalists.",
            price=12500.0,
            rating=4.8,
            reviews_count=230,
            image_url="https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800",
            tags=["river_cruise", "cabin", "safari", "all_inclusive", "ecotourism"],
            features=RecommendationFeatureTaxonomy(
                budget_affinity=0.9,
                spending_velocity=0.9,
                companion_type=0.5,
                nature_vs_urban_affinity=0.02,
                adventure_index=0.88,
                relaxation_wellness_affinity=0.8,
                amenity_density_score=0.7,
                inventory_scarcity_pressure=0.85,
            ),
        ),
        CatalogItem(
            id="tour-sundarbans-kotka-safari",
            name="3-Day Deep Forest Kotka Wildlife Safari & Dolphin Watching",
            item_type=CatalogItemType.TOUR,
            city="Sundarbans",
            region="sundarbans",
            description="Deep exploration of Kotka wildlife sanctuary, Jamtola sea beach walk, and canal silent rowing.",
            price=14500.0,
            rating=4.9,
            reviews_count=310,
            image_url="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=800",
            tags=["wildlife", "safari", "dolphin", "kotka_beach", "birdwatching"],
            features=RecommendationFeatureTaxonomy(
                budget_affinity=0.8,
                nature_vs_urban_affinity=0.01,
                adventure_index=0.95,
                relaxation_wellness_affinity=0.7,
                cultural_heritage_affinity=0.6,
                transport_accessibility=0.5,
            ),
        ),
    ]
    return items


# ==============================================================================
# 4. HYBRID RECOMMENDATION SERVICE
# ==============================================================================

class MLRecommendationService:
    """
    Production-Grade Hybrid Recommendation Service.
    Combines Content-Based Cosine Filtering, Latent Collaborative Prior Signal,
    and Regional Cold-Start Thompson Sampling Multi-Armed Bandit.
    """

    def __init__(self, random_seed: Optional[int] = 42) -> None:
        self.bandit = ThompsonSamplingBandit(random_seed=random_seed)
        self.feature_engine = FeatureVectorEngine()
        self._catalog: List[CatalogItem] = build_seed_catalog()
        self._catalog_map: Dict[str, CatalogItem] = {item.id: item for item in self._catalog}
        self._matrix_cache: Optional[np.ndarray] = None
        self._rebuild_catalog_matrix()

    def _rebuild_catalog_matrix(self) -> None:
        """Constructs an (N, 40) float64 matrix representing the entire catalog."""
        vectors = [item.features.to_vector() for item in self._catalog]
        self._matrix_cache = np.vstack(vectors).astype(np.float64)
        logger.info(f"Built catalog matrix shape: {self._matrix_cache.shape}")

    def add_catalog_items(self, items: List[CatalogItem]) -> None:
        """Dynamically ingests additional catalog items and invalidates matrix cache."""
        for item in items:
            self._catalog_map[item.id] = item
        self._catalog = list(self._catalog_map.values())
        self._rebuild_catalog_matrix()

    def _calculate_collaborative_score(
        self,
        candidate_item: CatalogItem,
        user_history: Sequence[str],
        bandit_samples: Dict[str, float],
    ) -> float:
        """
        Calculates collaborative filtering affinity score.
        If user has history: item-item co-occurrence and vector similarity against historical items.
        If user is cold-start: utilizes Thompson Sampling regional sampled posterior.
        Guarantees returned score in [0.0, 1.0].
        """
        if not user_history:
            # Cold-start fallback: regional bandit sample
            region_key = candidate_item.region.lower().replace(" ", "_")
            sampled_score = bandit_samples.get(region_key, 0.5)
            # Modulate with item's rating prior (rating / 5.0)
            rating_factor = candidate_item.rating / 5.0
            return float(np.clip(0.7 * sampled_score + 0.3 * rating_factor, 0.0, 1.0))

        # Known history: calculate item-item cosine similarity against user's interacted items
        history_items = [self._catalog_map[hid] for hid in user_history if hid in self._catalog_map]
        if not history_items:
            # Unrecognized item IDs: treat as cold-start
            region_key = candidate_item.region.lower().replace(" ", "_")
            return float(np.clip(bandit_samples.get(region_key, 0.5), 0.0, 1.0))

        candidate_vec = candidate_item.features.to_vector()
        similarities: List[float] = []
        for hist_item in history_items:
            h_vec = hist_item.features.to_vector()
            # Cosine similarity between history item and candidate item
            sim = float(
                FeatureVectorEngine.compute_cosine_similarity(candidate_vec, h_vec.reshape(1, -1))[0]
            )
            similarities.append(sim)

        # Mean similarity weighted towards most similar
        avg_sim = float(np.mean(similarities)) if similarities else 0.5
        max_sim = float(np.max(similarities)) if similarities else 0.5
        cf_score = 0.6 * max_sim + 0.4 * avg_sim
        return float(np.clip(cf_score, 0.0, 1.0))

    def _generate_match_reasons(
        self,
        item: CatalogItem,
        content_sim: float,
        cf_score: float,
        is_cold_start: bool,
        top_arm: Optional[str],
    ) -> List[str]:
        """Synthesizes human-interpretable rationale for why this item was recommended."""
        reasons: List[str] = []
        if is_cold_start and top_arm and item.region.lower() == top_arm.lower():
            reasons.append(
                f"Trending choice in {item.city} selected by Thompson Sampling multi-armed bandit"
            )

        if content_sim >= 0.75:
            reasons.append("High contextual alignment with your live travel style and budget preferences")
        elif content_sim >= 0.55:
            reasons.append("Matches your preferred travel rhythm and seasonal timing")

        if item.rating >= 4.8:
            reasons.append(f"Guest favorite with {item.rating}★ rating ({item.reviews_count}+ verified reviews)")

        if item.tags:
            top_tags = ", ".join([t.replace("_", " ").title() for t in item.tags[:2]])
            reasons.append(f"Features {top_tags}")

        if not reasons:
            reasons.append("Popular recommendation based on regional travel patterns")

        return reasons[:3]

    async def get_recommendations(
        self,
        request: RecommendationRequest,
    ) -> RecommendationResponse:
        """
        Executes hybrid scoring pipeline:
        1. Feature Vectorization (40 parameters).
        2. Cosine Similarity Calculation via SciPy / NumPy.
        3. Thompson Sampling Bandit Sampling.
        4. Collaborative Filtering & Cold-Start Adaptation.
        5. Contextual Boosting & Pydantic v2 Validation.
        """
        start_time = time.perf_counter()

        # 1. Determine if this request is cold start
        has_session_features = request.session_features is not None
        has_history = bool(request.collaborative_history)
        explicit_cold_start = request.is_cold_start is True

        is_cold_start = explicit_cold_start or (not has_history and not has_session_features)

        # 2. Draw Thompson Sampling posterior samples for regional arms
        bandit_samples = self.bandit.sample_arms()
        top_arm_id, top_arm_val = max(bandit_samples.items(), key=lambda kv: kv[1])

        # 3. Vectorize user session parameters
        user_vector = self.feature_engine.to_vector(request.session_features)

        # 4. Filter catalog candidates by item_type if requested
        candidates: List[CatalogItem] = self._catalog
        if request.item_type is not None:
            candidates = [c for c in candidates if c.item_type == request.item_type]

        if request.preferred_regions:
            pref_normalized = [r.lower().replace(" ", "_") for r in request.preferred_regions]
            candidates = [c for c in candidates if c.region.lower() in pref_normalized] or candidates

        if not candidates:
            # Fallback if over-filtered
            candidates = self._catalog

        # 5. Extract candidate vectors matrix
        candidate_matrix = np.vstack([c.features.to_vector() for c in candidates])

        # 6. Calculate Content-Based Cosine Similarities
        content_similarities = self.feature_engine.compute_cosine_similarity(user_vector, candidate_matrix)

        # 7. Compute Hybrid Score for each candidate
        scored_items: List[ScoredRecommendation] = []

        for idx, item in enumerate(candidates):
            content_sim = float(content_similarities[idx])

            # Collaborative filtering score
            cf_score = self._calculate_collaborative_score(
                candidate_item=item,
                user_history=request.collaborative_history or [],
                bandit_samples=bandit_samples,
            )

            # Bandit boost for regional arm
            item_region_key = item.region.lower().replace(" ", "_")
            bandit_sample_val = bandit_samples.get(item_region_key, 0.5)

            # Dynamic hybrid blend weight (alpha)
            # Cold-start or sparse: bandit & collaborative signal takes higher prominence
            if is_cold_start:
                alpha = 0.25  # 25% content similarity, 75% bandit / collaborative
                hybrid_score = (alpha * content_sim) + ((1.0 - alpha) * bandit_sample_val)
            else:
                hist_len = len(request.collaborative_history or [])
                # As history grows, collaborative filtering and content reach equilibrium
                alpha = max(0.4, min(0.75, 0.75 - 0.05 * hist_len))
                hybrid_score = (alpha * content_sim) + ((1.0 - alpha) * cf_score)

            # Contextual modifiers
            boosters = 1.0
            # If user has high budget affinity, boost luxury items, else boost budget items
            user_budget = float(user_vector[19])  # budget_affinity index
            item_budget = item.features.budget_affinity
            budget_delta = abs(user_budget - item_budget)
            budget_multiplier = 1.0 - (0.15 * budget_delta)
            boosters *= budget_multiplier

            # Final normalized confidence score strictly bounded [0.0, 1.0]
            raw_final_score = hybrid_score * boosters
            confidence_score = float(np.clip(raw_final_score, 0.0, 1.0))

            match_reasons = self._generate_match_reasons(
                item=item,
                content_sim=content_sim,
                cf_score=cf_score,
                is_cold_start=is_cold_start,
                top_arm=top_arm_id,
            )

            scored = ScoredRecommendation(
                id=item.id,
                name=item.name,
                item_type=item.item_type,
                city=item.city,
                region=item.region,
                relevance_score=round(confidence_score, 4),
                content_similarity=round(content_sim, 4),
                collaborative_score=round(cf_score, 4),
                bandit_boost=round(float(bandit_sample_val), 4),
                match_reasons=match_reasons,
                price=item.price,
                rating=item.rating,
                reviews_count=item.reviews_count,
                image_url=item.image_url,
                tags=item.tags,
                metadata={
                    "is_cold_start": is_cold_start,
                    "region_arm": item_region_key,
                },
            )
            scored_items.append(scored)

        # 8. Sort by relevance_score descending
        scored_items.sort(key=lambda x: x.relevance_score, reverse=True)
        top_recommendations = scored_items[: request.limit]

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return RecommendationResponse(
            success=True,
            recommendations=top_recommendations,
            total=len(top_recommendations),
            is_cold_start=is_cold_start,
            top_bandit_arm=top_arm_id,
            latency_ms=round(latency_ms, 2),
            engine_version="2.4.0-hybrid",
        )

    async def record_feedback(self, feedback: BanditFeedbackRequest) -> Dict[str, Any]:
        """Records user engagement feedback to update Thompson Sampling bandit distributions."""
        self.bandit.update(arm_id=feedback.arm_id, reward=feedback.reward)
        arm_states = self.bandit.get_arm_states()
        return {
            "success": True,
            "message": f"Feedback recorded for arm '{feedback.arm_id}' with reward {feedback.reward}",
            "arm_states": [s.model_dump() for s in arm_states],
        }

    def get_bandit_diagnostic_states(self) -> List[BanditArmState]:
        """Retrieves active Thompson Sampling arm states."""
        return self.bandit.get_arm_states()


# Global Singleton instance for application lifecycle
ml_recommendation_service = MLRecommendationService()

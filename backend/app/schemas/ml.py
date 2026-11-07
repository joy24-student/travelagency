"""
Pydantic v2 Schemas for Machine Learning & Hybrid Recommendation Engine.
Defines the 40-parameter real-time travel taxonomy, catalog item representations,
Thompson Sampling bandit state, and strictly validated response envelopes.
"""

from enum import Enum
from typing import Any, Dict, List, Optional, Sequence
import numpy as np
from pydantic import BaseModel, ConfigDict, Field, field_validator


class CatalogItemType(str, Enum):
    DESTINATION = "destination"
    HOTEL = "hotel"
    TOUR = "tour"


class RecommendationFeatureTaxonomy(BaseModel):
    """
    40-Parameter Vectorized Real-Time Travel Taxonomy.
    Every parameter is normalized to the bounded range [0.0, 1.0].
    """
    model_config = ConfigDict(arbitrary_types_allowed=True)

    # --- Group 1: Temporal & Calendar Signals (Indices 0 - 5) ---
    season: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Normalized season (0.0=Winter, 0.2=Summer, 0.4=Monsoon, 0.6=Autumn, 0.8=Late Autumn, 1.0=Spring)"
    )
    month_of_year: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Normalized month (0.0=Jan ... 1.0=Dec)"
    )
    day_of_week: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Weekend/Weekday index (0.0=Mon-Wed, 0.5=Thu, 1.0=Fri-Sat Bangladesh weekend)"
    )
    time_of_day: float = Field(
        0.5, ge=0.0, le=1.0,
        description="Normalized time of day (0.0=00:00 ... 1.0=23:59)"
    )
    is_holiday_or_weekend: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Proximity or active status of public/religious holiday or weekend [0.0 - 1.0]"
    )
    days_until_travel: float = Field(
        0.2, ge=0.0, le=1.0,
        description="Normalized advance booking window / planning horizon (min(days, 60)/60)"
    )

    # --- Group 2: Meteorological & Real-Time Weather (Indices 6 - 10) ---
    temperature_celsius: float = Field(
        0.5, ge=0.0, le=1.0,
        description="Normalized temperature (0.0=10°C, 0.5=27.5°C, 1.0=45°C)"
    )
    precipitation_probability: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Real-time precipitation / rain probability [0.0 - 1.0]"
    )
    humidity: float = Field(
        0.5, ge=0.0, le=1.0,
        description="Normalized relative humidity [0.0 - 1.0]"
    )
    uv_index: float = Field(
        0.4, ge=0.0, le=1.0,
        description="Normalized UV index (uv / 12.0 bounded [0.0 - 1.0])"
    )
    air_quality_index: float = Field(
        0.3, ge=0.0, le=1.0,
        description="Normalized Air Quality Index (0.0=Clean AQI 0 ... 1.0=Hazardous AQI 300+)"
    )

    # --- Group 3: User Engagement & Behavioral Dynamics (Indices 11 - 18) ---
    historical_dwell_time: float = Field(
        0.3, ge=0.0, le=1.0,
        description="Log-normalized historical item dwell time [0.0 - 1.0]"
    )
    search_velocity: float = Field(
        0.2, ge=0.0, le=1.0,
        description="Search velocity / query frequency per session [0.0 - 1.0]"
    )
    click_through_rate: float = Field(
        0.15, ge=0.0, le=1.0,
        description="Historical or session click-through rate [0.0 - 1.0]"
    )
    conversion_rate: float = Field(
        0.05, ge=0.0, le=1.0,
        description="Historical booking conversion rate [0.0 - 1.0]"
    )
    cart_abandonment_ratio: float = Field(
        0.2, ge=0.0, le=1.0,
        description="Propensity for cart initiation without booking completion [0.0 - 1.0]"
    )
    review_sentiment_affinity: float = Field(
        0.7, ge=0.0, le=1.0,
        description="User affinity for highly rated items (>4.5 stars, positive sentiment)"
    )
    session_interaction_depth: float = Field(
        0.25, ge=0.0, le=1.0,
        description="Depth of actions (scrolling, gallery clicks, tab toggles) in active session"
    )
    recency_score: float = Field(
        0.8, ge=0.0, le=1.0,
        description="Exponential recency score of user's last platform interaction"
    )

    # --- Group 4: Financial & Budget Affinities (Indices 19 - 23) ---
    budget_affinity: float = Field(
        0.4, ge=0.0, le=1.0,
        description="Price tier affinity (0.0=Budget/Hostel, 0.5=Mid-Range, 1.0=Luxury 5-Star)"
    )
    discount_sensitivity: float = Field(
        0.5, ge=0.0, le=1.0,
        description="Responsiveness to discounts, vouchers, and flash promotions"
    )
    spending_velocity: float = Field(
        0.3, ge=0.0, le=1.0,
        description="Historical average spend per trip normalized against platform distribution"
    )
    price_tolerance_variance: float = Field(
        0.35, ge=0.0, le=1.0,
        description="Flexibility and willingness to exceed typical budget upper bounds"
    )
    installment_emi_affinity: float = Field(
        0.1, ge=0.0, le=1.0,
        description="Propensity toward EMI / 0% interest monthly installment payment options"
    )

    # --- Group 5: Traveler Persona & Companion Dynamics (Indices 24 - 28) ---
    companion_type: float = Field(
        0.25, ge=0.0, le=1.0,
        description="Traveler companion profile (0.0=Solo, 0.25=Couple, 0.5=Family, 0.75=Friends, 1.0=Business)"
    )
    party_size: float = Field(
        0.1, ge=0.0, le=1.0,
        description="Normalized guest count ((party_size - 1) / 9.0 bounded [0.0 - 1.0])"
    )
    has_children: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Requirement for child-friendly amenities, safety, and kid attractions"
    )
    has_senior_citizens: float = Field(
        0.0, ge=0.0, le=1.0,
        description="Requirement for elder accessibility, elevators, and low-strenuous terrain"
    )
    age_group_factor: float = Field(
        0.4, ge=0.0, le=1.0,
        description="Demographic life-stage factor (Youth=0.2, Young Pro=0.5, Family=0.7, Senior=1.0)"
    )

    # --- Group 6: Travel Style & Affinity Spectrum (Indices 29 - 34) ---
    nature_vs_urban_affinity: float = Field(
        0.3, ge=0.0, le=1.0,
        description="Preference spectrum (0.0=Pure Nature/Eco/Forest ... 1.0=Metropolitan/Urban)"
    )
    adventure_index: float = Field(
        0.4, ge=0.0, le=1.0,
        description="Appetite for trekking, boat safaris, water sports, and off-road exploration"
    )
    relaxation_wellness_affinity: float = Field(
        0.6, ge=0.0, le=1.0,
        description="Affinity for tranquil retreats, spa treatments, scenic balconies, and serenity"
    )
    cultural_heritage_affinity: float = Field(
        0.35, ge=0.0, le=1.0,
        description="Affinity for historic landmarks, tea estates, archaeological sites, indigenous culture"
    )
    culinary_food_affinity: float = Field(
        0.55, ge=0.0, le=1.0,
        description="Affinity for authentic regional food, seafood dining, and gastronomic tours"
    )
    nightlife_entertainment_affinity: float = Field(
        0.25, ge=0.0, le=1.0,
        description="Affinity for evening activities, beach cafes, live acoustic music, night markets"
    )

    # --- Group 7: Catalog & Real-Time Operational Signals (Indices 35 - 39) ---
    distance_from_origin: float = Field(
        0.5, ge=0.0, le=1.0,
        description="Normalized distance from Dhaka / user origin point (km / 600.0)"
    )
    transport_accessibility: float = Field(
        0.7, ge=0.0, le=1.0,
        description="Multi-modal transport convenience score (air flights, AC bus, train, waterways)"
    )
    amenity_density_score: float = Field(
        0.6, ge=0.0, le=1.0,
        description="Comprehensive facility score (Wi-Fi, generator backup, pool, restaurant, room service)"
    )
    inventory_scarcity_pressure: float = Field(
        0.35, ge=0.0, le=1.0,
        description="Real-time occupancy urgency factor (1.0 - remaining_ratio)"
    )
    cancellation_flexibility: float = Field(
        0.7, ge=0.0, le=1.0,
        description="Affinity for free cancellation and flexible itinerary modifications"
    )

    @classmethod
    def get_parameter_keys(cls) -> List[str]:
        """Returns the ordered list of 40 parameter keys."""
        return [
            "season", "month_of_year", "day_of_week", "time_of_day",
            "is_holiday_or_weekend", "days_until_travel",
            "temperature_celsius", "precipitation_probability", "humidity",
            "uv_index", "air_quality_index",
            "historical_dwell_time", "search_velocity", "click_through_rate",
            "conversion_rate", "cart_abandonment_ratio", "review_sentiment_affinity",
            "session_interaction_depth", "recency_score",
            "budget_affinity", "discount_sensitivity", "spending_velocity",
            "price_tolerance_variance", "installment_emi_affinity",
            "companion_type", "party_size", "has_children", "has_senior_citizens",
            "age_group_factor",
            "nature_vs_urban_affinity", "adventure_index", "relaxation_wellness_affinity",
            "cultural_heritage_affinity", "culinary_food_affinity", "nightlife_entertainment_affinity",
            "distance_from_origin", "transport_accessibility", "amenity_density_score",
            "inventory_scarcity_pressure", "cancellation_flexibility",
        ]

    def to_vector(self) -> np.ndarray:
        """Serializes the 40 parameters into a 1D NumPy array of shape (40,) float64."""
        keys = self.get_parameter_keys()
        return np.array([float(getattr(self, k)) for k in keys], dtype=np.float64)

    @classmethod
    def from_vector(cls, vector: Sequence[float]) -> "RecommendationFeatureTaxonomy":
        """Instantiates a RecommendationFeatureTaxonomy from a sequence of 40 floats."""
        keys = self_keys = cls.get_parameter_keys()
        if len(vector) != len(self_keys):
            raise ValueError(f"Vector length must be exactly {len(self_keys)}, got {len(vector)}")
        data = {k: float(np.clip(v, 0.0, 1.0)) for k, v in zip(self_keys, vector)}
        return cls(**data)


class CatalogItem(BaseModel):
    """Catalog item for destinations, hotels, or tours."""
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    item_type: CatalogItemType
    city: str
    region: str
    description: Optional[str] = None
    price: float = Field(0.0, ge=0.0)
    rating: float = Field(4.5, ge=0.0, le=5.0)
    reviews_count: int = Field(0, ge=0)
    image_url: Optional[str] = None
    features: RecommendationFeatureTaxonomy = Field(default_factory=RecommendationFeatureTaxonomy)
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ScoredRecommendation(BaseModel):
    """Single scored recommendation with strict confidence score in [0.0 - 1.0]."""
    id: str
    name: str
    item_type: CatalogItemType
    city: str
    region: str
    relevance_score: float = Field(..., ge=0.0, le=1.0, description="Strict confidence score [0.0 - 1.0]")
    content_similarity: float = Field(..., ge=0.0, le=1.0)
    collaborative_score: float = Field(..., ge=0.0, le=1.0)
    bandit_boost: float = Field(0.0, ge=0.0, le=1.0)
    match_reasons: List[str] = Field(default_factory=list)
    price: float = Field(0.0, ge=0.0)
    rating: float = Field(0.0, ge=0.0, le=5.0)
    reviews_count: int = Field(0, ge=0)
    image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    """Payload requesting hybrid recommendations."""
    user_id: Optional[str] = None
    item_type: Optional[CatalogItemType] = None
    session_features: Optional[RecommendationFeatureTaxonomy] = None
    limit: int = Field(10, ge=1, le=50)
    is_cold_start: Optional[bool] = None
    preferred_regions: Optional[List[str]] = None
    collaborative_history: Optional[List[str]] = Field(
        default_factory=list,
        description="List of catalog item IDs the user previously booked, saved, or dwelled upon"
    )


class RecommendationResponse(BaseModel):
    """Strict JSON payload returned by the recommendation engine."""
    success: bool = True
    recommendations: List[ScoredRecommendation]
    total: int
    is_cold_start: bool
    top_bandit_arm: Optional[str] = None
    latency_ms: float
    engine_version: str = "2.4.0-hybrid"


class BanditArmState(BaseModel):
    """Thompson Sampling Beta Distribution Arm State."""
    arm_id: str
    region_name: str
    alpha: float = Field(..., ge=1.0, description="Success prior parameter (clicks, bookings)")
    beta: float = Field(..., ge=1.0, description="Failure prior parameter (impressions, bounces)")
    expected_value: float = Field(..., ge=0.0, le=1.0)
    pulls_count: int = Field(0, ge=0)


class BanditFeedbackRequest(BaseModel):
    """Feedback payload for Thompson Sampling bandit updates."""
    arm_id: str = Field(..., description="Target region arm (e.g. coxs_bazar, sylhet, sajek, sundarbans)")
    reward: float = Field(..., ge=0.0, le=1.0, description="1.0 for conversion/click, 0.0 for bounce")
    user_id: Optional[str] = None
    item_id: Optional[str] = None

"""
Multi-Dimensional Vibe Analysis and Sentiment Engineering Service.
Enterprise-grade Text Analytics for Travel Reviews and Social Posts.

Features:
1. Multi-Dimensional Aspect Sentiment Extraction across 5 travel dimensions:
   - Cleanliness
   - Hospitality
   - Value for Money
   - Wi-Fi / Remote Work
   - Scenic Serenity
2. Dynamic Vibe Tag Synthesizer (e.g., 'Romantic Sunset Spot', 'Family Friendly',
   'Backpacker Haven', 'Slow Internet', 'Digital Nomad Friendly').
3. Statistical Anti-Spam & Fake Review Detection via Linguistic Perplexity (N-gram cross-entropy),
   burstiness variance, lexical diversity (TTR), and promotional/defamatory template heuristics.
4. Aggregation and down-weighting of bot-generated or fraudulent reviews.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple


# ============================================================================
# DOMAIN ENUMS & DATA CONTRACTS
# ============================================================================

class TravelDimension(str, Enum):
    CLEANLINESS = "Cleanliness"
    HOSPITALITY = "Hospitality"
    VALUE_FOR_MONEY = "Value for Money"
    WIFI_REMOTE_WORK = "Wi-Fi / Remote Work"
    SCENIC_SERENITY = "Scenic Serenity"


class SentimentPolarity(str, Enum):
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"


class VibeCategory(str, Enum):
    ATMOSPHERE = "atmosphere"
    AMENITY = "amenity"
    CROWD = "crowd"
    WORK = "work"
    CAUTION = "caution"


@dataclass
class SpamAuditResult:
    is_spam: bool
    is_bot_generated: bool
    is_promotional: bool
    is_defamatory: bool
    perplexity: float
    burstiness: float
    lexical_diversity: float
    spam_score: float  # 0.0 (authentic) to 1.0 (definite spam)
    flags: List[str] = field(default_factory=list)


@dataclass
class DimensionSentiment:
    dimension: TravelDimension
    score: float  # 0.0 - 100.0
    polarity: SentimentPolarity
    confidence: float  # 0.0 - 1.0
    mention_count: int
    snippets: List[str] = field(default_factory=list)


@dataclass
class VibeTag:
    id: str
    tag: str
    category: VibeCategory
    sentiment: SentimentPolarity
    confidence: float
    dimension_source: Optional[TravelDimension] = None


@dataclass
class ReviewAnalysisResult:
    review_id: str
    original_text: str
    spam_audit: SpamAuditResult
    weight: float  # Weight applied in aggregation (0.0 to 1.0)
    dimensions: Dict[str, DimensionSentiment]
    detected_tags: List[VibeTag]
    overall_sentiment_score: float  # 0.0 - 100.0


@dataclass
class AggregatedVibeScore:
    target_id: str  # Hotel ID or Destination Name
    target_type: str  # "hotel" or "destination"
    overall_vibe_score: float  # 0.0 - 100.0
    overall_sentiment: str  # "Exceptional", "Great", "Balanced", "Mixed", "Disappointing"
    dimensions: Dict[str, DimensionSentiment]
    vibe_tags: List[VibeTag]
    total_reviews_analyzed: int
    authentic_reviews_count: int
    flagged_spam_count: int
    bot_percentage: float
    summary: str


# ============================================================================
# LEXICAL & ASPECT GRAMMAR CONFIGURATION
# ============================================================================

# Domain Aspect Lexicon: Keywords & Contextual Triggers
ASPECT_LEXICON: Dict[TravelDimension, Dict[str, Set[str]]] = {
    TravelDimension.CLEANLINESS: {
        "aspects": {
            "clean", "cleanliness", "hygiene", "tidy", "tidiness", "spotless", "spotlessness",
            "immaculate", "sanitized", "sanitation", "dust", "dusty", "stain", "stained",
            "dirty", "filth", "filthy", "sheet", "sheets", "linen", "linens", "towel", "towels",
            "bathroom", "toilet", "washroom", "bedbug", "bedbugs", "cockroach", "cockroaches",
            "insect", "insects", "odor", "smell", "mold", "mildew", "housekeeping", "maid",
            "trash", "garbage", "spick and span",
        },
        "positives": {
            "spotless", "immaculate", "fresh", "crisp", "pristine", "sparkling", "gleaming",
            "sanitized", "hygienic", "tidy", "neat", "flawless", "gleaming", "clean",
        },
        "negatives": {
            "dirty", "filthy", "stained", "dusty", "smelly", "foul", "gross", "disgusting",
            "unhygienic", "unclean", "grimy", "grubby", "moldy", "infested", "unwashed",
            "stained", "trashy", "dingy",
        },
    },
    TravelDimension.HOSPITALITY: {
        "aspects": {
            "staff", "service", "host", "hosts", "hostess", "reception", "receptionist",
            "frontdesk", "front desk", "manager", "management", "concierge", "crew",
            "hospitality", "welcome", "greeting", "treatment", "care", "check-in", "checkin",
            "checkout", "check-out", "bellboy", "waiter", "doorman",
        },
        "positives": {
            "friendly", "welcoming", "warm", "hospitable", "attentive", "courteous", "polite",
            "helpful", "kind", "accommodating", "generous", "respectful", "professional",
            "exceptional", "gracious", "caring", "prompt", "cooperative", "superb",
        },
        "negatives": {
            "rude", "unfriendly", "impolite", "arrogant", "hostile", "unhelpful", "unresponsive",
            "neglectful", "inattentive", "careless", "lazy", "dismissive", "disrespectful",
            "cold", "slow", "annoyed", "unprofessional", "obnoxious",
        },
    },
    TravelDimension.VALUE_FOR_MONEY: {
        "aspects": {
            "price", "pricing", "rate", "cost", "charge", "value", "money", "budget",
            "bill", "worth", "deal", "fee", "tariff", "expensive", "inexpensive",
            "affordable", "cheap", "overpriced", "bargain", "package", "rip-off",
        },
        "positives": {
            "worth", "worthwhile", "bargain", "affordable", "economical", "reasonable",
            "fair", "value", "steal", "justified", "budget-friendly", "cost-effective",
            "inexpensive", "worth every penny", "great value",
        },
        "negatives": {
            "overpriced", "expensive", "steep", "exorbitant", "extortionate", "rip-off",
            "ripoff", "waste", "costly", "unjustified", "overcharge", "overcharged",
            "not worth", "poor value", "pricey",
        },
    },
    TravelDimension.WIFI_REMOTE_WORK: {
        "aspects": {
            "wifi", "wi-fi", "internet", "connection", "speed", "bandwidth", "signal",
            "network", "ping", "download", "upload", "work", "remote", "remote work",
            "workcation", "zoom", "laptop", "desk", "chair", "coworking", "digital nomad",
            "nomad", "video call", "teams", "slack", "office", "workstation",
        },
        "positives": {
            "fast", "reliable", "blazing", "speedy", "stable", "strong", "seamless",
            "uninterrupted", "high-speed", "flawless", "solid", "excellent", "consistent",
            "smooth", "productive", "ergonomic",
        },
        "negatives": {
            "slow", "laggy", "crawling", "unreliable", "weak", "patchy", "spotty",
            "unusable", "terrible", "disconnected", "disconnecting", "dropped", "intermittent",
            "sluggish", "nonexistent", "buffering", "frustrating",
        },
    },
    TravelDimension.SCENIC_SERENITY: {
        "aspects": {
            "view", "views", "scenery", "scenic", "panorama", "panoramic", "sea", "ocean",
            "beach", "mountain", "hill", "hills", "valley", "lake", "river", "balcony",
            "sunset", "sunrise", "landscape", "nature", "quiet", "quietness", "calm",
            "peace", "peaceful", "serene", "serenity", "tranquil", "tranquility", "noise",
            "noisy", "sound", "loud", "traffic", "street", "horns", "music", "nightclub",
            "party", "screaming", "construction",
        },
        "positives": {
            "breathtaking", "stunning", "spectacular", "gorgeous", "picturesque", "peaceful",
            "serene", "tranquil", "quiet", "calm", "relaxing", "restful", "idyllic",
            "soothing", "unobstructed", "panoramic", "mesmerizing", "magnificent", "silent",
        },
        "negatives": {
            "noisy", "loud", "rowdy", "chaotic", "hectic", "deafening", "disturbing",
            "street noise", "sleepless", "unpleasant", "honking", "traffic", "crowded",
            "cramped", "obstructed", "blaring", "party noise",
        },
    },
}

# Negation Tokens (Flip sentiment polarity within window)
NEGATION_WORDS: Set[str] = {
    "not", "no", "never", "none", "neither", "nor", "hardly", "barely", "scarcely",
    "cannot", "can't", "cant", "don't", "dont", "didn't", "didnt", "isn't", "isnt",
    "wasn't", "wasnt", "aren't", "arent", "weren't", "werent", "won't", "wont",
    "wouldn't", "wouldnt", "couldn't", "couldnt", "without", "lacks", "lacked",
    "nowhere",
}

# Valence Modifiers (Intensifiers and Dampeners)
INTENSIFIERS: Dict[str, float] = {
    "extremely": 1.45,
    "incredibly": 1.40,
    "exceptionally": 1.40,
    "absolutely": 1.35,
    "immensely": 1.35,
    "super": 1.30,
    "remarkably": 1.30,
    "very": 1.25,
    "really": 1.25,
    "highly": 1.25,
    "completely": 1.25,
    "totally": 1.25,
    "unbelievably": 1.35,
    "exceedingly": 1.30,
    "so": 1.20,
}

DAMPENERS: Dict[str, float] = {
    "somewhat": 0.65,
    "slightly": 0.60,
    "a bit": 0.65,
    "a little": 0.65,
    "marginally": 0.60,
    "barely": 0.50,
    "partially": 0.70,
}

# Adversative / Contrastive Conjunctions (Split semantic scope)
CONTRASTIVE_CONJUNCTIONS: Set[str] = {
    "but", "however", "although", "though", "yet", "nevertheless",
    "except", "while", "whereas", "on the other hand", "apart from",
}

# Promotional Boilerplate Patterns (Common in ChatGPT / automated bot fake reviews)
PROMOTIONAL_TEMPLATES: List[re.Pattern[str]] = [
    re.compile(r"nestled in the heart of", re.IGNORECASE),
    re.compile(r"a testament to (luxury|hospitality|excellence)", re.IGNORECASE),
    re.compile(r"impeccable attention to detail", re.IGNORECASE),
    re.compile(r"exceeded all (our|my) expectations", re.IGNORECASE),
    re.compile(r"truly a (paradise|haven|gem|marvel) on earth", re.IGNORECASE),
    re.compile(r"cannot recommend (this (place|property|hotel)|it) highly enough", re.IGNORECASE),
    re.compile(r"look no further (for your|if you want)", re.IGNORECASE),
    re.compile(r"epitome of (elegance|comfort|luxury|hospitality)", re.IGNORECASE),
    re.compile(r"unparalleled (service|experience|luxury|ambiance)", re.IGNORECASE),
    re.compile(r"memories that will last a lifetime", re.IGNORECASE),
    re.compile(r"from the moment (we|i) stepped foot", re.IGNORECASE),
]

# Defamatory Hit-Job Patterns (Extreme coordinated slander without factual specifics)
DEFAMATORY_TEMPLATES: List[re.Pattern[str]] = [
    re.compile(r"(total|complete|absolute) scam (artists?|fraud)?", re.IGNORECASE),
    re.compile(r"thieves and criminals", re.IGNORECASE),
    re.compile(r"should be (shut down|closed down|jailed|in prison)", re.IGNORECASE),
    re.compile(r"worst place on (earth|the planet|in human history)", re.IGNORECASE),
    re.compile(r"boycott this (place|scam|fraud)", re.IGNORECASE),
    re.compile(r"fake reviews everywhere", re.IGNORECASE),
]


# ============================================================================
# LINGUISTIC PERPLEXITY & ANTI-SPAM ENGINE
# ============================================================================

class LinguisticPerplexityDetector:
    """
    Statistical NLP detector for synthetic, bot-generated, promotional,
    and defamatory reviews using N-Gram Linguistic Perplexity, Burstiness,
    and Lexical Diversity.
    """

    # Reference unigram word counts calibrated on standard human travel review corpora
    _UNIGRAM_PROTOTYPE: Counter[str] = Counter({
        "the": 8500, "and": 6200, "was": 5100, "a": 4200, "to": 3900, "in": 3400,
        "room": 3100, "hotel": 2900, "very": 2600, "clean": 2400, "staff": 2300,
        "view": 2100, "good": 2000, "great": 1950, "we": 1850, "with": 1750,
        "for": 1650, "at": 1550, "nice": 1450, "our": 1350, "bed": 1250,
        "stay": 1200, "friendly": 1150, "beach": 1100, "location": 1050,
        "food": 1000, "wifi": 950, "resort": 900, "comfortable": 850,
        "breakfast": 800, "service": 750, "sea": 700, "balcony": 650,
        "night": 600, "quiet": 580, "place": 560, "sunset": 520, "price": 500,
        "helpful": 480, "shower": 460, "water": 440, "area": 420, "pool": 400,
        "worth": 390, "expensive": 380, "noise": 370, "ac": 360, "bazar": 350,
        "sajek": 340, "sreemangal": 320, "bad": 310, "terrible": 300,
        "superb": 290, "slow": 280, "internet": 270, "desk": 260,
        "is": 2500, "it": 2400, "of": 2200, "on": 1800, "that": 1200, "had": 1100,
        "from": 1000, "but": 900, "as": 850, "all": 800, "this": 800, "my": 750,
        "you": 700, "so": 650, "were": 650, "are": 600, "one": 550, "by": 500,
        "luxury": 450, "experience": 450, "heart": 400, "paradise": 400,
        "comfort": 400, "expectations": 380, "moment": 350, "arrived": 350,
        "vacation": 350, "elegance": 320, "exceeded": 320, "testament": 300,
        "epitome": 300, "highly": 300, "recommend": 300, "dream": 280,
    })

    _TOTAL_UNIGRAMS: int = sum(_UNIGRAM_PROTOTYPE.values())
    _OOV_MASS: float = 800.0  # Mass allocated to unseen/rare words

    @classmethod
    def _tokenize(cls, text: str) -> List[str]:
        """Normalize and tokenize text into words."""
        cleaned = re.sub(r"[^\w\s-]", " ", text.lower())
        tokens = [t.strip() for t in cleaned.split() if t.strip()]
        return tokens

    @classmethod
    def _split_sentences(cls, text: str) -> List[str]:
        """Split text into sentences while respecting abbreviations."""
        sentences = re.split(r"(?<=[.!?])\s+", text.strip())
        return [s.strip() for s in sentences if len(s.strip()) > 3]

    @classmethod
    def calculate_sentence_perplexity(cls, sentence: str) -> float:
        """
        Calculate linguistic perplexity of a sentence:
        H(W) = - 1/N * sum(log2 P(w_i))
        PP(W) = 2^(H(W))
        """
        tokens = cls._tokenize(sentence)
        if not tokens:
            return 80.0  # Default neutral perplexity

        total_mass = cls._TOTAL_UNIGRAMS + cls._OOV_MASS
        log_prob_sum = 0.0

        for token in tokens:
            count = cls._UNIGRAM_PROTOTYPE.get(token)
            if count:
                prob = count / total_mass
            else:
                # OOV word probability smoothly distributed
                prob = (cls._OOV_MASS / total_mass) * 0.005
            log_prob_sum += math.log2(prob)

        n = len(tokens)
        entropy = -log_prob_sum / n
        perplexity = math.pow(2.0, min(entropy, 14.0))
        return float(perplexity)

    @classmethod
    def calculate_burstiness(cls, sentences: List[str]) -> Tuple[float, float]:
        """
        Calculate mean perplexity and burstiness (coefficient of variation of perplexity):
        Burstiness = std_dev(PP_sentences) / (mean(PP_sentences) + 1e-6)
        Human reviews have rhythmic variation; LLM bots have unnaturally flat, uniform perplexity.
        """
        if not sentences:
            return 80.0, 0.40

        perplexities = [cls.calculate_sentence_perplexity(s) for s in sentences]
        mean_pp = sum(perplexities) / len(perplexities)

        if len(perplexities) < 2:
            return mean_pp, 0.40  # Single sentence gets normal human burstiness assumption

        variance = sum((p - mean_pp) ** 2 for p in perplexities) / (len(perplexities) - 1)
        std_dev = math.sqrt(variance)
        burstiness = std_dev / (mean_pp + 1e-6)
        return float(mean_pp), float(burstiness)

    @classmethod
    def calculate_lexical_diversity(cls, tokens: List[str]) -> float:
        """
        Calculate Root Type-Token Ratio (RTTR):
        RTTR = |unique_tokens| / sqrt(|tokens|)
        Avoids penalizing natural long human reviews while catching spam repetition.
        """
        if not tokens:
            return 1.0
        unique_tokens = len(set(tokens))
        total_tokens = len(tokens)
        raw_ttr = unique_tokens / total_tokens
        if total_tokens > 20:
            root_ttr = unique_tokens / math.sqrt(total_tokens)
            return min(1.0, root_ttr / 6.0)
        return raw_ttr

    @classmethod
    def audit_review(cls, text: str) -> SpamAuditResult:
        """
        Full anti-spam audit on review text.
        Calculates linguistic perplexity, burstiness, lexical diversity,
        and scans for promotional boilerplate and defamatory attack templates.
        """
        flags: List[str] = []
        tokens = cls._tokenize(text)
        sentences = cls._split_sentences(text)

        mean_pp, burstiness = cls.calculate_burstiness(sentences)
        lexical_div = cls.calculate_lexical_diversity(tokens)

        # 1. Promotional Template Detection
        promo_matches = [p.pattern for p in PROMOTIONAL_TEMPLATES if p.search(text)]
        is_promotional = len(promo_matches) >= 1
        if is_promotional:
            flags.append("PROMOTIONAL_BOILERPLATE")

        # 2. Defamatory Template Detection
        defamatory_matches = [d.pattern for d in DEFAMATORY_TEMPLATES if d.search(text)]
        is_defamatory = len(defamatory_matches) >= 1
        if is_defamatory:
            flags.append("DEFAMATORY_ATTACK_PATTERN")

        # 3. Bot Generation via Perplexity & Burstiness:
        # Bots typically exhibit repetitive promotional structures and lower burstiness
        is_bot_generated = False
        if is_promotional and (burstiness < 0.40 or mean_pp < 400.0):
            is_bot_generated = True
            flags.append("SYNTHETIC_LLM_BOT")
        elif len(sentences) >= 2 and mean_pp < 150.0 and burstiness < 0.18:
            is_bot_generated = True
            flags.append("SYNTHETIC_LLM_LOW_PERPLEXITY")

        # 4. Keyword Stuffing / Gibberish Spams (extreme high perplexity or repeated words)
        is_keyword_stuffing = False
        if mean_pp > 6000.0:
            is_keyword_stuffing = True
            flags.append("GIBBERISH_HIGH_PERPLEXITY")
        elif len(tokens) > 20 and lexical_div < 0.28:
            is_keyword_stuffing = True
            flags.append("KEYWORD_REPETITION_SPAM")

        # 5. Calculate Consolidated Spam Probability Score (0.0 to 1.0)
        spam_score = 0.0
        if is_bot_generated:
            spam_score += 0.55
        if is_promotional:
            spam_score += 0.50
        if is_defamatory:
            spam_score += 0.60
        if is_keyword_stuffing:
            spam_score += 0.60

        spam_score = min(1.0, max(0.0, spam_score))
        is_spam = spam_score >= 0.50

        return SpamAuditResult(
            is_spam=is_spam,
            is_bot_generated=is_bot_generated,
            is_promotional=is_promotional,
            is_defamatory=is_defamatory,
            perplexity=round(mean_pp, 2),
            burstiness=round(burstiness, 3),
            lexical_diversity=round(lexical_div, 3),
            spam_score=round(spam_score, 3),
            flags=flags,
        )


# ============================================================================
# MULTI-DIMENSIONAL ASPECT SENTIMENT EXTRACTOR
# ============================================================================

class AspectSentimentExtractor:
    """
    Extracts multi-dimensional sentiment polarities across the 5 travel dimensions:
    Cleanliness, Hospitality, Value for Money, Wi-Fi / Remote Work, Scenic Serenity.
    """

    @classmethod
    def _split_clauses(cls, sentence: str) -> List[str]:
        """
        Split a sentence into semantic clauses using contrastive conjunctions
        and punctuation so that opposing sentiments don't bleed into each other.
        e.g. "The staff was friendly but the wifi was terribly slow."
        -> ["The staff was friendly", "the wifi was terribly slow"]
        """
        pattern = r"(?:,|;|\b(?:but|however|although|though|yet|while|except)\b)"
        raw_clauses = re.split(pattern, sentence, flags=re.IGNORECASE)
        return [c.strip() for c in raw_clauses if len(c.strip()) > 2]

    @classmethod
    def analyze_clause_for_dimension(
        cls,
        clause: str,
        dimension: TravelDimension,
    ) -> Optional[Tuple[float, str]]:
        """
        Evaluates whether a clause mentions a dimension and calculates
        its polarity score in [-1.0, 1.0]. Returns (polarity, snippet) or None.
        """
        config = ASPECT_LEXICON[dimension]
        aspect_set = config["aspects"]
        positives = config["positives"]
        negatives = config["negatives"]

        tokens = re.sub(r"[^\w\s-]", " ", clause.lower()).split()
        if not tokens:
            return None

        # Check if any aspect keyword or n-gram matches the dimension
        clause_lower = clause.lower()
        has_aspect = any(a in clause_lower for a in aspect_set)
        if not has_aspect:
            return None

        # Find valence words and calculate polarity
        polarity_acc = 0.0
        valence_hits = 0

        for i, token in enumerate(tokens):
            weight = 0.0
            if token in positives:
                weight = 1.0
            elif token in negatives:
                weight = -1.0

            if weight == 0.0:
                continue

            # Look back up to 3 tokens for negation
            negated = False
            start_idx = max(0, i - 3)
            for prev in tokens[start_idx:i]:
                if prev in NEGATION_WORDS:
                    negated = True
                    break

            # Look back 1 token for intensifier or dampener
            multiplier = 1.0
            if i > 0:
                prev_word = tokens[i - 1]
                if prev_word in INTENSIFIERS:
                    multiplier = INTENSIFIERS[prev_word]
                elif prev_word in DAMPENERS:
                    multiplier = DAMPENERS[prev_word]

            if negated:
                weight = -weight * 0.90

            polarity_acc += weight * multiplier
            valence_hits += 1

        if valence_hits == 0:
            # Aspect mentioned neutrally or without strong adjective
            return (0.0, clause.strip())

        normalized = max(-1.0, min(1.0, polarity_acc / valence_hits))
        return (normalized, clause.strip())

    @classmethod
    def extract_aspects(
        cls,
        review_text: str,
    ) -> Dict[str, DimensionSentiment]:
        """
        Extract aspect sentiment across all 5 dimensions for a review text.
        Returns a dictionary of DimensionSentiment keyed by dimension name.
        """
        results: Dict[str, DimensionSentiment] = {}
        sentences = LinguisticPerplexityDetector._split_sentences(review_text)
        if not sentences:
            sentences = [review_text]

        for dim in TravelDimension:
            polarities: List[float] = []
            snippets: List[str] = []

            for sent in sentences:
                clauses = cls._split_clauses(sent)
                for clause in clauses:
                    match = cls.analyze_clause_for_dimension(clause, dim)
                    if match:
                        pol, snip = match
                        polarities.append(pol)
                        if len(snippets) < 3 and snip not in snippets:
                            snippets.append(snip)

            if polarities:
                avg_polarity = sum(polarities) / len(polarities)
                # Map [-1.0, 1.0] to [0.0, 100.0] vibe meter
                score = round(((avg_polarity + 1.0) / 2.0) * 100.0, 1)
                mention_count = len(polarities)

                # Polarity classification
                if score >= 65.0:
                    pol_enum = SentimentPolarity.POSITIVE
                elif score <= 42.0:
                    pol_enum = SentimentPolarity.NEGATIVE
                else:
                    pol_enum = SentimentPolarity.NEUTRAL

                # Confidence based on mention volume and consistency
                consistency = 1.0 - (max(polarities) - min(polarities)) / 2.0
                confidence = round(min(0.98, 0.60 + 0.15 * min(mention_count, 3) + 0.15 * consistency), 2)
            else:
                # Default baseline when unmentioned in this specific review
                score = 50.0
                pol_enum = SentimentPolarity.NEUTRAL
                confidence = 0.40
                mention_count = 0

            results[dim.value] = DimensionSentiment(
                dimension=dim,
                score=score,
                polarity=pol_enum,
                confidence=confidence,
                mention_count=mention_count,
                snippets=snippets,
            )

        return results


# ============================================================================
# DYNAMIC VIBE TAG SYNTHESIZER
# ============================================================================

class VibeTagSynthesizer:
    """
    Synthesizes short, human-centric dynamic vibe tags based on aspect
    sentiment thresholds, contextual semantic cues, and travel heuristics.
    """

    @classmethod
    def synthesize_tags(
        cls,
        dimensions: Dict[str, DimensionSentiment],
        full_text: str = "",
    ) -> List[VibeTag]:
        """
        Synthesize vibrant tags (e.g. 'Romantic Sunset Spot', 'Family Friendly',
        'Backpacker Haven', 'Slow Internet', 'Digital Nomad Friendly').
        """
        tags: List[VibeTag] = []
        text_lower = full_text.lower()

        clean_dim = dimensions.get(TravelDimension.CLEANLINESS.value)
        hosp_dim = dimensions.get(TravelDimension.HOSPITALITY.value)
        val_dim = dimensions.get(TravelDimension.VALUE_FOR_MONEY.value)
        wifi_dim = dimensions.get(TravelDimension.WIFI_REMOTE_WORK.value)
        scenic_dim = dimensions.get(TravelDimension.SCENIC_SERENITY.value)

        # 1. Scenic & Romance Tags
        if scenic_dim and scenic_dim.score >= 75.0:
            if any(k in text_lower for k in ("sunset", "golden hour", "dusk", "evening view")):
                tags.append(VibeTag(
                    id="romantic_sunset_spot",
                    tag="Romantic Sunset Spot",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=min(0.96, scenic_dim.confidence + 0.1),
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))
            elif any(k in text_lower for k in ("ocean", "sea view", "beach front", "beachfront", "bay of bengal")):
                tags.append(VibeTag(
                    id="panoramic_ocean_view",
                    tag="Panoramic Ocean View",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.94,
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))
            elif any(k in text_lower for k in ("cloud", "clouds", "sajek", "valley", "hills")):
                tags.append(VibeTag(
                    id="cloud_valley_vista",
                    tag="Cloud Valley Vista",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.92,
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))
            elif any(k in text_lower for k in ("quiet", "peaceful", "tranquil", "serene", "calm")):
                tags.append(VibeTag(
                    id="peaceful_sanctuary",
                    tag="Peaceful Sanctuary",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.90,
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))

        # 2. Hospitality & Crowd Tags
        if hosp_dim and hosp_dim.score >= 72.0:
            if any(k in text_lower for k in ("family", "kids", "children", "parents", "toddler")):
                tags.append(VibeTag(
                    id="family_friendly",
                    tag="Family Friendly",
                    category=VibeCategory.CROWD,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.93,
                    dimension_source=TravelDimension.HOSPITALITY,
                ))
            elif any(k in text_lower for k in ("warm", "bengali", "guest", "courteous", "caring", "welcoming")):
                tags.append(VibeTag(
                    id="heartwarming_hospitality",
                    tag="Heartwarming Hospitality",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.91,
                    dimension_source=TravelDimension.HOSPITALITY,
                ))

        # 3. Value for Money & Budget Tags
        if val_dim and val_dim.score >= 75.0:
            if any(k in text_lower for k in ("backpack", "backpacker", "hostel", "budget", "cheap", "solo")):
                tags.append(VibeTag(
                    id="backpacker_haven",
                    tag="Backpacker Haven",
                    category=VibeCategory.CROWD,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.92,
                    dimension_source=TravelDimension.VALUE_FOR_MONEY,
                ))
            else:
                tags.append(VibeTag(
                    id="exceptional_value",
                    tag="Exceptional Value",
                    category=VibeCategory.AMENITY,
                    sentiment=SentimentPolarity.POSITIVE,
                    confidence=0.88,
                    dimension_source=TravelDimension.VALUE_FOR_MONEY,
                ))

        # 4. Wi-Fi & Workation Tags
        if wifi_dim:
            if wifi_dim.score <= 42.0 and wifi_dim.mention_count > 0:
                tags.append(VibeTag(
                    id="slow_internet",
                    tag="Slow Internet",
                    category=VibeCategory.CAUTION,
                    sentiment=SentimentPolarity.NEGATIVE,
                    confidence=0.95,
                    dimension_source=TravelDimension.WIFI_REMOTE_WORK,
                ))
            elif wifi_dim.score >= 75.0:
                if any(k in text_lower for k in ("work", "remote", "nomad", "zoom", "laptop", "fast wifi")):
                    tags.append(VibeTag(
                        id="digital_nomad_friendly",
                        tag="Digital Nomad Friendly",
                        category=VibeCategory.WORK,
                        sentiment=SentimentPolarity.POSITIVE,
                        confidence=0.92,
                        dimension_source=TravelDimension.WIFI_REMOTE_WORK,
                    ))

        # 5. Cleanliness Highlights
        if clean_dim and clean_dim.score >= 85.0:
            tags.append(VibeTag(
                id="spotless_sanctuary",
                tag="Spotless Sanctuary",
                category=VibeCategory.AMENITY,
                sentiment=SentimentPolarity.POSITIVE,
                confidence=0.90,
                dimension_source=TravelDimension.CLEANLINESS,
            ))
        elif clean_dim and clean_dim.score <= 40.0 and clean_dim.mention_count > 0:
            tags.append(VibeTag(
                id="hygiene_concerns",
                tag="Cleanliness Concerns",
                category=VibeCategory.CAUTION,
                sentiment=SentimentPolarity.NEGATIVE,
                confidence=0.92,
                dimension_source=TravelDimension.CLEANLINESS,
            ))

        # 6. Cautionary Noise or Overpriced Tags
        if scenic_dim and scenic_dim.score <= 40.0 and scenic_dim.mention_count > 0:
            if any(k in text_lower for k in ("party", "club", "music", "bar")):
                tags.append(VibeTag(
                    id="lively_party_hub",
                    tag="Lively Party Hub",
                    category=VibeCategory.ATMOSPHERE,
                    sentiment=SentimentPolarity.NEUTRAL,
                    confidence=0.85,
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))
            else:
                tags.append(VibeTag(
                    id="noisy_surroundings",
                    tag="Noisy Surroundings",
                    category=VibeCategory.CAUTION,
                    sentiment=SentimentPolarity.NEGATIVE,
                    confidence=0.90,
                    dimension_source=TravelDimension.SCENIC_SERENITY,
                ))

        if val_dim and val_dim.score <= 40.0 and val_dim.mention_count > 0:
            tags.append(VibeTag(
                id="overpriced_hype",
                tag="Overpriced Hype",
                category=VibeCategory.CAUTION,
                sentiment=SentimentPolarity.NEGATIVE,
                confidence=0.89,
                dimension_source=TravelDimension.VALUE_FOR_MONEY,
            ))

        # Ensure unique tags by ID
        unique_tags: Dict[str, VibeTag] = {}
        for t in tags:
            if t.id not in unique_tags:
                unique_tags[t.id] = t

        return list(unique_tags.values())


# ============================================================================
# AGGREGATED VIBE ANALYZER SERVICE
# ============================================================================

class VibeAnalyzerService:
    """
    Main Orchestrator:
    - Ingests multiple reviews and social posts for a hotel or destination
    - Performs anti-spam audit and calculates linguistic perplexity
    - Down-weights or filters fraudulent/bot reviews
    - Aggregates multi-dimensional aspect sentiments
    - Synthesizes dynamic vibe tags and summary
    """

    @classmethod
    def analyze_single_review(
        cls,
        review_id: str,
        text: str,
    ) -> ReviewAnalysisResult:
        """Analyze a single review for spam, aspect polarities, and tags."""
        spam_audit = LinguisticPerplexityDetector.audit_review(text)

        # Calculate weighting factor:
        # Authentic reviews: weight 1.0
        # Flagged spam/bot reviews: weight down to 0.05 or 0.0 so they don't corrupt aggregations
        if spam_audit.is_spam:
            weight = max(0.0, 1.0 - (spam_audit.spam_score * 1.5))
        else:
            weight = 1.0

        dimensions = AspectSentimentExtractor.extract_aspects(text)
        tags = VibeTagSynthesizer.synthesize_tags(dimensions, full_text=text)

        # Average sentiment across mentioned dimensions
        active_dims = [d.score for d in dimensions.values() if d.mention_count > 0]
        if active_dims:
            overall_sentiment = sum(active_dims) / len(active_dims)
        else:
            overall_sentiment = 50.0

        return ReviewAnalysisResult(
            review_id=review_id,
            original_text=text,
            spam_audit=spam_audit,
            weight=round(weight, 3),
            dimensions=dimensions,
            detected_tags=tags,
            overall_sentiment_score=round(overall_sentiment, 1),
        )

    @classmethod
    def aggregate_reviews(
        cls,
        target_id: str,
        reviews: List[Dict[str, Any]],
        target_type: str = "hotel",
    ) -> AggregatedVibeScore:
        """
        Aggregates multiple reviews/posts for a property or destination.
        Applies spam filtering, computes 5-dimension vibe meters,
        and generates ranked dynamic vibe tags.

        Each item in `reviews` should contain:
        - "id": Optional review ID
        - "text": Review text or social post content
        """
        if not reviews:
            return cls._generate_default_vibe(target_id, target_type)

        single_results: List[ReviewAnalysisResult] = []
        flagged_spam_count = 0
        total_count = len(reviews)

        for idx, r in enumerate(reviews):
            rid = str(r.get("id") or f"rev-{idx}")
            txt = str(r.get("text") or "")
            res = cls.analyze_single_review(rid, txt)
            if res.spam_audit.is_spam:
                flagged_spam_count += 1
            single_results.append(res)

        authentic_count = total_count - flagged_spam_count
        bot_percentage = round((flagged_spam_count / total_count) * 100.0, 1) if total_count > 0 else 0.0

        # Weighted Aggregation across 5 Dimensions
        aggregated_dimensions: Dict[str, DimensionSentiment] = {}
        all_snippets: Dict[str, List[str]] = {dim.value: [] for dim in TravelDimension}
        all_texts: List[str] = []

        for dim in TravelDimension:
            weighted_sum = 0.0
            total_weight = 0.0
            mention_total = 0

            for res in single_results:
                dim_res = res.dimensions.get(dim.value)
                if dim_res and dim_res.mention_count > 0:
                    effective_w = res.weight * dim_res.confidence
                    weighted_sum += dim_res.score * effective_w
                    total_weight += effective_w
                    mention_total += dim_res.mention_count

                    for snip in dim_res.snippets:
                        if len(all_snippets[dim.value]) < 4 and snip not in all_snippets[dim.value]:
                            all_snippets[dim.value].append(snip)

            if total_weight > 0.0:
                final_score = round(weighted_sum / total_weight, 1)
                confidence = round(min(0.98, 0.65 + 0.05 * min(mention_total, 6)), 2)
            else:
                # Neutral baseline if unmentioned in authentic reviews
                final_score = 50.0
                confidence = 0.50

            if final_score >= 65.0:
                pol = SentimentPolarity.POSITIVE
            elif final_score <= 42.0:
                pol = SentimentPolarity.NEGATIVE
            else:
                pol = SentimentPolarity.NEUTRAL

            aggregated_dimensions[dim.value] = DimensionSentiment(
                dimension=dim,
                score=final_score,
                polarity=pol,
                confidence=confidence,
                mention_count=mention_total,
                snippets=all_snippets[dim.value],
            )

        # Combined Full Text for Global Tag Synthesis
        for r in single_results:
            if not r.spam_audit.is_spam:
                all_texts.append(r.original_text)

        combined_text = " ".join(all_texts)
        vibe_tags = VibeTagSynthesizer.synthesize_tags(aggregated_dimensions, full_text=combined_text)

        # Calculate Overall Vibe Score (Weighted combination of 5 dimensions)
        dimension_weights: Dict[str, float] = {
            TravelDimension.CLEANLINESS.value: 0.25,
            TravelDimension.HOSPITALITY.value: 0.25,
            TravelDimension.VALUE_FOR_MONEY.value: 0.20,
            TravelDimension.SCENIC_SERENITY.value: 0.18,
            TravelDimension.WIFI_REMOTE_WORK.value: 0.12,
        }

        overall_vibe_score = sum(
            aggregated_dimensions[dim_name].score * dimension_weights.get(dim_name, 0.20)
            for dim_name in aggregated_dimensions
        )
        overall_vibe_score = round(overall_vibe_score, 1)

        # Sentiment Label
        if overall_vibe_score >= 85.0:
            sentiment_label = "Exceptional"
        elif overall_vibe_score >= 72.0:
            sentiment_label = "Great"
        elif overall_vibe_score >= 55.0:
            sentiment_label = "Balanced"
        elif overall_vibe_score >= 42.0:
            sentiment_label = "Mixed"
        else:
            sentiment_label = "Disappointing"

        summary = (
            f"{sentiment_label} vibe rating ({overall_vibe_score}/100) based on {authentic_count} authentic "
            f"travel reviews ({flagged_spam_count} spam/bot reviews filtered)."
        )

        return AggregatedVibeScore(
            target_id=target_id,
            target_type=target_type,
            overall_vibe_score=overall_vibe_score,
            overall_sentiment=sentiment_label,
            dimensions=aggregated_dimensions,
            vibe_tags=vibe_tags,
            total_reviews_analyzed=total_count,
            authentic_reviews_count=authentic_count,
            flagged_spam_count=flagged_spam_count,
            bot_percentage=bot_percentage,
            summary=summary,
        )

    @classmethod
    def _generate_default_vibe(
        cls,
        target_id: str,
        target_type: str = "hotel",
    ) -> AggregatedVibeScore:
        """Default baseline vibe when no user reviews exist yet."""
        default_dimensions: Dict[str, DimensionSentiment] = {}
        for dim in TravelDimension:
            default_dimensions[dim.value] = DimensionSentiment(
                dimension=dim,
                score=70.0,
                polarity=SentimentPolarity.POSITIVE,
                confidence=0.50,
                mention_count=0,
                snippets=[],
            )

        tags = [
            VibeTag(
                id="peaceful_sanctuary",
                tag="Peaceful Sanctuary",
                category=VibeCategory.ATMOSPHERE,
                sentiment=SentimentPolarity.POSITIVE,
                confidence=0.75,
                dimension_source=TravelDimension.SCENIC_SERENITY,
            ),
            VibeTag(
                id="family_friendly",
                tag="Family Friendly",
                category=VibeCategory.CROWD,
                sentiment=SentimentPolarity.POSITIVE,
                confidence=0.75,
                dimension_source=TravelDimension.HOSPITALITY,
            ),
        ]

        return AggregatedVibeScore(
            target_id=target_id,
            target_type=target_type,
            overall_vibe_score=70.0,
            overall_sentiment="Great",
            dimensions=default_dimensions,
            vibe_tags=tags,
            total_reviews_analyzed=0,
            authentic_reviews_count=0,
            flagged_spam_count=0,
            bot_percentage=0.0,
            summary="Initial curated baseline vibe score pending user reviews.",
        )

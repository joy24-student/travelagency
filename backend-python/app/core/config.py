"""
Application Configuration & Parameterized Enterprise Settings.
Uses Pydantic v2 Settings for type-safe environment configuration with zero hardcoded business logic.
"""

from typing import List, Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application Identity & Environment
    APP_NAME: str = "Shopno Jatra API"
    COMPANY_NAME: str = "Shopno Jatra (স্বপ্ন যাত্রা)"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    SECRET_KEY: str = "production-quality-secret-key-shopno-jatra-travel-ecosystem"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8081",
        "http://localhost:19006",
        "*",
    ]

    # Localization, Support & Corporate Information
    DEFAULT_CURRENCY: str = "BDT"
    DEFAULT_COUNTRY: str = "Bangladesh"
    SUPPORT_HELPLINE: str = "+880 9612-000000"
    SUPPORT_EMAIL: str = "support@shopnojatra.com"
    VERIFICATION_URL_BASE: str = "https://shopnojatra.com/verify"

    # Financial & Business Parameters (No Hardcoded Numbers)
    AGENCY_COMMISSION_PERCENTAGE: float = 5.0
    VAT_TAX_PERCENTAGE: float = 5.0
    BOOKING_SERVICE_FEE: float = 50.0
    LOYALTY_POINTS_PER_CURRENCY_SPENT: float = 0.1  # 1 point per 10 BDT
    LOYALTY_TIER_SILVER_THRESHOLD: float = 1000.0
    LOYALTY_TIER_GOLD_THRESHOLD: float = 5000.0
    LOYALTY_TIER_DIAMOND_THRESHOLD: float = 15000.0
    SEAT_LOCK_TTL_SECONDS: int = 600  # 10 minutes lock hold window

    # Supabase PostgreSQL (asyncpg pool)
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/postgres"
    DATABASE_REPLICA_URLS: List[str] = []
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    DB_ECHO: bool = False

    # Supabase Authentication & JWT
    SUPABASE_URL: str = "https://htkpmrfhoijznigwimwj.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = "super-secret-jwt-token-with-at-least-32-characters"
    SUPABASE_JWT_ALGORITHM: str = "HS256"
    SUPABASE_JWKS_URL: Optional[str] = None
    SUPABASE_JWT_AUDIENCE: str = "authenticated"

    # Redis Cache & Rate Limiting
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL_SECONDS: int = 300  # 5 minutes TTL
    REDIS_MAX_CONNECTIONS: int = 50
    RATE_LIMIT_DEFAULT: str = "100/minute"
    RATE_LIMIT_SEARCH: str = "60/minute"
    RATE_LIMIT_AI: str = "20/minute"

    # L1 In-Memory Cache & Two-Tier Architecture
    L1_CACHE_MAX_SIZE: int = 10000
    L1_CACHE_TTL_SECONDS: int = 60
    CACHE_L1_HOT_TTL_SECONDS: int = 15  # 15s TTL for hot travel routes (DAC->CXB, DAC->SYL)
    CACHE_L2_TTL_SECONDS: int = 900  # 15 mins (flight catalogs, hotel amenities, tour lists)
    CACHE_COMPRESSION_THRESHOLD_BYTES: int = 1024  # 1KB threshold for Brotli/Gzip
    HOT_FLIGHT_ROUTES: List[str] = ["DAC-CXB", "DAC-SYL", "DAC-CGP", "CXB-DAC", "SYL-DAC", "CGP-DAC"]
    HOT_HOTEL_CITIES: List[str] = ["Cox's Bazar", "Coxs Bazar", "Sylhet", "Dhaka", "Chittagong", "Kuakata"]
    EDGE_CACHE_CONTROL_HEADER: str = "public, max-age=60, s-maxage=300, stale-while-revalidate=86400, stale-if-error=3600"

    # Circuit Breakers
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 5
    CIRCUIT_BREAKER_RECOVERY_SECONDS: float = 20.0

    # Security & Nonce Windows
    NONCE_EXPIRY_SECONDS: int = 300  # 5 minutes
    NONCE_MIN_LENGTH: int = 16

    # Celery Task Queue
    CELERY_BROKER_URL: str = "redis://localhost:6379/1"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
    CELERY_TASK_TIME_LIMIT: int = 300

    # Google Gemini AI
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-3.8-flash"

    # Cloudflare R2 Storage (S3-Compatible)
    R2_ACCOUNT_ID: str = ""
    R2_ACCESS_KEY_ID: str = ""
    R2_SECRET_ACCESS_KEY: str = ""
    R2_BUCKET_NAME: str = "travel-app"
    R2_PUBLIC_DOMAIN: str = "cdn.shopnojatra.com"
    R2_PRESIGNED_URL_EXPIRES_IN: int = 3600
    MAX_UPLOAD_SIZE_BYTES: int = 5 * 1024 * 1024  # 5 MB
    ALLOWED_UPLOAD_MIME_TYPES: List[str] = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "image/jpg",
    ]

    @property
    def r2_endpoint_url(self) -> str:
        if self.R2_ACCOUNT_ID:
            return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        return "https://r2.cloudflarestorage.com"

    # Payment Gateways & HMAC Webhook Secrets
    BKASH_APP_KEY: str = ""
    BKASH_APP_SECRET: str = ""
    BKASH_USERNAME: str = ""
    BKASH_PASSWORD: str = ""
    BKASH_WEBHOOK_SECRET: str = "bkash-secure-webhook-hmac-secret-key"
    BKASH_BASE_URL: str = "https://tokenized.sandbox.bka.sh/v1.2.0-beta"

    NAGAD_MERCHANT_ID: str = ""
    NAGAD_PUBLIC_KEY: str = ""
    NAGAD_PRIVATE_KEY: str = ""
    NAGAD_WEBHOOK_SECRET: str = "nagad-secure-webhook-hmac-secret-key"

    ROCKET_MERCHANT_ID: str = ""
    ROCKET_WEBHOOK_SECRET: str = "rocket-secure-webhook-hmac-secret-key"

    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = "whsec_mock_stripe_webhook_secret"

    CARD_WEBHOOK_SECRET: str = "card-secure-webhook-hmac-secret-key"

    # Transactional Communications (SMTP & SMS)
    SMTP_HOST: str = "smtp.sendgrid.net"
    SMTP_PORT: int = 587
    SMTP_USER: str = "apikey"
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "no-reply@shopnojatra.com"
    SMTP_FROM_NAME: str = "Shopno Jatra Travel"

    SMS_GATEWAY_URL: str = "https://api.sms-provider.com/send"
    SMS_GATEWAY_API_KEY: str = ""
    SMS_SENDER_ID: str = "ShopnoJatra"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v):
        if isinstance(v, str) and v.startswith("postgresql://"):
            return v.replace("postgresql://", "postgresql+asyncpg://", 1)
        return v

    @field_validator("DATABASE_REPLICA_URLS", mode="before")
    @classmethod
    def assemble_replica_urls(cls, v):
        if not v:
            return []
        if isinstance(v, str):
            urls = [u.strip() for u in v.split(",") if u.strip()]
            return [cls.normalize_database_url(u) for u in urls]
        elif isinstance(v, list):
            return [cls.normalize_database_url(u) for u in v]
        return v

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)


settings = Settings()

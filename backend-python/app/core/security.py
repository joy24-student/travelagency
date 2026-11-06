"""
Security, Supabase JWT Authentication & HMAC-SHA256 Webhook Verification.
Enforces Zero-Trust token validation and cryptographic signature verification across gateways.
"""

import hashlib
import hmac
import logging
from typing import Any, Dict, Optional
import httpx
import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError, PyJWTError

from app.core.config import settings
from app.core.exceptions import AuthenticationError

logger = logging.getLogger(__name__)

# Cached JWKS keys for RS256 verification
_jwks_cache: Optional[Dict[str, Any]] = None


async def get_supabase_jwks() -> Optional[Dict[str, Any]]:
    """Fetch and cache JWKS public keys from Supabase."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    if not settings.SUPABASE_JWKS_URL:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(settings.SUPABASE_JWKS_URL)
            if resp.status_code == 200:
                _jwks_cache = resp.json()
                return _jwks_cache
    except Exception as exc:
        logger.warning(f"Failed to fetch Supabase JWKS from {settings.SUPABASE_JWKS_URL}: {exc}")
    return None


async def decode_supabase_jwt(token: str) -> Dict[str, Any]:
    """
    Validate and decode a Supabase Auth JWT.
    Supports both HS256 (symmetric JWT secret) and RS256 (asymmetric JWKS).
    """
    if not token or not isinstance(token, str):
        raise AuthenticationError("Missing or malformed Authorization token")

    token = token.strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()

    try:
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", settings.SUPABASE_JWT_ALGORITHM)

        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        elif alg == "RS256":
            jwks = await get_supabase_jwks()
            if jwks and "keys" in jwks:
                kid = unverified_header.get("kid")
                key_dict = next((k for k in jwks["keys"] if k.get("kid") == kid), jwks["keys"][0])
                public_key = jwt.algorithms.RSAAlgorithm.from_jwk(key_dict)
                payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    options={"verify_aud": False},
                )
            else:
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["RS256", "HS256"],
                    options={"verify_aud": False},
                )
        else:
            raise AuthenticationError(f"Unsupported JWT algorithm: {alg}")

        if not payload.get("sub"):
            raise AuthenticationError("JWT token missing 'sub' subject claim")

        return payload

    except ExpiredSignatureError:
        raise AuthenticationError("Authentication token has expired")
    except (InvalidTokenError, PyJWTError) as exc:
        logger.warning(f"Supabase JWT validation failed: {exc}")
        raise AuthenticationError(f"Invalid authentication token: {str(exc)}")


def verify_hmac_sha256(raw_payload: bytes, signature: Optional[str], secret: str) -> bool:
    """
    Constant-time HMAC-SHA256 signature verification to prevent timing attacks.
    """
    if not signature or not secret:
        return False
    try:
        clean_sig = signature.strip().lower()
        if clean_sig.startswith("sha256="):
            clean_sig = clean_sig[7:].strip()
        expected = hmac.new(secret.encode("utf-8"), raw_payload, hashlib.sha256).hexdigest().lower()
        return hmac.compare_digest(expected, clean_sig)
    except Exception as exc:
        logger.error(f"Error computing HMAC-SHA256 signature: {exc}")
        return False


def verify_bkash_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """Validate bKash webhook callback signature using HMAC-SHA256."""
    webhook_secret = secret or settings.BKASH_WEBHOOK_SECRET
    return verify_hmac_sha256(raw_payload, signature, webhook_secret)


def verify_nagad_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """Validate Nagad payment callback signature using HMAC-SHA256."""
    webhook_secret = secret or settings.NAGAD_WEBHOOK_SECRET
    return verify_hmac_sha256(raw_payload, signature, webhook_secret)


def verify_rocket_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """Validate DBBL Rocket webhook callback signature using HMAC-SHA256."""
    webhook_secret = secret or settings.ROCKET_WEBHOOK_SECRET
    return verify_hmac_sha256(raw_payload, signature, webhook_secret)


def verify_stripe_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """
    Validate Stripe webhook signature header (t=timestamp,v1=signature) or raw HMAC-SHA256.
    """
    if not signature:
        return False
    webhook_secret = secret or settings.STRIPE_WEBHOOK_SECRET
    if not webhook_secret:
        return False

    # Check if standard Stripe header format: t=xxx,v1=xxx
    if "t=" in signature and "v1=" in signature:
        parts = dict(item.strip().split("=", 1) for item in signature.split(",") if "=" in item)
        t = parts.get("t")
        v1 = parts.get("v1")
        if not t or not v1:
            return False
        signed_payload = f"{t}.".encode("utf-8") + raw_payload
        return verify_hmac_sha256(signed_payload, v1, webhook_secret)

    return verify_hmac_sha256(raw_payload, signature, webhook_secret)


def verify_card_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """Validate generic Card / SSLCommerz payment callback signature using HMAC-SHA256."""
    webhook_secret = secret or settings.CARD_WEBHOOK_SECRET
    return verify_hmac_sha256(raw_payload, signature, webhook_secret)

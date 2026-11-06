"""
Security, Supabase JWT Authentication & HMAC-SHA256 Webhook Verification.
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
    """Fetch and cache JWKS from Supabase if RS256 is used."""
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
        # Extract unverified header to determine key and algorithm
        unverified_header = jwt.get_unverified_header(token)
        alg = unverified_header.get("alg", settings.SUPABASE_JWT_ALGORITHM)

        if alg == "HS256":
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                options={"verify_aud": False},  # Supabase aud is often 'authenticated'
            )
        elif alg == "RS256":
            jwks = await get_supabase_jwks()
            if jwks and "keys" in jwks:
                # Find matching key in JWKS
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
                # Fallback to direct decoding with secret or unverified in local test mode if configured
                payload = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["RS256", "HS256"],
                    options={"verify_aud": False},
                )
        else:
            raise AuthenticationError(f"Unsupported JWT algorithm: {alg}")

        # Ensure required subject claim is present
        if not payload.get("sub"):
            raise AuthenticationError("JWT token missing 'sub' subject claim")

        return payload

    except ExpiredSignatureError:
        raise AuthenticationError("Authentication token has expired")
    except (InvalidTokenError, PyJWTError) as exc:
        logger.warning(f"Supabase JWT validation failed: {exc}")
        raise AuthenticationError(f"Invalid authentication token: {str(exc)}")


def verify_bkash_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """
    Validate bKash webhook callback signature using HMAC-SHA256.
    Computes digest against raw request body and verifies in constant time.
    """
    if not signature:
        logger.warning("bKash webhook received without signature header")
        return False

    webhook_secret = secret or settings.BKASH_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error("bKash webhook secret is not configured")
        return False

    try:
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            raw_payload,
            hashlib.sha256,
        ).hexdigest()

        # Constant-time comparison to prevent timing attacks
        return hmac.compare_digest(expected_signature.lower(), signature.strip().lower())
    except Exception as exc:
        logger.error(f"Error verifying bKash HMAC signature: {exc}")
        return False


def verify_nagad_webhook_signature(
    raw_payload: bytes,
    signature: Optional[str],
    secret: Optional[str] = None,
) -> bool:
    """
    Validate Nagad payment callback signature using HMAC-SHA256.
    """
    if not signature:
        logger.warning("Nagad webhook received without signature header")
        return False

    webhook_secret = secret or settings.NAGAD_WEBHOOK_SECRET
    if not webhook_secret:
        logger.error("Nagad webhook secret is not configured")
        return False

    try:
        expected_signature = hmac.new(
            webhook_secret.encode("utf-8"),
            raw_payload,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_signature.lower(), signature.strip().lower())
    except Exception as exc:
        logger.error(f"Error verifying Nagad HMAC signature: {exc}")
        return False

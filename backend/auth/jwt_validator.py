"""
Auth0 JWT validation using JWKS (RS256).

Fetches the public key from Auth0's JWKS endpoint and verifies the token
signature, expiry, issuer, and audience. Returns the decoded claims dict.
"""

import logging
from typing import Any, Dict

import httpx
from jose import ExpiredSignatureError, JWTError, jwt
from jose.exceptions import JWKError

from config import get_settings

logger = logging.getLogger(__name__)

# Simple in-process JWKS cache — keys rarely rotate
_jwks_cache: Dict[str, Any] = {}


async def _fetch_jwks() -> Dict[str, Any]:
    """Fetch JWKS from Auth0 and cache them."""
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(settings.auth0_jwks_url)
        response.raise_for_status()
        _jwks_cache = response.json()
        return _jwks_cache


async def validate_token(token: str) -> Dict[str, Any]:
    """
    Validate an Auth0 JWT and return the decoded claims.

    Raises ValueError with a descriptive message on any failure.
    The caller (FastAPI dependency) converts this to an HTTP 401.
    """
    settings = get_settings()

    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise ValueError(f"Invalid token header: {exc}") from exc

    jwks = await _fetch_jwks()

    # Find the matching key by kid
    rsa_key: Dict[str, Any] = {}
    for key in jwks.get("keys", []):
        if key.get("kid") == unverified_header.get("kid"):
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
            break

    if not rsa_key:
        # Invalidate cache — keys may have rotated
        _jwks_cache.clear()
        raise ValueError("Unable to find matching public key in JWKS")

    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.auth0_audience,
            issuer=settings.auth0_issuer,
        )
    except ExpiredSignatureError:
        raise ValueError("Token has expired")
    except JWKError as exc:
        raise ValueError(f"Token key error: {exc}") from exc
    except JWTError as exc:
        raise ValueError(f"Token validation failed: {exc}") from exc

    return payload

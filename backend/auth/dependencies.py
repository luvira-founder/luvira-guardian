"""
FastAPI dependency: get_current_user

Extracts and validates the Bearer token from the Authorization header.
Returns the decoded token payload (dict) with `sub` as the user ID.
Raises HTTP 401 on any authentication failure.
"""

import logging
from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth.jwt_validator import validate_token

logger = logging.getLogger(__name__)

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> Dict[str, Any]:
    """
    Validate the Bearer JWT and return decoded claims.
    The `sub` field contains the Auth0 user ID.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "error_code": "unauthenticated",
                "message": "Authorization header is missing or malformed.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = await validate_token(credentials.credentials)
    except ValueError as exc:
        logger.warning("JWT validation failed: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "error_code": "unauthenticated",
                "message": str(exc),
            },
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload


def get_user_id(payload: Dict[str, Any] = Depends(get_current_user)) -> str:
    """Shortcut dependency that returns just the user ID string."""
    return payload["sub"]


async def get_raw_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> str:
    """Return the raw JWT string for use in federated token exchange."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "status": "error",
                "error_code": "unauthenticated",
                "message": "Authorization header is missing or malformed.",
            },
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials

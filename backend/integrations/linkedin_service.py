"""
LinkedIn integration.

Uses the LinkedIn REST API to post a text update on behalf of the authenticated user.
All methods accept a short-lived `token` retrieved from Auth0 Token Vault.
The token is used inline and never stored.
"""

import logging
from typing import Any, Dict

import httpx

logger = logging.getLogger(__name__)

_LINKEDIN_API_BASE = "https://api.linkedin.com/v2"


class LinkedInError(Exception):
    """Raised when the LinkedIn API returns an actionable error."""

    def __init__(self, message: str, linkedin_error: str = "") -> None:
        super().__init__(message)
        self.message = message
        self.linkedin_error = linkedin_error


async def post_update(text: str, token: str) -> Dict[str, Any]:
    """
    Post a text update to LinkedIn on behalf of the authenticated user.

    1. Fetches the user's LinkedIn member URN via /userinfo.
    2. Posts a text share via /ugcPosts.

    Returns the LinkedIn API response dict.
    Raises LinkedInError on failure.
    """
    # Step 1: get member URN
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=15) as client:
        me_response = await client.get(
            f"{_LINKEDIN_API_BASE}/userinfo",
            headers=headers,
        )

    if me_response.status_code != 200:
        logger.error(
            "LinkedIn /userinfo error: status=%s body=%s",
            me_response.status_code,
            me_response.text[:200],
        )
        raise LinkedInError(
            message=f"Failed to fetch LinkedIn user info (status {me_response.status_code}).",
        )

    me_data = me_response.json()
    member_urn = me_data.get("sub")
    if not member_urn:
        raise LinkedInError(message="LinkedIn user info missing 'sub' field.")

    # Step 2: post the update
    payload = {
        "author": f"urn:li:person:{member_urn}",
        "lifecycleState": "PUBLISHED",
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {"text": text},
                "shareMediaCategory": "NONE",
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(
            f"{_LINKEDIN_API_BASE}/ugcPosts",
            headers=headers,
            json=payload,
        )

    if response.status_code not in (200, 201):
        logger.error(
            "LinkedIn post error: status=%s body=%s",
            response.status_code,
            response.text[:200],
        )
        _handle_linkedin_error(response.status_code, response.text)

    logger.info("LinkedIn update posted successfully")
    return response.json() if response.text else {}


def _handle_linkedin_error(status_code: int, body: str) -> None:
    """Normalize LinkedIn error responses into LinkedInError."""
    if status_code == 401:
        raise LinkedInError(
            message="LinkedIn token is invalid or has been revoked.",
            linkedin_error="unauthorized",
        )
    if status_code == 403:
        raise LinkedInError(
            message="LinkedIn token is missing required scope (w_member_social).",
            linkedin_error="forbidden",
        )
    raise LinkedInError(
        message=f"LinkedIn API error (status {status_code}).",
        linkedin_error=body[:200],
    )

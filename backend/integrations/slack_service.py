"""
Slack integration.

Uses the Slack Web API chat.postMessage endpoint.
All methods accept a short-lived `token` retrieved from Auth0 Token Vault.
The token is used inline and never stored.

Note: The token type (user vs bot) depends on the scope mapping configured
in your Auth0 connected-account setup for Slack. Verify the granted scope
names during integration testing against your specific configuration.
"""

import logging
from typing import Any, Dict

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


class SlackError(Exception):
    """Raised when the Slack API returns an actionable error."""

    def __init__(self, message: str, slack_error: str = "") -> None:
        super().__init__(message)
        self.message = message
        self.slack_error = slack_error


async def send_message(channel: str, text: str, token: str) -> Dict[str, Any]:
    """
    Post a message to a Slack channel.

    POST https://slack.com/api/chat.postMessage

    Returns the Slack API response dict.
    Raises SlackError on failure.
    """
    settings = get_settings()
    url = f"{settings.slack_api_base_url}/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {
        "channel": channel,
        "text": text,
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(url, headers=headers, json=payload)

    if response.status_code != 200:
        logger.error(
            "Slack HTTP error: status=%s body=%s",
            response.status_code,
            response.text[:200],
        )
        raise SlackError(
            message=f"Slack API HTTP error (status {response.status_code}).",
        )

    data: Dict[str, Any] = response.json()

    # Slack returns HTTP 200 even for logical errors — check the `ok` field
    if not data.get("ok"):
        slack_error = data.get("error", "unknown_error")
        _handle_slack_error(slack_error)

    logger.info(
        "Slack message sent: channel=%s ts=%s",
        channel,
        data.get("ts", ""),
    )
    return data


def _handle_slack_error(slack_error: str) -> None:
    """Normalize Slack logical error codes into SlackError."""
    if slack_error in ("invalid_auth", "not_authed", "token_revoked"):
        raise SlackError(
            message="Slack token is invalid or has been revoked.",
            slack_error=slack_error,
        )
    if slack_error == "missing_scope":
        raise SlackError(
            message="Slack token is missing required scope (chat:write).",
            slack_error=slack_error,
        )
    if slack_error == "channel_not_found":
        raise SlackError(
            message="Slack channel not found. Check the channel name or ID.",
            slack_error=slack_error,
        )
    if slack_error == "not_in_channel":
        raise SlackError(
            message="The bot is not a member of the target Slack channel.",
            slack_error=slack_error,
        )
    raise SlackError(
        message=f"Slack API error: {slack_error}",
        slack_error=slack_error,
    )

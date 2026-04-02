"""
Google Calendar integration.

All methods accept a short-lived `token` retrieved from Auth0 Token Vault.
The token is used inline and never stored.

Required scope: https://www.googleapis.com/auth/calendar.events
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


class CalendarError(Exception):
    """Raised when the Google Calendar API returns an actionable error."""

    def __init__(self, message: str, status_code: int = 0) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def create_event(
    calendar_id: str,
    summary: str,
    description: str,
    token: str,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Create a Google Calendar event.

    POST https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events

    Args:
        calendar_id: Calendar ID (e.g. "primary").
        summary: Event title.
        description: Event body / incident summary.
        token: Short-lived delegated token from Auth0 Token Vault.
        start: Event start time (defaults to 1 hour from now).
        end: Event end time (defaults to 2 hours from now).

    Returns the created event JSON dict.
    Raises CalendarError on failure.
    """
    settings = get_settings()
    url = (
        f"{settings.google_api_base_url}"
        f"/calendar/v3/calendars/{calendar_id}/events"
    )
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }

    now = datetime.now(tz=timezone.utc)
    event_start = start or (now + timedelta(hours=1))
    event_end = end or (now + timedelta(hours=2))

    event_body = {
        "summary": summary,
        "description": description,
        "start": {
            "dateTime": event_start.isoformat(),
            "timeZone": "UTC",
        },
        "end": {
            "dateTime": event_end.isoformat(),
            "timeZone": "UTC",
        },
    }

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(url, headers=headers, json=event_body)

    _handle_response_errors(response, action="create_event")

    event: Dict[str, Any] = response.json()
    logger.info(
        "Calendar event created: id=%s summary=%s start=%s",
        event.get("id", ""),
        summary,
        event_start.isoformat(),
    )
    return event


def _handle_response_errors(response: httpx.Response, action: str) -> None:
    """Normalize Google Calendar HTTP errors into CalendarError."""
    if response.status_code == 401:
        raise CalendarError(
            message="Google Calendar token is invalid or has been revoked.",
            status_code=401,
        )
    if response.status_code == 403:
        raise CalendarError(
            message="Insufficient Google Calendar permissions for this action.",
            status_code=403,
        )
    if response.status_code == 404:
        raise CalendarError(
            message=f"Google Calendar resource not found ({action}).",
            status_code=404,
        )
    if response.status_code >= 400:
        logger.error(
            "Google Calendar API error: action=%s status=%s body=%s",
            action,
            response.status_code,
            response.text[:200],
        )
        raise CalendarError(
            message=f"Google Calendar API error during '{action}' (HTTP {response.status_code}).",
            status_code=response.status_code,
        )

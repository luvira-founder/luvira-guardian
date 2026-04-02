"""
GitLab integration.

All methods accept a short-lived `token` retrieved from Auth0 Token Vault.
The token is used inline and never stored.
"""

import logging
from typing import Any, Dict

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


class GitLabError(Exception):
    """Raised when the GitLab API returns an actionable error."""

    def __init__(self, message: str, status_code: int = 0) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


async def get_issue(project_id: str, issue_iid: str, token: str) -> Dict[str, Any]:
    """
    Retrieve a GitLab issue by project ID and issue IID.

    GET /projects/:id/issues/:iid

    Returns the issue JSON dict.
    Raises GitLabError on failure.
    """
    settings = get_settings()
    url = f"{settings.gitlab_base_url}/projects/{project_id}/issues/{issue_iid}"
    headers = {"Authorization": f"Bearer {token}"}

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.get(url, headers=headers)

    _handle_response_errors(response, service="gitlab", action="get_issue")

    issue: Dict[str, Any] = response.json()
    logger.info(
        "GitLab issue retrieved: project=%s iid=%s title=%s",
        project_id,
        issue_iid,
        issue.get("title", ""),
    )
    return issue


async def post_comment(
    project_id: str, issue_iid: str, body: str, token: str
) -> Dict[str, Any]:
    """
    Post a comment on a GitLab issue.

    POST /projects/:id/issues/:iid/notes

    Returns the created note JSON dict.
    Raises GitLabError on failure.
    """
    settings = get_settings()
    url = f"{settings.gitlab_base_url}/projects/{project_id}/issues/{issue_iid}/notes"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(url, headers=headers, json={"body": body})

    _handle_response_errors(response, service="gitlab", action="post_comment")

    note: Dict[str, Any] = response.json()
    logger.info(
        "GitLab comment posted: project=%s iid=%s note_id=%s",
        project_id,
        issue_iid,
        note.get("id", ""),
    )
    return note


def _handle_response_errors(
    response: httpx.Response, service: str, action: str
) -> None:
    """Normalize GitLab HTTP errors into GitLabError."""
    if response.status_code == 401:
        raise GitLabError(
            message="GitLab token is invalid or has been revoked.",
            status_code=401,
        )
    if response.status_code == 403:
        raise GitLabError(
            message="Insufficient GitLab permissions for this action.",
            status_code=403,
        )
    if response.status_code == 404:
        raise GitLabError(
            message=f"GitLab resource not found ({action}).",
            status_code=404,
        )
    if response.status_code >= 400:
        logger.error(
            "GitLab API error: action=%s status=%s body=%s",
            action,
            response.status_code,
            response.text[:200],
        )
        raise GitLabError(
            message=f"GitLab API error during '{action}' (HTTP {response.status_code}).",
            status_code=response.status_code,
        )

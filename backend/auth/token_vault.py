"""
Auth0 Token Vault — federated token exchange.

Zero-Local-Secrets contract:
  - No provider token is ever stored in a database, cache, or variable that
    outlives the calling coroutine's stack frame.
  - Tokens are requested inline, used once, and then discarded.

Flow per action (federated exchange):
  1. Take the user's Auth0 access token (from their request).
  2. POST to Auth0 /oauth/token using the federated-connection-access-token grant.
  3. Auth0 returns the provider token (GitLab/Slack/Google) for the linked identity.
  4. Return it to the caller — token falls out of scope after use.

Auth0 federated token exchange grant:
  urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token

get_connected_services uses the Management API (client_credentials) to list
linked identities — this is a backend-only administrative call.
"""

import logging
from typing import Any, Dict, List

import httpx

from config import get_settings

logger = logging.getLogger(__name__)

# Connection name mapping: logical service name → Auth0 connection name
# These must match the exact connection names configured in your Auth0 tenant.
_SERVICE_CONNECTION_MAP: Dict[str, str] = {
    "gitlab": "gitlab",
    "linkedin": "linkedin",
    "google-calendar": "google-oauth2",
}

# Scope requirements per service
_SERVICE_SCOPES: Dict[str, List[str]] = {
    "gitlab": ["read_api", "write_api"],
    "linkedin": ["w_member_social"],
    "google-calendar": ["https://www.googleapis.com/auth/calendar.events"],
}


async def _get_mgmt_api_token() -> str:
    """
    Obtain a short-lived Auth0 Management API access token via
    client_credentials grant. Never stored — used only within this request.
    """
    settings = get_settings()
    payload = {
        "grant_type": "client_credentials",
        "client_id": settings.auth0_client_id,
        "client_secret": settings.auth0_client_secret,
        "audience": settings.auth0_mgmt_api_audience,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(settings.auth0_token_url, json=payload)

    if response.status_code != 200:
        logger.error(
            "Management API token request failed: status=%s",
            response.status_code,
        )
        raise TokenVaultError(
            service="auth0",
            message="Failed to obtain Auth0 Management API token.",
        )

    data = response.json()
    return data["access_token"]  # short-lived, used immediately below


async def get_delegated_token(
    user_token: str,
    service: str,
    scopes: List[str] | None = None,
) -> str:
    """
    Exchange the user's Auth0 access token for a provider token via the
    federated-connection-access-token grant (Token Vault).

    Args:
        user_token: The raw Auth0 JWT from the user's request (Authorization header).
        service: Logical service name — "gitlab" | "slack" | "google-calendar".
        scopes: Scope list to request. Defaults to the service's required scopes.

    Returns:
        The provider access token string (GitLab / Slack / Google).

    Raises:
        TokenVaultError: If the exchange fails or the connection is not linked.
    """
    settings = get_settings()
    connection_name = _SERVICE_CONNECTION_MAP.get(service)
    if connection_name is None:
        raise TokenVaultError(service=service, message=f"Unknown service '{service}'.")

    requested_scopes = scopes or _SERVICE_SCOPES.get(service, [])

    # Use the resource_server (TV) client for federated exchange
    tv_client_id = settings.auth0_tv_client_id or settings.auth0_client_id
    tv_client_secret = settings.auth0_tv_client_secret or settings.auth0_client_secret

    body = {
        "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
        "client_id": tv_client_id,
        "client_secret": tv_client_secret,
        "subject_token": user_token,
        "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
        "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
        "connection": connection_name,
    }
    if requested_scopes:
        body["scope"] = " ".join(requested_scopes)

    async with httpx.AsyncClient(timeout=15) as client:
        response = await client.post(settings.auth0_token_url, data=body)

    # user_token reference ends here — never stored

    if response.status_code == 403:
        raise TokenVaultError(
            service=service,
            message=f"Service '{service}' is not connected. Please link it via the UI.",
            error_code="connection_lost",
        )

    if response.status_code == 401:
        raise TokenVaultError(
            service=service,
            message="Federated token exchange authorization failed. Check client credentials.",
            error_code="unauthenticated",
        )

    if response.status_code != 200:
        error_body = response.text[:200]
        logger.error(
            "Federated token exchange failed: service=%s status=%s body=%s",
            service,
            response.status_code,
            error_body,
        )
        raise TokenVaultError(
            service=service,
            message=f"Federated token exchange failed for '{service}' (HTTP {response.status_code}).",
            error_code="connection_lost",
        )

    data = response.json()
    provider_token: str = data["access_token"]
    # provider_token is returned to the caller's stack frame only
    return provider_token


async def get_connected_services(user_id: str) -> List[Dict[str, Any]]:
    """
    List connected accounts for a user via the Auth0 Management API.

    Uses the dedicated /connected-accounts endpoint for Token Vault accounts.
    Returns a list of dicts with keys: connection, provider, scopes.
    """
    settings = get_settings()
    mgmt_token = await _get_mgmt_api_token()
    headers = {"Authorization": f"Bearer {mgmt_token}"}

    # Fetch Token Vault connected accounts
    url = f"{settings.auth0_mgmt_base_url}/users/{user_id}/connected-accounts"
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.get(url, headers=headers)

    # mgmt_token falls out of scope here

    if response.status_code != 200:
        logger.error(
            "Failed to fetch connected accounts: status=%s body=%s",
            response.status_code, response.text[:200],
        )
        return []

    data = response.json()
    accounts = data if isinstance(data, list) else data.get("connected_accounts", data.get("accounts", []))

    results: List[Dict[str, Any]] = []
    for account in accounts:
        results.append({
            "provider": account.get("connection", ""),
            "connection": account.get("connection", ""),
            "scopes": account.get("scopes", []),
        })

    logger.info("Connected accounts for user %s: %s", user_id, [r["connection"] for r in results])
    return results


class TokenVaultError(Exception):
    """Raised when Auth0 Token Vault cannot return a delegated token."""

    def __init__(
        self,
        service: str,
        message: str,
        error_code: str = "connection_lost",
    ) -> None:
        super().__init__(message)
        self.service = service
        self.message = message
        self.error_code = error_code

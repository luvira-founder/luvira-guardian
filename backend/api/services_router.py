"""
GET  /services/status           — show connected service states for the current user
POST /services/reconnect        — return the Auth0 connection URL to re-link a service
POST /services/connect          — initiate Connected Accounts flow (Token Vault)
POST /services/connect/complete — complete Connected Accounts flow after provider redirect
"""

import logging
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from auth.dependencies import get_raw_token, get_user_id
from auth.token_vault import TokenVaultError, get_connected_services
from config import get_settings
from models.schemas import (
    ConnectionState,
    ErrorCode,
    ErrorResponse,
    ReconnectRequest,
    ReconnectResponse,
    ServiceInfo,
    ServicesStatusResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/services", tags=["services"])

# Canonical services the system supports
_SUPPORTED_SERVICES: List[Dict] = [
    {
        "name": "gitlab",
        "display": "GitLab",
        "provider": "gitlab",
        "required_scopes": ["read_api", "write_api"],
    },
    {
        "name": "linkedin",
        "display": "LinkedIn",
        "provider": "linkedin",
        "required_scopes": ["w_member_social"],
    },
    {
        "name": "google-calendar",
        "display": "Google Calendar",
        "provider": "google-oauth2",
        "required_scopes": ["https://www.googleapis.com/auth/calendar.events"],
    },
]


@router.get(
    "/status",
    response_model=ServicesStatusResponse,
    summary="Get connected service status for the current user",
)
async def services_status(
    user_id: str = Depends(get_user_id),
) -> ServicesStatusResponse:
    """
    Checks which services the user has connected via Auth0 Token Vault
    (linked identities) and returns their connection state and granted scopes.
    """
    try:
        linked_identities = await get_connected_services(user_id)
    except TokenVaultError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                status="error",
                error_code=ErrorCode.connection_lost,
                message=exc.message,
                service="auth0",
            ).model_dump(),
        )

    # Build a set of connected provider names from Auth0 linked identities
    connected_providers = {
        identity.get("provider", "") for identity in linked_identities
    }

    service_infos: List[ServiceInfo] = []
    for svc in _SUPPORTED_SERVICES:
        provider = svc["provider"]

        if provider in connected_providers:
            state = ConnectionState.connected
            identity_data = next(
                (i for i in linked_identities if i.get("provider") == provider), {}
            )
            scopes = identity_data.get("scopes", svc["required_scopes"])
        else:
            state = ConnectionState.disconnected
            scopes = []

        service_infos.append(
            ServiceInfo(
                service=svc["display"],
                state=state,
                granted_scopes=scopes,
            )
        )

    return ServicesStatusResponse(services=service_infos)


@router.post(
    "/reconnect",
    response_model=ReconnectResponse,
    summary="Get the Auth0 reconnect URL for a disconnected service",
)
async def reconnect_service(
    body: ReconnectRequest,
    user_id: str = Depends(get_user_id),
) -> ReconnectResponse:
    """
    Returns the Auth0 authorize URL that the frontend should redirect the user
    to in order to re-connect the specified service.
    """
    settings = get_settings()

    connection_map: Dict[str, str] = {
        "gitlab": "gitlab",
        "linkedin": "linkedin",
        "google-calendar": "google-oauth2",
    }

    connection = connection_map.get(body.service.lower())
    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                status="error",
                error_code=ErrorCode.validation_error,
                message=f"Unknown service '{body.service}'. Valid values: gitlab, linkedin, google-calendar.",
            ).model_dump(),
        )

    # Build the Auth0 /authorize URL with connection hint
    reconnect_url = (
        f"https://{settings.auth0_domain}/authorize"
        f"?response_type=code"
        f"&client_id={settings.auth0_client_id}"
        f"&redirect_uri={settings.frontend_base_url}/callback"
        f"&scope=openid+profile+email"
        f"&connection={connection}"
        f"&prompt=consent"
    )

    return ReconnectResponse(service=body.service, reconnect_url=reconnect_url)


# ─── Connected Accounts (Token Vault) ────────────────────────────────────


class ExchangeRequest(BaseModel):
    connection: str = Field(..., description="Auth0 connection name: gitlab | linkedin | google-oauth2")
    scopes: List[str] = Field(default_factory=list, description="Provider scopes to request")


class ConnectRequest(ExchangeRequest):
    ma_token: str = Field(..., description="My Account API access token from the frontend")


class ConnectCompleteRequest(BaseModel):
    auth_session: str
    connect_code: str
    ma_token: str = Field(..., description="My Account API access token from the frontend")


@router.post(
    "/test-exchange",
    summary="Test federated token exchange for a connection",
)
async def test_exchange(
    body: ExchangeRequest,
    user_id: str = Depends(get_user_id),
    user_token: str = Depends(get_raw_token),
) -> Dict[str, Any]:
    """Test the federated token exchange — tries to get a provider token."""
    settings = get_settings()
    connection = body.connection
    scopes = body.scopes

    async with httpx.AsyncClient(timeout=15) as client:
        tv_client_id = settings.auth0_tv_client_id or settings.auth0_client_id
        tv_client_secret = settings.auth0_tv_client_secret or settings.auth0_client_secret
        res = await client.post(settings.auth0_token_url, data={
            "grant_type": "urn:auth0:params:oauth:grant-type:token-exchange:federated-connection-access-token",
            "client_id": tv_client_id,
            "client_secret": tv_client_secret,
            "subject_token": user_token,
            "subject_token_type": "urn:ietf:params:oauth:token-type:access_token",
            "requested_token_type": "http://auth0.com/oauth/token-type/federated-connection-access-token",
            "connection": connection,
            "scope": " ".join(scopes) if scopes else "",
        })

    data = res.json()
    if res.status_code == 200:
        # Don't return the actual token — just confirm it worked
        return {
            "status": "success",
            "connection": connection,
            "token_type": data.get("token_type"),
            "scope": data.get("scope"),
            "expires_in": data.get("expires_in"),
            "message": f"Successfully obtained {connection} provider token!",
        }
    else:
        return {
            "status": "failed",
            "connection": connection,
            "error": data.get("error"),
            "error_description": data.get("error_description"),
            "http_status": res.status_code,
        }


@router.post(
    "/connect",
    summary="Initiate Connected Accounts flow for Token Vault",
)
async def connect_service(
    body: ConnectRequest,
    user_id: str = Depends(get_user_id),
    user_token: str = Depends(get_raw_token),
) -> Dict[str, Any]:
    """
    Proxies the Connected Accounts /connect call to Auth0 My Account API.
    The frontend passes a My Account API token in the X-MA-Token header,
    or we forward the user's access token directly.
    """
    settings = get_settings()
    redirect_uri = settings.frontend_base_url

    # The frontend sends a My Account API token in a custom header
    ma_token = body.ma_token

    url = f"https://{settings.auth0_domain}/me/v1/connected-accounts/connect"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(url, headers={
            "Authorization": f"Bearer {ma_token}",
            "Content-Type": "application/json",
        }, json={
            "connection": body.connection,
            "redirect_uri": redirect_uri,
            "scopes": body.scopes,
        })

    if res.status_code >= 400:
        logger.error("Connect initiation failed: %s %s", res.status_code, res.text[:300])
        raise HTTPException(
            status_code=res.status_code,
            detail={"error": "connect_failed", "message": res.text[:300]},
        )

    return res.json()


@router.post(
    "/connect/complete",
    summary="Complete Connected Accounts flow after provider redirect",
)
async def connect_complete(
    body: ConnectCompleteRequest,
    user_id: str = Depends(get_user_id),
) -> Dict[str, Any]:
    """
    Completes the Connected Accounts flow by exchanging the connect_code.
    """
    settings = get_settings()
    redirect_uri = settings.frontend_base_url

    ma_token = body.ma_token

    url = f"https://{settings.auth0_domain}/me/v1/connected-accounts/complete"
    async with httpx.AsyncClient(timeout=15) as client:
        res = await client.post(url, headers={
            "Authorization": f"Bearer {ma_token}",
            "Content-Type": "application/json",
        }, json={
            "auth_session": body.auth_session,
            "connect_code": body.connect_code,
            "redirect_uri": redirect_uri,
        })

    if res.status_code not in (200, 201):
        logger.error("Connect completion failed: %s %s", res.status_code, res.text[:300])
        raise HTTPException(
            status_code=res.status_code,
            detail={"error": "complete_failed", "message": res.text[:300]},
        )

    return res.json()

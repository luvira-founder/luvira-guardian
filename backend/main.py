"""
Luvira Guardian — FastAPI application entry point.

Startup validates required configuration so the process fails fast if
environment variables are missing, rather than failing at runtime.
"""

import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.agent_router import router as agent_router
from api.audit_router import router as audit_router
from api.services_router import router as services_router
from config import get_settings


def _configure_logging(level: str) -> None:
    logging.basicConfig(
        stream=sys.stdout,
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


def create_app() -> FastAPI:
    settings = get_settings()
    _configure_logging(settings.log_level)

    app = FastAPI(
        title="Luvira Guardian",
        description=(
            "Secure AI Incident Response Agent — "
            "powered by Auth0 Token Vault for delegated, zero-local-secrets authorization."
        ),
        version="1.0.0",
    )

    # ── CORS ─────────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            settings.frontend_base_url,
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────────────────────────
    app.include_router(agent_router)
    app.include_router(audit_router)
    app.include_router(services_router)

    # ── Health check ──────────────────────────────────────────────────────────
    @app.get("/health", tags=["health"])
    async def health() -> dict:
        return {"status": "ok", "service": "luvira-guardian"}

    return app


app = create_app()

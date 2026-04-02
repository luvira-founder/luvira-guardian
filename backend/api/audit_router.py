"""
GET /audit/logs

Returns the structured audit log for the authenticated user.
Each entry includes: timestamp, user_id, agent_id, action, service,
status, step_up_required, and an optional detail field.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query

from auth.dependencies import get_user_id
from audit_logging.audit_logger import get_logs
from models.schemas import AuditLogsResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/audit", tags=["audit"])


@router.get(
    "/logs",
    response_model=AuditLogsResponse,
    summary="Retrieve the audit log for the current user",
)
async def get_audit_logs(
    user_id: str = Depends(get_user_id),
    workflow_id: Optional[str] = Query(default=None, description="Filter by workflow ID"),
) -> AuditLogsResponse:
    logs = get_logs(user_id=user_id, workflow_id=workflow_id)
    return AuditLogsResponse(logs=logs, total=len(logs))

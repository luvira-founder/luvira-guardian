"""
Audit Logger.

Stores structured audit entries in-memory for the demo.
In production this would write to a persistent store (database, SIEM, etc.).

Security rules enforced here:
  - Raw access tokens are NEVER logged.
  - Authorization header values are NEVER logged.
  - Only structured metadata is stored.
"""

import logging
from typing import List, Optional

from models.schemas import AuditEntry

logger = logging.getLogger(__name__)

# In-memory audit store — persists for the lifetime of the process
_audit_log: List[AuditEntry] = []


def log_action(entry: AuditEntry) -> None:
    """
    Append an AuditEntry to the in-memory log and emit a structured log line.

    Never pass token values, Authorization headers, or raw credentials to this
    function. Only action metadata is recorded.
    """
    _audit_log.append(entry)

    # Structured log — fields only, no secret material
    logger.info(
        "AUDIT wf=%s action=%s service=%s user=%s agent=%s status=%s "
        "step_up=%s approval=%s failure_reason=%s detail=%s",
        entry.workflow_id or "",
        entry.action,
        entry.service,
        entry.user_id,
        entry.agent_id,
        entry.status.value,
        entry.step_up_required,
        entry.approval_state.value if entry.approval_state else "",
        entry.failure_reason or "",
        entry.detail or "",
    )


def get_logs(
    user_id: Optional[str] = None,
    workflow_id: Optional[str] = None,
) -> List[AuditEntry]:
    """
    Return audit entries, optionally filtered by user_id and/or workflow_id.

    Returns entries in chronological order (oldest first).
    """
    results = _audit_log
    if user_id is not None:
        results = [e for e in results if e.user_id == user_id]
    if workflow_id is not None:
        results = [e for e in results if e.workflow_id == workflow_id]
    return list(results)


def clear_logs() -> None:
    """Clear the in-memory log. Intended for testing only."""
    _audit_log.clear()

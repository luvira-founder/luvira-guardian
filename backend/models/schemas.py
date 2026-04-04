from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────

class WorkflowStep(str, Enum):
    retrieve_gitlab_issue = "retrieve_gitlab_issue"
    generate_incident_summary = "generate_incident_summary"
    send_slack_notification = "send_slack_notification"
    schedule_calendar_meeting = "schedule_calendar_meeting"


class ActionStatus(str, Enum):
    success = "success"
    failed = "failed"
    skipped = "skipped"


class ConnectionState(str, Enum):
    connected = "connected"
    disconnected = "disconnected"
    reconnect_required = "reconnect_required"


class ErrorCode(str, Enum):
    unauthenticated = "unauthenticated"
    permission_denied = "permission_denied"
    connection_lost = "connection_lost"
    step_up_required = "step_up_required"
    validation_error = "validation_error"
    workflow_failed = "workflow_failed"
    provider_api_error = "provider_api_error"


class ApprovalState(str, Enum):
    approved = "approved"
    modified = "modified"
    rejected = "rejected"


# ─── Agent Request / Response ─────────────────────────────────────────────────

class AgentRequest(BaseModel):
    prompt: str = Field(..., min_length=1, description="User's natural language workflow request")
    preview_only: bool = Field(
        default=True,
        description="If true, return Permission Contract without executing. If false, execute workflow.",
    )
    step_up_verified: bool = Field(
        default=False,
        description="Set to true when the client has completed step-up authentication for a high-risk action.",
    )
    workflow_id: Optional[str] = Field(
        default=None,
        description="Workflow ID from preflight. Required when preview_only=false.",
    )
    approved_steps: Optional[List[WorkflowStep]] = Field(
        default=None,
        description="Steps the user approved from the Permission Contract. Backend executes only these.",
    )
    # Optional overrides for demo
    gitlab_project_id: Optional[str] = None
    gitlab_issue_iid: Optional[str] = None
    slack_channel: Optional[str] = None
    calendar_id: Optional[str] = None


class DelegatedScopes(BaseModel):
    gitlab: List[str] = Field(default_factory=list)
    slack: List[str] = Field(default_factory=list)
    google_calendar: List[str] = Field(default_factory=list)


class WorkflowStepDetail(BaseModel):
    action: WorkflowStep
    required: bool
    status: str = "ready"  # "ready" | "blocked"
    reason: Optional[str] = None


class PermissionContract(BaseModel):
    workflow_id: str
    workflow: List[WorkflowStep]
    steps: List[WorkflowStepDetail]
    authorization_source: str = "Auth0 Token Vault"
    delegated_scopes: DelegatedScopes
    security_guarantees: List[str] = Field(
        default=[
            "No credentials stored locally",
            "Tokens are short-lived",
            "All actions logged",
        ]
    )
    high_risk: bool = False


# ─── Workflow Plan (internal + returned on preview) ───────────────────────────

class WorkflowPlan(BaseModel):
    workflow_id: str = Field(default_factory=lambda: f"wf_{uuid.uuid4().hex[:12]}")
    steps: List[WorkflowStep]
    high_risk: bool = False
    high_risk_keywords: List[str] = Field(default_factory=list)
    # Resolved context
    gitlab_project_id: str = ""
    gitlab_issue_iid: str = ""
    slack_channel: str = ""
    calendar_id: str = "primary"


# ─── Preflight ───────────────────────────────────────────────────────────────

class PreflightStepStatus(BaseModel):
    action: str
    required: bool
    status: str  # "ready" | "blocked"
    reason: Optional[str] = None


class PreflightResponse(BaseModel):
    status: str  # "ready" | "blocked"
    workflow_id: str
    services: Dict[str, str]
    steps: List[PreflightStepStatus]
    blocking_reason: Optional[str] = None


# ─── Audit Log ────────────────────────────────────────────────────────────────

class AuditEntry(BaseModel):
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_id: str
    agent_id: str = "luvira_guardian"
    action: str
    service: str
    status: ActionStatus
    step_up_required: bool = False
    detail: Optional[str] = None
    workflow_id: Optional[str] = None
    approval_state: Optional[ApprovalState] = None
    failure_reason: Optional[str] = None


# ─── Service Status ───────────────────────────────────────────────────────────

class ServiceInfo(BaseModel):
    service: str
    state: ConnectionState
    granted_scopes: List[str] = Field(default_factory=list)


class ServicesStatusResponse(BaseModel):
    services: List[ServiceInfo]


# ─── Reconnect ────────────────────────────────────────────────────────────────

class ReconnectRequest(BaseModel):
    service: str = Field(..., description="Service to reconnect: gitlab | slack | google-calendar")


class ReconnectResponse(BaseModel):
    service: str
    reconnect_url: str


# ─── Error Response ───────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    status: str = "error"
    error_code: ErrorCode
    message: str
    service: Optional[str] = None
    action: Optional[str] = None
    details: Optional[Any] = None
    step_up_required: Optional[bool] = None


# ─── Execution Result ─────────────────────────────────────────────────────────

class ExecutionResult(BaseModel):
    status: str = "success"  # "success" | "partial_success" | "failed"
    workflow_id: str
    timeline: List[AuditEntry]
    completed_steps: List[str] = Field(default_factory=list)
    failed_steps: List[str] = Field(default_factory=list)


# ─── Audit Log Response ───────────────────────────────────────────────────────

class AuditLogsResponse(BaseModel):
    logs: List[AuditEntry]
    total: int

"""
Deterministic workflow planner.

Maps keywords in the user's natural language prompt to a structured, ordered
list of workflow steps. This is intentionally controlled and non-autonomous —
the system prioritizes predictable orchestration over broad AI autonomy.

High-risk keyword detection pauses execution and triggers step-up auth.

SECURITY INVARIANT — Reasoning-Layer Token Isolation:

The workflow planner is the "reasoning" layer. It operates on:
  - The user's natural language prompt (str)
  - Configuration defaults (str)

It NEVER receives, processes, or has access to:
  - Auth0 access tokens
  - Provider tokens (GitLab, Slack, Google)
  - Authorization headers
  - Any credential material

This separation is enforced by the function signatures: plan_workflow() accepts
only str parameters. Token exchange happens exclusively in incident_agent.py
at the Act phase, via auth/token_vault.py.
"""

import re
from typing import Dict, List, Optional

from models.schemas import (
    PreflightResponse,
    PreflightStepStatus,
    WorkflowPlan,
    WorkflowStep,
    WorkflowStepDetail,
)

# ─── Step metadata registries ────────────────────────────────────────────────

STEP_REQUIRED_MAP: Dict[WorkflowStep, bool] = {
    WorkflowStep.retrieve_gitlab_issue: True,
    WorkflowStep.generate_incident_summary: True,
    WorkflowStep.send_slack_notification: True,
    WorkflowStep.schedule_calendar_meeting: False,
}

STEP_SERVICE_MAP: Dict[WorkflowStep, Optional[str]] = {
    WorkflowStep.retrieve_gitlab_issue: "gitlab",
    WorkflowStep.generate_incident_summary: None,  # local computation, no service
    WorkflowStep.send_slack_notification: "slack",
    WorkflowStep.schedule_calendar_meeting: "google-calendar",
}

STEP_REQUIRED_SCOPES: Dict[WorkflowStep, List[str]] = {
    WorkflowStep.retrieve_gitlab_issue: ["read_api"],
    WorkflowStep.generate_incident_summary: [],
    WorkflowStep.send_slack_notification: ["chat:write"],
    WorkflowStep.schedule_calendar_meeting: ["https://www.googleapis.com/auth/calendar.events"],
}

# Auth0 connection name for each logical service
_SERVICE_PROVIDER_MAP: Dict[str, str] = {
    "gitlab": "gitlab",
    "slack": "sign-in-with-slack",
    "google-calendar": "google-oauth2",
}

# ─── Keyword → Step mapping (order matters: steps execute in list order) ──────

_STEP_KEYWORDS: List[tuple[WorkflowStep, List[str]]] = [
    (
        WorkflowStep.retrieve_gitlab_issue,
        ["incident", "issue", "review", "gitlab", "bug", "ticket", "problem", "error"],
    ),
    (
        WorkflowStep.generate_incident_summary,
        # Always included when retrieve_gitlab_issue is present;
        # can also be triggered explicitly
        ["summary", "summarize", "describe", "analyze", "report"],
    ),
    (
        WorkflowStep.send_slack_notification,
        ["notify", "notification", "slack", "team", "alert", "message", "inform", "post"],
    ),
    (
        WorkflowStep.schedule_calendar_meeting,
        ["meeting", "schedule", "calendar", "follow-up", "followup", "book", "call"],
    ),
]

# ─── High-risk keyword detection ─────────────────────────────────────────────

_HIGH_RISK_PATTERNS: List[str] = [
    r"\bdelete\b",
    r"\bremove\b.*\brepo",
    r"\brevoke\b",
    r"\bdrop\b.*\bdeploy",
    r"\bmodify.*production\b",
    r"\bproduction.*config\b",
    r"\bdestroy\b",
    r"\bwipe\b",
    r"\bpurge\b",
]


def plan_workflow(
    prompt: str,
    gitlab_project_id: str = "",
    gitlab_issue_iid: str = "",
    slack_channel: str = "",
    calendar_id: str = "primary",
    workflow_id: Optional[str] = None,
) -> WorkflowPlan:
    """
    Analyse `prompt` and return a deterministic WorkflowPlan.

    Rules:
    - Steps are deduplicated and returned in canonical execution order.
    - If retrieve_gitlab_issue is present, generate_incident_summary is always
      appended immediately after it (incident context is needed for the summary).
    - High-risk keywords immediately set high_risk=True; no steps are added for
      the dangerous action — execution will be blocked by the caller.
    """
    normalized = prompt.lower()

    # ── High-risk detection ───────────────────────────────────────────────────
    matched_risk: List[str] = []
    for pattern in _HIGH_RISK_PATTERNS:
        if re.search(pattern, normalized):
            matched_risk.append(pattern)

    if matched_risk:
        return WorkflowPlan(
            workflow_id=workflow_id or WorkflowPlan.model_fields["workflow_id"].default_factory(),
            steps=[],
            high_risk=True,
            high_risk_keywords=matched_risk,
            gitlab_project_id=gitlab_project_id,
            gitlab_issue_iid=gitlab_issue_iid,
            slack_channel=slack_channel,
            calendar_id=calendar_id,
        )

    # ── Normal step mapping ───────────────────────────────────────────────────
    matched_steps: List[WorkflowStep] = []

    for step, keywords in _STEP_KEYWORDS:
        if step == WorkflowStep.generate_incident_summary:
            # Added automatically after retrieve_gitlab_issue; skip here
            continue
        if any(kw in normalized for kw in keywords):
            matched_steps.append(step)

    # If no steps matched at all, default to the full incident response workflow
    if not matched_steps:
        matched_steps = [
            WorkflowStep.retrieve_gitlab_issue,
            WorkflowStep.send_slack_notification,
            WorkflowStep.schedule_calendar_meeting,
        ]

    # ── Inject generate_incident_summary after retrieve_gitlab_issue ──────────
    ordered: List[WorkflowStep] = []
    for step in matched_steps:
        ordered.append(step)
        if step == WorkflowStep.retrieve_gitlab_issue:
            ordered.append(WorkflowStep.generate_incident_summary)

    # Deduplicate while preserving order
    seen: set = set()
    deduped: List[WorkflowStep] = []
    for step in ordered:
        if step not in seen:
            deduped.append(step)
            seen.add(step)

    return WorkflowPlan(
        workflow_id=workflow_id or WorkflowPlan.model_fields["workflow_id"].default_factory(),
        steps=deduped,
        high_risk=False,
        high_risk_keywords=[],
        gitlab_project_id=gitlab_project_id,
        gitlab_issue_iid=gitlab_issue_iid,
        slack_channel=slack_channel,
        calendar_id=calendar_id,
    )


def build_permission_contract_scopes(steps: List[WorkflowStep]) -> dict:
    """
    Return the minimal scopes required for the given workflow steps.
    Used to populate the PermissionContract before execution.
    """
    scopes: dict = {"gitlab": [], "slack": [], "google_calendar": []}

    for step in steps:
        if step == WorkflowStep.retrieve_gitlab_issue:
            if "read_api" not in scopes["gitlab"]:
                scopes["gitlab"].append("read_api")
        if step == WorkflowStep.generate_incident_summary:
            pass
        if step == WorkflowStep.send_slack_notification:
            if "chat:write" not in scopes["slack"]:
                scopes["slack"].append("chat:write")
        if step == WorkflowStep.schedule_calendar_meeting:
            cal_scope = "https://www.googleapis.com/auth/calendar.events"
            if cal_scope not in scopes["google_calendar"]:
                scopes["google_calendar"].append(cal_scope)

    return scopes


def build_step_details(steps: List[WorkflowStep]) -> List[WorkflowStepDetail]:
    """Build enriched step details with required/optional classification."""
    return [
        WorkflowStepDetail(
            action=step,
            required=STEP_REQUIRED_MAP.get(step, True),
            status="ready",
        )
        for step in steps
    ]


async def preflight_check(
    plan: WorkflowPlan,
    linked_identities: list,
) -> PreflightResponse:
    """
    Check if each required service is connected before showing the Permission Contract.

    Args:
        plan: The workflow plan with steps and workflow_id.
        linked_identities: List of identity dicts from Auth0 Management API.

    Returns:
        PreflightResponse with per-step readiness and overall status.
    """
    # Build connected providers set from Auth0 linked identities
    connected_providers: Dict[str, dict] = {}
    for identity in linked_identities:
        provider = identity.get("provider", "")
        connected_providers[provider] = identity

    # Build services status
    services_status: Dict[str, str] = {}
    for svc_name, provider_name in _SERVICE_PROVIDER_MAP.items():
        services_status[svc_name] = (
            "connected" if provider_name in connected_providers else "disconnected"
        )

    # Check each step
    steps_status: List[PreflightStepStatus] = []
    blocking_reason: Optional[str] = None

    for step in plan.steps:
        required = STEP_REQUIRED_MAP.get(step, True)
        service = STEP_SERVICE_MAP.get(step)

        # Local steps (no service needed) are always ready
        if service is None:
            steps_status.append(PreflightStepStatus(
                action=step.value, required=required, status="ready"
            ))
            continue

        svc_status = services_status.get(service, "disconnected")
        if svc_status == "connected":
            step_status = "ready"
            reason = None
        else:
            step_status = "blocked"
            reason = "connection_lost"

        if step_status == "blocked" and required and blocking_reason is None:
            blocking_reason = f"{service}_disconnected"

        steps_status.append(PreflightStepStatus(
            action=step.value, required=required, status=step_status, reason=reason
        ))

    overall_status = "blocked" if blocking_reason else "ready"

    return PreflightResponse(
        status=overall_status,
        workflow_id=plan.workflow_id,
        services=services_status,
        steps=steps_status,
        blocking_reason=blocking_reason,
    )

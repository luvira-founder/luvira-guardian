"""
Incident Agent — Observe → Reason → Act.

Orchestrates the approved workflow by:
  1. Observe: fetching context from GitLab
  2. Reason:  the WorkflowPlan (already produced by workflow_planner)
  3. Act:     executing each step using short-lived delegated tokens

Zero-Local-Secrets: every delegated token is retrieved inline per step,
used once, and discarded when the coroutine returns.

SECURITY INVARIANT — Reasoning-Layer Token Isolation:

The `user_token` parameter is used ONLY for federated token exchange via
Auth0 Token Vault inside step handlers. It is NEVER:
  - passed to any planning/reasoning function
  - stored in the shared `context` dict
  - logged or included in audit entries
  - passed to any integration service alongside request data

The `context` dict carries only sanitized incident content and workflow
metadata — never tokens, headers, or credential material.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from agent.workflow_planner import STEP_REQUIRED_MAP
from auth.token_vault import TokenVaultError, get_delegated_token
from integrations import calendar_service, gitlab_service, linkedin_service
from integrations.calendar_service import CalendarError
from integrations.gitlab_service import GitLabError
from integrations.linkedin_service import LinkedInError
from audit_logging.audit_logger import log_action
from models.schemas import (
    ActionStatus,
    ApprovalState,
    AuditEntry,
    WorkflowPlan,
    WorkflowStep,
)

logger = logging.getLogger(__name__)

AGENT_ID = "luvira_guardian"

# Keys that must NEVER appear in the shared context dict
_FORBIDDEN_CONTEXT_KEYS = frozenset({
    "token", "access_token", "bearer", "authorization", "secret",
    "user_token", "provider_token", "refresh_token",
})


def _assert_no_tokens_in_context(context: Dict[str, Any]) -> None:
    """Runtime guard: tokens must never enter the shared workflow context."""
    for key in context:
        if key.lower() in _FORBIDDEN_CONTEXT_KEYS:
            raise RuntimeError(
                f"SECURITY VIOLATION: Token material detected in context key: '{key}'"
            )


async def execute_workflow(
    plan: WorkflowPlan,
    user_id: str,
    user_token: str,
    approved_steps: Optional[List[WorkflowStep]] = None,
    approval_state: Optional[ApprovalState] = None,
) -> List[AuditEntry]:
    """
    Execute the approved workflow plan step by step.

    Each step:
      - retrieves a short-lived delegated token from Auth0 Token Vault
      - calls the relevant integration
      - logs the outcome to the audit trail
      - on required step failure, halts the workflow
      - on optional step failure, records and continues (partial_success)

    Args:
        plan: The workflow plan with steps and resolved context.
        user_id: Auth0 user ID from the JWT sub claim.
        user_token: Raw JWT for federated token exchange. NEVER enters context.
        approved_steps: Steps the user approved. If None, all plan steps execute.
        approval_state: "approved" | "modified" | "rejected" from the frontend.

    Returns the list of AuditEntry records produced during execution.
    """
    timeline: List[AuditEntry] = []
    context: Dict[str, Any] = {}

    # Filter to only approved steps if specified
    steps_to_execute = plan.steps
    if approved_steps is not None:
        steps_to_execute = [s for s in plan.steps if s in approved_steps]

    for step in steps_to_execute:
        entry = await _execute_step(step, plan, user_id, user_token, context)

        # Attach workflow-level metadata to every entry
        entry.workflow_id = plan.workflow_id
        entry.approval_state = approval_state

        if entry.status == ActionStatus.failed:
            entry.failure_reason = entry.detail
            required = STEP_REQUIRED_MAP.get(step, True)

            timeline.append(entry)
            log_action(entry)

            if required:
                # Required step failed → halt workflow immediately
                logger.warning(
                    "Workflow halted: required step failed: step=%s user=%s wf=%s",
                    step, user_id, plan.workflow_id,
                )
                break
            else:
                # Optional step failed → log and continue
                logger.warning(
                    "Optional step failed, continuing: step=%s user=%s wf=%s",
                    step, user_id, plan.workflow_id,
                )
                continue

        timeline.append(entry)
        log_action(entry)

        # Runtime safety check after each step
        _assert_no_tokens_in_context(context)

    return timeline


async def _execute_step(
    step: WorkflowStep,
    plan: WorkflowPlan,
    user_id: str,
    user_token: str,
    context: Dict[str, Any],
) -> AuditEntry:
    """Dispatch a single workflow step and return its AuditEntry."""
    handlers = {
        WorkflowStep.retrieve_gitlab_issue: _step_retrieve_gitlab_issue,
        WorkflowStep.generate_incident_summary: _step_generate_summary,
        WorkflowStep.post_linkedin_update: _step_post_linkedin,
        WorkflowStep.schedule_calendar_meeting: _step_schedule_calendar,
    }
    handler = handlers.get(step)
    if handler is None:
        return _build_entry(
            user_id=user_id,
            action=step.value,
            service="unknown",
            status=ActionStatus.failed,
            detail=f"No handler registered for step '{step}'.",
        )

    try:
        return await handler(plan, user_id, user_token, context)
    except TokenVaultError as exc:
        return _build_entry(
            user_id=user_id,
            action=step.value,
            service=exc.service,
            status=ActionStatus.failed,
            detail=f"Token exchange error: {exc.message}",
        )
    except (GitLabError, LinkedInError, CalendarError) as exc:
        return _build_entry(
            user_id=user_id,
            action=step.value,
            service=_service_for_step(step),
            status=ActionStatus.failed,
            detail=str(exc),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Unexpected error during step '%s': %s", step, exc)
        return _build_entry(
            user_id=user_id,
            action=step.value,
            service=_service_for_step(step),
            status=ActionStatus.failed,
            detail="An unexpected error occurred.",
        )


# ─── Step handlers ────────────────────────────────────────────────────────────

async def _step_retrieve_gitlab_issue(
    plan: WorkflowPlan, user_id: str, user_token: str, context: Dict[str, Any]
) -> AuditEntry:
    token = await get_delegated_token(user_token, "gitlab", ["read_api"])
    issue = await gitlab_service.get_issue(
        plan.gitlab_project_id, plan.gitlab_issue_iid, token
    )
    # token falls out of scope — never stored

    # Store issue in context for the summary step
    context["gitlab_issue"] = issue
    return _build_entry(
        user_id=user_id,
        action="retrieve_gitlab_issue",
        service="gitlab",
        status=ActionStatus.success,
        detail=f"Retrieved issue #{plan.gitlab_issue_iid}: {issue.get('title', '')}",
    )


async def _step_generate_summary(
    plan: WorkflowPlan, user_id: str, user_token: str, context: Dict[str, Any]
) -> AuditEntry:
    issue: Optional[Dict[str, Any]] = context.get("gitlab_issue")
    if issue is None:
        return _build_entry(
            user_id=user_id,
            action="generate_incident_summary",
            service="agent",
            status=ActionStatus.failed,
            detail="No GitLab issue in context. retrieve_gitlab_issue must run first.",
        )

    # Deterministic summary — no LLM call, per spec
    title = issue.get("title", "Untitled")
    description = issue.get("description", "No description provided.")
    state = issue.get("state", "unknown")
    labels = ", ".join(issue.get("labels", [])) or "none"
    author = issue.get("author", {}).get("name", "unknown")

    summary = (
        f"Incident Summary\n"
        f"Title: {title}\n"
        f"State: {state}\n"
        f"Labels: {labels}\n"
        f"Author: {author}\n"
        f"Description: {description[:500]}"
    )
    context["incident_summary"] = summary
    context["incident_title"] = title

    return _build_entry(
        user_id=user_id,
        action="generate_incident_summary",
        service="agent",
        status=ActionStatus.success,
        detail=f"Summary generated for: {title}",
    )


async def _step_post_linkedin(
    plan: WorkflowPlan, user_id: str, user_token: str, context: Dict[str, Any]
) -> AuditEntry:
    summary = context.get("incident_summary", "Incident response workflow triggered.")
    title = context.get("incident_title", "Incident")

    message = f"Incident Alert: {title}\n\n{summary}"

    token = await get_delegated_token(user_token, "linkedin", ["w_member_social"])
    await linkedin_service.post_update(message, token)
    # token falls out of scope — never stored

    return _build_entry(
        user_id=user_id,
        action="post_linkedin_update",
        service="linkedin",
        status=ActionStatus.success,
        detail=f"LinkedIn update posted for: {title}",
    )


async def _step_schedule_calendar(
    plan: WorkflowPlan, user_id: str, user_token: str, context: Dict[str, Any]
) -> AuditEntry:
    title = context.get("incident_title", "Incident Follow-Up")
    summary = context.get("incident_summary", "Follow-up meeting for incident response.")
    event_summary = f"Incident Follow-Up: {title}"

    cal_scope = "https://www.googleapis.com/auth/calendar.events"
    token = await get_delegated_token(user_token, "google-calendar", [cal_scope])
    event = await calendar_service.create_event(
        calendar_id=plan.calendar_id,
        summary=event_summary,
        description=summary,
        token=token,
    )
    # token falls out of scope — never stored

    return _build_entry(
        user_id=user_id,
        action="schedule_calendar_meeting",
        service="google_calendar",
        status=ActionStatus.success,
        detail=f"Event created: {event.get('htmlLink', event.get('id', ''))}",
    )


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _build_entry(
    user_id: str,
    action: str,
    service: str,
    status: ActionStatus,
    detail: str = "",
    step_up_required: bool = False,
) -> AuditEntry:
    return AuditEntry(
        timestamp=datetime.now(tz=timezone.utc),
        user_id=user_id,
        agent_id=AGENT_ID,
        action=action,
        service=service,
        status=status,
        step_up_required=step_up_required,
        detail=detail,
    )


def _service_for_step(step: WorkflowStep) -> str:
    return {
        WorkflowStep.retrieve_gitlab_issue: "gitlab",
        WorkflowStep.generate_incident_summary: "agent",
        WorkflowStep.send_slack_notification: "slack",
        WorkflowStep.schedule_calendar_meeting: "google_calendar",
    }.get(step, "unknown")

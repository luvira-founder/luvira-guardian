"""
POST /agent/preflight
  → Check service readiness, return PreflightResponse with workflow_id

POST /agent/execute
  Two modes:
    preview_only=true  → return PermissionContract with step details + workflow_id
    preview_only=false → execute only approved_steps → return ExecutionResult

  High-risk prompts always return step_up_required error unless step_up_verified=true
  AND the JWT carries a valid step-up assertion (amr claim includes mfa or otp).
"""

import logging
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, status

from agent import incident_agent
from agent.workflow_planner import (
    STEP_REQUIRED_MAP,
    build_permission_contract_scopes,
    build_step_details,
    plan_workflow,
    preflight_check,
)
from auth.dependencies import get_current_user, get_raw_token, get_user_id
from auth.token_vault import TokenVaultError, get_connected_services
from config import get_settings
from models.schemas import (
    ActionStatus,
    AgentRequest,
    ApprovalState,
    DelegatedScopes,
    ErrorCode,
    ErrorResponse,
    ExecutionResult,
    PermissionContract,
    PreflightResponse,
    WorkflowStep,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


def _resolve_defaults(body: AgentRequest):
    """Resolve demo defaults from settings."""
    settings = get_settings()
    return (
        body.gitlab_project_id or settings.demo_default_gitlab_project_id,
        body.gitlab_issue_iid or settings.demo_default_gitlab_issue_iid,
        body.slack_channel or settings.demo_default_slack_channel,
        body.calendar_id or settings.demo_default_calendar_id,
    )


@router.post(
    "/preflight",
    response_model=PreflightResponse,
    summary="Check service readiness before showing Permission Contract",
)
async def preflight(
    body: AgentRequest,
    user_id: str = Depends(get_user_id),
    token_payload: Dict[str, Any] = Depends(get_current_user),
) -> PreflightResponse:
    gitlab_project_id, gitlab_issue_iid, slack_channel, calendar_id = _resolve_defaults(body)

    plan = plan_workflow(
        prompt=body.prompt,
        gitlab_project_id=gitlab_project_id,
        gitlab_issue_iid=gitlab_issue_iid,
        slack_channel=slack_channel,
        calendar_id=calendar_id,
    )

    # High-risk gate
    if plan.high_risk:
        if not body.step_up_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorResponse(
                    status="error",
                    error_code=ErrorCode.step_up_required,
                    message="High-risk action detected. Additional verification is required.",
                    step_up_required=True,
                ).model_dump(),
            )
        amr: list = token_payload.get("amr", [])
        if "mfa" not in amr and "otp" not in amr:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorResponse(
                    status="error",
                    error_code=ErrorCode.step_up_required,
                    message="Step-up authentication claim not found in token.",
                    step_up_required=True,
                ).model_dump(),
            )

    # Get linked identities for preflight check
    try:
        linked_identities = await get_connected_services(user_id)
    except TokenVaultError:
        linked_identities = []

    result = await preflight_check(plan, linked_identities)
    return result


@router.post(
    "/execute",
    response_model=None,
    summary="Execute or preview an incident response workflow",
)
async def execute(
    body: AgentRequest,
    user_id: str = Depends(get_user_id),
    token_payload: Dict[str, Any] = Depends(get_current_user),
    user_token: str = Depends(get_raw_token),
) -> PermissionContract | ExecutionResult | Dict:
    gitlab_project_id, gitlab_issue_iid, slack_channel, calendar_id = _resolve_defaults(body)

    # ── Plan (Reason) ─────────────────────────────────────────────────────────
    plan = plan_workflow(
        prompt=body.prompt,
        gitlab_project_id=gitlab_project_id,
        gitlab_issue_iid=gitlab_issue_iid,
        slack_channel=slack_channel,
        calendar_id=calendar_id,
        workflow_id=body.workflow_id,
    )

    # ── High-risk gate ────────────────────────────────────────────────────────
    if plan.high_risk:
        if not body.step_up_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorResponse(
                    status="error",
                    error_code=ErrorCode.step_up_required,
                    message=(
                        "High-risk action detected. Additional verification is required "
                        "before this workflow can proceed."
                    ),
                    step_up_required=True,
                ).model_dump(),
            )

        # Verify the Auth0 token carries an MFA assertion
        amr: list = token_payload.get("amr", [])
        if "mfa" not in amr and "otp" not in amr:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ErrorResponse(
                    status="error",
                    error_code=ErrorCode.step_up_required,
                    message=(
                        "Step-up authentication claim not found in token. "
                        "Please complete MFA verification and retry."
                    ),
                    step_up_required=True,
                ).model_dump(),
            )

    # ── Build Permission Contract ─────────────────────────────────────────────
    raw_scopes = build_permission_contract_scopes(plan.steps)
    step_details = build_step_details(plan.steps)
    contract = PermissionContract(
        workflow_id=plan.workflow_id,
        workflow=plan.steps,
        steps=step_details,
        delegated_scopes=DelegatedScopes(
            gitlab=raw_scopes["gitlab"],
            slack=raw_scopes["slack"],
            google_calendar=raw_scopes["google_calendar"],
        ),
        high_risk=plan.high_risk,
    )

    # ── Preview only — return contract without executing ──────────────────────
    if body.preview_only:
        return contract

    # ── Validate required context for execution ───────────────────────────────
    # Determine which steps to execute
    steps_to_execute = plan.steps
    if body.approved_steps is not None:
        steps_to_execute = [s for s in plan.steps if s in body.approved_steps]

    missing = []
    for step in steps_to_execute:
        if step == WorkflowStep.retrieve_gitlab_issue:
            if not gitlab_project_id:
                missing.append("gitlab_project_id")
            if not gitlab_issue_iid:
                missing.append("gitlab_issue_iid")
        if step == WorkflowStep.send_slack_notification and not slack_channel:
            missing.append("slack_channel")

    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=ErrorResponse(
                status="error",
                error_code=ErrorCode.validation_error,
                message=f"Missing required fields for execution: {', '.join(missing)}",
                details={"missing_fields": missing},
            ).model_dump(),
        )

    # ── Determine approval state ──────────────────────────────────────────────
    if body.approved_steps is None:
        approval_state = ApprovalState.approved
    elif set(body.approved_steps) == set(plan.steps):
        approval_state = ApprovalState.approved
    else:
        approval_state = ApprovalState.modified

    # ── Act — execute the workflow ────────────────────────────────────────────
    try:
        timeline = await incident_agent.execute_workflow(
            plan,
            user_id,
            user_token,
            approved_steps=body.approved_steps,
            approval_state=approval_state,
        )
    except TokenVaultError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=ErrorResponse(
                status="error",
                error_code=ErrorCode.connection_lost,
                message=exc.message,
                service=exc.service,
                action="reconnect_required",
            ).model_dump(),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Workflow execution failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=ErrorResponse(
                status="error",
                error_code=ErrorCode.workflow_failed,
                message="Workflow execution encountered an unexpected error.",
            ).model_dump(),
        )

    # ── Compute execution result ──────────────────────────────────────────────
    completed = [e.action for e in timeline if e.status == ActionStatus.success]
    failed = [e.action for e in timeline if e.status == ActionStatus.failed]

    if failed and completed:
        # Check if all required steps succeeded
        required_steps_in_scope = {
            s.value for s in steps_to_execute if STEP_REQUIRED_MAP.get(s, True)
        }
        all_required_ok = required_steps_in_scope.issubset(set(completed))
        overall_status = "partial_success" if all_required_ok else "failed"
    elif failed:
        overall_status = "failed"
    else:
        overall_status = "success"

    return ExecutionResult(
        status=overall_status,
        workflow_id=plan.workflow_id,
        timeline=timeline,
        completed_steps=completed,
        failed_steps=failed,
    )

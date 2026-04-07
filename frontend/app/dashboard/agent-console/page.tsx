"use client";

import { useState, useEffect, useRef } from "react";
import { ConsoleState, StepStatus, WorkflowStep } from "@/types";
import { useExecuteWorkFlow } from "@/services/mutations";
import { useQueryClient } from "@tanstack/react-query";
import { PLAN_STEPS, STEP_ID_TO_ACTION, WORKFLOW_STEPS } from "@/lib/constants";

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "success") {
    return (
      <span className="w-5 h-5 rounded-full bg-green-100 border border-green-300 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
    );
  }
  if (status === "failed") {
    return (
      <span className="w-5 h-5 rounded-full bg-red-100 border border-red-300 flex items-center justify-center">
        <svg
          className="w-3 h-3 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.5}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="w-5 h-5 rounded-full border border-gray-300 bg-white" />
  );
}

function PermissionContractModal({
  onApprove,
  onDeny,
}: {
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="h-px bg-linear-to-r from-transparent via-[#3bcaca]/50 to-transparent" />
        <div className="p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#3bcaca]/10 border border-[#3bcaca]/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-[#3bcaca]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900">
                Permission Contract
              </h2>
              <p className="text-[11px] text-gray-400">
                Review before authorizing
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <section>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Requested Workflow
              </p>
              <ul className="space-y-1">
                {[
                  "Read GitLab Incident Issue",
                  "Send Slack Notification",
                  "Schedule Calendar Meeting",
                ].map((action) => (
                  <li
                    key={action}
                    className="flex items-center gap-2 text-[13px] text-gray-600"
                  >
                    <span className="w-1 h-1 rounded-full bg-gray-400" />
                    {action}
                  </li>
                ))}
              </ul>
            </section>

            <div className="h-px bg-gray-100" />

            <section>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Authorization Source
              </p>
              <p className="text-[13px] text-[#3bcaca] font-medium">
                Auth0 Token Vault
              </p>
            </section>

            <section>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Delegated Scopes
              </p>
              <div className="space-y-1.5">
                {[
                  { service: "GitLab", scope: "read_api" },
                  { service: "Slack", scope: "chat:write" },
                  {
                    service: "Google Calendar",
                    scope: "…/auth/calendar.events",
                  },
                ].map(({ service, scope }) => (
                  <div key={service} className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400 w-28 shrink-0">
                      {service}:
                    </span>
                    <span className="text-[12px] font-mono text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                      {scope}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <div className="h-px bg-gray-100" />

            <section>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Security Guarantees
              </p>
              <ul className="space-y-1">
                {[
                  "No credentials stored locally",
                  "Tokens are short-lived",
                  "All actions logged",
                ].map((g) => (
                  <li
                    key={g}
                    className="flex items-center gap-2 text-[12px] text-gray-600"
                  >
                    <svg
                      className="w-3.5 h-3.5 text-green-500 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                    {g}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onDeny}
              className="flex-1 py-2 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Deny
            </button>
            <button
              onClick={onApprove}
              className="flex-1 py-2 text-[13px] font-medium text-white bg-[#3bcaca] rounded-lg hover:bg-[#2db8b8] transition-colors"
            >
              Authorize Workflow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HighRiskModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white border border-yellow-200 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="h-px bg-linear-to-r from-transparent via-yellow-400/50 to-transparent" />
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-yellow-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.75}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h2 className="text-[16px] font-semibold text-gray-900 mb-1">
            High-Risk Action Detected
          </h2>
          <p className="text-[13px] text-gray-500 mb-1">
            Additional verification required
          </p>
          <p className="text-[12px] text-yellow-600 mb-6">
            Awaiting confirmation on your device&hellip;
          </p>

          <div className="flex items-center justify-center gap-3 mb-6">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 text-[13px] font-medium text-white bg-yellow-500 rounded-lg hover:bg-yellow-400 transition-colors"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReconnectBanner({
  service,
  onReconnect,
  onDismiss,
}: {
  service: string;
  onReconnect: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-xl p-4 flex items-start gap-3">
      <svg
        className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.75}
          d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
        />
      </svg>
      <div className="flex-1">
        <p className="text-[13px] font-semibold text-red-700">
          {service} connection lost
        </p>
        <p className="text-[12px] text-gray-500 mt-0.5">
          Reconnect required to continue this workflow.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onReconnect}
          className="px-3 py-1.5 text-[12px] font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
        >
          Reconnect
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 text-[12px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function AgentConsolePage() {
  const [prompt, setPrompt] = useState(
    "Review the incident issue, notify the team, and schedule a follow-up meeting.",
  );
  const [gitlabProjectId, setGitlabProjectId] = useState("");
  const [gitlabIssueIid, setGitlabIssueIid] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [state, setState] = useState<ConsoleState>({ type: "idle" });
  const executionRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutateAsync: executeWorkflow } = useExecuteWorkFlow();
  const queryClient = useQueryClient();

  function initSteps(): WorkflowStep[] {
    return WORKFLOW_STEPS.map((s) => ({ ...s, status: "pending" }));
  }

  function handleSubmit() {
    if (!prompt.trim()) return;
    setState({ type: "planning" });
    setTimeout(() => setState({ type: "contract" }), 2000);
  }

  function handleDeny() {
    setState({ type: "idle" });
  }

  async function handleApprove() {
    const steps = initSteps();
    setState({ type: "executing", steps, connectionLost: null });
    try {
      const result = await executeWorkflow({
        prompt,
        gitlab_project_id: gitlabProjectId || null,
        gitlab_issue_iid: gitlabIssueIid || null,
        slack_channel: slackChannel || null,
        calendar_id: calendarId,
        preview_only: false,
      });
      await queryClient.invalidateQueries({ queryKey: ["audit-log"] });

      if (result.status === "failed") {
        const updatedSteps = steps.map((s) => {
          const action = STEP_ID_TO_ACTION[s.id];
          if (result.failed_steps.includes(action)) {
            const item = result.timeline.find((t) => t.action === action);
            return {
              ...s,
              status: "failed" as StepStatus,
              failureReason: item?.failure_reason,
            };
          }
          if (result.completed_steps.includes(action)) {
            return { ...s, status: "success" as StepStatus };
          }
          return s;
        });
        setState({ type: "completed", steps: updatedSteps });
      } else {
        runStep(steps, 0);
      }
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Workflow execution failed";
      const failedSteps = steps.map((s, i) =>
        i === 0
          ? { ...s, status: "failed" as StepStatus, failureReason: reason }
          : s,
      );
      setState({ type: "completed", steps: failedSteps });
    }
  }

  function runStep(steps: WorkflowStep[], index: number) {
    if (index >= steps.length) {
      setState({ type: "completed", steps });
      return;
    }
    const updated = steps.map((s, i) =>
      i === index ? { ...s, status: "in_progress" as StepStatus } : s,
    );
    setState({ type: "executing", steps: updated, connectionLost: null });
    if (index === 2) {
      executionRef.current = setTimeout(() => {
        setState({
          type: "high_risk",
          steps: updated,
          pendingStepIndex: index,
        });
      }, 800);
      return;
    }
    const delay = index === 1 ? 1500 : 2000;
    executionRef.current = setTimeout(() => {
      const done = updated.map((s, i) =>
        i === index ? { ...s, status: "success" as StepStatus } : s,
      );
      runStep(done, index + 1);
    }, delay);
  }

  function handleHighRiskConfirm() {
    if (state.type !== "high_risk") return;
    const { steps, pendingStepIndex } = state;
    setState({ type: "executing", steps, connectionLost: null });
    executionRef.current = setTimeout(() => {
      const done = steps.map((s, i) =>
        i === pendingStepIndex ? { ...s, status: "success" as StepStatus } : s,
      );
      runStep(done, pendingStepIndex + 1);
    }, 2000);
  }

  function handleHighRiskCancel() {
    if (state.type !== "high_risk") return;
    const failed = state.steps.map((s, i) =>
      i === state.pendingStepIndex
        ? { ...s, status: "failed" as StepStatus }
        : s,
    );
    setState({ type: "completed", steps: failed });
  }

  function handleSimulateConnectionLost() {
    if (state.type !== "executing") return;
    if (executionRef.current) clearTimeout(executionRef.current);
    setState({ type: "connection_lost", steps: state.steps, service: "Slack" });
  }

  function handleReconnect() {
    if (state.type !== "connection_lost") return;
    const steps = state.steps;
    const resumeIndex = steps.findIndex((s) => s.status !== "success");
    setState({ type: "executing", steps, connectionLost: null });
    runStep(steps, resumeIndex >= 0 ? resumeIndex : 0);
  }

  function handleReset() {
    if (executionRef.current) clearTimeout(executionRef.current);
    setState({ type: "idle" });
    setPrompt(
      "Review the incident issue, notify the team, and schedule a follow-up meeting.",
    );
  }

  useEffect(() => {
    return () => {
      if (executionRef.current) clearTimeout(executionRef.current);
    };
  }, []);

  const isSuccessfullyCompleted =
    state.type === "completed" &&
    state.steps.every((s) => s.status === "success");

  const executingSteps =
    state.type === "executing"
      ? state.steps
      : state.type === "high_risk"
        ? state.steps
        : state.type === "completed"
          ? state.steps
          : state.type === "connection_lost"
            ? state.steps
            : null;

  return (
    <>
      {state.type === "contract" && (
        <PermissionContractModal
          onApprove={handleApprove}
          onDeny={handleDeny}
        />
      )}
      {state.type === "high_risk" && (
        <HighRiskModal
          onConfirm={handleHighRiskConfirm}
          onCancel={handleHighRiskCancel}
        />
      )}

      <div className="px-8 py-8 w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
            Agent Console
          </h1>
          <p className="text-gray-500 text-sm mt-1.5">
            Submit an incident workflow request for structured AI orchestration.
          </p>
        </div>

        {/* Prompt input */}
        <div className="bg-white border border-gray-200 rounded-md p-5 mb-5 shadow-sm">
          <label className="block text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-2.5">
            Workflow Request
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isSuccessfullyCompleted}
            rows={3}
            className="w-full bg-transparent text-[14px] text-gray-700 placeholder:text-gray-300 resize-none outline-none leading-relaxed disabled:opacity-50"
            placeholder="Describe the incident response workflow…"
          />

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 max-[500px]:grid-cols-1">
            {(
              [
                {
                  label: "GitLab Project ID",
                  value: gitlabProjectId,
                  set: setGitlabProjectId,
                  placeholder: "e.g. 8472739",
                },
                {
                  label: "GitLab Issue IID",
                  value: gitlabIssueIid,
                  set: setGitlabIssueIid,
                  placeholder: "e.g. 1",
                },
                {
                  label: "Slack Channel",
                  value: slackChannel,
                  set: setSlackChannel,
                  placeholder: "e.g. #incidents",
                },
                {
                  label: "Calendar ID",
                  value: calendarId,
                  set: setCalendarId,
                  placeholder: "e.g. primary",
                },
              ] as const
            ).map((field) => (
              <div key={field.label} className="flex flex-col gap-1">
                <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                  {field.label}
                </label>
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => field.set(e.target.value)}
                  disabled={isSuccessfullyCompleted}
                  placeholder={field.placeholder}
                  className="w-full bg-gray-50 border border-gray-200 rounded px-3 py-2 text-[13px] text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#3bcaca] focus:ring-1 focus:ring-[#3bcaca]/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
            {isSuccessfullyCompleted ? (
              <button
                onClick={handleReset}
                className="px-4 py-2 text-[13px] font-medium text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors max-[500px]:w-full"
              >
                Reset
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={state.type !== "idle" || !prompt.trim()}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#3bcaca] rounded hover:bg-[#2db8b8] transition-colors disabled:opacity-40 disabled:cursor-not-allowed max-[500px]:w-full"
              >
                Run Workflow
              </button>
            )}
            {state.type === "executing" && (
              <button
                onClick={handleSimulateConnectionLost}
                className="text-[11px] text-gray-300 hover:text-red-400 transition-colors"
              >
                Demo: lose connection
              </button>
            )}
          </div>
        </div>

        {/* Agent Workflow Plan */}
        {state.type === "planning" && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-4 h-4 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
              <p className="text-[13px] font-semibold text-gray-900">
                Agent Workflow Plan
              </p>
            </div>
            <ul className="space-y-2">
              {PLAN_STEPS.map((step, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2.5 text-[13px] text-gray-600"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-400 font-medium">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Connection Lost Banner */}
        {state.type === "connection_lost" && (
          <div className="mb-5">
            <ReconnectBanner
              service={state.service}
              onReconnect={handleReconnect}
              onDismiss={handleReset}
            />
          </div>
        )}

        {/* Execution Timeline */}
        {executingSteps &&
          state.type !== "planning" &&
          state.type !== "contract" && (
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Execution Timeline
              </p>
              <div className="space-y-0">
                {executingSteps.map((step, i) => (
                  <div key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <StepIcon status={step.status} />
                      {i < executingSteps.length - 1 && (
                        <div
                          className={`w-px flex-1 mt-1 mb-1 min-h-5 ${step.status === "success" ? "bg-green-300" : "bg-gray-200"}`}
                        />
                      )}
                    </div>
                    <div className="pb-4">
                      <p
                        className={`text-[13px] font-medium leading-none mt-0.5 ${
                          step.status === "success"
                            ? "text-gray-700"
                            : step.status === "in_progress"
                              ? "text-gray-900"
                              : step.status === "failed"
                                ? "text-red-500"
                                : "text-gray-300"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1">
                        {step.service}
                        {step.status === "in_progress" && (
                          <span className="text-[#3bcaca]"> · Running…</span>
                        )}
                        {step.status === "success" && (
                          <span className="text-green-500"> · Complete</span>
                        )}
                        {step.status === "failed" && (
                          <span className="text-red-500"> · Failed</span>
                        )}
                      </p>
                      {step.status === "failed" && step.failureReason && (
                        <p className="text-[11px] text-red-400 font-mono mt-1.5 bg-red-50 border border-red-100 rounded px-2 py-1">
                          {step.failureReason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {state.type === "completed" && (
                <div
                  className={`mt-2 pt-4 border-t border-gray-100 flex items-center gap-2 ${
                    executingSteps.some((s) => s.status === "failed")
                      ? "text-red-500"
                      : "text-green-600"
                  }`}
                >
                  {executingSteps.some((s) => s.status === "failed") ? (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      <span className="text-[13px] font-medium">
                        Workflow completed with errors
                      </span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2.5}
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      <span className="text-[13px] font-medium">
                        Workflow completed successfully
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </>
  );
}

import { INITIAL_STEPS } from "@/lib/constants";
import { ApprovedStep } from "@/types";
import React, { useState } from "react";
import { auditLogs } from "@/services/api";
import {
  useExecuteWorkFlow,
  usePreflightCheck,
  usePreviewWorkflow,
  useTestHighRiskDelete,
  useTestTokenExchange,
} from "@/services/mutations";
import { TWorkFlowPayload } from "@/services/types";

type ActionKey =
  | "tokenExchange"
  | "preflight"
  | "preview"
  | "execute"
  | "highRisk";

const LOADING_MESSAGES: Record<ActionKey, string> = {
  tokenExchange: "Testing token exchange for GitLab…",
  preflight: "Running preflight check…",
  preview: "Generating permission contract preview…",
  execute: "Executing workflow…",
  highRisk: "Testing high-risk delete operation…",
};

export default function AgentConsole() {
  const [gitlabProjectId, setGitlabProjectId] = useState("");
  const [gitlabIssueIid, setGitlabIssueIid] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [calendarId, setCalendarId] = useState("primary");
  const [steps, setSteps] = useState<ApprovedStep[]>(INITIAL_STEPS);
  const [prompt, setPrompt] = useState(
    "Review the incident issue, notify the team, and schedule a follow-up meeting.",
  );

  const [activeAction, setActiveAction] = useState<ActionKey | null>(null);
  const [response, setResponse] = useState<string | null>(null);

  const [auditWorkflowId, setAuditWorkflowId] = useState("");
  const [auditLog, setAuditLog] = useState<string | null>(null);
  const [loadingAuditLog, setLoadingAuditLog] = useState(false);

  const { mutateAsync: testTokenExchange } = useTestTokenExchange();
  const { mutateAsync: preflightCheck } = usePreflightCheck();
  const { mutateAsync: previewWorkflow } = usePreviewWorkflow();
  const { mutateAsync: executeWorkflow } = useExecuteWorkFlow();
  const { mutateAsync: testHighRiskDelete } = useTestHighRiskDelete();

  function handleToggleStep(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)),
    );
  }

  function workflowPayload(
    preview_only?: boolean,
    approved_steps?: Array<string>,
  ): TWorkFlowPayload {
    return {
      gitlab_project_id: gitlabIssueIid,
      slack_channel: slackChannel,
      calendar_id: calendarId,
      gitlab_issue_iid: gitlabIssueIid,
      prompt,
      preview_only,
      approved_steps,
    };
  }

  async function runAction(key: ActionKey, fn: () => Promise<unknown>) {
    if (activeAction) return;
    setActiveAction(key);
    setResponse(null);
    try {
      const data = await fn();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setResponse(JSON.stringify({ error: String(err) }, null, 2));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleLoadAuditLog() {
    setLoadingAuditLog(true);
    setAuditLog(null);
    try {
      const data = await auditLogs();
      setAuditLog(JSON.stringify(data, null, 2));
    } catch (err) {
      setAuditLog(JSON.stringify({ error: String(err) }, null, 2));
    } finally {
      setLoadingAuditLog(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 flex flex-col gap-4">
      <h2 className="text-[15px] font-bold text-gray-900">Agent Console</h2>

      {/* Prompt */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] text-gray-600">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          className="w-full bg-gray-50 border border-gray-200 rounded-sm px-4 py-3 text-[13px] text-gray-400 placeholder:text-gray-300 resize-none outline-none focus:border-[#3bcaca] focus:ring-1 focus:ring-[#3bcaca]/30 transition-colors"
        />
      </div>

      {/* Input fields */}
      <div className="grid grid-cols-4 gap-4">
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
              placeholder: "1",
            },
            {
              label: "Slack Channel",
              value: slackChannel,
              set: setSlackChannel,
              placeholder: "e.g. @company",
            },
            {
              label: "Calendar ID",
              value: calendarId,
              set: setCalendarId,
              placeholder: "e.g. primary",
            },
          ] as const
        ).map((field) => (
          <div key={field.label} className="flex flex-col gap-1.5">
            <label className="text-[13px] text-gray-600">{field.label}</label>
            <input
              type="text"
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
              placeholder={field.placeholder}
              className="w-full bg-white border border-gray-300 rounded-sm px-3 py-2 text-[13px] text-gray-700 placeholder:text-gray-300 outline-none focus:border-[#3bcaca] focus:ring-1 focus:ring-[#3bcaca]/30 transition-colors"
            />
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() =>
            runAction(
              "tokenExchange",
              async () =>
                await testTokenExchange({
                  connection: "gitlab",
                  scopes: ["read_api"],
                }),
            )
          }
          disabled={!!activeAction}
          className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded hover:bg-[#2db8b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activeAction === "tokenExchange"
            ? "Testing…"
            : "Test Token Exchange (GitLab)"}
        </button>
        <button
          onClick={() =>
            runAction(
              "preflight",
              async () => await preflightCheck(workflowPayload()),
            )
          }
          disabled={!!activeAction}
          className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded hover:bg-[#2db8b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activeAction === "preflight" ? "Checking…" : "Preflight Check"}
        </button>
        <button
          onClick={() =>
            runAction(
              "preview",
              async () => await previewWorkflow(workflowPayload(true)),
            )
          }
          disabled={!!activeAction}
          className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded hover:bg-[#2db8b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activeAction === "preview"
            ? "Previewing…"
            : "Preview (Permission Contract)"}
        </button>
        <button
          onClick={() =>
            runAction("execute", () =>
              executeWorkflow(
                workflowPayload(
                  false,
                  steps.filter((s) => s.checked).map((s) => s.id),
                ),
              ),
            )
          }
          disabled={!!activeAction}
          className="px-3 py-2 bg-green-500 text-white text-[12px] font-medium rounded hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activeAction === "execute" ? "Executing…" : "Execute Workflow"}
        </button>
        <button
          onClick={() =>
            runAction("highRisk", () =>
              testHighRiskDelete({
                preview_only: false,
                prompt: "Delete the repository and revoke deployment access.",
              }),
            )
          }
          disabled={!!activeAction}
          className="px-3 py-2 bg-red-500 text-white text-[12px] font-medium rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {activeAction === "highRisk" ? "Testing…" : "Test High-Risk (Delete)"}
        </button>
      </div>

      {/* Approved Steps */}
      <div className="flex flex-col gap-2">
        <p className="text-[13px] text-gray-600">
          Approved Steps{" "}
          <span className="text-gray-400 font-normal">
            (uncheck to skip optional steps)
          </span>
        </p>
        <div className="flex flex-col gap-2">
          {steps.map((step) => (
            <label
              key={step.id}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="relative">
                <input
                  type="checkbox"
                  checked={step.checked}
                  onChange={() => handleToggleStep(step.id)}
                  className="sr-only"
                />
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                    step.checked
                      ? "bg-[#3bcaca] border-[#3bcaca]"
                      : "bg-white border-gray-300 group-hover:border-gray-400"
                  }`}
                >
                  {step.checked && (
                    <svg
                      className="w-2.5 h-2.5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[13px] text-gray-700 font-mono">
                {step.label}
              </span>
              <span className="text-[11px] text-gray-400">
                ({step.required ? "required" : "optional"})
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Response + Audit Log panels */}
      <div className="grid grid-cols-2 gap-4">
        {/* Response */}
        <div className="bg-white border border-gray-200 rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-[14px] font-semibold text-gray-800">Response</h3>
          <div
            className="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-auto"
            style={{ minHeight: 220, maxHeight: 300 }}
          >
            {activeAction ? (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-3 h-3 shrink-0 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
                <p className="text-[12px] text-[#3bcaca] font-mono leading-relaxed">
                  {LOADING_MESSAGES[activeAction]}
                </p>
              </div>
            ) : response ? (
              <pre className="text-[11px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {response}
              </pre>
            ) : (
              <pre className="text-[11px] text-gray-300 font-mono leading-relaxed select-none">
                {"{\n  // response will appear here\n}"}
              </pre>
            )}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white border border-gray-200 rounded-md p-4 flex flex-col gap-3">
          <h3 className="text-[14px] font-semibold text-gray-800">Audit Log</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleLoadAuditLog}
              disabled={loadingAuditLog}
              className="shrink-0 px-3 py-1.5 bg-[#3bcaca] text-white text-[12px] font-medium rounded hover:bg-[#2db8b8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingAuditLog ? "Loading…" : "Load Audit Logs"}
            </button>
            <input
              type="text"
              value={auditWorkflowId}
              onChange={(e) => setAuditWorkflowId(e.target.value)}
              className="flex-1 min-w-0 bg-white border border-gray-300 rounded-sm px-3 py-1.5 text-[12px] text-gray-600 font-mono placeholder:text-gray-300 outline-none focus:border-[#3bcaca] focus:ring-1 focus:ring-[#3bcaca]/30 transition-colors"
            />
          </div>
          <div
            className="bg-gray-50 border border-gray-200 rounded-md p-4 overflow-auto"
            style={{ minHeight: 180, maxHeight: 260 }}
          >
            {loadingAuditLog ? (
              <div className="flex items-start gap-2">
                <span className="mt-0.5 w-3 h-3 shrink-0 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
                <p className="text-[12px] text-[#3bcaca] font-mono leading-relaxed">
                  Loading audit logs…
                </p>
              </div>
            ) : auditLog ? (
              <pre className="text-[11px] text-gray-500 font-mono leading-relaxed whitespace-pre-wrap break-all">
                {auditLog}
              </pre>
            ) : (
              <pre className="text-[11px] text-gray-300 font-mono leading-relaxed select-none">
                {"{\n  // audit logs will appear here\n}"}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

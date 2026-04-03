import { INITIAL_STEPS } from "@/lib/constants";
import { ApprovedStep } from "@/types";
import React, { useState } from "react";

export default function AgentConsole() {
  const [gitlabProjectId, setGitlabProjectId] = useState("");
  const [gitlabIssueIid, setGitlabIssueIid] = useState("");
  const [linkedinHandle, setLinkedinHandle] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [steps, setSteps] = useState<ApprovedStep[]>(INITIAL_STEPS);
  const [prompt, setPrompt] = useState(
    "Review the incident issue, notify the team, and schedule a follow-up meeting.",
  );

  function handleToggleStep(id: string) {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, checked: !s.checked } : s)),
    );
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
              label: "LinkedIn Handle",
              value: linkedinHandle,
              set: setLinkedinHandle,
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
        <button className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded-lg hover:bg-[#2db8b8] transition-colors">
          Test Token Exchange (GitLab)
        </button>
        <button className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded-lg hover:bg-[#2db8b8] transition-colors">
          Preflight Check
        </button>
        <button className="px-3 py-2 bg-[#3bcaca] text-white text-[12px] font-medium rounded-lg hover:bg-[#2db8b8] transition-colors">
          Preview (Permission Contract)
        </button>
        <button className="px-3 py-2 bg-green-500 text-white text-[12px] font-medium rounded-lg hover:bg-green-600 transition-colors">
          Execute Workflow
        </button>
        <button className="px-3 py-2 bg-red-500 text-white text-[12px] font-medium rounded-lg hover:bg-red-600 transition-colors">
          Test High-Risk (Delete)
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
    </div>
  );
}

import React from "react";
import type { TLogItem } from "@/services/types";

function StatusBadge({ status }: { status: "success" | "failed" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        status === "success"
          ? "bg-green-50 text-green-600 border border-green-200"
          : "bg-red-50 text-red-500 border border-red-200"
      }`}
    >
      <span className={`w-1 h-1 rounded-full ${status === "success" ? "bg-green-500" : "bg-red-400"}`} />
      {status === "success" ? "Success" : "Failed"}
    </span>
  );
}

export default function LogItem({
  action,
  timestamp,
  status,
  service,
  agent_id,
  step_up_required,
}: TLogItem) {
  return (
    <li className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto] gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
      <span className="text-[13px] text-gray-800 font-medium">{action}</span>
      <span className="text-[13px] text-gray-500">{service}</span>
      <span className="text-[13px] text-gray-500">{agent_id}</span>
      <span className="text-[12px] text-gray-400 font-mono">{timestamp}</span>
      <StatusBadge status={status} />
      <span className="flex items-center">
        {step_up_required ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-yellow-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
            Required
          </span>
        ) : (
          <span className="text-[11px] text-gray-300">—</span>
        )}
      </span>
    </li>
  );
}

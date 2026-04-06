"use client";

import LogItem from "../log-item";
import { useAuditLogsQuery } from "@/services/queries";

export default function AuditLogs() {
  const { data, isLoading } = useAuditLogsQuery();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-5 py-4 text-[13px] text-gray-400">
        <span className="w-3 h-3 rounded-full border-2 border-[#3bcaca] border-t-transparent animate-spin" />
        Loading audit logs…
      </div>
    );
  }

  if (!data?.logs?.length) {
    return (
      <p className="px-5 py-4 text-[13px] text-gray-400 italic">
        No audit logs found.
      </p>
    );
  }

  const sorted = [...data.logs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  return (
    <ul className="divide-y divide-gray-100">
      {sorted.map((entry, i) => (
        <LogItem key={i} {...entry} />
      ))}
    </ul>
  );
}

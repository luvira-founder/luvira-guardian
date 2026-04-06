"use client";

import React from "react";
import { useAuditLogsQuery } from "@/services/queries";

export default function AuditLogEntries() {
  const { data } = useAuditLogsQuery();
  const total = data?.total ?? 0;
  return (
    <p className="text-[12px] text-gray-400 mt-4">
      {total} entries · All times in UTC
    </p>
  );
}

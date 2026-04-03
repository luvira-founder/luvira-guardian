import { useQuery } from "@tanstack/react-query";
import { auditLogs } from "../api";

export const useAuditLogsQuery = () => {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: auditLogs,
  });
};

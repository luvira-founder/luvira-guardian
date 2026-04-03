import { apiConfig } from "./api-config";
import { kyInstance } from "./ky";
import { TLogResponse } from "./types";

export const auditLogs = async (): Promise<TLogResponse> => {
  const response = await kyInstance(
    apiConfig["audit-log"],
  ).json<TLogResponse>();

  return response;
};

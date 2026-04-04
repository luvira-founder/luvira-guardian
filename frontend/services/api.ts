import { apiConfig } from "./api-config";
import { kyInstance } from "./ky";
import {
  TConnection,
  TConnectionCompleteResponse,
  TConnectPayload,
  TConnectResponse,
  TGitlabTokenExchangeResponse,
  TLogResponse,
  TPreflightCheckResponse,
  TServiceStatusResponse,
  TWorkFlowPayload,
} from "./types";

export const auditLogs = async (): Promise<TLogResponse> => {
  const response = await kyInstance(
    apiConfig["audit-log"],
  ).json<TLogResponse>();

  return response;
};

export const connectService = async (
  payload: TConnectPayload,
): Promise<TConnectResponse> => {
  return await kyInstance(`services/connect`, {
    method: "post",
    json: payload,
  }).json<TConnectResponse>();
};

export const disconnectService = async (serviceId: string): Promise<void> => {
  await kyInstance(`services/${serviceId}/disconnect`, {
    method: "post",
  });
};

export const completeServiceConnection = async (payload: {
  auth_session: string;
  connect_code: string;
  ma_token: string;
}): Promise<TConnectionCompleteResponse> => {
  const response = await kyInstance
    .post(`services/connect/complete`, {
      json: payload,
    })
    .json<TConnectionCompleteResponse>();

  return response;
};

export const checkServicesConnectionStatus =
  async (): Promise<TServiceStatusResponse> => {
    return await kyInstance("services/status").json<TServiceStatusResponse>();
  };

export const testTokenExchange = async ({
  connection,
  scopes,
}: {
  connection: TConnection;
  scopes: Array<string>;
}): Promise<TGitlabTokenExchangeResponse> => {
  return await kyInstance
    .post(`services/test-exchange`, { json: { connection, scopes } })
    .json<TGitlabTokenExchangeResponse>();
};

export const preflightCheck = async (
  payload: TWorkFlowPayload,
): Promise<TPreflightCheckResponse> => {
  return await kyInstance.post(`agent/preflight`, { json: payload }).json();
};

export const previewWorkflow = async (
  payload: TWorkFlowPayload,
): Promise<unknown> => {
  return await kyInstance.post(`agent/execute`, { json: payload }).json();
};

export const executeWorkflow = async (
  payload: TWorkFlowPayload,
): Promise<unknown> => {
  return await kyInstance.post(`agent/execute`, { json: payload }).json();
};

export const testHighRiskDelete = async (payload: {
  prompt: string;
  preview_only: boolean;
}): Promise<unknown> => {
  return await kyInstance.post(`agent/execute`, { json: payload }).json();
};

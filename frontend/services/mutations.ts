import { useMutation } from "@tanstack/react-query";
import { TConnection, TConnectPayload, TWorkFlowPayload } from "./types";
import {
  completeServiceConnection,
  connectService,
  executeWorkflow,
  previewWorkflow,
  testHighRiskDelete,
  testTokenExchange,
} from "./api";

export const useConnectService = () => {
  return useMutation({
    mutationFn: (data: TConnectPayload) => connectService(data),
  });
};

export const useCompleteServiceConnection = () => {
  return useMutation({
    mutationFn: completeServiceConnection,
  });
};

export const usePreviewWorkflow = () => {
  return useMutation({
    mutationFn: (data: TWorkFlowPayload) => previewWorkflow(data),
  });
};

export const useExecuteWorkFlow = () => {
  return useMutation({
    mutationFn: (data: TWorkFlowPayload) => executeWorkflow(data),
  });
};

export const usePreflightCheck = () => {
  return useMutation({
    mutationFn: (data: TWorkFlowPayload) => previewWorkflow(data),
  });
};

export const useTestTokenExchange = () => {
  return useMutation({
    mutationFn: (data: { connection: TConnection; scopes: Array<string> }) =>
      testTokenExchange(data),
  });
};

export const useTestHighRiskDelete = () => {
  return useMutation({
    mutationFn: (data: { prompt: string; preview_only: boolean }) =>
      testHighRiskDelete(data),
  });
};

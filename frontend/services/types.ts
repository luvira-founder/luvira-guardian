export type TLogItem = {
  timestamp: string;
  user_id: string;
  agent_id: string;
  action: string;
  service: string;
  status: "success" | "failed";
  step_up_required: boolean;
  detail: string;
  workflow_id: string;
  approval_state: string;
  failure_reason: string;
};

export type TLogResponse = {
  logs: Array<TLogItem>;
  total: number;
};

export type TConnection = "gitlab" | "google-oauth2" | "linkedin" | "slack";

export type TConnectPayload = {
  connection: TConnection;
  scopes: Array<string>;
  ma_token: string;
};

export type TConnectResponse = {
  auth_session: string;
  connect_uri: string;
  connect_params: { ticket: string };
  expires_in: number;
};

export type TServiceStatus = {
  service: string;
  state: "connected" | "disconnected";
  granted_scopes: Array<string>;
};

export type TServiceStatusResponse = {
  services: Array<TServiceStatus>;
};

export type TConnectionCompleteResponse = {
  id: string;
  connection: TConnection;
  access_type: "offline" | "online";
  scopes: Array<string>;
  created_at: string;
  expires_at: string;
};

export type TWorkFlowPayload = {
  calendar_id: string;
  gitlab_issue_iid: string | null;
  gitlab_project_id: string | null;
  preview_only?: boolean;
  prompt: string;
  slack_channel: string | null;
  approved_steps?: Array<string>;
};

export type TGitlabTokenExchangeResponse = {
  status: "success" | "failure";
  connection: "gitlab";
  token_type: string;
  scope: string;
  expires_in: number;
  message: string;
};

type ConnectionStatus = "connected" | "disconnected";

type TStep = {
  action: string;
  required: boolean;
  status: StepStatus;
  reason: string | null;
};

type StepStatus = "ready" | "blocked";

export type TPreflightCheckResponse = {
  status: string;
  workflow_id: string;
  services: {
    gitlab: ConnectionStatus;
    slack: ConnectionStatus;
    "google-calendar": ConnectionStatus;
  };
  steps: Array<TStep>;
  blocking_reason: string;
};

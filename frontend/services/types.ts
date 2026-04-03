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

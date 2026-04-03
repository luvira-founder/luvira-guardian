type ConnectionState = "connected" | "disconnected";

export interface Service {
  id: string;
  name: string;
  status: ConnectionState;
  scope: string;
  logo: string;
  logoWidth: number;
  logoHeight: number;
  connectLabel: string;
}

export interface User {
  name?: string | null;
  email?: string | null;
  picture?: string | null;
}

export interface ApprovedStep {
  id: string;
  label: string;
  required: boolean;
  checked: boolean;
}

export type StepStatus = "pending" | "in_progress" | "success" | "failed";

export interface WorkflowStep {
  id: string;
  label: string;
  service: string;
  status: StepStatus;
}

export type ConsoleState =
  | { type: "idle" }
  | { type: "planning" }
  | { type: "contract" }
  | { type: "executing"; steps: WorkflowStep[]; connectionLost: string | null }
  | { type: "high_risk"; steps: WorkflowStep[]; pendingStepIndex: number }
  | { type: "completed"; steps: WorkflowStep[] }
  | { type: "connection_lost"; steps: WorkflowStep[]; service: string };

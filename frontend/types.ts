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

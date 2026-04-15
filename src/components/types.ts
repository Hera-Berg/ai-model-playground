export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

export type SessionStatus =
  | "idle"
  | "launching"
  | "warming"
  | "ready"
  | "error";

export interface CostEstimate {
  gpu: string;
  vramGb: number;
  perSecondUsd: number;
}

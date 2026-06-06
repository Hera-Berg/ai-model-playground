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

export interface Session {
  endpointId: string;
  templateId: string;
  gpu: string | null;
}

export type KeyStatus = "unknown" | "checking" | "valid" | "invalid";

export type { ResolveResult } from "@/lib/estimate";

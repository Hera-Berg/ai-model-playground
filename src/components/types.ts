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

export type { ResolveResult } from "@/lib/estimate";

export type Role = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
}

// The lifecycle of the rented GPU endpoint.
//   idle      — nothing running
//   launching — creating the endpoint via RunPod
//   ready      — endpoint exists; warms on first message (Step 4)
//   error      — last action failed
export type SessionStatus = "idle" | "launching" | "warming" | "ready" | "error";

// What we hold onto for a running endpoint so we can talk to it and tear it down.
export interface Session {
  endpointId: string;
  templateId: string;
  model: string; // the HF repo id the endpoint serves (OpenAI "model" field)
  gpu: string | null;
}

export type KeyStatus = "unknown" | "checking" | "valid" | "invalid";

// The model resolution + cost estimate returned by /api/model/resolve.
export type { ResolveResult } from "@/lib/estimate";

const REST = "https://rest.runpod.io/v1";

export const VLLM_IMAGE =
  process.env.RUNPOD_VLLM_IMAGE ||
  "runpod/worker-v1-vllm:v2.5.0stable-cuda12.1.0";

export function resolveKey(headerKey: string | null): string | null {
  return headerKey?.trim() || process.env.RUNPOD_API_KEY || null;
}

function headers(key: string): Record<string, string> {
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error || body?.message || JSON.stringify(body);
  } catch {
    try {
      return (await res.text()) || `RunPod returned ${res.status}.`;
    } catch {
      return `RunPod returned ${res.status}.`;
    }
  }
}

export interface RunpodCall<T> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

async function call<T>(
  path: string,
  key: string,
  init?: RequestInit,
): Promise<RunpodCall<T>> {
  let res: Response;
  try {
    res = await fetch(`${REST}${path}`, {
      ...init,
      headers: headers(key),
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 0,
      error: "Couldn't reach RunPod. Check your connection.",
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      status: res.status,
      error: "RunPod rejected the API key.",
    };
  }
  if (!res.ok) {
    return { ok: false, status: res.status, error: await errorText(res) };
  }
  if (res.status === 204) return { ok: true, status: 204, data: undefined };
  try {
    return { ok: true, status: res.status, data: (await res.json()) as T };
  } catch {
    return { ok: true, status: res.status, data: undefined };
  }
}

export function listEndpoints(key: string) {
  return call<unknown[]>("/endpoints", key);
}

export interface CreateTemplateInput {
  name: string;
  repoId: string;
  containerDiskGb: number;
  maxModelLen: number;
  hfToken?: string | null;
  image?: string | null;
}

export function createTemplate(key: string, input: CreateTemplateInput) {
  const env: Record<string, string> = {
    MODEL_NAME: input.repoId,
    MAX_MODEL_LEN: String(input.maxModelLen),
  };
  if (input.hfToken) env.HF_TOKEN = input.hfToken;

  return call<{ id: string }>("/templates", key, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      imageName: input.image?.trim() || VLLM_IMAGE,
      isServerless: true,
      containerDiskInGb: input.containerDiskGb,
      env,
    }),
  });
}

export interface CreateEndpointInput {
  name: string;
  templateId: string;
  gpuTypeIds: string[];
}

export function createEndpoint(key: string, input: CreateEndpointInput) {
  return call<{ id: string }>("/endpoints", key, {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      templateId: input.templateId,
      gpuTypeIds: input.gpuTypeIds,
      scalerType: "QUEUE_DELAY",
      scalerValue: 4,
      workersMin: 0,
      workersMax: 1,
      idleTimeout: 60,
    }),
  });
}

export function getEndpoint(key: string, id: string) {
  return call<Record<string, unknown>>(`/endpoints/${id}`, key);
}

export function deleteEndpoint(key: string, id: string) {
  return call<unknown>(`/endpoints/${id}`, key, { method: "DELETE" });
}

export function deleteTemplate(key: string, id: string) {
  return call<unknown>(`/templates/${id}`, key, { method: "DELETE" });
}

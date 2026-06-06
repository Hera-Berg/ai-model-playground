export interface HfResult {
  ok: boolean;
  status: number;
  gated: boolean;
  safetensors?: { total?: number; parameters?: Record<string, number> };
  error?: string;
}

export async function fetchModelInfo(
  repoId: string,
  token?: string | null,
): Promise<HfResult> {
  const headers: Record<string, string> = { "User-Agent": "model-playground" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`https://huggingface.co/api/models/${repoId}`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return {
      ok: false,
      status: 0,
      gated: false,
      error:
        "Couldn't reach Hugging Face. Check your connection and try again.",
    };
  }

  if (res.status === 404) {
    return {
      ok: false,
      status: 404,
      gated: false,
      error: `No model called ${repoId} on Hugging Face.`,
    };
  }
  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      status: res.status,
      gated: true,
      error: "This model is gated. Add a Hugging Face token to read it.",
    };
  }
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      gated: false,
      error: `Hugging Face returned ${res.status}.`,
    };
  }

  const info = await res.json();
  return {
    ok: true,
    status: 200,
    gated: Boolean(info.gated),
    safetensors: info.safetensors,
  };
}

import { NextRequest, NextResponse } from "next/server";
import { parseModelRef, buildEstimate } from "@/lib/estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get("ref") ?? "";
  const repoId = parseModelRef(ref);

  if (!repoId) {
    return NextResponse.json(
      { error: "Enter a model as org/name or a huggingface.co URL." },
      { status: 400 },
    );
  }

  const headers: Record<string, string> = { "User-Agent": "model-playground" };
  const token = req.headers.get("x-hf-token");
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`https://huggingface.co/api/models/${repoId}`, {
      headers,
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't reach Hugging Face. Check your connection and try again.",
      },
      { status: 502 },
    );
  }

  if (res.status === 404) {
    return NextResponse.json(
      { error: `No model called ${repoId} on Hugging Face.` },
      { status: 404 },
    );
  }

  if (res.status === 401 || res.status === 403) {
    return NextResponse.json({
      repoId,
      params: null,
      paramsLabel: null,
      dtype: null,
      estVramGb: null,
      gpu: null,
      perSecondUsd: null,
      perHourUsd: null,
      gated: true,
      fitsLargest: true,
      note: "This model is gated. You'll add a Hugging Face token in a later step to read it.",
    });
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Hugging Face returned ${res.status}.` },
      { status: 502 },
    );
  }

  const info = await res.json();
  const estimate = buildEstimate(repoId, info.safetensors, Boolean(info.gated));
  return NextResponse.json(estimate);
}

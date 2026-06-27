import { NextRequest, NextResponse } from "next/server";
import { parseModelRef, buildEstimate } from "@/lib/estimate";
import { fetchModelInfo } from "@/lib/hf";

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

  const token = req.headers.get("x-hf-token");
  const hf = await fetchModelInfo(repoId, token);

  if (!hf.ok) {
    if (hf.gated) {
      // Return a structured gated result rather than an error.
      return NextResponse.json({
        repoId, params: null, paramsLabel: null, dtype: null, estVramGb: null,
        gpu: null, gpuTypeIds: null, containerDiskGb: null,
        perSecondUsd: null, perHourUsd: null, gated: true, fitsLargest: true,
        note: "This model is gated. Add a Hugging Face token to read it.",
      });
    }
    return NextResponse.json({ error: hf.error }, { status: hf.status || 502 });
  }

  return NextResponse.json(buildEstimate(repoId, hf.safetensors, hf.gated));
}

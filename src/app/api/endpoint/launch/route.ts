import { NextRequest, NextResponse } from "next/server";
import {
  resolveKey,
  createTemplate,
  createEndpoint,
  deleteTemplate,
} from "@/lib/runpod";
import { fetchModelInfo } from "@/lib/hf";
import { buildEstimate, parseModelRef } from "@/lib/estimate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  if (!key) {
    return NextResponse.json(
      { error: "Add your RunPod API key first." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const repoId = parseModelRef(body.modelRef ?? "");
  if (!repoId) {
    return NextResponse.json(
      { error: "Enter a valid Hugging Face model." },
      { status: 400 },
    );
  }
  const hfToken: string | null = body.hfToken?.trim() || null;
  const maxModelLen: number = Number(body.maxModelLen) || 8192;
  const workerImage: string | null = body.workerImage?.trim() || null;

  const hf = await fetchModelInfo(repoId, hfToken);
  if (!hf.ok) {
    return NextResponse.json({ error: hf.error }, { status: hf.status || 502 });
  }
  const est = buildEstimate(repoId, hf.safetensors, hf.gated);
  if (!est.gpuTypeIds || !est.containerDiskGb) {
    return NextResponse.json(
      { error: est.note ?? "Couldn't size this model for a GPU." },
      { status: 422 },
    );
  }

  const stamp = Date.now().toString(36);
  const baseName = `mp-${repoId.split("/").pop()}-${stamp}`.slice(0, 60);

  const tmpl = await createTemplate(key, {
    name: baseName,
    repoId,
    containerDiskGb: est.containerDiskGb,
    maxModelLen,
    hfToken,
    image: workerImage,
  });
  if (!tmpl.ok || !tmpl.data?.id) {
    return NextResponse.json(
      { error: tmpl.error ?? "Template creation failed." },
      { status: tmpl.status || 502 },
    );
  }

  const ep = await createEndpoint(key, {
    name: baseName,
    templateId: tmpl.data.id,
    gpuTypeIds: est.gpuTypeIds,
  });
  if (!ep.ok || !ep.data?.id) {
    await deleteTemplate(key, tmpl.data.id);
    return NextResponse.json(
      { error: ep.error ?? "Endpoint creation failed." },
      { status: ep.status || 502 },
    );
  }

  return NextResponse.json({
    endpointId: ep.data.id,
    templateId: tmpl.data.id,
    model: repoId,
    gpu: est.gpu,
    estVramGb: est.estVramGb,
    perSecondUsd: est.perSecondUsd,
  });
}

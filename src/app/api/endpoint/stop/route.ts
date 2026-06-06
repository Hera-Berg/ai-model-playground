import { NextRequest, NextResponse } from "next/server";
import { resolveKey, deleteEndpoint, deleteTemplate } from "@/lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  if (!key) {
    return NextResponse.json({ error: "Missing RunPod API key." }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));
  const { endpointId, templateId } = body;

  const results: Record<string, unknown> = {};
  if (endpointId) {
    const ep = await deleteEndpoint(key, endpointId);
    results.endpoint = ep.ok ? "deleted" : ep.error;
  }
  if (templateId) {
    const tmpl = await deleteTemplate(key, templateId);
    results.template = tmpl.ok ? "deleted" : tmpl.error;
  }
  return NextResponse.json({ ok: true, results });
}

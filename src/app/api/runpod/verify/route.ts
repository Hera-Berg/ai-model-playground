import { NextRequest, NextResponse } from "next/server";
import { resolveKey, listEndpoints } from "@/lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  if (!key) {
    return NextResponse.json({ error: "Paste a RunPod API key first." }, { status: 400 });
  }
  const res = await listEndpoints(key);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status || 502 });
  }
  const count = Array.isArray(res.data) ? res.data.length : 0;
  return NextResponse.json({ ok: true, endpoints: count });
}

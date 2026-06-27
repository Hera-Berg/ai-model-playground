import { NextRequest, NextResponse } from "next/server";
import { resolveKey, getEndpoint } from "@/lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  const id = req.nextUrl.searchParams.get("id");
  if (!key || !id) {
    return NextResponse.json({ error: "Missing key or endpoint id." }, { status: 400 });
  }
  const res = await getEndpoint(key, id);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.status || 502 });
  }
  const d = res.data ?? {};
  return NextResponse.json({
    id,
    // RunPod field names vary; surface what's there for the readout.
    workersReady: (d as any).workersReady ?? (d as any).workersStandby ?? 0,
    workersRunning: (d as any).workersRunning ?? 0,
    raw: d,
  });
}

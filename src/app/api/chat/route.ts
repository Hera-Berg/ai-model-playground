import { NextRequest, NextResponse } from "next/server";
import { resolveKey } from "@/lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  if (!key) {
    return NextResponse.json(
      { error: "Missing RunPod API key." },
      { status: 400 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const endpointId: string = body.endpointId;
  const model: string = body.model;
  const systemPrompt: string = body.systemPrompt ?? "";
  const history: InMessage[] = Array.isArray(body.messages)
    ? body.messages
    : [];

  if (!endpointId || !model) {
    return NextResponse.json(
      { error: "No live endpoint to talk to." },
      { status: 400 },
    );
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt.trim())
    messages.push({ role: "system", content: systemPrompt.trim() });
  for (const m of history) messages.push({ role: m.role, content: m.content });

  const url = `https://api.runpod.ai/v2/${endpointId}/openai/v1/chat/completions`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, stream: true, max_tokens: 1024 }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the model endpoint." },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: text || `Endpoint returned ${upstream.status}.` },
      { status: upstream.status || 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

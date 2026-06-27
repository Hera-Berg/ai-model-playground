import { NextRequest, NextResponse } from "next/server";
import { resolveKey } from "@/lib/runpod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface InMessage {
  role: "user" | "assistant";
  content: string;
}

// Proxy the browser's chat request to the endpoint's OpenAI-compatible API and
// stream the SSE response back. A cold model can take minutes before the first
// token, so we start streaming SSE keep-alive comments immediately and every
// 10s until real output arrives — this keeps the connection alive through the
// cold start instead of tripping Cloudflare's ~100s idle-origin timeout (524).
export async function POST(req: NextRequest) {
  const key = resolveKey(req.headers.get("x-runpod-key"));
  if (!key) {
    return NextResponse.json({ error: "Missing RunPod API key." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const endpointId: string = body.endpointId;
  const model: string = body.model;
  const systemPrompt: string = body.systemPrompt ?? "";
  const history: InMessage[] = Array.isArray(body.messages) ? body.messages : [];

  if (!endpointId || !model) {
    return NextResponse.json({ error: "No live endpoint to talk to." }, { status: 400 });
  }

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt.trim()) messages.push({ role: "system", content: systemPrompt.trim() });
  for (const m of history) messages.push({ role: m.role, content: m.content });

  const url = `https://api.runpod.ai/v2/${endpointId}/openai/v1/chat/completions`;
  const upstreamAbort = new AbortController();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* controller closed */
        }
      };
      const sendError = (msg: string) => send(`data: ${JSON.stringify({ error: msg })}\n\n`);

      // First bytes right away, then a ping every 10s until real output flows.
      send(": warming\n\n");
      heartbeat = setInterval(() => send(": ping\n\n"), 10000);

      let upstream: Response;
      try {
        upstream = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model, messages, stream: true, max_tokens: 1024 }),
          signal: upstreamAbort.signal,
          cache: "no-store",
        });
      } catch {
        if (heartbeat) clearInterval(heartbeat);
        sendError("Couldn't reach the model endpoint.");
        controller.close();
        return;
      }

      if (!upstream.ok || !upstream.body) {
        if (heartbeat) clearInterval(heartbeat);
        const text = await upstream.text().catch(() => "");
        sendError(text || `Endpoint returned ${upstream.status}.`);
        controller.close();
        return;
      }

      const reader = upstream.body.getReader();
      let first = true;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (first) {
            if (heartbeat) clearInterval(heartbeat);
            heartbeat = null;
            first = false;
          }
          controller.enqueue(value); // pass the upstream SSE bytes through unchanged
        }
      } catch {
        sendError("The stream was interrupted.");
      } finally {
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
    cancel() {
      if (heartbeat) clearInterval(heartbeat);
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

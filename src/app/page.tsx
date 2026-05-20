"use client";

import { useEffect, useState } from "react";
import ControlRail from "@/components/ControlRail";
import ChatSurface from "@/components/ChatSurface";
import type {
  ChatMessage,
  ResolveResult,
  SessionStatus,
} from "@/components/types";

function id() {
  return Math.random().toString(36).slice(2);
}

export default function Page() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelRef, setModelRef] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status] = useState<SessionStatus>("idle");

  const [estimate, setEstimate] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    const ref = modelRef.trim();
    setResolveError(null);

    if (!ref.includes("/")) {
      setEstimate(null);
      setResolving(false);
      return;
    }

    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setResolving(true);
      try {
        const res = await fetch(
          `/api/model/resolve?ref=${encodeURIComponent(ref)}`,
          {
            signal: ctrl.signal,
          },
        );
        const data = await res.json();
        if (!res.ok) {
          setEstimate(null);
          setResolveError(data.error ?? "Couldn't resolve that model.");
        } else {
          setEstimate(data as ResolveResult);
        }
      } catch (err) {
        if ((err as { name?: string }).name !== "AbortError") {
          setResolveError("Couldn't reach the resolver.");
        }
      } finally {
        setResolving(false);
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [modelRef]);

  function handleSend(text: string) {
    const userMsg: ChatMessage = { id: id(), role: "user", content: text };
    const stub: ChatMessage = {
      id: id(),
      role: "assistant",
      content: `[stub reply] No model is running yet. You said: "${text}"`,
    };
    setMessages((prev) => [...prev, userMsg, stub]);
  }

  function handleReset() {
    setMessages([]);
  }

  return (
    <main className="flex h-screen flex-col md:flex-row">
      <ControlRail
        systemPrompt={systemPrompt}
        onSystemPromptChange={setSystemPrompt}
        modelRef={modelRef}
        onModelRefChange={setModelRef}
        status={status}
        estimate={estimate}
        resolving={resolving}
        resolveError={resolveError}
      />
      <ChatSurface
        modelRef={modelRef}
        messages={messages}
        onSend={handleSend}
        onReset={handleReset}
      />
    </main>
  );
}

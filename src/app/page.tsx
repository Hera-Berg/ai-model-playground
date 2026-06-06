"use client";

import { useCallback, useEffect, useState } from "react";
import ControlRail from "@/components/ControlRail";
import ChatSurface from "@/components/ChatSurface";
import type {
  ChatMessage,
  KeyStatus,
  ResolveResult,
  Session,
  SessionStatus,
} from "@/components/types";

function id() {
  return Math.random().toString(36).slice(2);
}

const KEY_STORE = "mp_runpod_key";
const HF_STORE = "mp_hf_token";

export default function Page() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelRef, setModelRef] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<SessionStatus>("idle");

  const [estimate, setEstimate] = useState<ResolveResult | null>(null);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [runpodKey, setRunpodKey] = useState("");
  const [keyStatus, setKeyStatus] = useState<KeyStatus>("unknown");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [hfToken, setHfToken] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setRunpodKey(sessionStorage.getItem(KEY_STORE) ?? "");
      setHfToken(sessionStorage.getItem(HF_STORE) ?? "");
    } catch {
      /* sessionStorage unavailable — fine */
    }
  }, []);

  const onRunpodKeyChange = useCallback((v: string) => {
    setRunpodKey(v);
    setKeyStatus("unknown");
    setKeyError(null);
    try {
      sessionStorage.setItem(KEY_STORE, v);
    } catch {
      /* ignore */
    }
  }, []);

  const onHfTokenChange = useCallback((v: string) => {
    setHfToken(v);
    try {
      sessionStorage.setItem(HF_STORE, v);
    } catch {
      /* ignore */
    }
  }, []);

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
        const headers: Record<string, string> = {};
        if (hfToken.trim()) headers["x-hf-token"] = hfToken.trim();
        const res = await fetch(
          `/api/model/resolve?ref=${encodeURIComponent(ref)}`,
          {
            signal: ctrl.signal,
            headers,
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
  }, [modelRef, hfToken]);

  async function testKey() {
    setKeyStatus("checking");
    setKeyError(null);
    try {
      const res = await fetch("/api/runpod/verify", {
        method: "POST",
        headers: { "x-runpod-key": runpodKey.trim() },
      });
      const data = await res.json();
      if (res.ok) {
        setKeyStatus("valid");
      } else {
        setKeyStatus("invalid");
        setKeyError(data.error ?? "Key check failed.");
      }
    } catch {
      setKeyStatus("invalid");
      setKeyError("Couldn't reach RunPod.");
    }
  }

  async function launch() {
    setLaunchError(null);
    setStatus("launching");
    try {
      const res = await fetch("/api/endpoint/launch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-runpod-key": runpodKey.trim(),
        },
        body: JSON.stringify({
          modelRef: modelRef.trim(),
          hfToken: hfToken.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setLaunchError(data.error ?? "Launch failed.");
        return;
      }
      setSession({
        endpointId: data.endpointId,
        templateId: data.templateId,
        gpu: data.gpu ?? null,
      });
      setStatus("ready");
    } catch {
      setStatus("error");
      setLaunchError("Couldn't reach the launcher.");
    }
  }

  async function stop() {
    if (!session) return;
    const current = session;
    setSession(null);
    setStatus("idle");
    setLaunchError(null);
    try {
      const res = await fetch("/api/endpoint/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-runpod-key": runpodKey.trim(),
        },
        body: JSON.stringify({
          endpointId: current.endpointId,
          templateId: current.templateId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setLaunchError(
          `Couldn't fully delete the endpoint — check your RunPod dashboard. ${data.error ?? ""}`,
        );
      }
    } catch {
      setLaunchError(
        "Stop request failed — verify teardown in your RunPod dashboard.",
      );
    }
  }

  function handleSend(text: string) {
    const userMsg: ChatMessage = { id: id(), role: "user", content: text };
    const stub: ChatMessage = {
      id: id(),
      role: "assistant",
      content: session
        ? `[stub reply] Endpoint ${session.endpointId} is live, but real chat lands in the next step. You said: "${text}"`
        : `[stub reply] No model is running yet. You said: "${text}"`,
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
        runpodKey={runpodKey}
        onRunpodKeyChange={onRunpodKeyChange}
        keyStatus={keyStatus}
        keyError={keyError}
        onTestKey={testKey}
        hfToken={hfToken}
        onHfTokenChange={onHfTokenChange}
        session={session}
        launchError={launchError}
        onLaunch={launch}
        onStop={stop}
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

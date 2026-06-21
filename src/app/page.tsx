"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const IMG_STORE = "mp_worker_image";

const DEFAULT_WORKER_IMAGE = "runpod/worker-v1-vllm:v2.5.0stable-cuda12.1.0";

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
  const [workerImage, setWorkerImage] = useState("");

  const [session, setSession] = useState<Session | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);

  const streamAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setRunpodKey(sessionStorage.getItem(KEY_STORE) ?? "");
      setHfToken(sessionStorage.getItem(HF_STORE) ?? "");
      setWorkerImage(sessionStorage.getItem(IMG_STORE) ?? "");
    } catch {
      /* sessionStorage unavailable */
    }
  }, []);

  const onWorkerImageChange = useCallback((v: string) => {
    setWorkerImage(v);
    try {
      sessionStorage.setItem(IMG_STORE, v);
    } catch {
      /* ignore */
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
          workerImage: workerImage.trim() || undefined,
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
        model: data.model,
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
    streamAbort.current?.abort();
    setStreaming(false);
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

  function patchMessage(msgId: string, content: string) {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, content } : m)),
    );
  }

  async function handleSend(text: string) {
    if (!session || streaming) return;

    const userMsg: ChatMessage = { id: id(), role: "user", content: text };
    const assistantId = id();
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "" },
    ]);
    setStreaming(true);
    setStatus("warming");

    const ctrl = new AbortController();
    streamAbort.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-runpod-key": runpodKey.trim(),
        },
        body: JSON.stringify({
          endpointId: session.endpointId,
          model: session.model,
          systemPrompt,
          messages: history,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        patchMessage(assistantId, `⚠️ ${data.error ?? "Request failed."}`);
        setStatus("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let acc = "";
      let gotToken = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const payload = t.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            const delta = obj.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              if (!gotToken) {
                gotToken = true;
                setStatus("ready");
              }
              acc += delta;
              patchMessage(assistantId, acc);
            }
          } catch {
            /* ignore keep-alive / non-JSON lines */
          }
        }
      }

      if (!gotToken) {
        patchMessage(assistantId, "⚠️ The model returned no output.");
      }
      setStatus("ready");
    } catch (err) {
      if ((err as { name?: string }).name !== "AbortError") {
        patchMessage(assistantId, "⚠️ The stream was interrupted.");
        setStatus("error");
      }
    } finally {
      setStreaming(false);
      streamAbort.current = null;
    }
  }

  function handleReset() {
    streamAbort.current?.abort();
    setStreaming(false);
    setMessages([]);
    if (session) setStatus("ready");
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
        workerImage={workerImage}
        onWorkerImageChange={onWorkerImageChange}
        defaultImage={DEFAULT_WORKER_IMAGE}
        session={session}
        launchError={launchError}
        onLaunch={launch}
        onStop={stop}
      />
      <ChatSurface
        modelRef={modelRef}
        messages={messages}
        canChat={session != null}
        busy={streaming}
        onSend={handleSend}
        onReset={handleReset}
      />
    </main>
  );
}

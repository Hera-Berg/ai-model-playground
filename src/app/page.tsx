"use client";

import { useState } from "react";
import ControlRail from "@/components/ControlRail";
import ChatSurface from "@/components/ChatSurface";
import type { ChatMessage, SessionStatus } from "@/components/types";

function id() {
  return Math.random().toString(36).slice(2);
}

export default function Page() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [modelRef, setModelRef] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status] = useState<SessionStatus>("idle");

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

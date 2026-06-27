"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./types";

interface ChatSurfaceProps {
  modelRef: string;
  messages: ChatMessage[];
  canChat: boolean;
  busy: boolean;
  onSend: (text: string) => void;
  onReset: () => void;
}

export default function ChatSurface({
  modelRef,
  messages,
  canChat,
  busy,
  onSend,
  onReset,
}: ChatSurfaceProps) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function submit() {
    const text = draft.trim();
    if (!text || !canChat || busy) return;
    onSend(text);
    setDraft("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const placeholder = !canChat ? "Launch a model to start chatting" : "Message the model…";

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-panel px-5 py-3">
        <div className="min-w-0">
          <p className="eyebrow text-muted">Session</p>
          <p className="truncate font-mono text-[13px] text-ink">
            {modelRef.trim() || "no model selected"}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={messages.length === 0}
          className="shrink-0 rounded-well border border-line bg-panel px-3 py-1.5 font-sans text-[13px] font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-muted"
        >
          Reset chat
        </button>
      </header>

      <div className="scroll-thin flex-1 overflow-y-auto px-5 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <p className="font-sans text-sm font-medium text-ink">No messages yet</p>
            <p className="mt-1 text-[13px] text-muted">
              {canChat
                ? "Send something below to test the model. Reset clears the conversation but keeps your system prompt."
                : "Launch a model from the left, then send a message. The first reply waits on a cold start."}
            </p>
          </div>
        ) : (
          <div className="mx-auto flex max-w-2xl flex-col gap-4">
            {messages.map((m) => (
              <Bubble key={m.id} message={m} busy={busy} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-line bg-panel px-5 py-3">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={!canChat || busy}
            className="scroll-thin max-h-40 min-h-[44px] flex-1 resize-none rounded-well border border-line bg-surface px-3 py-2.5 font-sans text-[14px] text-ink outline-none ring-amber/50 placeholder:text-muted focus:ring-1 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!draft.trim() || !canChat || busy}
            className="h-[44px] shrink-0 rounded-well bg-ink px-4 font-sans text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}

function Bubble({ message, busy }: { message: ChatMessage; busy: boolean }) {
  const isUser = message.role === "user";
  const isEmptyAssistant = !isUser && message.content === "";

  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[85%] rounded-well rounded-br-sm bg-ink px-3.5 py-2.5 text-[14px] leading-relaxed text-white"
            : "max-w-[85%] rounded-well rounded-bl-sm border border-line bg-panel px-3.5 py-2.5 text-[14px] leading-relaxed text-ink"
        }
      >
        {!isUser && <p className="eyebrow mb-1 text-muted">Assistant</p>}
        {isEmptyAssistant && busy ? (
          <span className="inline-flex gap-1 py-1" aria-label="warming up">
            <Dot delay="0ms" />
            <Dot delay="150ms" />
            <Dot delay="300ms" />
          </span>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted"
      style={{ animationDelay: delay }}
    />
  );
}

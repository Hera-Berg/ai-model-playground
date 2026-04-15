import type { SessionStatus } from "./types";
import StatusStrip from "./StatusStrip";

interface ControlRailProps {
  systemPrompt: string;
  onSystemPromptChange: (v: string) => void;
  modelRef: string;
  onModelRefChange: (v: string) => void;
  status: SessionStatus;
}

export default function ControlRail({
  systemPrompt,
  onSystemPromptChange,
  modelRef,
  onModelRefChange,
  status,
}: ControlRailProps) {
  return (
    <aside className="flex h-full w-full flex-col bg-rail md:w-[360px] md:shrink-0">
      <div className="border-b border-rail-line px-5 py-4">
        <p className="eyebrow text-rail-muted">Control</p>
        <h1 className="mt-1 font-sans text-base font-semibold text-rail-value">
          Model Playground
        </h1>
      </div>

      <div className="scroll-thin flex-1 space-y-6 overflow-y-auto px-5 py-5">
        {/* System prompt — explicitly survives a chat reset */}
        <div>
          <label htmlFor="system-prompt" className="eyebrow text-rail-muted">
            System prompt
          </label>
          <textarea
            id="system-prompt"
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="You are a helpful assistant…"
            rows={6}
            className="mt-2 w-full resize-y rounded-well bg-rail-well px-3 py-2.5 font-mono text-[13px] leading-relaxed text-rail-value shadow-well outline-none ring-amber/60 placeholder:text-rail-muted/60 focus:ring-1"
          />
          <p className="mt-1.5 text-[11px] text-rail-muted">
            Stays put when you reset the chat.
          </p>
        </div>

        {/* Model reference */}
        <div>
          <label htmlFor="model-ref" className="eyebrow text-rail-muted">
            Hugging Face model
          </label>
          <input
            id="model-ref"
            value={modelRef}
            onChange={(e) => onModelRefChange(e.target.value)}
            placeholder="Qwen/Qwen3-8B  or  paste the model URL"
            className="mt-2 w-full rounded-well bg-rail-well px-3 py-2.5 font-mono text-[13px] text-rail-value shadow-well outline-none ring-amber/60 placeholder:text-rail-muted/60 focus:ring-1"
          />
          <p className="mt-1.5 text-[11px] text-rail-muted">
            Estimating size and rate comes online in a later step.
          </p>
        </div>

        {/* Cost block — placeholder readout for now */}
        <div className="rounded-well border border-rail-line p-3">
          <p className="eyebrow text-rail-muted">Estimated cost</p>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono">
            <span className="text-rail-muted text-[13px]">$</span>
            <span className="text-rail-value text-xl">—.——</span>
            <span className="text-rail-muted text-[11px]">/ sec</span>
          </div>
          <p className="mt-1 text-[11px] text-rail-muted">
            Fills in once a model is resolved.
          </p>
        </div>

        {/* Ignition — stubbed until orchestration lands */}
        <button
          type="button"
          disabled
          title="Launching gets wired up in a later step"
          className="w-full cursor-not-allowed rounded-well bg-amber/40 px-4 py-2.5 font-sans text-sm font-semibold text-rail"
        >
          Launch model
        </button>
      </div>

      <StatusStrip status={status} />
    </aside>
  );
}

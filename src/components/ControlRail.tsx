import type { ResolveResult, SessionStatus } from "./types";
import StatusStrip from "./StatusStrip";

interface ControlRailProps {
  systemPrompt: string;
  onSystemPromptChange: (v: string) => void;
  modelRef: string;
  onModelRefChange: (v: string) => void;
  status: SessionStatus;
  estimate: ResolveResult | null;
  resolving: boolean;
  resolveError: string | null;
}

export default function ControlRail({
  systemPrompt,
  onSystemPromptChange,
  modelRef,
  onModelRefChange,
  status,
  estimate,
  resolving,
  resolveError,
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
            Read straight from Hugging Face to size the GPU and estimate the
            rate.
          </p>
        </div>

        {/* Cost block — live readout */}
        <CostBlock
          estimate={estimate}
          resolving={resolving}
          error={resolveError}
        />

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

      <StatusStrip status={status} estimate={estimate} />
    </aside>
  );
}

function CostBlock({
  estimate,
  resolving,
  error,
}: {
  estimate: ResolveResult | null;
  resolving: boolean;
  error: string | null;
}) {
  const hasRate = estimate && estimate.perSecondUsd != null;

  return (
    <div className="rounded-well border border-rail-line p-3">
      <p className="eyebrow text-rail-muted">Estimated cost</p>

      {resolving ? (
        <p className="mt-2 font-mono text-[13px] text-rail-muted">Resolving…</p>
      ) : error ? (
        <p className="mt-2 font-mono text-[12px] leading-relaxed text-err">
          {error}
        </p>
      ) : hasRate ? (
        <>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono">
            <span className="text-[13px] text-rail-muted">$</span>
            <span className="text-xl text-rail-value">
              {estimate!.perSecondUsd!.toFixed(5)}
            </span>
            <span className="text-[11px] text-rail-muted">/ sec</span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-rail-muted">
            ≈ ${estimate!.perHourUsd!.toFixed(2)} / hr while running
          </p>
          <p className="mt-2 font-mono text-[11px] text-rail-value">
            {estimate!.paramsLabel ?? "size n/a"}
            {estimate!.dtype ? ` · ${estimate!.dtype}` : ""}
          </p>
          {estimate!.note && (
            <p className="mt-1 text-[11px] leading-relaxed text-amber">
              {estimate!.note}
            </p>
          )}
        </>
      ) : estimate?.note ? (
        // Gated or unknown-size: no rate, but we have something to say.
        <p className="mt-2 text-[12px] leading-relaxed text-amber">
          {estimate.note}
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-1.5 font-mono">
            <span className="text-[13px] text-rail-muted">$</span>
            <span className="text-xl text-rail-value">—.——</span>
            <span className="text-[11px] text-rail-muted">/ sec</span>
          </div>
          <p className="mt-1 text-[11px] text-rail-muted">
            Fills in once a model is resolved.
          </p>
        </>
      )}
    </div>
  );
}

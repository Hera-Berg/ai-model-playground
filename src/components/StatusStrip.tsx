import type { SessionStatus } from "./types";

const STATE_COPY: Record<
  SessionStatus,
  { label: string; tone: string; dot: string }
> = {
  idle: {
    label: "Idle — no model loaded",
    tone: "text-rail-muted",
    dot: "bg-rail-muted",
  },
  launching: {
    label: "Launching endpoint",
    tone: "text-amber",
    dot: "bg-amber animate-pulse",
  },
  warming: {
    label: "Warming up — first load",
    tone: "text-amber",
    dot: "bg-amber animate-pulse",
  },
  ready: { label: "Ready", tone: "text-ready", dot: "bg-ready" },
  error: { label: "Error", tone: "text-err", dot: "bg-err" },
};

export default function StatusStrip({ status }: { status: SessionStatus }) {
  const s = STATE_COPY[status];
  return (
    <div className="border-t border-rail-line bg-rail-well/60 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className={`font-mono text-[11px] ${s.tone}`}>{s.label}</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <div>
          <dt className="text-rail-muted">GPU</dt>
          <dd className="text-rail-value">—</dd>
        </div>
        <div>
          <dt className="text-rail-muted">VRAM</dt>
          <dd className="text-rail-value">—</dd>
        </div>
        <div>
          <dt className="text-rail-muted">$/SEC</dt>
          <dd className="text-rail-value">—</dd>
        </div>
      </dl>
    </div>
  );
}

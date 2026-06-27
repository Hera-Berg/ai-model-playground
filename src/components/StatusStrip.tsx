import type { ResolveResult, Session, SessionStatus } from "./types";

const STATE_COPY: Record<SessionStatus, { label: string; tone: string; dot: string }> = {
  idle: { label: "Idle — no model loaded", tone: "text-rail-muted", dot: "bg-rail-muted" },
  launching: { label: "Launching endpoint", tone: "text-amber", dot: "bg-amber animate-pulse" },
  warming: { label: "Warming up — first load", tone: "text-amber", dot: "bg-amber animate-pulse" },
  ready: { label: "Ready", tone: "text-ready", dot: "bg-ready" },
  error: { label: "Error", tone: "text-err", dot: "bg-err" },
};

/**
 * The instrument readout. Reports the machine's state plus the resolved GPU /
 * VRAM / rate. Fields show "—" until a model is resolved.
 */
export default function StatusStrip({
  status,
  estimate,
  session,
}: {
  status: SessionStatus;
  estimate: ResolveResult | null;
  session: Session | null;
}) {
  const s = STATE_COPY[status];

  const gpu = session?.gpu ?? (estimate?.gpu ? estimate.gpu.split(" · ")[0] : "—");
  const vram = estimate?.estVramGb ? `${estimate.estVramGb} GB` : "—";
  const rate = estimate?.perSecondUsd != null ? `$${estimate.perSecondUsd.toFixed(5)}` : "—";

  return (
    <div className="border-t border-rail-line bg-rail-well/60 px-5 py-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${s.dot}`} aria-hidden />
        <span className={`font-mono text-[11px] ${s.tone}`}>{s.label}</span>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px]">
        <div>
          <dt className="text-rail-muted">GPU</dt>
          <dd className="truncate text-rail-value" title={session?.gpu ?? estimate?.gpu ?? undefined}>
            {gpu}
          </dd>
        </div>
        <div>
          <dt className="text-rail-muted">VRAM</dt>
          <dd className="text-rail-value">{vram}</dd>
        </div>
        <div>
          <dt className="text-rail-muted">$/SEC</dt>
          <dd className="text-rail-value">{rate}</dd>
        </div>
      </dl>
    </div>
  );
}

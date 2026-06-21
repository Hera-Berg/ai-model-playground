import { useState } from "react";
import type { KeyStatus } from "./types";

interface ConnectionPanelProps {
  runpodKey: string;
  onRunpodKeyChange: (v: string) => void;
  keyStatus: KeyStatus;
  keyError: string | null;
  onTest: () => void;
  hfToken: string;
  onHfTokenChange: (v: string) => void;
  workerImage: string;
  onWorkerImageChange: (v: string) => void;
  defaultImage: string;
}

const STATUS_DOT: Record<KeyStatus, string> = {
  unknown: "bg-rail-muted",
  checking: "bg-amber animate-pulse",
  valid: "bg-ready",
  invalid: "bg-err",
};

const STATUS_LABEL: Record<KeyStatus, string> = {
  unknown: "Not tested",
  checking: "Testing…",
  valid: "Connected",
  invalid: "Failed",
};

export default function ConnectionPanel({
  runpodKey,
  onRunpodKeyChange,
  keyStatus,
  keyError,
  onTest,
  hfToken,
  onHfTokenChange,
  workerImage,
  onWorkerImageChange,
  defaultImage,
}: ConnectionPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="rounded-well border border-rail-line p-3">
      <div className="flex items-center justify-between">
        <p className="eyebrow text-rail-muted">RunPod access</p>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[keyStatus]}`}
            aria-hidden
          />
          <span className="font-mono text-[10px] text-rail-muted">
            {STATUS_LABEL[keyStatus]}
          </span>
        </span>
      </div>

      <div className="mt-2 flex gap-2">
        <input
          type="password"
          value={runpodKey}
          onChange={(e) => onRunpodKeyChange(e.target.value)}
          placeholder="RunPod API key"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-well bg-rail-well px-3 py-2 font-mono text-[12px] text-rail-value shadow-well outline-none ring-amber/60 placeholder:text-rail-muted/60 focus:ring-1"
        />
        <button
          type="button"
          onClick={onTest}
          disabled={!runpodKey.trim() || keyStatus === "checking"}
          className="shrink-0 rounded-well border border-rail-line px-3 py-2 font-sans text-[12px] font-medium text-rail-value transition-colors hover:bg-rail-well disabled:cursor-not-allowed disabled:text-rail-muted"
        >
          Test
        </button>
      </div>

      {keyError && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-err">
          {keyError}
        </p>
      )}

      <button
        type="button"
        onClick={() => setShowAdvanced((s) => !s)}
        className="mt-2 font-mono text-[10px] uppercase tracking-wider text-rail-muted hover:text-rail-value"
      >
        {showAdvanced ? "− Advanced" : "+ Advanced"}
      </button>

      {showAdvanced && (
        <div className="mt-2 space-y-2">
          <div>
            <label className="font-mono text-[10px] text-rail-muted">
              Hugging Face token
            </label>
            <input
              type="password"
              value={hfToken}
              onChange={(e) => onHfTokenChange(e.target.value)}
              placeholder="hf_… (only for gated models)"
              autoComplete="off"
              className="mt-1 w-full rounded-well bg-rail-well px-3 py-2 font-mono text-[12px] text-rail-value shadow-well outline-none ring-amber/60 placeholder:text-rail-muted/60 focus:ring-1"
            />
          </div>
          <div>
            <label className="font-mono text-[10px] text-rail-muted">
              vLLM worker image
            </label>
            <input
              type="text"
              value={workerImage}
              onChange={(e) => onWorkerImageChange(e.target.value)}
              placeholder={defaultImage}
              autoComplete="off"
              spellCheck={false}
              className="mt-1 w-full rounded-well bg-rail-well px-3 py-2 font-mono text-[11px] text-rail-value shadow-well outline-none ring-amber/60 placeholder:text-rail-muted/60 focus:ring-1"
            />
            <p className="mt-1 text-[10px] leading-relaxed text-rail-muted">
              Leave blank to use the default. If a model fails to load, paste
              the image tag RunPod&apos;s own Serverless vLLM quick-deploy uses.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

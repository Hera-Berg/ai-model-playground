export interface SafeTensors {
  total?: number;
  parameters?: Record<string, number>;
}

export interface GpuTier {
  vramGb: number;
  label: string;
  perSecondUsd: number;

  gpuTypeIds: string[];
}

export interface ResolveResult {
  repoId: string;
  params: number | null;
  paramsLabel: string | null;
  dtype: string | null;
  estVramGb: number | null;
  gpu: string | null;
  gpuTypeIds: string[] | null;
  containerDiskGb: number | null;
  perSecondUsd: number | null;
  perHourUsd: number | null;
  gated: boolean;
  fitsLargest: boolean;
  note?: string;
}

export const GPU_TIERS: GpuTier[] = [
  {
    vramGb: 16,
    label: "16 GB · RTX A4000-class",
    perSecondUsd: 0.00016,
    gpuTypeIds: ["NVIDIA RTX A4000", "NVIDIA RTX 2000 Ada Generation"],
  },
  {
    vramGb: 24,
    label: "24 GB · RTX 4090 / L4-class",
    perSecondUsd: 0.0002,
    gpuTypeIds: ["NVIDIA GeForce RTX 4090", "NVIDIA L4", "NVIDIA RTX A5000"],
  },
  {
    vramGb: 48,
    label: "48 GB · A6000 / L40S-class",
    perSecondUsd: 0.00039,
    gpuTypeIds: ["NVIDIA L40S", "NVIDIA RTX A6000", "NVIDIA L40", "NVIDIA A40"],
  },
  {
    vramGb: 80,
    label: "80 GB · A100 / H100-class",
    perSecondUsd: 0.00076,
    gpuTypeIds: [
      "NVIDIA A100 80GB PCIe",
      "NVIDIA H100 PCIe",
      "NVIDIA H100 80GB HBM3",
    ],
  },
  {
    vramGb: 141,
    label: "141 GB · H200-class",
    perSecondUsd: 0.00155,
    gpuTypeIds: ["NVIDIA H200"],
  },
  {
    vramGb: 180,
    label: "180 GB · pro-class",
    perSecondUsd: 0.0024,
    gpuTypeIds: ["NVIDIA B200", "NVIDIA H200"],
  },
];

const DTYPE_BYTES: Record<string, number> = {
  F64: 8,
  I64: 8,
  U64: 8,
  F32: 4,
  I32: 4,
  U32: 4,
  F16: 2,
  BF16: 2,
  I16: 2,
  U16: 2,
  F8_E4M3: 1,
  F8_E5M2: 1,
  I8: 1,
  U8: 1,
  BOOL: 1,
  I4: 0.5,
  U4: 0.5,
};

const VRAM_OVERHEAD = 1.2;

function bytesForDtype(dtype: string): number {
  return DTYPE_BYTES[dtype.toUpperCase()] ?? 2;
}

export function parseModelRef(input: string): string | null {
  let s = (input ?? "").trim();
  if (!s) return null;

  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      if (!u.hostname.includes("huggingface.co")) return null;
      s = u.pathname;
    } catch {
      return null;
    }
  }

  s = s.replace(/^\/+/, "");
  s = s.replace(/\/(tree|blob|resolve|commit|commits)\/.*$/i, "");
  s = s.replace(/\/+$/, "");

  const parts = s.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const repo = `${parts[0]}/${parts[1]}`;
  if (!/^[\w.\-]+\/[\w.\-]+$/.test(repo)) return null;
  return repo;
}

export function weightsBytes(
  st: SafeTensors | undefined | null,
): number | null {
  if (!st) return null;
  if (st.parameters && Object.keys(st.parameters).length > 0) {
    let bytes = 0;
    for (const [dt, n] of Object.entries(st.parameters))
      bytes += n * bytesForDtype(dt);
    return bytes;
  }
  if (typeof st.total === "number") return st.total * 2;
  return null;
}

export function dominantDtype(
  st: SafeTensors | undefined | null,
): string | null {
  if (!st?.parameters) return null;
  let best: string | null = null;
  let max = -1;
  for (const [dt, n] of Object.entries(st.parameters)) {
    if (n > max) {
      max = n;
      best = dt;
    }
  }
  return best;
}

export function estimateVramGb(bytes: number): number {
  return (bytes / 1e9) * VRAM_OVERHEAD;
}

export function containerDiskGb(bytes: number): number {
  return Math.max(20, Math.ceil((bytes / 1e9) * 2.5));
}

export function pickTier(vramGb: number): { tier: GpuTier; fits: boolean } {
  for (const t of GPU_TIERS) {
    if (t.vramGb >= vramGb) return { tier: t, fits: true };
  }
  return { tier: GPU_TIERS[GPU_TIERS.length - 1], fits: false };
}

export function formatParams(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}

export function buildEstimate(
  repoId: string,
  st: SafeTensors | undefined | null,
  gated: boolean,
): ResolveResult {
  const bytes = weightsBytes(st);
  if (!bytes) {
    return {
      repoId,
      params: st?.total ?? null,
      paramsLabel: st?.total ? formatParams(st.total) : null,
      dtype: null,
      estVramGb: null,
      gpu: null,
      gpuTypeIds: null,
      containerDiskGb: null,
      perSecondUsd: null,
      perHourUsd: null,
      gated,
      fitsLargest: true,
      note: "Couldn't read this model's size — no safetensors metadata. It may be GGUF or otherwise quantized, so the size estimate isn't available yet.",
    };
  }

  const vram = estimateVramGb(bytes);
  const { tier, fits } = pickTier(vram);
  const params = st?.total ?? null;

  return {
    repoId,
    params,
    paramsLabel: params ? formatParams(params) : null,
    dtype: dominantDtype(st ?? null),
    estVramGb: Math.ceil(vram),
    gpu: tier.label,
    gpuTypeIds: tier.gpuTypeIds,
    containerDiskGb: containerDiskGb(bytes),
    perSecondUsd: tier.perSecondUsd,
    perHourUsd: tier.perSecondUsd * 3600,
    gated,
    fitsLargest: fits,
    note: fits
      ? undefined
      : "Larger than a single serverless GPU tier — it'll need quantization or multi-GPU, handled in a later step.",
  };
}

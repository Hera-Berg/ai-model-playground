# Model Playground

Paste a Hugging Face model, spin it up on a rented RunPod GPU, and test it in a
chat window — no local download, no manual GPU rental. Designed to run behind a
Cloudflare Tunnel + Zero Trust as a portfolio piece.

> **Build status: Step 5 of 6 — deploy behind Cloudflare + reliability fixes.**
> Real streaming chat works. This build adds automatic GPU fallback, a
> cold-start heartbeat so cold models survive Cloudflare's idle timeout, and the
> tunnel wiring. Remaining: optional idle auto-teardown (cost safety).

## Stack

Single Next.js (TypeScript) app — UI and API route handlers in one container,
mapping onto one Cloudflare Tunnel route. Tailwind. No Python.

## Run locally

```bash
npm install && npm run dev
# or, app-only in Docker (comment out the cloudflared service first):
docker compose up --build
```

## Deploy behind Cloudflare Tunnel + Zero Trust

This publishes the app at e.g. `models.sanaorbit.space`, gated by Cloudflare
Access — no login code in the app.

### 1. Create the tunnel (token method)

In the Cloudflare dashboard: **Zero Trust → Networks → Tunnels → Create a
tunnel → Cloudflared**. Name it (e.g. `model-playground`). On the install
screen, copy the **tunnel token** (the long string after `--token`).

Put it in `.env`:

```
CLOUDFLARE_TUNNEL_TOKEN=eyJ...your-token...
```

### 2. Add the public hostname

Still in the tunnel's config, open **Public Hostnames → Add a public hostname**:

- **Subdomain:** `models`
- **Domain:** `sanaorbit.space`
- **Type:** `HTTP`
- **URL:** `app:3000`  ← the compose service name; cloudflared reaches it over
  the internal Docker network.

Save. Cloudflare creates the DNS record automatically.

### 3. Gate it with Zero Trust Access

**Zero Trust → Access → Applications → Add an application → Self-hosted**:

- **Application domain:** `models.sanaorbit.space`
- Add a **policy** — e.g. Action *Allow*, Include *Emails* = your email (or
  *Emails ending in* your domain).

Now anyone hitting the URL must pass Cloudflare Access first.

### 4. Run it

```bash
docker compose up --build
```

`cloudflared` connects out to Cloudflare (no inbound ports needed), and the app
is live at `https://models.sanaorbit.space` behind Access.

> Locally-managed tunnel alternative (credentials file + `config.yml`) is in
> `cloudflared/config.example.yml` if you prefer not to use the dashboard.

## Reliability notes

- **GPU fallback** — each launch offers RunPod the ideal GPU tier *plus every
  larger tier*, cheapest first. An unavailable or unhealthy small card auto-
  climbs to a bigger one instead of failing. The displayed cost is the ideal
  tier; a fallback to a bigger GPU costs more.
- **Cold-start heartbeat** — `/api/chat` streams SSE keep-alive pings every 10s
  until the model's first token, so a multi-minute cold start doesn't trip
  Cloudflare's ~100s idle-origin timeout.
- **GPU still flaky?** RunPod serverless availability varies by region/time. If
  launches keep landing on unhealthy workers, widen the candidate list in
  `GPU_TIERS` (`src/lib/estimate.ts`) or pin a known-good worker image in the
  app's Advanced field.

## Cost & safety

- The first chat message spins up a GPU worker; you pay per second until it
  idles out (60s after the last message), then it scales to zero.
- **Stop & delete the endpoint when done.** Even behind Access, a forgotten tab
  leaves an endpoint that warms on the next message.
- Step 6 (recommended) adds idle auto-teardown so the app deletes its own
  endpoint after a period of inactivity.

## Adjustable bits

- Worker image — Advanced field in the UI, or `RUNPOD_VLLM_IMAGE` env.
- GPU tiers / fallback — `GPU_TIERS` in `src/lib/estimate.ts`.
- Idle timeout / max tokens / context length — `src/lib/runpod.ts`,
  `src/app/api/chat/route.ts`.

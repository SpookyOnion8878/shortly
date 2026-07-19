# Shortly — Modern, Self-Hostable URL Shortener

> Shorten links. Understand clicks.

**Shortly** is a URL shortener built with [Next.js](https://nextjs.org),
[TypeScript](https://www.typescriptlang.org) and [Tailwind CSS](https://tailwindcss.com).
It gives every short link deep, privacy-aware click analytics, ships with
built-in SSRF protection, and runs with **zero external dependencies** in local
mode (a JSON file store) — or scales to serverless via Upstash Redis.

---

## ✨ Features

- **Shorten any URL** — random codes (6 chars ≈ 20B combinations) or bring your
  own custom code.
- **Click analytics** — daily time series, plus breakdowns by country, browser,
  operating system and referrer.
- **Expiring links** — optionally set an `expiresAt` timestamp per link.
- **SSRF protection** — private, loopback, link-local and cloud-metadata
  targets are rejected by default.
- **Pluggable storage** — local JSON file for single-instance self-hosting, or
  Upstash Redis for multi-instance / serverless deploys.
- **Rate limiting** — per-IP sliding window on the create endpoint.
- **Bounded storage** — raw click events are capped and folded into daily
  aggregates, so storage stays ~O(days) instead of O(clicks).
- **Zero UI dependencies** — charts are hand-rolled SVG; no chart library.

---

## 🗂 Project Structure

```
shortly/
├── app/                      # Next.js App Router
│   ├── [code]/
│   │   └── route.ts          # GET /:code  — the redirect + click-recording hot path
│   ├── api/
│   │   ├── links/route.ts    # GET  /api/links  — list all links (dashboard feed)
│   │   ├── shorten/route.ts  # POST /api/shorten — create a short link
│   │   └── stats/
│   │       └── [code]/
│   │           └── route.ts  # GET  /api/stats/:code — aggregate analytics
│   ├── stats/
│   │   ├── page.tsx          # /stats — dashboard listing every link
│   │   └── [code]/
│   │       └── page.tsx      # /stats/:code — per-link analytics view
│   ├── globals.css           # Tailwind layers + design tokens
│   ├── layout.tsx            # Root layout / shell
│   ├── not-found.tsx         # Friendly 404 for unknown/expired links
│   └── page.tsx              # Home: hero + shorten form + feature cards
├── components/
│   ├── UrlShortener.tsx      # Client form that talks to /api/shorten
│   └── BarChart.tsx          # Dependency-free SVG bar chart
├── lib/                      # Framework-agnostic business logic
│   ├── analytics.ts          # Visit events → bounded daily aggregates
│   ├── client.ts             # Client-side fetch helpers + clipboard util
│   ├── db.ts                 # Store interface + getStore() factory
│   ├── env.ts                # Type-safe, centralised env configuration
│   ├── file-store.ts         # JSON-file Store implementation
│   ├── paths.ts              # Resolves project base directory
│   ├── rate-limiter.ts       # In-memory per-IP sliding-window limiter
│   ├── redis-store.ts        # Upstash Redis Store implementation
│   ├── short-code.ts         # Short code generation + validation
│   ├── shortener.ts          # High-level use-cases (create/resolve/click/stats)
│   ├── types.ts              # Shared domain types
│   └── url.ts                # URL validation, normalisation & SSRF guard
├── .env.example              # Documented environment variables
├── .gitignore                # Ignores node_modules, .next, .env, .data, …
├── .eslintrc.json            # ESLint (next/core-web-vitals)
├── Dockerfile                # Multi-stage build for containerised hosting
├── .dockerignore
├── next.config.mjs           # Next.js config (standalone output)
├── postcss.config.mjs        # PostCSS (Tailwind + autoprefixer)
├── tailwind.config.ts        # Tailwind theme (brand palette, fade-in)
├── tsconfig.json             # TypeScript config
├── package.json
└── LICENSE                   # MIT
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.18 (tested on Node 24)
- **npm** (ships with Node)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example env file and adjust if needed (the defaults work out of the box):

```bash
cp .env.example .env
```

| Variable                 | Default                       | Description                                                        |
| ------------------------ | ----------------------------- | ------------------------------------------------------------------ |
| `NEXT_PUBLIC_BASE_URL`   | `http://localhost:3000`       | Public base URL used to build short links returned to the client.  |
| `UPSTASH_REDIS_REST_URL` | _(empty)_                     | Upstash Redis URL. **Presence enables the Redis store.**           |
| `UPSTASH_REDIS_REST_TOKEN` | _(empty)_                   | Upstash Redis token.                                               |
| `SHORT_CODE_LENGTH`      | `6`                           | Length of generated short codes.                                   |
| `SHORT_CODE_ALPHABET`    | `23456789abcdefghijkmnpqrstuvwxyz` | Unambiguous alphabet (no `0/O`, `1/l/I`).                   |
| `BLOCK_PRIVATE_TARGETS`  | `true`                        | Reject URLs pointing to private/local/metadata addresses (SSRF).   |
| `RATE_LIMIT_MAX`         | `20`                          | Max create requests per IP per window.                             |
| `RATE_LIMIT_WINDOW_MS`   | `60000`                       | Rate-limit window in milliseconds.                                 |
| `VISIT_EVENT_CAP`        | `5000`                        | Max raw visit events retained per link (`0` = keep all).           |

> **Storage note:** With no Redis credentials set, Shortly uses a local JSON
> file at `.data/store.json` (git-ignored). Provide both `UPSTASH_REDIS_REST_*`
> variables to switch automatically to Upstash Redis — ideal for Vercel, Fly.io
> or Kubernetes.

### 3. Run the dev server

```bash
npm run dev
```

Open <http://localhost:3000>.

### 4. Build & run in production

```bash
npm run build
npm run start
```

> **Low-memory machines:** if `npm run build` fails with
> `FATAL ERROR: Zone Allocation failed - process out of memory`, raise the V8
> heap limit first:
>
> ```bash
> export NODE_OPTIONS="--max-old-space-size=4096"   # Linux/macOS
> npm run build
> ```

---

## 🔌 API Reference

### `POST /api/shorten`

Create a short link.

**Request body (JSON):**

```json
{
  "url": "https://example.com/some/very/long/path",
  "customCode": "my-link",      // optional
  "expiresAt": "2026-12-31T23:59:59.000Z", // optional ISO-8601
  "note": "Q4 campaign"         // optional
}
```

**Responses:**

- `200` → `{ "code", "shortUrl", "url", "createdAt" }`
- `400` → `{ "error" }` (validation / collision failure)
- `429` → `{ "error", "retryAfterMs" }` (rate limited)
- `500` → `{ "error" }`

### `GET /api/stats/:code`

Aggregate analytics for a single link.

- `200` → [`LinkStats`](./lib/types.ts)
- `404` → `{ "error" }`
- `500` → `{ "error" }`

### `GET /api/links`

List all links (lightweight summaries, newest first).

- `200` → `{ "links": LinkSummary[] }`

### `GET /:code`

The redirect endpoint. Resolves the code, records the click (best-effort), and
issues a `307` redirect to the destination. Unknown or expired codes render the
friendly 404 page.

---

## 🐳 Docker

A multi-stage `Dockerfile` is included (uses Next.js `standalone` output):

```bash
docker build -t shortly .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BASE_URL=http://localhost:3000 \
  shortly
```

To use Redis in the container, pass the Upstash credentials:

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_BASE_URL=https://your-domain \
  -e UPSTASH_REDIS_REST_URL=... \
  -e UPSTASH_REDIS_REST_TOKEN=... \
  shortly
```

---

## 🧪 Scripts

| Script          | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Start the dev server with hot reload |
| `npm run build` | Production build                     |
| `npm run start` | Serve the production build           |
| `npm run lint`  | Lint with ESLint (next/core-web-vitals) |

---

## 🔒 Security

- **SSRF guard** (`lib/url.ts`): only `http`/`https`, no embedded credentials,
  and (when `BLOCK_PRIVATE_TARGETS=true`) hostnames are DNS-resolved and
  rejected if they resolve to loopback, RFC1918, link-local, CGNAT or
  cloud-metadata addresses.
- **Rate limiting** (`lib/rate-limiter.ts`): per-IP sliding window on creation.
- **Privacy-aware analytics**: raw events are capped and aggregated; no
  third-party trackers or cookies are used.

> For multi-instance deployments, swap the in-memory rate limiter for a shared
> one (e.g. Redis `INCR`/`EXPIRE`) — the function signature is intentionally
> identical.

---

## 📄 License

[MIT](./LICENSE) © Shortly contributors.

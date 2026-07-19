# syntax=docker/dockerfile:1

# ── Dependencies ──────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev || npm install

# ── Build ─────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js "standalone" output keeps the runtime image tiny.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Data dir for the JSON file store (mount a volume here in production).
RUN mkdir -p .data
VOLUME ["/app/.data"]

EXPOSE 3000
# Next standalone expects the server to live at ./server.js
CMD ["node", "server.js"]

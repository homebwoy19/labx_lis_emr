# ============================================================================
# Foundation Lab LIS — Backend image
#
# Multi-stage build:
#   deps   — install production dependencies only
#   build  — install all deps + generate the Prisma client
#   runner — slim runtime with Chromium (for Puppeteer PDF rendering)
#
# Puppeteer uses the system Chromium instead of downloading its own, so the
# image stays smaller and works on ARM/x64 alike.
# ============================================================================

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# ── dependencies (production) ────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --prod --frozen-lockfile --ignore-scripts

# ── build (all deps + prisma client) ─────────────────────────────────────────
FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts
COPY prisma ./prisma
RUN pnpm exec prisma generate

# ── runtime ──────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim AS runner
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Chromium + fonts for headless PDF rendering.
RUN apt-get update && apt-get install -y --no-install-recommends \
      chromium \
      fonts-liberation \
      ca-certificates \
      dumb-init \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Production node_modules from deps, generated client from build.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY . .

# Run as the built-in non-root user.
USER node
EXPOSE 4000

# dumb-init reaps zombies and forwards signals for clean shutdown.
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/server.js"]

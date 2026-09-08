# syntax=docker/dockerfile:1

# ---- Base: Node + pnpm via Corepack ----------------------------------------
# Digest-pinned so a rebuilt tag cannot change the base image under a build.
FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV HUSKY=0
# The trailing `pnpm --version` is not a smoke test. pnpm 12 ships as a
# launcher whose real binary is an optional per-platform dependency, which
# Corepack does not install and pnpm therefore fetches on first run. Doing that
# here lands it in this layer, which both stages below inherit, instead of
# fetching it again in each of them.
RUN corepack enable && corepack prepare pnpm@12.3.4 --activate && pnpm --version
WORKDIR /app

# ---- Dependencies ----------------------------------------------------------
FROM base AS deps
# pnpm-workspace.yaml carries nodeLinker: hoisted, which the standalone build
# depends on (see docs/adr/0006). Leaving it out silently gives the symlinked
# layout and a container that dies at start on a missing @swc/helpers.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# ---- Build -----------------------------------------------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# ---- Runtime ---------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 -G nodejs

# Standalone output ships the server plus only the dependencies it needs.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# Readiness rather than liveness: the page renders the flow, so a 200 here means
# the flow parsed and the server can serve it. `/` is a redirect to the
# negotiated locale, which fetch follows by default, so this covers the proxy as
# well as the render.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]

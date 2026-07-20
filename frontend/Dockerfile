# syntax=docker/dockerfile:1
#
# Multi-stage image for the OCRFlow Next.js frontend.
#
# Stages:
#   deps    — install node_modules from the lockfile (cached on package*.json).
#   builder — produce the standalone production build (.next/standalone).
#   runner  — minimal runtime: the standalone server + static assets only.
#
# The app talks to the backend server-side (Next route handlers read API_URL),
# so no build-time API URL is baked in — API_URL is supplied at runtime by the
# root docker-compose.yml (http://gateway:8000 on the compose network).

ARG NODE_VERSION=20

# --------------------------------------------------------------------------- #
FROM node:${NODE_VERSION}-alpine AS deps

# libc6-compat: Next.js on Alpine expects glibc-compatible shims for some deps.
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# --------------------------------------------------------------------------- #
FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# --------------------------------------------------------------------------- #
FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Standalone output already contains a minimal node_modules + server.js.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]

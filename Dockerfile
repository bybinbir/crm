# ⚠️  DEPRECATED - Host-Native Deployment Only
# This Dockerfile is no longer used in production.
# Production uses systemd services: crmanaliz-api.service, crmanaliz-web.service
# See: docs/releases/CRM-ANALIZ-HOST-NATIVE-FINALIZATION-039.md
# Last Docker deployment: 2026-03-25
# Use for local development only

# Base stage
FROM node:20-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/*/package.json ./packages/
RUN pnpm install --frozen-lockfile

# Builder stage
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Production stage - API
FROM base AS api-production
ENV NODE_ENV=production
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/node_modules ./node_modules
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]

# Production stage - Web
FROM base AS web-production
ENV NODE_ENV=production
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/package.json ./apps/web/
COPY --from=builder /app/node_modules ./node_modules
WORKDIR /app/apps/web
EXPOSE 3000
CMD ["pnpm", "start"]

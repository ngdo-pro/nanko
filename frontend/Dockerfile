# syntax=docker/dockerfile:1
#
# Build context is the repo root (not frontend/), because the frontend build
# needs every pnpm workspace package's package.json to resolve the lockfile,
# even though only `frontend` is actually built. See
# .github/workflows/deploy-{preprod,prod}.yml for the corresponding
# `docker/build-push-action` context/file settings.

FROM node:24-alpine AS builder
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11 --activate
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json frontend/package.json
COPY landing/package.json landing/package.json
COPY library/package.json library/package.json
COPY tests-e2e/package.json tests-e2e/package.json
RUN pnpm install --frozen-lockfile
COPY frontend frontend
ARG VITE_API_BASE_URL
RUN test -n "$VITE_API_BASE_URL"
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm --filter frontend build

# Dev-only stage for `infra/local/compose.yaml`. The repo is
# bind-mounted at /workspace at container start (not copied here), so edits
# are picked up without a rebuild; `pnpm install` runs at container start
# rather than build time, since the mounted /workspace is empty until then.
FROM node:24-alpine AS dev
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11 --activate
CMD ["sh", "-c", "pnpm install --frozen-lockfile --store-dir /pnpm-store && pnpm --filter frontend exec vite --host 0.0.0.0"]

FROM caddy:2-alpine AS runtime
COPY frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /workspace/frontend/dist /srv
EXPOSE 8080

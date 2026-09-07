# Infra

- `local/` — docker-compose for local development (Postgres only, per ADR-0007 — no Redis, no dedicated search engine).
- `preprod/`, `prod/` — per-environment Docker Compose stacks (Postgres + backend + frontend + landing). Each joins the VPS's external `edge` network and gets routed via Docker labels, no Caddyfile to keep in sync (see `docs/adr/0010-*.md`).
- `signoz/` — self-hosted SigNoz observability stack (ClickHouse, OTel Collector, Query Service, Alertmanager, Frontend).
- `plausible/` — self-hosted Plausible analytics sharing the existing Postgres and ClickHouse datastores (ADR-0007, ADR-0012).
- `postgres/` — database hardening scripts (`harden-roles.sql`).
- `scripts/` — operational verification scripts (`verify-hardening.sh`).
- `mercure/` — Mercure hub deployment configuration lands here when needed. Application-level Mercure integration code (JWT publishing, hub subscriptions) belongs in `/backend`, not here.

The shared reverse proxy (`caddy-docker-proxy`) and Watchtower (image-polling auto-deploy) live on the VPS itself, in `~/infra/` on the server -- not part of this repo. Compose-structure changes to `preprod/`/`prod/` (new service, changed labels/ports) are applied with `make deploy-preprod` / `make deploy-prod` (see root `Makefile`); ordinary code changes just produce a new image on GHCR and are picked up by Watchtower on its own.

## VPS Hardening & Security Recommendations (Runbook)

### 1. Watchtower Isolation via Docker Socket Proxy
Rather than mounting the raw host Docker socket (`/var/run/docker.sock`), run Watchtower behind `tecnativa/docker-socket-proxy`:
- Grant only minimal API permissions: `CONTAINERS=1`, `IMAGES=1`, `POST=1`, `NETWORKS=1`, with everything else set to `0`.
- Enable label-based updates: `WATCHTOWER_LABEL_ENABLE=true` and `WATCHTOWER_CLEANUP=true`.

### 2. Caddy-Docker-Proxy Socket Isolation
Configure `caddy-docker-proxy` to read events through a read-only socket proxy:
- Permissions: `CONTAINERS=1`, `EVENTS=1`, `POST=0`.

### 3. Rate Limiting on OTLP Endpoint (`otlp.nanko.dev`)
The public OTLP telemetry ingestion endpoint is constrained by request body limits (2MB), path filtering, and memory limiter. For enhanced DDoS mitigation, compile Caddy with `mholt/caddy-ratelimit` (`xcaddy build --with github.com/mholt/caddy-ratelimit`) to enforce rate limits per client IP at the edge.

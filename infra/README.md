# Infra

- `local/` — docker-compose for local development (Postgres only, per ADR-0007 — no Redis, no dedicated search engine).
- `preprod/`, `prod/` — per-environment Docker Compose stacks (Postgres + backend + frontend + landing). Each joins the VPS's external `edge` network and gets routed via Docker labels, no Caddyfile to keep in sync (see `docs/adr/0010-*.md`).
- `mercure/` — Mercure hub deployment configuration lands here when needed. Application-level Mercure integration code (JWT publishing, hub subscriptions) belongs in `/backend`, not here.

The shared reverse proxy (`caddy-docker-proxy`) and Watchtower (image-polling auto-deploy) live on the VPS itself, in `~/infra/` on the server -- not part of this repo. Compose-structure changes to `preprod/`/`prod/` (new service, changed labels/ports) are applied with `make deploy-preprod` / `make deploy-prod` (see root `Makefile`); ordinary code changes just produce a new image on GHCR and are picked up by Watchtower on its own.

# Infra

- `local/` — docker-compose for local development (Postgres only, per ADR-0007 — no Redis, no dedicated search engine).
- `preprod/`, `prod/`, `deploy/` — not built yet.
- `mercure/` — Mercure hub deployment configuration lands here when needed. Application-level Mercure integration code (JWT publishing, hub subscriptions) belongs in `/backend`, not here.

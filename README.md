# Nanko

Nanko helps design architecture diagrams as "diagrams-as-code": a versioned text format (`.nanko`) is the exchange/versioning artifact; Postgres is the runtime source of truth.

See `CONTEXT.md` for the domain glossary and `docs/adr/` for the architecture decisions this repo follows.

## Packages

- `backend/` — Symfony API (api.nanko.dev, private)
- `frontend/` — React app (app.nanko.dev, account-gated)
- `infra/` — local/preprod/prod/deploy configuration
- `landing/` — public landing page (www.nanko.dev)
- `library/` — component catalog (library.nanko.dev, private)
- `tests-e2e/` — Playwright suite against preprod

## Local development

```
make dev
```

Runs postgres + backend + frontend in the background, fully dockerized --
only Docker is required on the host, no PHP/Composer/Node/pnpm. Uses
non-default host ports (frontend on http://localhost:45173, backend on
http://localhost:48000, postgres on 45432) to avoid clashing with other
projects on the same machine. `make logs` follows the logs, `make stop`
stops everything.

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
docker compose -f infra/local/docker-compose.yml up -d
cd backend && composer install
php bin/console doctrine:migrations:migrate
pnpm install
pnpm --filter frontend dev
```

# Nanko

Outil de modélisation d'architecture C4 (Context/Container/Component). Voir [PLAN.md](./PLAN.md) pour le contexte produit et technique complet.

## Stack

Next.js (App Router) + TypeScript strict, Tailwind, Drizzle ORM + Postgres, Vitest, pino, OpenTelemetry.

## Setup

```bash
make init   # .env.local, services Docker (postgres, jaeger), pnpm install, migrations
make dev    # serveur de dev
```

Équivalent sans Makefile :

```bash
cp .env.example .env.local
docker compose up -d postgres jaeger   # jaeger requis : le tracing est activé par défaut, voir "Tracing" plus bas
pnpm install
pnpm db:migrate
pnpm db:seed                    # optionnel : jeu de données de démo
pnpm dev
```

`GET /api/health` vérifie la connectivité DB.

`make help` liste toutes les commandes (start/stop des services Docker, migrate, seed, studio, test, lint, etc.).

## Développement

```bash
pnpm dev          # serveur de dev (Turbopack)
pnpm typecheck
pnpm lint
pnpm format       # pnpm format:check en CI
pnpm test         # vitest, contre TEST_DATABASE_URL (vraie DB, pas de mocks)
pnpm db:studio    # explorateur de données Drizzle Studio
```

Un hook pre-commit (Husky + lint-staged) lance `eslint --fix` et `prettier --write` sur les fichiers stagés.

### Base de données

Le schéma vit dans `src/db/schema.ts`. Après une modification :

```bash
pnpm db:generate   # génère une migration SQL dans drizzle/
pnpm db:migrate    # l'applique à la DB de dev
```

Les migrations sont commitées. La CI échoue si `schema.ts` a changé sans migration générée et commitée en face.

### Tests

`pnpm test` tourne contre une vraie base Postgres (`nanko_test`, créée automatiquement par `docker compose up postgres`, jamais mockée — voir `src/db/test/`). Chaque test repart d'une base tronquée (`src/db/test/setup.ts`). Les fixtures de base (`makeProject`, `makeMilestone`, `makeElement`, `setElementVersion`) sont dans `src/db/test/fixtures.ts` : c'est la brique à réutiliser pour tester `resolveGraph()`/`diff()` au fur et à mesure qu'ils sont implémentés (PLAN.md Phase 1).

### Tracing (optionnel)

Avec `OTEL_EXPORTER_OTLP_ENDPOINT` défini dans `.env.local` (c'est le cas par défaut dans `.env.example`) et `docker compose up -d jaeger` lancé, chaque requête HTTP produit une trace visible sur [http://localhost:16686](http://localhost:16686), avec les requêtes SQL Drizzle/`pg` imbriquées dedans (via `@opentelemetry/instrumentation-pg`, auto-instrumenté dans `src/instrumentation.ts`). Pour désactiver : laisser la variable non définie, aucun conteneur requis.

En dev, chaque requête SQL Drizzle est aussi loguée en clair sur stdout (`src/db/client.ts`, niveau `debug`).

### Logs

`src/lib/logger.ts` (pino) : JSON structuré en production, format lisible en dev. `LOG_LEVEL` pour ajuster la verbosité.

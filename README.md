# Nanko

Outil de modélisation d'architecture C4 (Context/Container/Component). Voir [PLAN.md](./PLAN.md) pour le contexte produit (la section technique de ce document décrit encore l'ancien stack Next.js, voir note en tête de PLAN.md).

## Stack

Monorepo pnpm : backend Symfony + Mercure (`apps/api`), frontend React SPA/Vite (`apps/web`). Pivot depuis Next.js le 2026-08-09 — voir AGENTS.md.

Bootstrap uniquement pour l'instant : pas de Doctrine/Postgres, pas d'API Platform, pas de CI, pas de tests, aucune reproduction du modèle métier Nanko.

## Setup

```bash
# Hub Mercure
docker compose up -d

# Backend Symfony (depuis apps/api)
cd apps/api && symfony server:start --port=8000 --no-tls -d

# Frontend React (depuis la racine)
pnpm install
pnpm --filter ./apps/web dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

`GET http://localhost:8000/api/ping` vérifie que le backend répond ; `POST http://localhost:8000/api/publish` publie un event Mercure visible en live dans la SPA.

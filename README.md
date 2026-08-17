# Nanko

Outil de modélisation d'architecture C4 (Context/Container/Component). Voir [PRODUCT_STATUS.md](./PRODUCT_STATUS.md) pour l'état du produit, [TECHNICAL_REFERENCE.md](./TECHNICAL_REFERENCE.md) pour le contexte produit et le modèle de données (sa section stack décrit encore l'ancien Next.js, voir note en tête de ce fichier).

## Stack

Monorepo pnpm : backend Symfony + Mercure (`apps/api`), frontend React SPA/Vite (`apps/web`).

Bootstrap uniquement pour l'instant : pas de Doctrine/Postgres, pas d'API Platform, pas de CI, pas de tests, aucune reproduction du modèle métier Nanko.

## Setup

```bash
pnpm install
make dev    # hub Mercure (Docker) + backend Symfony + frontend Vite
make stop   # arrête tout
```

Équivalent sans Makefile :

```bash
docker compose up -d
cd apps/api && symfony server:start --port=8000 --no-tls -d
cd ../.. && pnpm --filter ./apps/web dev
```

Ouvrir [http://localhost:5173](http://localhost:5173).

`GET http://localhost:8000/api/ping` vérifie que le backend répond ; `POST http://localhost:8000/api/publish` publie un event Mercure visible en live dans la SPA.

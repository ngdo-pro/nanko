# spike-symfony-mercure

Spike isolé pour tester une architecture alternative à Nanko : backend Symfony + Mercure (SSE pub/sub), front SPA React (Vite), organisés en monorepo.

## But

Prouver que ça démarre bout-en-bout :

- Symfony sert une route API simple (`GET /api/ping`)
- Un hub Mercure tourne et peut publier/recevoir un event (`POST /api/publish` → SSE)
- La SPA React se build/démarre, consomme l'API et reçoit les events Mercure en temps réel

## Non-goals

Pas de Doctrine/Postgres, pas d'API Platform, pas de CORS bundle, pas d'auth au-delà du JWT Mercure, pas de CI, pas de tests, pas de conteneurisation de PHP/Node (seul le hub Mercure tourne en Docker), aucune reproduction du modèle de données ou des fonctionnalités Nanko.

Ce dossier est isolé de l'app Next.js à la racine du repo — rien ailleurs n'est touché.

## Lancer

```bash
# Hub Mercure
docker compose -f docker-compose.yml up -d

# Backend Symfony (depuis apps/api)
symfony server:start --port=8000 --no-tls -d

# Front React (depuis la racine du spike)
pnpm --filter ./apps/web dev
```

Ouvrir http://localhost:5173.

## Supprimer le spike

```bash
docker compose -f spike-symfony-mercure/docker-compose.yml down
rm -rf spike-symfony-mercure
```

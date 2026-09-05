# tests-e2e

Suite de tests End-to-End Playwright pour Nanko.

## Exécution

### 1. En local (contre le dev stack `localhost`)
En local, Playwright utilise le helper `keycloak.ts` pour provisionner automatiquement le compte utilisateur via l'API Admin de Keycloak (`admin-cli`) sans configuration requise :

```bash
APP_BASE_URL=http://localhost:45173 pnpm --filter tests-e2e exec playwright test
```

### 2. En CI (contre la Préproduction `app.preprod.nanko.dev`)
Contre la préprod, Playwright utilise un compte utilisateur de test dédié injecté via variables d'environnement (sans accès admin) :

```bash
APP_BASE_URL=https://app.preprod.nanko.dev \
E2E_USERNAME=e2e-tester@nanko.dev \
E2E_PASSWORD=secret-password \
pnpm --filter tests-e2e exec playwright test
```

# tests-e2e

Suite de tests End-to-End Playwright pour Nanko.

## Exécution

### 1. En local (contre le dev stack `localhost`)
En local, Playwright utilise le helper `keycloak.ts` pour provisionner automatiquement le compte utilisateur via l'API Admin de Keycloak (`admin-cli`) sans configuration requise :

```bash
pnpm --filter tests-e2e test
```

### 2. En CI (contre la Préproduction `app.preprod.nanko.dev`)
Contre la préprod, Playwright utilise un compte utilisateur de test dédié injecté via variables d'environnement (sans accès admin) :

```bash
APP_BASE_URL=https://app.preprod.nanko.dev \
E2E_USERNAME=e2e-tester@nanko.dev \
E2E_PASSWORD=secret-password \
pnpm --filter tests-e2e exec playwright test
```

## Convention de Sélecteurs E2E (`data-qa`)

Les tests E2E Playwright de Nanko s'appuient exclusivement sur des sélecteurs stables découplés du style :
* **Attribut standard :** `[data-qa="..."]` configuré via `testIdAttribute: "data-qa"` dans `playwright.config.ts`.
* **API de sélection :** Utiliser systématiquement `page.getByTestId('element-name')` (ou `locator.getByTestId(...)`).
* **Formatage :** Convention `kebab-case` explicite et fonctionnelle : `[contexte]-[élément]-[action/état]` (ex: `user-menu`, `login-button`, `nav-logo`).
* **Proscription stricte :** Aucun sélecteur Playwright ne doit cibler de classe CSS (ex: `.nav-logo`) ni d'identifiant HTML technique.
* **Exception documentée (IdP tiers) :** Seule la mire d'authentification externe Keycloak (`auth.nanko.dev`) utilise des sélecteurs natifs (`#username`, `#password`, `#kc-login`).

# Domaine : Plateforme & Livraison Continue (platform) - Architecture Technique

## 1. Stack & Composants Cibles

### CI/CD GitHub Actions (`.github/workflows/`)
* **Workflow PR (`.github/workflows/pr-preprod-e2e.yml`) :**
  * Déclenché sur `pull_request` (open, synchronize, reopen).
  * Filtrage sélectif via `dorny/paths-filter@v3` : si seuls les dossiers non-applicatifs (`.agents/`, `.claude/`, `.github/`, `.specs/`, `docs/`, `landing/`, etc.) sont modifiés, le déploiement et les tests E2E sont bypassés en succès immédiat.
  * Sérialisation de l'environnement de préproduction partagé via `concurrency: group: preprod-shared-env, cancel-in-progress: false`.
  * Calcul SemVer dynamique basé sur les Git tags (`git describe --tags --always`).
  * Build et push des conteneurs multi-services (`backend`, `frontend`) vers GitHub Container Registry (GHCR) sous les tags `:preprod` et `:preprod-<sha>` avec l'argument de build `APP_VERSION`.
  * Boucle active de diagnostic HTTP interrogeant `https://api.preprod.nanko.dev/api/v1/version` toutes les 15 secondes jusqu'à alignement de version (timeout 8 minutes, aligné sur le cycle de scrutation Watchtower).
  * Exécution de la suite de tests Playwright pointant sur `https://app.preprod.nanko.dev`.
  * Statut de commit bloquant pour la Pull Request en cas d'échec.
* **Workflow Déploiement Préproduction (`.github/workflows/deploy-preprod.yml`) :**
  * Déclenché sur push vers la branche `main`.
  * Génération de version format release candidate (`vX.Y.Z-rc.<run_number>`).
  * Build et push des images `:preprod` sur GHCR.
* **Workflow Déploiement Production (`.github/workflows/deploy-prod.yml`) :**
  * Déclenché lors de la création d'un tag Git de version (`v*`).
  * Déploiement des images `:latest` et versionnées sur l'infrastructure de production.

### Backend Symfony (`backend/`)
* **Contrôleur de Diagnostic :** `backend/src/Adapter/Driver/Http/Controller/System/VersionController.php`
  * Route `#[Route('/api/v1/version', name: 'api_version', methods: ['GET'])]`.
  * Autowiring des paramètres `%app.version%`, `%app.commit%` et `%kernel.environment%`.
* **Sécurité & Contrôle d'accès :**
  * Règle `access_control: - { path: ^/api/v1/version, roles: PUBLIC_ACCESS }` dans `config/packages/security.yaml`.
  * Support CORS via `config/packages/nelmio_cors.yaml` autorisant l'accès cross-origin.
* **Conteneurisation Docker :**
  * `backend/Dockerfile` déclarant `ARG APP_VERSION` et `ARG APP_COMMIT` propagés en variables d'environnement `ENV APP_VERSION` et `ENV APP_COMMIT`.

### Infrastructure & Déploiement VPS (`infra/`)
* **Watchtower :** Scrutation automatique des digests d'images GHCR (polling 5 minutes) assurant un déploiement continu sans exposition de clés SSH privées (respect de l'ADR-0010).
* **Reverse Proxy Caddy :** Gestion automatique des certificats Let's Encrypt TLS et routage dynamique des sous-domaines (`api.preprod.nanko.dev`, `app.preprod.nanko.dev`, `auth.preprod.nanko.dev`).

### Tests E2E Playwright (`tests-e2e/`)
* `tests-e2e/playwright.config.ts` configuré avec support de la variable `APP_BASE_URL` pour cibler indifféremment l'environnement local (`http://localhost:5173`) ou l'environnement de préproduction (`https://app.preprod.nanko.dev`).

---

## 2. Invariants Techniques & Sécurité
* Aucun secret d'accès serveur (SSH, sudo, API daemon Docker) n'est injecté dans GitHub Actions (architecture *pull-based* stricte).
* Les runs de préproduction sont strictement sérialisés pour garantir l'isolation des tests E2E.
* L'endpoint de diagnostic `/api/v1/version` est public, sans dépendance à la base de données, assurant un temps de réponse instantané et une disponibilité maximale en tant que health check applicatif.

---

## 3. ADRs de Référence
* `ADR-0010` : Déploiement préproduction sans secret SSH via GHCR et Watchtower.

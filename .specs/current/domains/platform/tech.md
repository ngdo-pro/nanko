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
* **Reverse Proxy Caddy :** Gestion automatique des certificats Let's Encrypt TLS et routage dynamique des sous-domaines (`api.preprod.nanko.dev`, `app.preprod.nanko.dev`, `auth.preprod.nanko.dev`, `signoz.nanko.dev`, `otlp.nanko.dev`).

### Observabilité & Monitoring Distribué (SigNoz & OpenTelemetry)
* **Stack SigNoz Auto-Hébergée (`infra/signoz/docker-compose.yaml`, `infra/shared/signoz/`) :**
  - **Moteur ClickHouse :** Stockage colonnaire dédié (`clickhouse/clickhouse-server:24.1.2-alpine`) pour traces, métriques et logs.
  - **SigNoz OTel Collector :** Image `signoz/signoz-otel-collector:0.111.23` exposant les ports OTLP `4317` (gRPC interne pour Keycloak et Symfony) et `4318` (HTTP pour le frontend web).
  - **Routage & Sécurisation Caddy :**
    - `signoz.nanko.dev` ➔ Frontend UI SigNoz (`:3301`) avec HTTPS forcé.
    - `otlp.nanko.dev` ➔ Endpoint d'ingestion public OTLP HTTP (`:4318`), avec CORS strict et limite de payload 2MB.
  - **Observability as Code :**
    - Alertes déclaratives : `infra/signoz/alerts/platform-alerts.yaml` montées dans AlertManager.
    - Dashboards déclaratifs : `infra/signoz/dashboards/platform-overview.json` injectés par le service `signoz-provisioner` au démarrage.
* **Environnement Local Dédié (`infra/local/compose.observability.yaml`) :**
  - Stack SigNoz locale optionnelle pilotée par les cibles Makefile `make signoz-up` et `make signoz-down` pour tester la télémétrie sans alourdir le démarrage de base `make dev`.
* **Serveur d'Identité Keycloak 26 :**
  - Activation de l'extension Quarkus OpenTelemetry intégrée (`KC_TRACING_ENABLED=true`, `KC_TRACING_ENDPOINT=http://otel-collector:4317`, `KC_METRICS_ENABLED=true`).
  - Métriques d'authentification exposées et spans de validation de session/token exportés en gRPC.
* **Backend Symfony 8 :**
  - SDK OpenTelemetry PHP (`open-telemetry/sdk`, `open-telemetry/exporter-otlp`, `open-telemetry/sem-conv`).
  - `App\Adapter\Driver\Http\OpenTelemetry\TraceSubscriber` : souscripteur HTTP qui extrait le header W3C `traceparent`, instrumente la requête et réinjecte `traceparent` dans la réponse.
  - Résilience fail-open absolue (l'absence de collecteur n'interrompt ni ne ralentit aucune requête).
* **Frontend React 19 :**
  - SDK OpenTelemetry Web (`@opentelemetry/sdk-trace-web`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation-fetch`).
  - `frontend/src/config/telemetry.ts` : initialisation résiliente et helper `injectTraceContext` assurant la propagation de `traceparent` sur les appels HTTP.

### Configuration Centralisée & Validée par Zod (`frontend/src/config/env.ts`, `tests-e2e/config/env.ts`)
* Dépendance `zod` ajoutée à `frontend/package.json` (dépendance) et `tests-e2e/package.json` (devDépendance).
* Chaque package expose un unique module `config/env.ts` qui parse `import.meta.env` (frontend) ou `process.env` (tests-e2e) via un schéma Zod, avec valeurs par défaut *zero-config* alignées sur Docker local.
* Validation `safeParse` fail-fast : toute variable manquante ou mal formée lève une exception explicite au chargement plutôt que de propager un `undefined`.
* Export figé (`Object.freeze`) d'un objet `env` fortement typé (`AppEnv`, `E2EEnv`), consommé exclusivement par `frontend/src/auth/httpClient.ts`, `frontend/src/auth/keycloak.ts`, `frontend/src/config/telemetry.ts`, `tests-e2e/playwright.config.ts` et `tests-e2e/tests/helpers/keycloak.ts`.
* Aucun accès direct à `import.meta.env` (hors `frontend/src/config/env.ts`) ni à `process.env` (hors `tests-e2e/config/env.ts`) ne subsiste dans le code applicatif ou les tests.

### Tests E2E Playwright (`tests-e2e/`)
* `tests-e2e/playwright.config.ts` configuré avec support de la variable `APP_BASE_URL` pour cibler indifféremment l'environnement local (`http://localhost:5173`) ou l'environnement de préproduction (`https://app.preprod.nanko.dev`), désormais exposée via `tests-e2e/config/env.ts`.
* `tests-e2e/tests/app/telemetry.spec.ts` validant la conformité du header W3C `traceparent` et la résilience fail-open.

---

## 2. Invariants Techniques & Sécurité
* Aucun secret d'accès serveur (SSH, sudo, API daemon Docker) n'est injecté dans GitHub Actions (architecture *pull-based* stricte).
* Les runs de préproduction sont strictement sérialisés pour garantir l'isolation des tests E2E.
* L'endpoint de diagnostic `/api/v1/version` est public, sans dépendance à la base de données, assurant un temps de réponse instantané et une disponibilité maximale en tant que health check applicatif.
* La télémétrie OpenTelemetry applique un principe de **fail-open absolu** : aucun composant ne doit échouer ni bloquer en cas d'indisponibilité du collecteur.

---

## 3. ADRs de Référence
* `ADR-0007` : Postgres seul pour le MVP applicatif & exception documentée pour le datastore ClickHouse de SigNoz.
* `ADR-0010` : Déploiement préproduction sans secret SSH via GHCR et Watchtower.

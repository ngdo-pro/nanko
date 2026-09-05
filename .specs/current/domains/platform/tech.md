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
* **Stack SigNoz Auto-Hébergée (`infra/signoz/compose.yaml`) :**
  - **Moteur ClickHouse 25.1 :** Image `clickhouse/clickhouse-server:25.1-alpine` avec Keeper embarqué (port 9181), macros de cluster (`cluster`, `shard=1`, `replica=1`), support des types JSON dynamiques (`enable_json_type=1` via `clickhouse-users.xml`), et création automatique des bases au démarrage (`clickhouse-init.sql`).
  - **Auto-Migration de Schéma (`signoz-schema-migrator`) :** Conteneur d'initialisation one-shot exécutant séquentiellement `/signoz-otel-collector migrate bootstrap`, `sync up` et `async up` avant le démarrage des services dépendants.
  - **SigNoz Query Service :** Image `signoz/query-service:latest` configurée avec les drapeaux `-use-trace-new-schema=true` et `-use-logs-new-schema=true` pour exploiter nativement le schéma v3 de ClickHouse.
  - **SigNoz OTel Collector :** Image `signoz/signoz-otel-collector:latest` exposant les ports OTLP `4317` (gRPC interne pour Keycloak) et `4318` (HTTP pour le backend Symfony et le frontend web).
  - **Routage & Sécurisation Caddy (Réseau `edge`) :**
    - `signoz.nanko.dev` ➔ Frontend UI SigNoz (`:3301`) sécurisé par HTTP Basic Auth (`SIGNOZ_BASICAUTH_HASH`), HTTPS forcé (HSTS) et proxy Nginx redirigeant `/signup` vers `/login`.
    - `otlp.nanko.dev` ➔ Endpoint d'ingestion public OTLP HTTP (`:4318`), avec CORS permissif (`*`) pour la télémétrie navigateur.
  - **Observability as Code & Provisioning :**
    - Alertes déclaratives : `infra/signoz/alerts/platform-alerts.yaml` montées dans AlertManager.
    - Dashboards déclaratifs : `infra/signoz/dashboards/platform-overview.json` et création idempotente du compte superadmin via le conteneur `signoz-provisioner`.
    - Cible de déploiement VPS : `make deploy-signoz` (charge `~/.config/nanko/signoz.env` et déploie `infra/signoz/compose.yaml`).
* **Environnement Local Dédié (`infra/local/compose.observability.yaml`) :**
  - Stack SigNoz locale optionnelle pilotée par les cibles Makefile `make signoz-up` et `make signoz-down` pour tester la télémétrie sans alourdir le démarrage de base `make dev`.
* **Serveur d'Identité Keycloak 26 :**
  - Activation de l'extension Quarkus OpenTelemetry intégrée (`KC_TRACING_ENABLED=true`, `KC_TRACING_ENDPOINT=http://signoz-otel-collector:4317`, `KC_METRICS_ENABLED=true`).
  - Métriques d'authentification exposées et spans de validation de session/token exportés en gRPC direct via le réseau Docker `edge`.
* **Backend Symfony 8 :**
  - SDK OpenTelemetry PHP (`open-telemetry/sdk`, `open-telemetry/exporter-otlp`, `open-telemetry/sem-conv`).
  - `App\Adapter\Driver\Http\OpenTelemetry\TraceSubscriber` : souscripteur HTTP extrayant et injectant `traceparent`, normalisant l'endpoint OTLP (suppression du `/v1/traces` superflu), et forçant le flush des batch spans lors de `kernel.terminate` via `$this->tracerProvider?->shutdown()`.
  - Résilience fail-open absolue (l'absence de collecteur n'interrompt ni ne ralentit aucune requête).
* **Frontend React 19 :**
  - SDK OpenTelemetry Web (`@opentelemetry/sdk-trace-web`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation-fetch`).
  - `frontend/src/config/telemetry.ts` : initialisation résiliente et helper `injectTraceContext` propageant le contexte W3C `traceparent` sur les appels HTTP.
  - Arguments de build `VITE_OTEL_EXPORTER_URL` et `VITE_APP_ENV` intégrés dans `frontend/Dockerfile` et les workflows GitHub Actions `deploy-prod.yml` et `deploy-preprod.yml`.

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

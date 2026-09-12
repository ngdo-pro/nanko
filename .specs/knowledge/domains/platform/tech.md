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
  * **Sécurisation & En-têtes HTTP Caddy (Durcissement Spec 013) :**
    - **En-têtes de Sécurité Systématiques :** `Strict-Transport-Security: "max-age=31536000; includeSubDomains"` (sans preload), `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: "camera=(), microphone=(), geolocation=(), payment=(), usb=()"`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
    - **Content Security Policy :** Déploiement de `Content-Security-Policy-Report-Only` sur frontend et landing (`default-src 'self'`, scripts Google Fonts et Plausible autorisés, absence de scripts inline).
    - **Verrouillage Admin Keycloak :** Blocage HTTP `403 Forbidden` par Caddy sur `/admin*` et `/realms/master*` restreint aux adresses IP de `KC_ADMIN_ALLOWED_IPS`.
    - **Sas HTTP Basic Auth :** Appliqué sur `signoz.nanko.dev` (`SIGNOZ_BASICAUTH_HASH`) et sur tous les sous-domaines applicatifs de préproduction (`PREPROD_HTTP_HASH`).
    - **Protection Anti-Indexation (RFC 9309) :** `/robots.txt` intercepté par Caddy et en-tête `X-Robots-Tag: "noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex"` appliqué en préproduction et sur SigNoz.

### Observabilité & Monitoring Distribué (SigNoz & OpenTelemetry)
* **Stack SigNoz Auto-Hébergée (`infra/signoz/compose.yaml`) :**
  - **Moteur ClickHouse 25.12 :** Image `clickhouse/clickhouse-server:25.12-alpine` avec Keeper embarqué (port 9181), macros de cluster, support JSON dynamique. Cloisonnement strict des utilisateurs via `clickhouse-users.xml` : `default` restreint à localhost, `signoz` et `plausible` isolés avec mots de passe forts. Retiré du réseau public `edge`.
  - **Auto-Migration de Schéma (`signoz-schema-migrator`) :** Image épinglée `signoz/signoz-otel-collector:v0.144.9` exécutant séquentiellement `migrate bootstrap`, `sync up` et `async up`.
  - **SigNoz Query Service :** Image stable `signoz/query-service:0.76.2` (zéro tag `:latest`).
  - **SigNoz OTel Collector :** Image stable `signoz/signoz-otel-collector:v0.144.9` exposant `4317` (gRPC) et `4318` (HTTP) :
    - CORS strictement restreint aux origines Nanko (`app.nanko.dev`, `www.nanko.dev`, `app.preprod.nanko.dev`, `www.preprod.nanko.dev`, `http://localhost:*`).
    - Limitation de charge utile `max_request_body_size: 2097152` (2 Mo) et processeur `memory_limiter`.
    - Retrait des endpoints de debug non essentiels (`zpages`).
  - **Routage Caddy (Réseau `edge`) :**
    - `signoz.nanko.dev` ➔ Frontend UI SigNoz (`:3301`) protégé par HTTP Basic Auth Caddy (`SIGNOZ_BASICAUTH_HASH`).
    - `otlp.nanko.dev` ➔ Endpoint OTLP HTTP (`:4318`) avec blocage Caddy en `404 Not Found` de tout chemin hors allowlist (`/v1/traces*`, `/v1/logs*`, `/v1/metrics*`).
* **Environnement Local Dédié (`infra/local/compose.observability.yaml`) :**
  - Stack SigNoz locale optionnelle pilotée par les cibles Makefile `make signoz-up` et `make signoz-down` pour tester la télémétrie sans alourdir le démarrage de base `make dev`.
* **Serveur d'Identité Keycloak 26 :**
  - Activation de l'extension Quarkus OpenTelemetry intégrée (`KC_TRACING_ENABLED=true`, `KC_TRACING_ENDPOINT=http://signoz-otel-collector:4317`, `KC_METRICS_ENABLED=true`).
  - Métriques d'authentification exposées et spans de validation de session/token exportés en gRPC direct via le réseau Docker `edge`.
* **Backend Symfony 8 :**
  - SDK OpenTelemetry PHP (`open-telemetry/sdk`, `open-telemetry/exporter-otlp`, `open-telemetry/sem-conv`).
  - `App\Adapter\Driver\Http\OpenTelemetry\TraceSubscriber` : souscripteur HTTP extrayant et injectant `traceparent`, normalisant l'endpoint OTLP (suppression du `/v1/traces` superflu), et forçant le flush des batch spans ainsi que des logs Monolog lors de `kernel.terminate` via `$this->tracerProvider?->shutdown()` et `$this->logHandler?->flush()`.
  - `App\Adapter\Driver\Http\OpenTelemetry\OtelLogHandler` : handler Monolog personnalisé convertissant les `LogRecord` Monolog en structure OTLP v1, extrayant automatiquement `trace_id` et `span_id` depuis le `TracerProvider` actif, bufferisant les logs en mémoire et les expédiant par batch HTTP POST vers l'endpoint `/v1/logs` du collecteur.
  - Configuration `backend/config/packages/monolog.php` chaînant le flux Docker local `stream` (`php://stderr`) et le handler `otel` conditionné par la présence de l'endpoint OTel et le seuil `%otel.logs_level%`.
  - Résilience fail-open absolue (l'absence de collecteur n'interrompt ni ne ralentit aucune requête, et n'engendre aucune exception non gérée).
* **Frontend React 19 (Architecture Bulletproof React) :**
  - Standard modulaire piloté par les fonctionnalités (*feature-based*) selon [Bulletproof React](https://github.com/alan2207/bulletproof-react) :
    - `src/app/` : racine applicative, composition hiérarchique des providers (`AppProvider` regroupant `AppErrorBoundary`, `QueryClientProvider`, `KeycloakProvider`), arbre de routage déclaratif (`AppRouter` avec `react-router` v7) et vues racines (`home.tsx`, `not-found.tsx`).
    - `src/features/` : modules métier autonomes et étanches (ex. `features/auth/`), avec encapsulation stricte via barrel export (`index.ts`). Tout accès extérieur aux fichiers internes d'une feature est proscrit.
    - `src/components/` : composants génériques partagés divisés en `ui/` (éléments atomiques : `Button`, `Spinner`, `AppErrorBoundary`) et `layout/` (`AppLayout`, `Navbar`, `Footer`).
    - `src/lib/` : singletons et abstractions de bibliothèques tierces (`api-client.ts`, `keycloak.ts`, `react-query.ts`).
    - `src/types/` : types transversaux partagés (`api.ts` pour `ApiError`, `ApiValidationError`, etc.).
    - `src/utils/` : helpers purs (`cn.ts` pour composition de classes CSS).
    - `src/testing/` : harnais de test unitaire et d'intégration (`test-utils.tsx` exportant `renderWithProviders`).
  - **Résolution des Alias de Chemins (`@/*`) :** configuration unifiée dans `tsconfig.app.json` et `vite.config.ts` pointant sur `./src/*`.
  - **Client API Universel (`src/lib/api-client.ts`) :** client HTTP encapsulant `fetch`, l'injection automatique du Bearer token JWT Keycloak avec refresh préventif et gestion des erreurs 401 (invalidation/clear du cache `QueryClient`), propagation du contexte de trace W3C `traceparent`, et typage unifié des erreurs sous forme d'`ApiError`.
  - **Cache Serveur & Requêtes TanStack Query :** instance `QueryClient` centralisée (`src/lib/react-query.ts`) avec options par défaut optimisées (retry backoff, staleTime 5min, gcTime 15min).
  - **Télémétrie OpenTelemetry Web & Tracing :** SDK Web (`@opentelemetry/sdk-trace-web`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/instrumentation-fetch`), initialisation dans `src/config/telemetry.ts` et propagation W3C `traceparent` assurée via `apiClient`.
  - **Logger Unifié & Capture d'Erreurs (`src/config/logger.ts`, `src/components/AppErrorBoundary.tsx`) :**
    - Module `src/config/logger.ts` fournissant une API unifiée (`debug`, `info`, `warn`, `error`), bufferisant et expédiant les logs OTLP HTTP (`POST /v1/logs`) avec extraction du `trace_id` actif depuis `@opentelemetry/api`.
    - Déduplication anti-flood sur fenêtre glissante et verrou interne anti-récursion (tout échec d'envoi réseau du logger est étouffé silencieusement sans réinvoquer le logger).
    - Écouteurs globaux `window.addEventListener('error')` et `window.addEventListener('unhandledrejection')` dans `src/main.tsx` capturant les anomalies runtime et promesses rejetées.
    - Composant `AppErrorBoundary` interceptant tout plantage dans l'arbre de rendu React, affichant un écran d'incident élégant avec identifiant de trace, et journalisant l'erreur avec pile d'exécution via `logger.error`.
  - Arguments de build `VITE_OTEL_EXPORTER_URL`, `VITE_OTEL_LOGS_EXPORTER_URL`, `VITE_LOG_LEVEL` et `VITE_APP_ENV` intégrés dans `frontend/Dockerfile` et les workflows GitHub Actions.
  - **Module d'Analytics Produit & Mesure d'Audience (`src/lib/analytics.ts`) :**
    - Singleton d'analytics fail-open initialisé au démarrage de l'application dans `src/main.tsx` (`initAnalytics`).
    - Émission de pages vues SPA et d'événements typés (`trackEvent`, `trackPageview`) via `window.plausible`.
    - Filtre anti-PII strict (`sanitizeAnalyticsProps`) éliminant de manière préventive toute donnée nominative ou sensible (`forbiddenPiiKeys`) et n'autorisant que des primitives scalaires non identifiantes.
    - Arguments de build `VITE_PLAUSIBLE_DOMAIN` et `VITE_PLAUSIBLE_API_HOST` déclarés dans `frontend/Dockerfile` et obligatoirement transmis dans tous les workflows de déploiement CI/CD.

### Stack Plausible Analytics Auto-Hébergée (`infra/plausible/compose.yaml`)
* **Conteneur applicatif unique stateless :** Image officielle `ghcr.io/plausible/community-edition:v2.1.4` exposant le port interne `:8000` sur le réseau Docker `edge`.
* **Mutualisation totale des datastores (ADR-0007) :**
  - **PostgreSQL 16 :** Utilisation de l'instance existante `nanko-prod-postgres` avec la base dédiée `plausible` (`PLAUSIBLE_DATABASE_URL`), sans conteneur SGBD additionnel.
  - **ClickHouse :** Utilisation de l'instance existante de la stack SigNoz `signoz-clickhouse` avec la base dédiée `plausible_events_db` (`PLAUSIBLE_CLICKHOUSE_URL`), évitant toute duplication d'empreinte mémoire sur le VPS.
* **Routage Caddy & TLS Automatique :** Caddy gère le reverse-proxy pour `plausible.nanko.dev`, les certificats TLS Let's Encrypt et les en-têtes de sécurité HSTS.
* **Sécurité & Administration :** Clé secrète `SECRET_KEY_BASE` (64 octets minimum en base64), inscription publique désactivée (`DISABLE_REGISTRATION=invite_only`), et déploiement VPS via `make deploy-plausible` alimenté par `~/.config/nanko/plausible.env`.

### Landing Page (`landing/index.html`)
* **Intégration Plausible sans cookie :** Balise `<script defer data-domain="nanko.dev" data-api="https://plausible.nanko.dev/api/event" src="https://plausible.nanko.dev/js/script.tagged-events.js"></script>`.
* **Balisage déclaratif des actions clés :** Classes HTML Plausible (`plausible-event-name=landing_cta_app_click`, `plausible-event-name=landing_theme_toggle`, `plausible-event-name=landing_docs_click`).
* **Information réglementaire :** Mentions légales de transparence en pied de page détaillant la mesure d'audience anonyme exemptée de consentement préalable (CNIL / RGPD).

### Configuration Centralisée & Validée par Zod (`frontend/src/config/env.ts`, `tests-e2e/config/env.ts`)
* Dépendance `zod` ajoutée à `frontend/package.json` (dépendance) et `tests-e2e/package.json` (devDépendance).
* Chaque package expose un unique module `config/env.ts` qui parse `import.meta.env` (frontend) ou `process.env` (tests-e2e) via un schéma Zod, avec valeurs par défaut *zero-config* alignées sur Docker local.
* Validation `safeParse` fail-fast : toute variable manquante ou mal formée lève une exception explicite au chargement plutôt que de propager un `undefined`.
* Export figé (`Object.freeze`) d'un objet `env` fortement typé (`AppEnv`, `E2EEnv`), consommé exclusivement par `frontend/src/lib/api-client.ts`, `frontend/src/lib/keycloak.ts`, `frontend/src/config/telemetry.ts`, `frontend/src/config/logger.ts`, `frontend/src/lib/analytics.ts`, `tests-e2e/playwright.config.ts` et `tests-e2e/tests/helpers/keycloak.ts`.
* Aucun accès direct à `import.meta.env` (hors `frontend/src/config/env.ts`) ni à `process.env` (hors `tests-e2e/config/env.ts`) ne subsiste dans le code applicatif ou les tests.

### Tests E2E Playwright (`tests-e2e/`)
* `tests-e2e/playwright.config.ts` configuré avec support de la variable `APP_BASE_URL` pour cibler indifféremment l'environnement local (`http://localhost:5173`) ou l'environnement de préproduction (`https://app.preprod.nanko.dev`), désormais exposée via `tests-e2e/config/env.ts`.
* Déclaration explicite de `testIdAttribute: "data-qa"` dans l'objet `use` de `playwright.config.ts`, configurant nativement `page.getByTestId(...)` pour cibler les balises DOM `[data-qa="..."]`.
* Standardisation exclusive des sélecteurs de composants Nanko sur `data-qa` au format `kebab-case` (`[contexte]-[élément]-[action/état]`), découplant totalement les tests des styles visuels ou classes CSS.
* Configuration de React Testing Library dans `frontend/src/test/setup.ts` via `configure({ testIdAttribute: 'data-qa' })`, unifiant les sélecteurs de tests unitaires et E2E tout en éliminant 100% des attributs `data-testid` résiduels dans le code applicatif.
* Exception isolée et documentée pour les formulaires de l'IdP tiers Keycloak (`#username`, `#password`, `#kc-login`).
* Injection conditionnelle de `httpCredentials: { username, password }` dans `playwright.config.ts` lorsque `env.preprodHttpUser` et `env.preprodHttpPassword` sont définis, autorisant l'exécution transparente de la suite de tests E2E contre une préproduction protégée.
* Workflow CI `pr-preprod-e2e.yml` transmettant les secrets `PREPROD_HTTP_USER` et `PREPROD_HTTP_PASSWORD` lors de l'exécution du job Playwright.
* `tests-e2e/tests/app/telemetry.spec.ts` validant la conformité du header W3C `traceparent` et la résilience fail-open via `page.getByTestId('nav-logo')`.
* `tests-e2e/tests/app/portal.spec.ts` validant le rendu du portail Nanko et ses interactions sans sélecteur CSS.
* `tests-e2e/tests/app/robots.spec.ts` validant la présence de l'en-tête HTTP `X-Robots-Tag` (`noindex, nofollow`) sur l'application et la réponse standardisée `200 OK` sur `/robots.txt` (`User-agent: *`, `Disallow: /`).
* `tests-e2e/tests/app/logging.spec.ts` validant la capture des exceptions par l'ErrorBoundary, l'affichage de l'identifiant d'incident et la résilience fail-open en cas d'indisponibilité du endpoint OTLP via `getByTestId('error-boundary-fallback')` et `getByTestId('incident-id')`.
* `tests-e2e/tests/app/analytics.spec.ts` validant la résilience fail-open de l'application en l'absence de Plausible et confirmant l'absence stricte de cookies déposés par la mesure d'audience.

---

## 2. Invariants Techniques & Sécurité
* Aucun secret d'accès serveur (SSH, sudo, API daemon Docker) n'est injecté dans GitHub Actions (architecture *pull-based* stricte).
* Les runs de préproduction sont strictement sérialisés pour garantir l'isolation des tests E2E.
* L'endpoint de diagnostic `/api/v1/version` est public, sans dépendance à la base de données, assurant un temps de réponse instantané et une disponibilité maximale en tant que health check applicatif.
* La télémétrie OpenTelemetry applique un principe de **fail-open absolu** : aucun composant ne doit échouer ni bloquer en cas d'indisponibilité du collecteur.
* Le transport des logs OpenTelemetry intègre une protection stricte contre les **boucles de récursion infinies** : un échec d'exporteur ne doit en aucun cas déclencher une nouvelle émission de log.
* Le sas HTTP Basic Auth est strictement restreint à la préproduction : il ne s'applique ni au local ni à la production, et n'altère en rien les flux d'authentification applicatifs Keycloak OIDC.
* La protection anti-indexation (`X-Robots-Tag` durci et consigne `Disallow: /` sur `/robots.txt`) est strictement cantonnée à la préproduction et aux outils internes (SigNoz), pour garantir l'étanchéité SEO totale sans impacter la découvrabilité du domaine de production.
* **Invariant `data-qa` exclusif :** Aucun test E2E Playwright ciblant du code Nanko ne doit utiliser de sélecteur basé sur une classe CSS (`.classe`) ou un ID HTML (`#id`). L'API `page.getByTestId(...)` résout obligatoirement `[data-qa="..."]`. Seule la mire externe Keycloak fait exception.
* **Invariant Analytics sans cookie & Anti-PII :** La mesure d'audience Plausible fonctionne sans aucun cookie ni fingerprint persistant (hachage éphémère d'IP rotatif 24h) et sans bannière de consentement. Aucun événement ne doit comporter de données personnelles identifiantes (`sanitizeAnalyticsProps`).
* **Invariant Propagation Build-Args CI/CD :** Toute variable d'environnement `VITE_*` déclarée dans `frontend/src/config/env.ts` et `frontend/Dockerfile` doit obligatoirement être transmise en `build-args` dans tous les workflows de déploiement GitHub Actions (`deploy-prod.yml`, `deploy-preprod.yml`, `pr-preprod-e2e.yml`).
* **Invariant Moindre Privilège Datastores (ADR-0012) :** Aucun service applicatif ne se connecte avec le superutilisateur PostgreSQL ou un compte ClickHouse sans mot de passe. Chaque service utilise un rôle dédié (`nanko_app`, `keycloak`, `plausible`, `backup`). Les bases sont retirées du réseau public `edge`.
* **Invariant Hardening Conteneurs :** Les conteneurs tournent avec `security_opt: ["no-new-privileges:true"]`, `cap_drop: [ALL]` (avec ajouts minimaux stricts si nécessaire), des limites mémoires et PIDs, et des logs rotatifs `json-file`. Le backend Symfony s'exécute en utilisateur non-root `www-data` sur le port `:8080`.
* **Invariant Épinglage Immuable CI :** Toute action GitHub dans `.github/workflows/` est épinglée sur un commit SHA complet (40 hex) avec commentaire de version.

---

## 3. ADRs de Référence
* `ADR-0007` : Postgres seul pour le MVP applicatif & mutualisation des datastores pour l'observabilité (SigNoz ClickHouse) et l'analytics (Plausible réutilisant les conteneurs PostgreSQL et ClickHouse existants sans nouveau conteneur SGBD).
* `ADR-0010` : Déploiement préproduction sans secret SSH via GHCR et Watchtower.
* `ADR-0012` : Moindre privilège et cloisonnement des datastores partagés (PostgreSQL & ClickHouse).


# Domaine : Plateforme & Livraison Continue (platform) - Contrats d'API & Schémas

## 1. Endpoints REST Actifs

### `GET /api/v1/version`
* **Authentification :** `PUBLIC_ACCESS` (accessible sans jeton Bearer)
* **Headers de requête :** `Accept: application/json`
* **Description :** Expose la version applicative SemVer, l'identifiant du commit Git et l'environnement actif. Utilisé notamment par la boucle de validation de déploiement en CI.

#### Réponses
* `200 OK` :
  ```json
  {
    "status": "ok",
    "version": "v0.1.0-pr.14.2",
    "commit": "a1b2c3d4e5f67890",
    "environment": "preprod"
  }
  ```

---

## 2. Configuration d'Exécution & Variables d'Environnement

### Variables du Conteneur Backend
| Variable | Obligatoire | Fallback par défaut | Rôle |
|---|---|---|---|
| `APP_VERSION` | Non | `v0.0.0-dev` | Version SemVer injectée lors du build Docker ou au runtime |
| `APP_COMMIT` | Non | `dev` | SHA du commit Git injecté lors du build Docker |
| `APP_ENV` | Oui | `prod` | Nom de l'environnement Symfony (`local`, `test`, `preprod`, `prod`) |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Non | `""` | Endpoint OTLP/HTTP pour export des traces (ex: `http://otel-collector:4318/v1/traces`) |
| `OTEL_SERVICE_NAME` | Non | `nanko-backend` | Nom du service dans SigNoz APM |
| `OTEL_RESOURCE_ATTRIBUTES` | Non | `""` | Attributs OpenTelemetry standard (ex: `service.name=nanko-backend,deployment.environment=preprod`) |

### Paramètres Symfony (`config/services.php`)
* `%app.version%` : mappé sur `%env(default:default_app_version:APP_VERSION)%`
* `%app.commit%` : mappé sur `%env(default:default_app_commit:APP_COMMIT)%`
* `%otel.exporter_endpoint%` : mappé sur `%env(default::OTEL_EXPORTER_OTLP_ENDPOINT)%`
* `%otel.service_name%` : mappé sur `%env(default:default_otel_service_name:OTEL_SERVICE_NAME)%`

### Variables du Conteneur Keycloak 26
| Variable | Obligatoire | Valeur type | Rôle |
|---|---|---|---|
| `KC_TRACING_ENABLED` | Non | `"true"` | Active l'instrumentation native Quarkus OpenTelemetry |
| `KC_TRACING_ENDPOINT` | Non | `http://signoz-otel-collector:4317` | Collecteur OTLP gRPC (`http://otel-collector:4317` en local) |
| `KC_TRACING_RESOURCE_ATTRIBUTES` | Non | `service.name=nanko-keycloak,deployment.environment=...` | Attributs OpenTelemetry du service d'identité |
| `KC_METRICS_ENABLED` | Non | `"true"` | Active les métriques d'authentification Micrometer/Prometheus |

### Variables de la Stack Préproduction (`~/.config/nanko/preprod.env`)
| Variable | Obligatoire | Fallback par défaut | Rôle |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Oui | — | Mot de passe base PostgreSQL préproduction |
| `APP_SECRET` | Oui | — | Secret Symfony pour tokens et sessions |
| `PREPROD_HTTP_USER` | Non | `nanko` | Nom d'utilisateur pour le sas Caddy HTTP Basic Auth |
| `PREPROD_HTTP_HASH` | Oui | — | Hash Bcrypt du mot de passe Basic Auth généré par `caddy hash-password` |

### Variables de la Stack d'Observabilité SigNoz (`~/.config/nanko/signoz.env`)
| Variable | Obligatoire | Rôle |
|---|---|---|
| `SIGNOZ_BASICAUTH_HASH` | Oui (VPS) | Hash bcrypt Caddy pour sécuriser l'accès à `https://signoz.nanko.dev` |
| `SIGNOZ_ADMIN_EMAIL` | Oui (VPS) | Adresse email du compte superadmin initial créé au démarrage |
| `SIGNOZ_ADMIN_PASSWORD` | Oui (VPS) | Mot de passe initial du compte superadmin créé par le provisioner |
| `SIGNOZ_ADMIN_NAME` | Non | Nom d'affichage du superadmin (`Nanko Admin` par défaut) |

---

## 3. Schémas de Validation Zod — Configuration Frontend & E2E

### Frontend (`frontend/src/config/env.ts`)
| Variable | Obligatoire | Fallback par défaut | Validation |
|---|---|---|---|
| `VITE_API_BASE_URL` | Non | `http://localhost:48000` | URL valide |
| `VITE_KEYCLOAK_URL` | Non | `http://localhost:48080` | URL valide |
| `VITE_KEYCLOAK_REALM` | Non | `nanko` | Chaîne non vide |
| `VITE_KEYCLOAK_CLIENT_ID` | Non | `nanko-web` | Chaîne non vide |
| `VITE_OTEL_EXPORTER_URL` | Non | `""` | URL valide ou chaîne vide (mode no-op) |
| `VITE_OTEL_SERVICE_NAME` | Non | `nanko-frontend` | Chaîne non vide |
| `VITE_APP_ENV` | Non | `local` | Chaîne non vide |

* Parsing via `frontendEnvSchema.safeParse()` sur un objet extrait explicitement de `import.meta.env` (compatibilité substitution statique Vite/Rollup).
* Échec de validation : `throw` immédiat + rendu d'un écran de secours HTML injecté dans `#root` listant les erreurs de schéma.
* Export figé (`Object.freeze`) : `env.api.baseUrl`, `env.keycloak.{url,realm,clientId}`, `env.otel.{exporterUrl,serviceName,environment}`.
* Consommé par `frontend/src/auth/httpClient.ts`, `frontend/src/auth/keycloak.ts`, et `frontend/src/config/telemetry.ts`.

### Tests E2E (`tests-e2e/config/env.ts`)
| Variable | Obligatoire | Fallback par défaut | Validation |
|---|---|---|---|
| `APP_BASE_URL` | Non | `http://localhost:45173` | URL valide |
| `API_BASE_URL` | Non | `http://localhost:48000` | URL valide |
| `LIBRARY_BASE_URL` | Non | `http://localhost:45174` | URL valide |
| `KEYCLOAK_URL` | Non | `http://localhost:48080` | URL valide |
| `KEYCLOAK_ADMIN_USER` | Non | `admin` | Chaîne non vide |
| `KEYCLOAK_ADMIN_PASSWORD` | Non | `admin` | Chaîne non vide |
| `E2E_USERNAME` | Non | — | Optionnel |
| `E2E_PASSWORD` | Non | — | Optionnel |
| `PREPROD_HTTP_USER` | Non | — | Optionnel (nom d'utilisateur Basic Auth préprod) |
| `PREPROD_HTTP_PASSWORD` | Non | — | Optionnel (mot de passe clair Basic Auth préprod) |
| `CI` | Non | `false` | Transformée en booléen (`"true"` ou `"1"` → `true`) |

* Parsing via `e2eEnvSchema.safeParse(process.env)`.
* Échec de validation : `throw` immédiat avec détail des erreurs Zod en console.
* Export figé : `env.{appBaseUrl,apiBaseUrl,libraryBaseUrl}`, `env.keycloak.{url,adminUser,adminPassword}`, `env.testUser.{username,password}`, `env.{preprodHttpUser,preprodHttpPassword}`, `env.isCi`.
* Consommé par `tests-e2e/playwright.config.ts`, `tests-e2e/tests/app/telemetry.spec.ts` et `tests-e2e/tests/helpers/keycloak.ts`.

---

## 4. Protocole de Traçabilité Distribuée (W3C Trace Context) & CORS
* **En-tête `traceparent` :** Format standard W3C `00-{trace_id}-{span_id}-{flags}` (ex: `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`).
* **En-tête `tracestate` :** Métadonnées additionnelles du contexte de traçabilité.
* **CORS Nelmio (`backend/config/packages/nelmio_cors.yaml`) :**
  - `allow_headers` inclut `'traceparent'` et `'tracestate'`.
  - `expose_headers` inclut `'traceparent'` et `'tracestate'`.

---

## 5. Protocole HTTP Basic Auth (RFC 7617) — Préproduction
* **Sous-domaines cibles :** `app.preprod.nanko.dev`
* **En-tête de challenge (requête anonyme) :** `WWW-Authenticate: Basic realm="Nanko Preproduction"`
* **En-tête de requête attendu :** `Authorization: Basic <base64(user:password)>`
* **Codes retour :**
  - Sans en-tête / échec : `401 Unauthorized`
  - Avec identifiants valides : code de statut du service sous-jacent (`200 OK`, etc.)
* **En-tête anti-indexation systématique :** `X-Robots-Tag: "noindex, nofollow"`

---

## 6. Comptes & Identifiants Réservés
* **Compte E2E Préproduction :** `e2e-tester@nanko.dev`
  * Pré-provisionné dans l'instance Keycloak de préproduction.
  * Identifiants injectés via les secrets de repository GitHub `E2E_USERNAME` et `E2E_PASSWORD`.
* **Identifiants Sas Préproduction (CI/CD) :**
  * `PREPROD_HTTP_USER` et `PREPROD_HTTP_PASSWORD` injectés en secrets GitHub Actions pour autoriser le runner Playwright à traverser le sas Caddy.

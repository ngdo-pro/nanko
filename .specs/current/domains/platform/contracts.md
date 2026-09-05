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

### Paramètres Symfony (`config/services.php`)
* `%app.version%` : mappé sur `%env(default:default_app_version:APP_VERSION)%`
* `%app.commit%` : mappé sur `%env(default:default_app_commit:APP_COMMIT)%`

---

## 3. Schémas de Validation Zod — Configuration Frontend & E2E

### Frontend (`frontend/src/config/env.ts`)
| Variable | Obligatoire | Fallback par défaut | Validation |
|---|---|---|---|
| `VITE_API_BASE_URL` | Non | `http://localhost:48000` | URL valide |
| `VITE_KEYCLOAK_URL` | Non | `http://localhost:48080` | URL valide |
| `VITE_KEYCLOAK_REALM` | Non | `nanko` | Chaîne non vide |
| `VITE_KEYCLOAK_CLIENT_ID` | Non | `nanko-web` | Chaîne non vide |

* Parsing via `frontendEnvSchema.safeParse()` sur un objet extrait explicitement de `import.meta.env` (compatibilité substitution statique Vite/Rollup).
* Échec de validation : `throw` immédiat + rendu d'un écran de secours HTML injecté dans `#root` listant les erreurs de schéma.
* Export figé (`Object.freeze`) : `env.api.baseUrl`, `env.keycloak.{url,realm,clientId}`.
* Consommé par `frontend/src/auth/httpClient.ts` et `frontend/src/auth/keycloak.ts` (plus aucun accès direct à `import.meta.env` en dehors de ce module).

### Tests E2E (`tests-e2e/config/env.ts`)
| Variable | Obligatoire | Fallback par défaut | Validation |
|---|---|---|---|
| `APP_BASE_URL` | Non | `http://localhost:45173` | URL valide |
| `LIBRARY_BASE_URL` | Non | `http://localhost:45174` | URL valide |
| `KEYCLOAK_URL` | Non | `http://localhost:48080` | URL valide |
| `KEYCLOAK_ADMIN_USER` | Non | `admin` | Chaîne non vide |
| `KEYCLOAK_ADMIN_PASSWORD` | Non | `admin` | Chaîne non vide |
| `E2E_USERNAME` | Non | — | Optionnel |
| `E2E_PASSWORD` | Non | — | Optionnel |
| `CI` | Non | `false` | Transformée en booléen (`"true"` ou `"1"` → `true`) |

* Parsing via `e2eEnvSchema.safeParse(process.env)`.
* Échec de validation : `throw` immédiat avec détail des erreurs Zod en console.
* Export figé : `env.{appBaseUrl,libraryBaseUrl}`, `env.keycloak.{url,adminUser,adminPassword}`, `env.testUser.{username,password}`, `env.isCi`.
* Consommé par `tests-e2e/playwright.config.ts` et `tests-e2e/tests/helpers/keycloak.ts` (plus aucun accès direct à `process.env` en dehors de ce module).

---

## 4. Comptes & Identifiants Réservés
* **Compte E2E Préproduction :** `e2e-tester@nanko.dev`
  * Pré-provisionné dans l'instance Keycloak de préproduction.
  * Identifiants injectés via les secrets de repository GitHub `E2E_USERNAME` et `E2E_PASSWORD`.

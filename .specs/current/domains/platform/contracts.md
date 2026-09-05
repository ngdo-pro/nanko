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

## 3. Comptes & Identifiants Réservés
* **Compte E2E Préproduction :** `e2e-tester@nanko.dev`
  * Pré-provisionné dans l'instance Keycloak de préproduction.
  * Identifiants injectés via les secrets de repository GitHub `E2E_USERNAME` et `E2E_PASSWORD`.

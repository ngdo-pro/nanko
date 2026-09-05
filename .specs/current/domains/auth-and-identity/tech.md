# Domaine : Identité & Accès (auth-and-identity) - Architecture Technique

## 1. Stack & Composants Cibles
* **Identity Provider (Keycloak 26.1) :**
  * Conteneur Docker officiel Quay (`quay.io/keycloak/keycloak:26.1`).
  * Configuration déclarative versionnée dans `infra/keycloak/realm-nanko.json` (import automatique `--import-realm`).
  * Persistance dans PostgreSQL sous le schéma dédié `keycloak` (`KC_DB_SCHEMA: keycloak`).
  * Inscription publique et direct access grants désactivés (`registrationAllowed: false`, `directAccessGrantsEnabled: false`).
* **Backend (`backend/`) :**
  * Rôle de **Resource Server** OIDC sans stockage ni manipulation de mots de passe.
  * Authenticator Symfony custom `JwtKeycloakAuthenticator` interceptant `Authorization: Bearer <token>`.
  * `JwtKeycloakValidator` validant les signatures RS256 contre les clés publiques JWKS de Keycloak (`KEYCLOAK_JWKS_URL`) avec cache et invalidation sur rotation (`kid`).
  * Architecture hexagonale stricte (`backend/src/AuthAndIdentity/Core/` et `Adapter/`) validée par Deptrac.
* **Frontend (`frontend/`) :**
  * Bibliothèque officielle `keycloak-js`.
  * `KeycloakProvider` (Context React) gérant l'initialisation avec PKCE (S256) et le renouvellement silencieux.
  * `httpClient` injectant automatiquement le bearer token et gérant l'actualisation sur expiration.
  * Garde de navigation `ProtectedRoute`.
* **Tests E2E (`tests-e2e/`) :**
  * Helper `tests-e2e/tests/helpers/keycloak.ts` provisionnant les utilisateurs de test en local via l'API Admin Keycloak (`admin-cli`).

## 2. Invariants Techniques & Sécurité
* Strictement aucun mot de passe ou secret utilisateur en clair dans les bases applicatives ou les logs.
* Validation cryptographique locale des JWT via les clés publiques JWKS sans dépendance synchrone à Keycloak pour chaque appel API.
* Idempotence garantie lors du premier appel pour le provisioning Just-In-Time de l'entité locale `app_user`.

## 3. ADRs de Référence
* `ADR-0011` : Architecture hexagonale et structure des Bounded Contexts.

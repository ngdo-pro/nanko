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
  * Bibliothèque officielle `keycloak-js` configurée dans `src/lib/keycloak.ts`.
  * **Feature Auth (`src/features/auth/`) :** Module étanche respectant Bulletproof React avec barrel export strict (`index.ts`) :
    * `components/KeycloakProvider.tsx` : contexte React gérant l'initialisation PKCE (S256), la synchronisation de session et le renouvellement silencieux de token.
    * `components/ProtectedRoute.tsx` : garde de navigation redirigeant vers Keycloak si non authentifié.
    * `components/UserMenu.tsx` : menu utilisateur (avatar initial, email, bouton déconnexion) avec sélecteurs normalisés `data-qa`.
    * `api/getUser.ts` : requête API typée `/api/v1/me` et hook TanStack Query `useUserProfile()`.
    * `hooks/useAuth.ts` : hook d'accès au contexte d'authentification.
    * `types/index.ts` : schéma Zod `userProfileSchema` et types TypeScript `UserProfile`, `AuthContextType`.
  * `src/lib/api-client.ts` : injection transparente du bearer token JWT et refresh automatique sur 401.
  * **Design System & Identité Nanko :** Typographies officielles (`Archivo`, `IBM Plex Sans`, `IBM Plex Mono`, `Poppins`), tokens CSS clair (`#F7F4EF`) / sombre (`#04141A`), et logo officiel vectoriel SVG (`BrandLogo`).
  * **Composants d'Interface :** `ThemeSwitch` (gestion et persistance du thème `nanko-theme`), layouts partagés dans `src/components/layout/` (`Navbar`, `AppLayout`, `Footer`).
  * **Vues :** `UnauthenticatedView` (portail visiteur avec aperçu `.nanko` et CTA Keycloak) et `DashboardView` (accueil connecté avec état vide incitatif).
  * **Outillage de Tests Unitaires & Intégration :** Vitest, React Testing Library, `@testing-library/jest-dom`, `@testing-library/user-event`, jsdom, harnais `renderWithProviders` (`pnpm --filter frontend test`).
* **Tests E2E (`tests-e2e/`) :**
  * Helper `tests-e2e/tests/helpers/keycloak.ts` provisionnant les utilisateurs de test en local via l'API Admin Keycloak (`admin-cli`).
  * Suite de tests Playwright couvrant le flux d'authentification (`auth.spec.ts`) et le portail d'accueil (`portal.spec.ts`).

## 2. Invariants Techniques & Sécurité
* Strictement aucun mot de passe ou secret utilisateur en clair dans les bases applicatives ou les logs.
* Validation cryptographique locale des JWT via les clés publiques JWKS sans dépendance synchrone à Keycloak pour chaque appel API.
* Idempotence garantie lors du premier appel pour le provisioning Just-In-Time de l'entité locale `app_user`.

## 3. ADRs de Référence
* `ADR-0011` : Architecture hexagonale et structure des Bounded Contexts.

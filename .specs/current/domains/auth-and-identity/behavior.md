# Domaine : Identité & Accès (auth-and-identity) - Comportement Produit

## 1. Mission du Domaine (Le « Why »)
Fournir une gestion sécurisée, sans friction et standardisée de l'identité des utilisateurs, de l'authentification et du cycle de vie des sessions sur Nanko en déléguant l'IAM à Keycloak (OpenID Connect).

## 2. Parcours Utilisateurs Actifs

### Parcours 1 : Authentification via Keycloak (OIDC Auth Code + PKCE)
* L'utilisateur clique sur « Se connecter » sur le frontend Nanko.
* Il est redirigé vers la mire officielle Keycloak (`auth.nanko.dev` / `auth.preprod.nanko.dev` / `localhost:48080`).
* Après authentification réussie, Keycloak redirige vers l'application avec un code d'autorisation.
* Le client `keycloak-js` échange le code contre les jetons (`access_token`, `refresh_token`, `id_token`) stockés en mémoire.

### Parcours 2 : Requête API authentifiée & Provisioning Just-In-Time (JIT)
* Le client frontend injecte l'en-tête `Authorization: Bearer <access_token>` dans chaque requête API.
* Le backend Symfony valide cryptographiquement le JWT (signature RS256 contre les clés publiques JWKS de Keycloak).
* Si l'utilisateur (`keycloak_id` / claim `sub`) se connecte pour la première fois, un enregistrement local `app_user` est automatiquement et de manière idempotente créé (JIT provisioning).
* L'API renvoie le profil utilisateur (`GET /api/v1/me`).

### Parcours 3 : Renouvellement silencieux de session
* Avant expiration du token d'accès, le frontend rafraîchit automatiquement le jeton en arrière-plan via le `refresh_token`.
* Si le refresh token est expiré ou révoqué, l'utilisateur est redirigé vers la mire de connexion.

### Parcours 4 : Déconnexion globale
* L'utilisateur clique sur « Déconnexion » depuis son menu profil.
* La session locale est purgée et une redirection vers l'endpoint de logout de Keycloak invalide la session SSO globale.

## 3. Règles de Gestion Métier
* **Règle 1 (Zero Trust & Signature RS256) :** Tout accès aux endpoints applicatifs privés exige un jeton JWT Bearer valide émis par Keycloak et vérifiable via JWKS.
* **Règle 2 (Délégation IAM totale) :** Strictement aucun mot de passe ni identifiant brut ne transite ou n'est stocké par le backend Symfony ou le frontend Nanko.
* **Règle 3 (Idempotence JIT) :** L'enregistrement d'un utilisateur local lors de requêtes concurrentes au premier login est idempotent (`keycloak_id` unique).
* **Règle 4 (Découplage Authentification vs Autorisation) :** `AuthAndIdentity` authentifie et garantit un `UserId` (UUIDv7) interne. La gestion des permissions et contextes collaboratifs relève exclusivement de `WorkspaceManagement`.

## 4. Matrice des Échecs & Cas Limites
| Situation | Comportement visible pour l'utilisateur |
|---|---|
| Token absent, révoqué ou expiré | Réponse HTTP `401 Unauthorized`, tentative de renouvellement ou redirection vers Keycloak |
| Clé de signature Keycloak renouvelée | Rafraîchissement automatique du cache JWKS backend sans interruption de service |
| Indisponibilité ponctuelle de Keycloak | L'API continue de valider les tokens existants grâce au cache local des clés publiques JWKS |
| Utilisateur désactivé dans Keycloak | Refus immédiat de renouvellement du jeton par Keycloak |

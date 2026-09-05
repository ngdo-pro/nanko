# Domaine : Identité & Accès (auth-and-identity) - Architecture Technique

## 1. Stack & Composants Cibles
* **Backend (`backend/`) :**
  * Spécification OAuth 2.0 (RFC 6749) avec signature JWT en RS256.
  * Hachage des mots de passe avec Argon2id.
  * Entités Core Domain isolées, services d'authentification et intercepteurs de sécurité Symfony.
* **Frontend (`frontend/`) :**
  * Client HTTP Axios/Fetch avec intercepteur de renouvellement sur code 401.
  * Context Provider React pour l'état d'authentification (`AuthContext`).
* **Base de données :**
  * Tables PostgreSQL pour les identités, comptes et jetons révoqués avec identifiants UUIDv7.

## 2. Invariants Techniques & Sécurité
* Aucun mot de passe ni token JWT en clair dans les logs Monolog.
* Durée de vie du JWT d'accès limitée à 60 minutes.
* Signature asymétrique RS256 (clé privée sur l'API, clé publique pour vérification).

## 3. ADRs de Référence
* `ADR-001` : Adoption du serveur OAuth 2.0 avec rotation de jetons.

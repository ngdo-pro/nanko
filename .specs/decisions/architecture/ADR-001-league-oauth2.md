# ADR-001 : Serveur OAuth 2.0 avec rotation de jetons

* **Statut :** Validé
* **Date :** 2026-08-30
* **Impact :** `backend` | `frontend`

## 1. Contexte & Problématique
Nanko a besoin d'un mécanisme d'authentification robuste pour séparer clairement les sessions SPA, les futures intégrations CLI, et l'API backend REST sans sessions serveur à état (stateless).

## 2. Options techniques étudiées
* **Option A : Sessions PHP natives avec cookies de session**
  * Problèmes : Couplage fort au serveur, non adapté aux futures requêtes CLI ou API externes, complexité de mise à l'échelle horizontale.
* **Option B : Spécification OAuth 2.0 (RFC 6749) avec JWT RS256 et Refresh Tokens**
  * Avantages : Standard de l'industrie, interopérabilité, tokens signés vérifiables sans requête DB à chaque hit, rotation sécurisée.

## 3. Décision
Option B : Spécification OAuth 2.0 avec jetons JWT Bearer signés en RS256 et rotation de Refresh Tokens à usage unique.

## 4. Justifications & Conséquences
* Permet aux clients (Web SPA, CLI Nanko) d'interagir de façon homogène avec l'API backend.
* Durée courte des jetons d'accès (60 min) minimisant l'impact en cas de compromission.

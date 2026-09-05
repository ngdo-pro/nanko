# Domaine : Plateforme & Livraison Continue (platform) - Comportement & Processus

## 1. Mission du Domaine (Le « Why »)
Garantir l'intégrité, la traçabilité et la stabilité de la plateforme Nanko à travers une chaîne de livraison continue automatisée, la validation bout-en-bout (E2E) sur infrastructure réelle (préproduction) pour chaque Pull Request avant merge, et un versionnement sémantique (SemVer) strict de tous les artefacts déployés.

## 2. Parcours & Processus Actifs

### Parcours 1 : Validation automatisée E2E sur Pull Request (CI/CD)
* Le développeur ouvre ou met à jour une Pull Request (`pull_request`: open, synchronize, reopen).
* GitHub Actions calcule une version SemVer dynamique (`<base-tag>-pr.<pr_number>.<run_number>`).
* Les conteneurs Docker (backend Symfony et frontend React) sont construits avec injection de `APP_VERSION` et poussés sur GitHub Container Registry (GHCR).
* Watchtower sur le VPS de préproduction détecte la nouvelle image `:preprod` et redéploie le conteneur.
* Le workflow CI interroge `https://api.preprod.nanko.dev/api/v1/version` en boucle d'attente active (*polling* toutes les 15s, timeout à 8 min) jusqu'à confirmation que la version active correspond exactement à celle calculée.
* La suite de tests Playwright s'exécute contre l'environnement réel de préproduction (`https://app.preprod.nanko.dev`) avec l'utilisateur de test dédié (`e2e-tester@nanko.dev`).
* Le merge de la PR est bloqué si le déploiement ou l'un des tests E2E échoue (*Required Status Check*).

### Parcours 2 : Diagnostic de version déployée
* Tout système tiers, développeur ou sonde de supervision peut interroger publiquement `GET /api/v1/version` sur n'importe quel environnement (`local`, `preprod`, `prod`).
* L'API retourne instantanément l'état opérationnel, la version SemVer, le commit SHA et l'environnement d'exécution.

### Parcours 3 : Traçabilité distribuée de bout en bout (OpenTelemetry & SigNoz)
* Chaque action utilisateur sur le frontend React génère ou propage un contexte de traçabilité W3C (`traceparent`, `tracestate`).
* Le contexte est transmis de façon transparente à travers toute la chaîne : Frontend React ➔ Keycloak (OIDC/SSO) ➔ Backend Symfony ➔ Requêtes PostgreSQL.
* Les traces, métriques applicatives (RED) et métriques d'authentification Keycloak sont ingérées par SigNoz OTel Collector et visualisables sur le dashboard centralisé (`https://signoz.nanko.dev`) avec filtrage par environnement (`deployment.environment`).

### Parcours 4 : Accès sécurisé à l'environnement de Préproduction (Caddy HTTP Basic Auth)
* **Accès public / Robots :** Toute requête non authentifiée vers l'environnement de préproduction (`https://app.preprod.nanko.dev`) est interceptée par Caddy et reçoit immédiatement un statut HTTP `401 Unauthorized` avec l'en-tête `WWW-Authenticate: Basic realm="Nanko Preproduction"`, empêchant l'exploration du frontend ou du backend.
* **Accès humain (Développeurs & QA) :** Une invite d'authentification native du navigateur s'affiche lors de la première navigation. Après validation des identifiants (`PREPROD_HTTP_USER`), la session HTTP est maintenue par le navigateur et la navigation dans l'application ainsi que l'authentification Keycloak OIDC se déroulent normalement.
* **Exécution automatisée E2E (CI) :** Le runner Playwright injecte nativement les identifiants Basic Auth (`httpCredentials`) configurés via les secrets de repository (`PREPROD_HTTP_USER`, `PREPROD_HTTP_PASSWORD`) de façon 100% transparente, validant les parcours nominaux sans contourner ni altérer le flux Keycloak.

## 3. Règles de Gestion & Invariants Opérationnels
* **Règle 1 (Gate de préprod bloquante) :** Toute Pull Request doit obligatoirement valider l'ensemble des scénarios E2E Playwright sur l'infrastructure de préproduction réelle avant d'être éligible au merge sur `main`.
* **Règle 2 (Sérialisation de l'environnement de préproduction) :** Pour éviter les conflits d'état sur l'environnement partagé de préproduction, les exécutions de PR sont strictement sérialisées via un groupe de concurrence GitHub Actions (`concurrency: group: preprod-shared-env, cancel-in-progress: false`).
* **Règle 3 (Versionnement SemVer strict & traçable) :** Chaque build et conteneur porte une version SemVer traçable issue des tags Git (`git describe --tags --always`).
* **Règle 4 (Zéro secret SSH en CI) :** Conformément à l'ADR-0010, aucun accès SSH ou webhook direct vers le serveur n'est octroyé à GitHub Actions ; le déploiement repose sur le polling de Watchtower.
* **Règle 5 (Bypass CI pour changements non applicatifs) :** Si une Pull Request ne modifie que des éléments documentaires, de spécifications ou d'outillage (`.agents/`, `.claude/`, `.github/`, `.specs/`, `docs/`, `landing/`, fichiers Markdown), les étapes lourdes de build Docker, de déploiement préproduction et de tests E2E sont automatiquement ignorées pour libérer l'environnement partagé et valider le check en quelques secondes.
* **Règle 6 (Fail-fast sur configuration d'environnement invalide) :** Le frontend (`frontend/src/config/env.ts`) et les tests E2E (`tests-e2e/config/env.ts`) valident systématiquement leurs variables d'environnement via un schéma Zod au chargement. Toute variable manquante ou mal formée interrompt immédiatement le démarrage (exception explicite + écran de secours pour le frontend), sans jamais laisser un `undefined` se propager silencieusement dans le code applicatif.
* **Règle 7 (Résilience Fail-Open absolue sur la télémétrie) :** L'indisponibilité, la lenteur ou l'arrêt du collecteur SigNoz ne doit en aucun cas dégrader ni interrompre l'expérience utilisateur, l'authentification Keycloak ou les appels d'API Symfony. Les exportateurs OTel fonctionnent en asynchrone (batching) avec timeout court et abandon silencieux en cas d'erreur réseau.
* **Règle 8 (Observabilité locale à la demande) :** En développement local, SigNoz ne démarre pas par défaut avec `make dev` pour économiser les ressources de la machine (2-3 Go de RAM requis). Il est activable à la demande via `make signoz-up` et `make signoz-down`.
* **Règle 9 (Conformité Compose Spec & Nommage) :** Toutes les piles de conteneurisation de l'infrastructure respectent la spécification Compose officielle en utilisant exclusivement le nom de fichier `compose.yaml` (ou `compose.*.yaml`), proscrivant l'ancienne dénomination `docker-compose.yaml`.
* **Règle 10 (Migrations de schéma ClickHouse autonomes) :** Tout déploiement de la stack d'observabilité (local ou VPS) exécute automatiquement les migrations de schéma SigNoz (`bootstrap`, `sync up`, `async up`) via le conteneur dédié `signoz-schema-migrator` avant le démarrage des services `otel-collector` et `signoz-query-service`.
* **Règle 11 (Sas de sécurité HTTP Basic Auth en préproduction) :** L'accès à l'application web de préproduction (`app.preprod.nanko.dev`) est protégé par une authentification HTTP Basic Auth au niveau du reverse proxy Caddy (`caddy.basic_auth`). La production et le développement local restent exempts de Basic Auth.
* **Règle 12 (Directive anti-indexation robots en préproduction) :** Tous les sous-domaines de préproduction (`app.preprod.nanko.dev`, `www.preprod.nanko.dev`) renvoient obligatoirement l'en-tête de réponse HTTP `X-Robots-Tag: "noindex, nofollow"` pour proscrire tout référencement ou moissonnage par les moteurs de recherche.

## 4. Matrice des Échecs & Cas Limites
| Situation | Comportement & Conséquence |
|---|---|
| Timeout de déploiement Watchtower (> 8 min sans mise à jour) | Échec immédiat du workflow CI avec message explicite, merge bloqué |
| Échec d'un test Playwright en préproduction | Rapport de test et traces conservés en artefacts GitHub, merge bloqué |
| Pull Requests simultanées | Mise en file d'attente séquentielle sans annulation des runs précédents |
| Absence de tag Git dans le repository | Fallback sur `v0.0.0-dev` pour les environnements locaux ou non tagués |
| Variable d'environnement frontend invalide (ex. `VITE_KEYCLOAK_URL` mal formée) | `throw` immédiat au chargement du module `config/env.ts` + écran de secours HTML listant les erreurs Zod |
| Variable d'environnement E2E invalide (ex. `APP_BASE_URL` mal formée) | `throw` immédiat au chargement de `tests-e2e/config/env.ts`, suite Playwright interrompue avant exécution |
| Collecteur SigNoz arrêté ou inaccessible | Fonctionnement transparent en fail-open : requêtes HTTP et authentification 100% opérationnelles sans erreur |
| Requête non authentifiée sur la préproduction (`app.preprod.nanko.dev`) | Réponse immédiate `401 Unauthorized` par Caddy avec challenge Basic Auth, code applicatif inaccessible |
| Identifiants HTTP Basic Auth préproduction erronés | Réponse `401 Unauthorized`, réinvite native du navigateur ou échec explicite Playwright en CI |

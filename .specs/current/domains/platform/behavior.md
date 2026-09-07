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

### Parcours 4 : Accès sécurisé à l'environnement de Préproduction (Caddy HTTP Basic Auth & Anti-Indexation)
* **Exploration par les Robots (Moteurs de recherche & Crawlers) :**
  - Toute requête vers `/robots.txt` sur les sous-domaines de préproduction (`app.preprod.nanko.dev`, `auth.preprod.nanko.dev`, `www.preprod.nanko.dev`, `api.preprod.nanko.dev`) est interceptée nativement par Caddy et renvoie immédiatement un statut HTTP `200 OK` (`Content-Type: text/plain`) avec la directive RFC 9309 : `User-agent: *\nDisallow: /`, sans aucune exigence d'authentification Basic Auth.
  - L'intégralité des réponses HTTP servies sur la préproduction et la stack d'observabilité (`signoz.nanko.dev`) injecte l'en-tête de réponse strict `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex`, prévenant toute indexation, mise en cache ou affichage de snippets par les moteurs de recherche.
* **Accès public / Visiteurs anonymes :** Toute requête non authentifiée vers les applications de préproduction (`app.preprod.nanko.dev`, `api.preprod.nanko.dev`, `www.preprod.nanko.dev`) hors `/robots.txt` est interceptée par Caddy et reçoit immédiatement un statut HTTP `401 Unauthorized` avec l'en-tête `WWW-Authenticate: Basic realm="Nanko Preproduction"`.
* **Mire d'authentification Keycloak (`auth.preprod.nanko.dev`) :** Exemptée de Basic Auth pour permettre les redirections OIDC du navigateur, mais systématiquement protégée par l'en-tête `X-Robots-Tag` durci et `/robots.txt`.
* **Accès humain (Développeurs & QA) :** Une invite d'authentification native du navigateur s'affiche lors de la première navigation. Après validation des identifiants (`PREPROD_HTTP_USER`), la session HTTP est maintenue par le navigateur et la navigation dans l'application ainsi que l'authentification Keycloak OIDC se déroulent normalement.
* **Exécution automatisée E2E (CI) :** Le runner Playwright injecte nativement les identifiants Basic Auth (`httpCredentials`) configurés via les secrets de repository (`PREPROD_HTTP_USER`, `PREPROD_HTTP_PASSWORD`) de façon 100% transparente, validant les parcours nominaux sans contourner ni altérer le flux Keycloak.

### Parcours 5 : Centralisation des logs applicatifs et gestion des incidents Frontend (OpenTelemetry & SigNoz)
* **Frontend React (Capture & Remontée Fail-Open) :**
  - Un module unifié (`src/config/logger.ts`) expose les méthodes typées (`debug`, `info`, `warn`, `error`).
  - Les erreurs globales non interceptées (`window.onerror`, `window.onunhandledrejection`) et les crashs de composants React sont interceptés nativement.
  - Le composant `AppErrorBoundary` encapsule l'application racine. En cas d'exception non gérée, il affiche un écran de repli élégant et rassurant contenant le Trace ID W3C de l'incident et des actions de reprise (« Recharger l'application », « Retour à l'accueil »), évitant tout écran blanc bloquant.
  - Les logs de sévérité `WARN` et `ERROR` sont transmis de manière asynchrone non-bloquante au format OTLP HTTP (`POST /v1/logs`) avec le `trace_id` actif et les attributs de contexte (`service.name`, `deployment.environment`, stack trace, url).
  - Un mécanisme d'anti-flood déduplique les erreurs répétitives identiques sur fenêtre glissante pour préserver la bande passante client et l'ingestion ClickHouse.
* **Backend Symfony (Corrélation Monolog ➔ OTLP) :**
  - Le handler Monolog `App\Adapter\Driver\Http\OpenTelemetry\OtelLogHandler` convertit chaque enregistrement de log Monolog en `LogRecord` OTLP.
  - Chaque log est automatiquement enrichi avec le `trace_id` et le `span_id` du span OpenTelemetry actif via le SDK OpenTelemetry.
  - Les logs sont stockés en tampon mémoire et flushés par lot vers le collecteur OTLP HTTP (`POST /v1/logs`) à l'événement `kernel.terminate`.
  - Le niveau minimal d'émission vers OTLP est configurable via `OTEL_LOGS_LEVEL` (`info` par défaut), tandis que le flux local `php://stderr` continue de consigner l'intégralité des logs conteneur.
* **Observabilité SigNoz :**
  - L'équipe d'ingénierie navigue en 1 clic dans SigNoz depuis une trace HTTP lente ou en erreur vers l'ensemble des logs contextuels Backend et Frontend partageant le même `trace_id`.

### Parcours 6 : Mesure d'audience anonyme et suivi produit sans consentement (Plausible Analytics)
* **Landing Page (`www.nanko.dev`) :**
  - Mesure d'audience automatique dès le chargement de la page via le script léger (< 1 Ko) `https://plausible.nanko.dev/js/script.tagged-events.js`.
  - Suivi déclaratif des interactions clés par balisage de classes HTML (`plausible-event-name=landing_cta_app_click`, `plausible-event-name=landing_theme_toggle`, `plausible-event-name=landing_docs_click`).
  - Information réglementaire transparente affichée en pied de page (mesure d'audience anonyme sans cookie ni profilage).
* **Application React SPA (`app.nanko.dev`) :**
  - Initialisation globale du module d'analytics (`frontend/src/lib/analytics.ts`) au démarrage dans `src/main.tsx`.
  - Suivi automatique des transitions de pages (`pageview`) lors de chaque navigation dans le routeur React SPA (`history.pushState`).
  - Déclenchement d'événements personnalisés typés lors des étapes clés du cycle de vie utilisateur (`trackEvent('login_initiated')`, `trackEvent('logout_initiated')`).
  - Assainissement systématique des métadonnées contextuelles par le filtre anti-PII (`sanitizeAnalyticsProps`), garantissant qu'aucune donnée nominative, identifiant Keycloak ou information sensible n'est transmise.
* **Résilience Fail-Open & Exemption Réglementaire :**
  - Zéro cookie et zéro stockage persistant : aucun bandeau de consentement intrusif (CMP / Cookie Banner) requis (exemption formelle CNIL / RGPD).
  - En cas de blocage réseau (bloqueur de publicité uBlock, Brave Shields) ou d'indisponibilité du serveur Plausible, l'application fonctionne de manière fluide et transparente sans aucune exception ni dégradation d'expérience.

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
* **Règle 11 (Sas de sécurité HTTP Basic Auth en préproduction) :** L'accès aux applications web de préproduction (`app.preprod.nanko.dev`, `api.preprod.nanko.dev`, `www.preprod.nanko.dev`) est protégé par une authentification HTTP Basic Auth au niveau du reverse proxy Caddy (`caddy.basic_auth`), à l'exception explicite de `/robots.txt`. La production et le développement local restent exempts de Basic Auth.
* **Règle 12 (Protection Anti-Indexation et Directive Robots stricte) :** Tous les sous-domaines de préproduction (`app.preprod.nanko.dev`, `www.preprod.nanko.dev`, `api.preprod.nanko.dev`, `auth.preprod.nanko.dev`) ainsi que la stack d'observabilité (`signoz.nanko.dev`) renvoient obligatoirement l'en-tête de réponse HTTP durci `X-Robots-Tag: "noindex, nofollow, noarchive, nosnippet, notranslate, noimageindex"`. L'endpoint `/robots.txt` renvoie sans authentification une consigne d'exclusion universelle (`User-agent: *\nDisallow: /`) pour interdire le crawl de l'ensemble des moteurs et robots d'exploration.
* **Règle 13 (Corrélation Trace-Log obligatoire) :** Tout log Backend ou Frontend transmis à OpenTelemetry est obligatoirement enrichi avec le `trace_id` et le `span_id` W3C actifs s'ils existent, garantissant la liaison bidirectionnelle traces ↔ logs dans SigNoz.
* **Règle 14 (Fail-Open et protection anti-récursion sur les logs) :** Tout dysfonctionnement de l'ingestion de logs (erreur réseau, collecteur indisponible, timeout) est silencieusement ignoré sans lever d'exception ni altérer l'UI ou les requêtes API. Une erreur survenue au sein de l'exporteur de logs ne doit jamais être re-capturée par le logger (protection stricte contre la récursion infinie).
* **Règle 15 (Filtrage et seuil de télémétrie des logs) :** En préproduction et production, le Frontend restreint ses envois réseau vers OTLP aux niveaux `WARN` et `ERROR` avec déduplication locale, tandis que le Backend transmet à OTLP selon le seuil configuré par `OTEL_LOGS_LEVEL` (`INFO` par défaut).
* **Règle 16 (Sanitization des logs applicatifs) :** Les attributs de log ne doivent jamais contenir de secrets en clair, mots de passe, tokens JWT ou en-têtes `Authorization: Bearer ...` (caviardage ou omission obligatoire).
* **Règle 17 (Standardisation des sélecteurs E2E data-qa) :** Les tests End-to-End Playwright ciblant des composants Nanko doivent obligatoirement utiliser l'API `page.getByTestId(...)` résolvant des attributs `[data-qa="..."]` au format kebab-case (`[contexte]-[élément]-[action/état]`). Tout ciblage reposant sur des classes CSS (ex. `.nav-logo`) ou des sélecteurs de style est strictement interdit. Seule la mire d'authentification tierce Keycloak (`auth.nanko.dev`) fait exception avec ses identifiants natifs (`#username`, `#password`, `#kc-login`).
* **Règle 18 (Exemption de consentement cookies - CNIL / RGPD) :** Plausible Analytics fonctionne sans aucun cookie, sans stockage persistant (`localStorage`), et avec un hachage d'IP journalier éphémère (sel rotatif détruit chaque jour à minuit). Aucun bandeau de consentement ni barrière d'acceptation cookies ne doit être présenté à l'utilisateur. Une mention d'information claire dans la politique de confidentialité / pied de page est obligatoire et suffisante.
* **Règle 19 (Interdiction stricte de données personnelles identifiantes - Anti-PII) :** Il est strictement interdit d'émettre des données personnelles (PII : nom, prénom, email, UUID utilisateur Keycloak `sub`, IP brute, token de session) dans les événements analytiques. Le helper client `sanitizeAnalyticsProps` supprime automatiquement toute clé interdite (`forbiddenPiiKeys`) avant émission vers `/api/event`.
* **Règle 20 (Résilience Fail-Open Analytics) :** Le blocage réseau ou l'échec de chargement de Plausible (bloqueurs de pub, indisponibilité serveur, timeout) ne doit jamais lever d'erreur ni altérer le fonctionnement normal du frontend React ou de la landing page.
### Parcours 7 : Durcissement sécurité de l'infrastructure et moindre privilège (Spec 013 / ADR-0012)
* **Cloisonnement PostgreSQL :** Le superutilisateur `nanko` n'est plus utilisé par les conteneurs applicatifs. Le backend Symfony utilise le rôle dédié `nanko_app`, Keycloak utilise `keycloak`, Plausible utilise `plausible`, et les sauvegardes quotidiennes utilisent le rôle dédié en lecture seule `backup` (`pg_read_all_data`). La directive `CONNECT` sur les bases est révoquée pour `PUBLIC`. L'instance `postgres` est strictement confinée au réseau Docker interne et retirée du réseau public `edge`.
* **Cloisonnement ClickHouse :** L'utilisateur `default` est restreint aux connexions locales (`127.0.0.1`, `::1`), tandis que `signoz` et `plausible` disposent d'identifiants dédiés avec mots de passe injectés via variables d'environnement.
* **Verrouillage de la console Admin Keycloak :** Tout accès extérieur non autorisé aux chemins d'administration (`/admin*`, `/realms/master*`) est intercepté par Caddy et rejeté avec un code HTTP `403 Forbidden` hors allowlist IP (`KC_ADMIN_ALLOWED_IPS`).
* **Réduction de surface d'attaque OTLP :** Le proxy Caddy bloque tout chemin non allowlisté vers l'OTEL Collector en `404 Not Found`. Le collecteur applique une politique CORS stricte limitée aux origines Nanko (`app`, `www`, dev) et refuse les requêtes d'origines non reconnues.
* **Hygiène Supply Chain CI & Images :** Toutes les GitHub Actions sont épinglées par SHA commit immuable avec commentaires de version, Dependabot assure la maintenance automatisée, et les conteneurs s'exécutent avec des privilèges restreints (`no-new-privileges`, `cap_drop: [ALL]`, backend non-root en utilisateur `www-data` sur port `:8080`).

---

## 3. Règles Métier & Invariants
* **Règle 21 (Propagation obligatoire des variables d'environnement VITE_* dans la CI/CD) :** Toute variable d'environnement frontend préfixée `VITE_*` introduite dans `frontend/src/config/env.ts` et `frontend/Dockerfile` doit obligatoirement être déclarée et injectée en tant que `build-args` Docker dans l'ensemble des workflows GitHub Actions de build et déploiement (`deploy-prod.yml`, `deploy-preprod.yml`, `pr-preprod-e2e.yml`).
* **Règle 22 (Moindre privilège datastores — ADR-0012) :** Aucun conteneur applicatif ne doit se connecter à PostgreSQL ou ClickHouse en superutilisateur (`postgres`, `nanko` superuser ou `default` sans mot de passe). Tout composant dispose de son propre rôle LOGIN et de permissions strictement limitées à son périmètre de schéma/tables.
* **Règle 23 (Épinglage immuable des actions CI) :** Dans tous les workflows GitHub Actions, la directive `uses:` doit cibler un commit SHA complet (40 caractères hexadécimaux) et spécifier le tag versionné en commentaire `# vX.Y.Z`.
* **Règle 24 (Isolement réseau des datastores) :** Les conteneurs de bases de données (`postgres`, `clickhouse`) ne doivent jamais être rattachés au réseau externe `edge` du reverse proxy. Seuls les conteneurs exposant un service HTTP/HTTPS destiné au trafic web public ont accès au réseau `edge`.

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
| Requête sur `/robots.txt` sur n'importe quel sous-domaine de préproduction | Réponse immédiate `200 OK` (`text/plain`) avec `User-agent: *\nDisallow: /`, sans challenge Basic Auth |
| Découverte de sous-domaines via Certificate Transparency (CT logs) | Tout bot explorateur recevant `/robots.txt` abandonne le crawl, et toute réponse HTTP porte `X-Robots-Tag` interdisant l'indexation |
| Identifiants HTTP Basic Auth préproduction erronés | Réponse `401 Unauthorized`, réinvite native du navigateur ou échec explicite Playwright en CI |
| Exception non gérée dans un composant React (crash UI) | `AppErrorBoundary` intercepte l'erreur, affiche l'écran de secours avec Trace ID, et émet un log `ERROR` vers SigNoz |
| Échec d'envoi du log vers `/v1/logs` (ex: réseau coupé) | Abandon silencieux fail-open, aucun blocage du flux utilisateur, aucune boucle récursive |
| Bloqueur de publicité bloquant `plausible.nanko.dev` ou `/api/event` | Abandon silencieux fail-open, aucune erreur bloquante dans la console, expérience utilisateur 100 % préservée |
| Propriété PII passée à `trackEvent` (ex: `email: "user@test.com"`) | `sanitizeAnalyticsProps` supprime la propriété interdite, l'événement est émis sans la donnée personnelle |
| Tentative d'accès extérieur à la console d'administration Keycloak (`/admin*`) | Réponse immédiate `403 Forbidden` par le reverse-proxy Caddy si l'IP cliente n'est pas allowlistée |
| Origine inconnue ou non autorisée tentant d'envoyer des traces vers `otlp.nanko.dev` | Rejet CORS (pas d'en-tête `Access-Control-Allow-Origin` retourné), requête bloquée par le navigateur |
| Requête vers un chemin arbitraire non OTLP sur `otlp.nanko.dev` (ex: `/debug/*`) | Réponse immédiate `404 Not Found` par Caddy sans routage vers le collecteur interne |

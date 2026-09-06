# Change : 011 - Setup Plausible Analytics Auto-Hébergé (Landing & App SPA)

## Métadonnées
* **Domaine concerné :** `.specs/current/domains/platform/`
* **Type de changement :** `Nouveau module`
* **Cible :** `Fullstack` (Infra Docker, Frontend React, Landing HTML/JS, Tests E2E)

---

## 1. Intention & Contexte (Le « Why » du Delta)

### Problème résolu / Besoin
L'équipe produit et technique n'a actuellement aucune visibilité quantitative sur :
1. L'acquisition et la conversion sur la landing page (`www.nanko.dev`) : taux de visite, provenance, clics sur le bouton CTA principal (« Commencer gratuitement » / redirection vers l'app).
2. L'usage réel et l'engagement au sein de l'application web SPA (`app.nanko.dev`) : navigation entre pages, interactions clés (création d'organisation, ouverture de projet, export de document d'architecture).

Le besoin est d'obtenir une mesure d'audience fine, légère et auto-hébergée, sans dégrader les performances (script < 1 Ko), sans dépendre d'un tiers extérieur propriétaire, et en parfaite cohérence avec l'infrastructure existante (Docker Compose + Caddy + ClickHouse).

### Analyse Réglementaire & Gestion du Consentement (RGPD / CNIL / ePrivacy)
> [!IMPORTANT]
> **Plausible Analytics NE NÉCESSITE AUCUN BANDEAU DE CONSENTEMENT (ni Cookie Banner ni CMP)** dès lors que les règles suivantes sont respectées :
>
> 1. **Absence totale de cookies et de stockage persistant :** Plausible n'écrit aucun cookie, n'utilise pas le `localStorage`, et ne réalise aucun fingerprinting matériel persistant entre les sessions ou entre les domaines.
> 2. **Mesure d'audience anonyme et hachage journalier éphémère :** Plausible calcule une empreinte journalière non réversible : `hash(IP + UserAgent + sel_journalier)`. Le sel est détruit toutes les 24h, rendant tout recoupement ou profilage temporel strictement impossible. La CNIL et les lignes directrices européennes exemptent formellement ces outils de recueil de consentement préalable.
> 3. **Interdiction stricte de PII (Personally Identifiable Information) :** Aucun événement personnalisé ne doit transmettre d'identifiant direct ou indirect d'une personne physique (adresse email, nom d'utilisateur, identifiant unique de compte Keycloak UUID, IP brute). Seules des métriques agrégées et contextuelles non nominatives (ex. type d'action, format de document, statut HTTP) sont admises.
> 4. **Obligation d'information :** L'exemption de consentement ne dispense pas de l'obligation de transparence. Une mention claire et accessible dans la politique de confidentialité (mentions légales) expliquant l'usage de la solution auto-hébergée pour la mesure d'audience anonyme est obligatoire et suffisante.

### In Scope (Ce qui est ajouté/modifié)
* **Infrastructure Auto-Hébergée Mutualisée (`infra/plausible/compose.yaml`) :**
  * Déploiement du conteneur unique stateless Plausible Community Edition (`ghcr.io/plausible/community-edition`).
  * **Mutualisation PostgreSQL :** Réutilisation stricte de l'instance PostgreSQL 16 existante (base dédiée `plausible`), sans aucun nouveau conteneur de base de données relationnelle (conformité ADR-0007).
  * **Mutualisation ClickHouse :** Réutilisation de l'instance ClickHouse existante de la stack SigNoz (`signoz-clickhouse`, base dédiée `plausible_events_db`), évitant toute duplication d'empreinte mémoire sur le VPS.
  * Exposition via Caddy Proxy sous le sous-domaine dédié `plausible.nanko.dev` (ou `plausible.preprod.nanko.dev`) avec TLS Let's Encrypt automatique et HSTS.
  * Protection du dashboard d'administration de Plausible (authentification native ou Basic Auth en préproduction).
* **Landing Page (`landing/`) :**
  * Inclusion du script Plausible léger (`script.tagged-events.js` ou `script.js`).
  * Marquage des éléments d'action clés (CTA vers l'application, liens documentaires) via classes ou attributs d'événements Plausible (`plausible-event-name=...`).
* **Frontend React SPA (`frontend/`) :**
  * Validation des variables d'environnement dans `frontend/src/config/env.ts` (`VITE_PLAUSIBLE_DOMAIN`, `VITE_PLAUSIBLE_API_HOST`).
  * Module d'analyse typé `frontend/src/lib/analytics.ts` (ou feature `frontend/src/features/analytics/`) garantissant le tracking automatique des routes SPA (`history.pushState`).
  * Helper typé d'émission d'événements personnalisés (`trackEvent(name, props)`) avec assainissement anti-PII automatique.
  * Résilience Fail-Open totale : aucun blocage d'interface si le script Plausible est bloqué par un bloqueur de publicité (uBlock, Brave Shields) ou si le serveur Plausible est indisponible.
* **Tests & Validation :**
  * Tests unitaires et d'intégration frontend vérifiant l'anti-PII et la non-régression fail-open.
  * Scénarios Playwright E2E (`tests-e2e/tests/app/analytics.spec.ts`) vérifiant l'émission transparente des requêtes `/api/event`.

### Out of Scope (Exclusions strictes)
* Pas de nouveau conteneur de base de données (zéro conteneur PostgreSQL ou ClickHouse additionnel).
* Pas de tracking publicitaire, pas de remarketing, pas de pixels Meta/Google Ads.
* Pas de collecte de données personnelles identifiantes (PII : emails, noms, identifiants Keycloak).
* Pas de bandeau cookies ni de bannière de consentement intrusif dans l'UI.
* Pas de modification du schéma de base de données PostgreSQL applicatif Symfony (le stockage analytique est autonome et confiné aux bases dédiées `plausible` et `plausible_events_db`).

---

## 2. Flux & Architecture (Diff)

```mermaid
sequenceDiagram
    autonumber
    actor U as Visiteur / Utilisateur
    participant L as Landing / Frontend SPA
    participant C as Caddy Reverse Proxy (plausible.nanko.dev)
    participant P as Plausible CE (Conteneur Plausible)
    participant CH as ClickHouse Partagé (signoz-clickhouse:8123)
    participant PG as PostgreSQL Partagé (postgres:5432)

    Note over U,PG: 1. Chargement & Mesure d'audience (Pageview anonyme)
    U->>L: Visite une page (/ ou /app/workspaces)
    L->>C: GET /js/script.tagged-events.js
    C-->>L: 200 OK (Script JS ~1 Ko mis en cache)
    L->>C: POST /api/event (Payload anonyme : url, domain, screen_width)
    C->>P: Proxy interne vers plausible:8000
    P->>CH: Enregistrement agrégé dans plausible_events_db (sans cookie, IP hachée)
    P-->>L: 202 Accepted (Réponse immédiate)

    Note over U,PG: 2. Interaction utilisateur (Custom Event sans PII)
    U->>L: Clic sur CTA "Créer un document" / "Se connecter"
    L->>L: Validation anti-PII (Schéma Zod / Filtre props)
    L->>C: POST /api/event (Event: "Document Created", Props: { format: "nanko" })
    C->>P: Ingestion de l'événement
    P->>CH: Stockage de la métrique d'action dans plausible_events_db
    P-->>L: 202 Accepted

    Note over U,PG: 3. Consultation du Dashboard (Équipe Nanko)
    actor A as Admin Nanko
    A->>C: GET https://plausible.nanko.dev/login
    C->>P: Authentification & session admin
    P->>PG: Vérification compte administrateur dans base plausible
    P->>CH: Requêtes d'agrégation statistique
    P-->>A: Affichage du Dashboard temps réel
```

---

## 3. Delta Modèle de données & Base de données

### 3.1. Architecture des Données & Mutualisation (Option A)
> [!IMPORTANT]
> **Zéro nouveau conteneur de base de données :**
> * **PostgreSQL mutualisé :** Plausible se connecte à l'instance `postgres:16-alpine` déjà en place via une base dédiée `plausible` créée par `CREATE DATABASE plausible;`. Aucun impact sur la base métier `nanko` ni sur le schéma `keycloak`.
> * **ClickHouse mutualisé :** Plausible se connecte à l'instance ClickHouse existante de SigNoz (`signoz-clickhouse:8123`) via la base dédiée `plausible_events_db`.
> * Le conteneur Plausible est le **seul nouveau conteneur Docker** ajouté à l'infrastructure.

```mermaid
erDiagram
    EXISTING_POSTGRES ||--o{ PLAUSIBLE_DATABASE : "héberge"
    EXISTING_CLICKHOUSE ||--o{ PLAUSIBLE_EVENTS_DATABASE : "héberge"

    PLAUSIBLE_DATABASE {
        string schema_public "Tables internes Plausible (users, sites, goals)"
    }

    PLAUSIBLE_EVENTS_DATABASE {
        string tables "Tables ClickHouse compressées (events_v2, sessions_v2)"
    }
```

### 3.2. Segregation des Données & Rétrocompatibilité
* **Base PostgreSQL Plausible (`plausible`) :** Utilisée exclusivement par Plausible pour l'authentification des administrateurs, les configurations de sites et les objectifs de conversion.
* **Base ClickHouse Plausible (`plausible_events_db`) :** Utilisée pour le stockage compressé en colonnes des statistiques d'événements et de pages vues.
* **Intégrité applicative Nanko :** Étanchéité absolue : aucune clé étrangère, aucun accès croisé avec les données applicatives (`users`, `workspaces`, etc.) ni avec les traces SigNoz.

---

## 4. Delta Contrats d'API & Ingestion

### Endpoint : `POST https://plausible.nanko.dev/api/event`
* **Exposition :** Publique (accessible depuis les navigateurs des visiteurs anonymes et utilisateurs connectés).
* **Headers requis :** `Content-Type: application/json` | `User-Agent`
* **CORS :** Autorisé pour les origines Nanko (`https://www.nanko.dev`, `https://app.nanko.dev`, `https://*.preprod.nanko.dev`).

#### Payload Ingestion standard (`PlausibleEventPayload`)
```json
{
  "n": "pageview",
  "u": "https://app.nanko.dev/workspaces",
  "d": "app.nanko.dev",
  "r": "https://www.nanko.dev/",
  "w": 1440,
  "p": {
    "action": "view_list",
    "theme": "dark"
  }
}
```

#### Payload Événement Personnalisé (`CustomEventPayload`)
```json
{
  "n": "document_created",
  "u": "https://app.nanko.dev/projects/01918a24-7b3b-7c99-b1d5-2a1d2f34e567",
  "d": "app.nanko.dev",
  "w": 1440,
  "p": {
    "format": "nanko",
    "layers_count": 3
  }
}
```

#### Réponses
* `202 Accepted` : Événement validé et mis en file d'attente d'ingestion ClickHouse.
* `400 Bad Request` : Payload corrompu ou domaine non configuré.

---

## 5. Configuration Réseau, Prérequis DNS & Sécurisation des Endpoints

### 5.1. Prérequis DNS Externes (Registrar / Zone DNS)
| Sous-domaine / Hôte | Type DNS | Cible | Rôle |
|---|---|---|---|
| `plausible.nanko.dev` | `A` (ou `CNAME`) | `<IP_PUBLIQUE_VPS>` | Interface d'administration Plausible et endpoint d'ingestion `/api/event` pour la production. |
| `plausible.preprod.nanko.dev` | `A` (ou `CNAME`) | `<IP_PUBLIQUE_VPS>` | Instance ou routage de préproduction (si déployé séparément, sinon couvert par le wildcard `*.preprod.nanko.dev` et `*.nanko.dev`). |

> [!NOTE]
> Le domaine `*.nanko.dev` pointant déjà sur l'IP du VPS OVH sous Caddy, la résolution de `plausible.nanko.dev` est automatiquement effective dès l'ajout de la directive Caddy.

### 5.2. Matrice d'Exposition et Sécurisation des Endpoints
| Endpoint / Service | Exposition | Authentification & Contrôle d'accès | Mesures de mitigation (CORS, Rate-limit, Headers, TLS) |
|---|---|---|---|
| `https://plausible.nanko.dev/api/event` | `Publique` | Aucune (Endpoint d'ingestion télémétrie anonyme) | TLS 1.3, HSTS, Rate-limiting Caddy anti-abus (100 req/sec/IP), Payload max 16 Ko. |
| `https://plausible.nanko.dev/js/*` | `Publique` | Aucune (Distribution des assets de tracking) | Cache public `max-age=86400`, compression gzip/zstd, CORS `*`. |
| `https://plausible.nanko.dev/*` (Dashboard) | `Restreinte` | Authentification utilisateur Plausible (Argon2id/Bcrypt) + HTTP Basic Auth sur Préproduction | HTTPS forcé, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`. |
| `plausible:8000` (Conteneur Plausible) | `Interne Docker` | Réseau privé `edge` | Aucun port exposé publiquement sur l'hôte. |
| `clickhouse:8123` / `postgres:5432` | `Interne Docker` | Réseau privé isolé | Accessible uniquement par le service Plausible. |

### 5.3. Content Security Policy (CSP)
Les applications Frontend et Landing doivent autoriser l'exécution du script Plausible et l'envoi de la télémétrie :
* `script-src` : `'self' https://plausible.nanko.dev`
* `connect-src` : `'self' https://plausible.nanko.dev/api/event https://otlp.nanko.dev`

### 5.4. Variables d'Environnement & Secrets requis

| Variable | Composant | Environnement | Description & Exemple |
|---|---|---|---|
| `DATABASE_URL` | `infra/plausible/compose.yaml` | VPS (Secrets) | Connexion à l'instance PostgreSQL partagée (`postgresql://nanko:${POSTGRES_PASSWORD}@postgres:5432/plausible`). |
| `CLICKHOUSE_DATABASE_URL` | `infra/plausible/compose.yaml` | VPS (Secrets) | Connexion à l'instance ClickHouse partagée de SigNoz (`http://signoz-clickhouse:8123/plausible_events_db`). |
| `BASE_URL` | `infra/plausible/compose.yaml` | VPS (Preprod / Prod) | URL de base de l'instance Plausible (`https://plausible.nanko.dev`). |
| `SECRET_KEY_BASE` | `infra/plausible/compose.yaml` | VPS (Secrets) | Clé secrète aléatoire de 64 octets générée pour chiffrer les sessions Plausible. |
| `DISABLE_REGISTRATION` | `infra/plausible/compose.yaml` | Tous | `true` ou `invite_only` (interdit l'inscription publique sauvage). |
| `ADMIN_USER_NAME` | `infra/plausible/compose.yaml` | VPS | Nom du compte administrateur initial (`Nanko Admin`). |
| `ADMIN_USER_EMAIL` | `infra/plausible/compose.yaml` | VPS | Email du compte administrateur initial (`admin@nanko.dev`). |
| `ADMIN_USER_PWD` | `infra/plausible/compose.yaml` | VPS | Mot de passe de l'administrateur initial. |
| `VITE_PLAUSIBLE_DOMAIN` | `frontend` / `landing` | Tous | Domaine déclaré dans Plausible (`nanko.dev` ou `preprod.nanko.dev`). |
| `VITE_PLAUSIBLE_API_HOST` | `frontend` / `landing` | Tous | URL du serveur Plausible (`https://plausible.nanko.dev`). |

---

## 6. Architecture & Implémentation Client (Landing & Frontend)

### 6.1. Intégration sur la Landing (`landing/index.html`)
L'intégration sur la landing repose sur le script natif Plausible avec support des événements balisés par classes HTML :

```html
<!-- Plausible Analytics (Anonyme, sans cookie, exempté de consentement CNIL/RGPD) -->
<script defer
        data-domain="nanko.dev"
        data-api="https://plausible.nanko.dev/api/event"
        src="https://plausible.nanko.dev/js/script.tagged-events.js">
</script>
```

#### Balisage des actions d'interaction sur la Landing :
* Bouton CTA Principal ("Commencer gratuitement") :
  `class="... plausible-event-name=landing_cta_app_click"`
* Lien Documentation d'architecture :
  `class="... plausible-event-name=landing_docs_click"`
* Sélection du thème clair/sombre :
  `class="... plausible-event-name=landing_theme_toggle"`

### 6.2. Architecture du Module Analytics Frontend (`frontend/src/lib/analytics.ts`)
Conformément aux principes de [Bulletproof React](https://github.com/alan2207/bulletproof-react), l'instrumentation est isolée dans un module unique encapsulé :

```text
frontend/src/
├── config/
│   └── env.ts            # Validation Zod des variables VITE_PLAUSIBLE_*
├── lib/
│   ├── analytics.ts      # Singleton d'initialisation, assainissement anti-PII & dispatch
│   └── analytics.test.ts # Tests unitaires (anti-PII, fail-open, mock plausible)
└── components/
    └── layout/
        └── AppLayout.tsx # Déclenchement automatique des Pageviews sur changement de route
```

### 6.3. Typage strict des Événements & Schéma Anti-PII

```typescript
// frontend/src/lib/analytics.ts
import { z } from 'zod';
import { env } from '@/config/env';

// Événements métier autorisés (exhaustifs)
export type AnalyticsEventName =
  | 'login_initiated'
  | 'logout_initiated'
  | 'workspace_created'
  | 'project_created'
  | 'document_created'
  | 'document_exported'
  | 'architecture_layer_toggled';

// Définition des propriétés admises : types primitifs uniquement, interdiction stricte de clés PII
export const forbiddenPiiKeys = ['email', 'user', 'username', 'name', 'password', 'token', 'jwt', 'sub', 'id_token', 'phone', 'ip'];

export const analyticsPropsSchema = z.record(
  z.string().refine((key) => !forbiddenPiiKeys.includes(key.toLowerCase()), {
    message: 'Détection d\'une clé interdite (PII) non conforme aux règles d\'exemption RGPD',
  }),
  z.union([z.string(), z.number(), z.boolean()])
);

export type AnalyticsProps = z.infer<typeof analyticsPropsSchema>;
```

---

## 7. Delta Spécifications UI & Logique Client (React)

### Implémentation du service `analytics` (`src/lib/analytics.ts`)

```typescript
declare global {
  interface Window {
    plausible?: (
      eventName: string,
      options?: {
        props?: Record<string, string | number | boolean>;
        callback?: () => void;
      }
    ) => void;
  }
}

/**
 * Charge le script Plausible de manière dynamique et fail-open si configuré.
 */
export function initAnalytics(): void {
  if (!env.VITE_PLAUSIBLE_DOMAIN || !env.VITE_PLAUSIBLE_API_HOST) {
    return;
  }

  if (typeof document === 'undefined') return;

  const existingScript = document.querySelector('script[data-analytics="plausible"]');
  if (existingScript) return;

  try {
    const script = document.createElement('script');
    script.defer = true;
    script.dataset.analytics = 'plausible';
    script.dataset.domain = env.VITE_PLAUSIBLE_DOMAIN;
    script.dataset.api = `${env.VITE_PLAUSIBLE_API_HOST}/api/event`;
    script.src = `${env.VITE_PLAUSIBLE_API_HOST}/js/script.tagged-events.js`;

    script.onerror = () => {
      // Fail-open : Bloqueur de pub uBlock/Brave ou indisponibilité réseau, aucune rupture applicative
    };

    document.head.appendChild(script);
  } catch {
    // Fail-open absolu
  }
}

/**
 * Déclenche un événement personnalisé typé avec validation et assainissement anti-PII.
 */
export function trackEvent(name: AnalyticsEventName, props?: Record<string, unknown>): void {
  try {
    if (typeof window === 'undefined' || !window.plausible) {
      return;
    }

    let sanitizedProps: Record<string, string | number | boolean> | undefined = undefined;

    if (props) {
      // Filtrage des clés PII
      const filtered: Record<string, string | number | boolean> = {};
      for (const [key, val] of Object.entries(props)) {
        if (!forbiddenPiiKeys.includes(key.toLowerCase()) && (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')) {
          filtered[key] = val;
        }
      }
      sanitizedProps = filtered;
    }

    window.plausible(name, { props: sanitizedProps });
  } catch {
    // Fail-open : Toute anomalie d'analytics est silencieuse
  }
}
```

### Matrice des états d'interface

| État | Déclencheur | Rendu visuel & Comportement |
|---|---|---|
| **Analytics Initialisé** | Variables d'environnement `VITE_PLAUSIBLE_*` renseignées | Script injecté en `defer` sans impact sur le First Contentful Paint (FCP). |
| **Tracking Actif (Nominal)** | Navigation de page ou appel `trackEvent` | Requête `POST /api/event` émise en arrière-plan (202 Accepted). Aucun cookie créé. |
| **Bloqueur Publicitaire / Offline** | uBlock Origin ou rupture réseau | Échec silencieux de la requête réseau. L'UI React et les formulaires fonctionnent à 100% de façon nominale. |
| **Analytics Désactivé** | Variables `VITE_PLAUSIBLE_*` vides (défaut local/test) | Aucun script n'est chargé, `trackEvent` est un no-op synchrone instantané. |
| **Tentative de transmission PII** | Appel `trackEvent` avec un champ `email` ou `token` | La clé PII est automatiquement supprimée par le filtre avant l'émission de la requête. |

---

## 8. Invariants & Cas limites (*Edge cases*)

1. **Exemption RGPD / CNIL Stricte (Zéro PII) :**
   * Aucun identifiant personnel direct ne doit transiter vers Plausible.
   * Tout appel transmettant une clé PII interdite (`email`, `user_id`, `token`) est assaini à la source par le client.
2. **Fail-Open Absolu & Performance :**
   * L'indisponibilité ou le blocage de Plausible (par exemple via uBlock Origin, DNS sinkhole ou panne du service) ne doit en aucun cas bloquer la navigation, ralentir le chargement des pages ou perturber l'authentification Keycloak.
3. **Séparation Stricte des Environnements :**
   * Les métriques de préproduction doivent utiliser `data-domain="preprod.nanko.dev"` pour ne pas polluer les statistiques de production `nanko.dev`.
   * En local, l'analytics est désactivé par défaut.
4. **Prise en charge de la navigation SPA :**
   * Plausible intercepte nativement les modifications d'historique `history.pushState` et `history.replaceState`, assurant le décompte fidèle des pages vues lors des transitions de routes React Router v7.
5. **Anti-Indexation de l'Interface Plausible :**
   * Le service Plausible en préproduction doit hériter des headers Caddy `X-Robots-Tag: "noindex, nofollow..."` et `/robots.txt` pour préserver le référencement naturel.

---

## 9. Plan d'exécution séquentiel

- [x] **Phase 1 : Infrastructure & Stack Plausible Mutualisée (`infra/plausible/`)**
  - [x] 1. Initialiser la base de données PostgreSQL `plausible` sur l'instance `postgres:16-alpine` existante.
  - [x] 2. Initialiser la base ClickHouse `plausible_events_db` sur l'instance `signoz-clickhouse` existante.
  - [x] 3. Créer `infra/plausible/compose.yaml` avec le conteneur unique stateless `plausible` (`ghcr.io/plausible/community-edition`) relié au réseau `edge`.
  - [x] 4. Configurer les labels Caddy pour le sous-domaine `plausible.nanko.dev` avec gestion automatique TLS et protection des routes d'administration.
  - [x] 5. Ajouter la cible Makefile `deploy-plausible` permettant le déploiement sur le VPS OVH sans secret CI (ADR-0010).
  - [x] **Validation Infra :** Vérifier la conformité de la syntaxe Docker Compose (`docker compose -f infra/plausible/compose.yaml config`).

- [x] **Phase 2 : Configuration & Frontend Client (`frontend/`)**
  - [x] 1. Enrichir `frontend/src/config/env.ts` avec les variables `VITE_PLAUSIBLE_DOMAIN` et `VITE_PLAUSIBLE_API_HOST`.
  - [x] 2. Créer le module `frontend/src/lib/analytics.ts` avec `initAnalytics`, `trackEvent`, le catalogue d'événements et le filtre anti-PII.
  - [x] 3. Initialiser analytics dans `frontend/src/main.tsx` et instrumenter les transitions de routes dans `AppLayout.tsx`.
  - [x] 4. Rédiger les tests unitaires frontend dans `frontend/src/lib/analytics.test.ts` (validation anti-PII, fail-open, no-op en mode test).
  - [x] **Tests & Types Frontend :** Valider avec `pnpm --filter frontend typecheck`, `pnpm --filter frontend test` et `pnpm --filter frontend lint`.

- [x] **Phase 3 : Landing Page (`landing/`)**
  - [x] 1. Injecter le script Plausible dans `landing/index.html` avec les attributs `data-domain` et `data-api`.
  - [x] 2. Baliser les boutons d'action clés avec les classes `plausible-event-name=...` (`landing_cta_app_click`, `landing_docs_click`).
  - [x] 3. Insérer la mention d'information réglementaire (mesure d'audience anonyme sans cookie) dans le pied de page / mentions légales.

- [x] **Phase 4 : End-to-End (`tests-e2e/`)**
  - [x] 1. Créer le test Playwright `tests-e2e/tests/app/analytics.spec.ts` simulant la navigation et vérifiant la non-régression de l'application avec et sans mock Plausible.
  - [x] **Tests E2E :** Exécuter la suite Playwright (`pnpm --filter tests-e2e exec playwright test`).

- [ ] **Phase 5 : Synchronisation documentaire (Automatisable via `/sync-current`)**
  - [ ] 1. Répercuter le composant Plausible dans `.specs/current/domains/platform/tech.md`.
  - [ ] 2. Répercuter les règles d'exemption de consentement et d'anti-PII dans `.specs/current/domains/platform/behavior.md`.
  - [ ] 3. Archiver ce delta dans `.specs/changes/archive/011-plausible-analytics-setup.md`.

---

## 10. Definition of Done & Stratégie de tests

### 10.1. Scénarios de validation (Format Gherkin avec tags)

```gherkin
# ==============================================================================
# TESTS E2E (tests-e2e/ - Exécutés contre l'environnement cible)
# ==============================================================================

@e2e @web
Fonctionnalité: Mesure d'audience Plausible et Résilience Fail-Open

  Scénario: Résilience complète en cas d'indisponibilité ou blocage de Plausible
    Étant donné que l'utilisateur navigue sur "https://app.preprod.nanko.dev"
    Et que le domaine "plausible.nanko.dev" est bloqué ou renvoie une erreur réseau
    Quand l'utilisateur clique sur "Connexion" et interagit avec l'interface
    Alors aucun écran d'erreur n'apparaît
    Et l'application reste 100% opérationnelle sans aucun blocage

  Scénario: Transmission d'un événement sans cookie
    Étant donné que l'utilisateur visite la Landing Page
    Quand il clique sur le bouton "Commencer gratuitement"
    Alors une requête "POST /api/event" est interceptée avec l'événement "landing_cta_app_click"
    Et aucun cookie n'est stocké dans le navigateur

# ==============================================================================
# TESTS FRONTEND (frontend/ - Unitaires & Filtre Anti-PII)
# ==============================================================================

@web @unit
Fonctionnalité: Module Analytics & Assainissement Anti-PII

  Scénario: Élimination automatique des données personnelles (PII)
    Quand l'application déclenche l'événement "document_created" avec les propriétés:
      | cle       | valeur                 |
      | format    | nanko                  |
      | email     | utilisateur@test.com   |
      | user_id   | 12345                  |
      | layers    | 3                      |
    Alors le payload transmis à Plausible contient "format" et "layers"
    Mais les champs "email" et "user_id" sont strictement éliminés

  Scénario: Comportement No-op sans configuration
    Étant donné que les variables d'environnement Plausible sont absentes
    Quand la fonction "trackEvent" est appelée
    Alors aucune exception n'est levée et aucune balise script n'est injectée
```

### 10.2. Commandes de validation automatisée

```bash
# 1. Validation Frontend (Types, Tests unitaires et Lint)
pnpm --filter frontend typecheck
pnpm --filter frontend test
pnpm --filter frontend lint

# 2. Validation Infrastructure (Validation syntaxique Compose)
docker compose -f infra/plausible/compose.yaml config

# 3. Validation End-to-End
pnpm --filter tests-e2e exec playwright test tests/app/analytics.spec.ts
```

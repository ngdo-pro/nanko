# Domaine : Plateforme & Livraison Continue (platform) - Modèles & Schéma DB

## 1. Modèle Domaine & Schéma de Données
* **Aucune entité persistée en base de données relationnelle :** Le domaine Plateforme ne possède pas de table SQL dans PostgreSQL.
* Les états de version sont injectés dynamiquement à la compilation/démarrage du conteneur sans état persistant.
* **Datastore Télémétrique Dédié (ADR-0007) :** L'observabilité (traces, métriques, logs) repose sur un moteur ClickHouse dédié et isolé (`signoz-clickhouse-data`) géré par la stack SigNoz, sans aucun impact sur la base PostgreSQL applicative. Les logs applicatifs sont stockés dans la base ClickHouse `signoz_logs` (table `logs_v2`).

---

## 2. DTO Système & Structure de Version

### DTO Réponse Version (`GET /api/v1/version`)
* **Contrôleur :** `backend/src/Adapter/Driver/Http/Controller/System/VersionController.php`

```typescript
export interface VersionResponse {
  status: 'ok'
  version: string      // Format SemVer (ex. "v0.1.0-pr.14.2", "v0.1.0-rc.35", "v0.1.0")
  commit: string       // Hash Git court ou complet (ex. "a1b2c3d4e5f67890")
  environment: string  // Nom de l'environnement ("local", "test", "preprod", "prod")
}
```

---

## 3. Conventions de Versionnement SemVer
* **Branches Pull Request :** `<base-tag>-pr.<pr_number>.<run_number>` (ex. `v0.1.0-pr.14.2`)
* **Branche Main (Release Candidates) :** `<base-tag>-rc.<run_number>` (ex. `v0.1.0-rc.35`)
* **Releases / Tags Git :** `<base-tag>` (ex. `v0.1.0`)
* **Environnement de développement local :** `v0.0.0-dev`

---

## 4. Modèle de Données Télémétrique — LogRecord OpenTelemetry
Les logs applicatifs émis par le Backend Symfony et le Frontend React sont normalisés selon le modèle de données de log OpenTelemetry :

| Champ OTel | Type | Source Backend | Source Frontend | Description |
|---|---|---|---|---|
| `Timestamp` / `timeUnixNano` | uint64 (nanosecondes) | Horodatage précis PHP (microsecondes converties) | `Date.now() * 1_000_000` | Horodatage universel de l'événement |
| `SeverityNumber` | int32 (1..24) | Mappé depuis le niveau Monolog (INFO: 9, WARN: 13, ERROR: 17, CRITICAL: 21) | DEBUG: 5, INFO: 9, WARN: 13, ERROR: 17 | Sévérité numérique normalisée OTel |
| `SeverityText` | string | `DEBUG`, `INFO`, `NOTICE`, `WARNING`, `ERROR`, `CRITICAL` | `DEBUG`, `INFO`, `WARN`, `ERROR` | Libellé textuel de sévérité |
| `Body` | string / value | Message de log Monolog | Message passé au logger ou `error.message` | Corps textuel du message |
| `trace_id` / `traceId` | string (hex 32) | Extrait du span actif via `TracerProvider` | Extrait du span actif via `@opentelemetry/api` (ou généré W3C) | Identifiant W3C 128-bit corrélé avec la trace |
| `span_id` / `spanId` | string (hex 16) | Extrait du span actif via `TracerProvider` | Extrait du span actif via `@opentelemetry/api` | Identifiant W3C 64-bit du span |
| `service.name` | string | `nanko-backend` | `nanko-frontend` | Identifiant de la ressource émettrice |
| `deployment.environment` | string | `local` / `preprod` / `prod` | `local` / `preprod` / `prod` | Environnement d'exécution |
| `attributes` | map<string, value> | Contexte Monolog (`context` + `extra`) | Contexte additionnel (`stack`, `componentStack`, `url`, `userAgent`) | Paires clé-valeur de diagnostic |

---

## 5. Modèle de Données Analytics — Plausible Community Edition

### 5.1. Datastores Mutualisés (ADR-0007)
* **Base Relationnelle PostgreSQL (`plausible`) :** Hébergée sur l'instance `nanko-prod-postgres` existante (PostgreSQL 16). Stocke l'état d'administration, les comptes utilisateurs (`users`), les domaines déclarés (`sites`), les autorisations (`site_memberships`) et les clés API (`api_keys`).
* **Base Analytique ClickHouse (`plausible_events_db`) :** Hébergée sur l'instance `signoz-clickhouse` existante. Stocke les séries temporelles d'audience haute performance compressées en colonnes.

### 5.2. Schéma ClickHouse Principal (`plausible_events_db`)
| Table ClickHouse | Moteur de Table | Rôle |
|---|---|---|
| `events_v2` | `MergeTree` | Enregistrements individuels de pages vues et d'événements personnalisés |
| `sessions_v2` | `SharedReplacingMergeTree` | Sessions de navigation agrégées par visiteur éphémère |
| `location_data` | `Dictionary` / `MergeTree` | Dictionnaire de géolocalisation anonymisée (pays, région, ville) |

### 5.3. Structure d'un Enregistrement d'Événement (`events_v2`)
| Colonne ClickHouse | Type | Description |
|---|---|---|
| `timestamp` | `DateTime` | Horodatage UTC de l'événement |
| `name` | `LowCardinality(String)` | Nom de l'événement (`pageview`, `login_initiated`, etc.) |
| `hostname` | `LowCardinality(String)` | Domaine source (`nanko.dev`, `preprod.nanko.dev`) |
| `pathname` | `String` | Chemin d'accès de la ressource (`/`, `/pricing`, `/dashboard`) |
| `user_id` | `UInt64` | Hachage anonyme éphémère rotatif : `hash(IP + UA + sel_journalier)` (sel détruit toutes les 24h) |
| `session_id` | `UInt64` | Identifiant éphémère de session |
| `operating_system` | `LowCardinality(String)` | Système d'exploitation extrait du User-Agent (ex. `Mac OS`, `Linux`) |
| `browser` | `LowCardinality(String)` | Navigateur extrait du User-Agent (ex. `Chrome`, `Firefox`) |
| `country_code` | `LowCardinality(FixedString(2))` | Code pays ISO-3166-1 extrait de l'IP sans stockage de l'IP |


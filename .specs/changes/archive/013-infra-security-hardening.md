# Change : 013 - Durcissement sécurité de l'infrastructure VPS (Postgres, ClickHouse, Keycloak, OTLP, conteneurs, CI)

## Métadonnées
* **Domaine concerné :** `.specs/current/domains/platform/`
* **Type de changement :** `Évolution` / `Sécurité` (`Fix` sur plusieurs points)
* **Cible :** `Fullstack` (`infra`, `backend/Dockerfile`, `frontend/index.html`, `landing/index.html`, `.github/`, `tests-e2e`)

---

## 1. Intention & Contexte (Le « Why » du Delta)

### Problème résolu / Besoin
Une relecture sécurité de `infra/` (2026-09-06) a mis en évidence des défauts de cloisonnement et de moindre privilège sur le VPS mutualisé qui héberge preprod, prod, SigNoz et Plausible. Aucun secret n'est commité et la chaîne de déploiement *pull-based* (ADR-0010) est saine, mais la compromission d'un seul conteneur périphérique (Plausible, Caddy, collector OTLP) donne aujourd'hui un accès complet aux données métier et aux données d'observabilité.

Constats, par gravité décroissante :

| # | Gravité | Constat | Référence |
|---|---|---|---|
| 1 | Critique | ClickHouse : utilisateur `default` sans mot de passe, `::/0`, `access_management=1`, attaché au réseau `edge` partagé. | `infra/signoz/clickhouse-users.xml:10-16`, `infra/signoz/compose.yaml:18` |
| 2 | Critique | Un seul rôle Postgres **superuser** (`nanko`) partagé par le backend, Keycloak et Plausible ; Postgres prod attaché à `edge` avec alias résolvable. | `infra/prod/compose.yaml:7,21,68`, `infra/plausible/compose.yaml:10` |
| 3 | Important | Ingestion OTLP `otlp.nanko.dev` publique, sans limite de taille ni d'origine (`Access-Control-Allow-Origin: *`, `allowed_origins: http(s)://*`). | `infra/signoz/compose.yaml:111-114`, `infra/signoz/otel-collector-config.yaml` |
| 4 | Important | Console admin Keycloak (`/admin`, realm `master`) exposée à tout Internet ; realm sans `bruteForceProtected` ni `passwordPolicy`. | `infra/prod/compose.yaml:71`, `infra/keycloak/realm-nanko.json` |
| 5 | Important | Images `:latest` (SigNoz ×4, `alpine`) auto-déployées par Watchtower en prod. | `infra/signoz/compose.yaml:35,51,77,98,122` |
| 6 | Important | Dérive doc : `tech.md` annonce un Basic Auth sur `signoz.nanko.dev` (`SIGNOZ_BASICAUTH_HASH`) qui n'existe pas dans `infra/signoz/compose.yaml`. | `.specs/current/domains/platform/tech.md` |
| 7 | Mineur | Actions GitHub épinglées par tag mutable (`@v4`, `@v2`…) et non par SHA. | `.github/workflows/*.yml` |
| 8 | Mineur | Aucun hardening conteneur : root, pas de `cap_drop`, `no-new-privileges`, `read_only`, limites mémoire/PIDs, rotation des logs Docker. | `infra/*/compose.yaml` |
| 9 | Mineur | En-têtes manquants : `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`. HSTS `preload` posé sur des sous-domaines. | labels `caddy.header.*` |
| 10 | Mineur | `localhost` présent dans le realm Keycloak importé en prod et dans `CORS_ALLOW_ORIGIN` prod. | `infra/keycloak/realm-nanko.json:38`, `infra/prod/compose.yaml:36` |
| 11 | Mineur | Aucune sauvegarde Postgres. | `infra/prod/compose.yaml` |
| 12 | Mineur | `/infra/plausible/.env` absent du `.gitignore` ; `KEYCLOAK_ADMIN_PASSWORD` mort dans `infra/preprod/.env.example`. | `.gitignore`, `infra/preprod/.env.example` |
| 13 | Hors repo | Watchtower et caddy-docker-proxy (`~/infra/` sur le VPS) montent le socket Docker (root hôte). | `infra/README.md` |

### Impact utilisateur
* **Utilisateurs finaux (`app.nanko.dev`, `www.nanko.dev`) :** aucun changement fonctionnel. Nouveaux en-têtes de sécurité, d'abord en mode `Report-Only` puis appliqués. La police Google Fonts, Plausible et Keycloak continuent de fonctionner.
* **Développeur / opérateur :** console admin Keycloak accessible uniquement depuis les IP allowlistées ; SigNoz derrière un sas Basic Auth en plus de son login ; nouveaux secrets à provisionner dans `~/.config/nanko/*.env` sur le VPS ; procédure de migration one-shot des rôles Postgres et ClickHouse.
* **CI :** aucun changement de comportement du workflow PR ➔ preprod ➔ E2E. Les actions sont épinglées par SHA et maintenues par Dependabot.

### In Scope (Ce qui est ajouté/modifié)
1. **Postgres — moindre privilège & cloisonnement réseau** : trois rôles applicatifs dédiés (`nanko_app`, `keycloak`, `plausible`) + un rôle `backup` en lecture seule ; superuser `nanko` réservé à l'administration ; retrait de Postgres du réseau `edge` ; Plausible rejoint le réseau interne `nanko-prod_default`.
2. **ClickHouse — authentification & cloisonnement** : utilisateurs `default` (admin, localhost uniquement), `signoz` (bases `signoz_*`), `plausible` (base `plausible_events_db` seule), mots de passe via `from_env` ; retrait de ClickHouse du réseau `edge` ; Plausible rejoint `signoz_default`.
3. **OTLP public — réduction de surface** : CORS restreint aux origines Nanko côté collector, suppression des en-têtes CORS `*` côté Caddy, allowlist de chemins (`/v1/traces`, `/v1/logs`, `/v1/metrics`), taille de corps maximale, `memory_limiter`, suppression de l'extension `zpages`.
4. **Keycloak — verrouillage** : blocage Caddy de `/admin*` et `/realms/master*` hors IP allowlistées (prod et preprod) ; `bruteForceProtected` + `passwordPolicy` dans le realm ; realm par environnement (`infra/keycloak/{local,preprod,prod}/`) sans `localhost` en preprod/prod ; procédure `kcadm` pour appliquer sur les realms déjà importés.
5. **SigNoz** : images épinglées sur les versions effectivement en production ; Basic Auth Caddy sur `signoz.nanko.dev` (alignement avec `tech.md`).
6. **Hardening conteneurs (prod, preprod, signoz, plausible)** : `security_opt: no-new-privileges`, `cap_drop: ALL` + `cap_add` minimal, `read_only` + `tmpfs` pour les conteneurs Caddy statiques, backend FrankenPHP en `www-data` sur `:8080`, limites mémoire/PIDs, rotation des logs Docker.
7. **En-têtes HTTP** : `Content-Security-Policy` (phase `Report-Only` puis enforce), `Referrer-Policy`, `Permissions-Policy` sur `app`, `www` (prod + preprod) ; retrait de `preload` sur HSTS ; externalisation des scripts inline de `frontend/index.html` et `landing/index.html` pour éviter `'unsafe-inline'` sur `script-src`.
8. **CI supply chain** : `uses:` épinglés par SHA complet ; `.github/dependabot.yml` (écosystèmes `github-actions`, `docker`, `composer`, `npm`).
9. **Sauvegarde Postgres** : sidecar `pg_dump` quotidien avec rétention, rôle `backup` dédié, procédure de restauration documentée.
10. **Hygiène repo** : `.gitignore` complété (`/infra/plausible/.env`), `.env.example` alignés, `CORS_ALLOW_ORIGIN` prod sans `localhost`.
11. **Documentation VPS (hors repo)** : section runbook dans `infra/README.md` décrivant la configuration attendue de Watchtower (`--label-enable`, scope) et le passage par un proxy de socket Docker.

### Out of Scope (Exclusions strictes)
* Le déploiement automatique de toute PR vers la preprod (`pr-preprod-e2e.yml`, `packages: write`) : design assumé tant que le projet est mono-contributeur.
* Rate limiting au niveau Caddy sur `otlp.nanko.dev` : nécessite un build custom de caddy-docker-proxy avec `mholt/caddy-ratelimit`, hors repo (`~/infra/` VPS). Documenté comme recommandation, non implémenté ici.
* Copie hors-VPS des sauvegardes Postgres (rclone / S3) : suivi séparé. La sauvegarde locale ne protège pas contre la perte du VPS.
* Durées de vie des jetons Keycloak (`accessTokenLifespan`, refresh) : non touchées.
* Le realm Keycloak `master` lui-même (utilisateurs admin) : bootstrap inchangé (`kc.sh bootstrap-admin`).
* Toute modification de logique métier backend/frontend au-delà du déplacement des scripts inline.

---

## 2. Flux & Architecture (Diff)

Le diagramme illustre les chemins d'attaque fermés par ce delta. Chaque branche `alt` correspond à un constat de la section 1.

```mermaid
sequenceDiagram
    autonumber
    actor Att as Attaquant Internet
    actor Comp as Conteneur compromis (sur `edge`)
    actor Ops as Opérateur (IP allowlistée)
    participant Caddy as Caddy edge (VPS)
    participant KC as Keycloak (auth.nanko.dev)
    participant OTel as OTel Collector (:4318)
    participant CH as ClickHouse (signoz_default)
    participant PG as PostgreSQL (nanko-prod_default)
    participant PL as Plausible

    Note over Att,KC: (4) Console admin Keycloak
    Att->>Caddy: GET https://auth.nanko.dev/admin/master/console/
    Caddy-->>Att: 403 Forbidden (matcher @admin, remote_ip hors allowlist)
    Ops->>Caddy: GET https://auth.nanko.dev/admin/master/console/
    Caddy->>KC: reverse_proxy
    KC-->>Ops: 200 OK (mire admin)
    Att->>Caddy: POST /realms/nanko/protocol/openid-connect/token (bruteforce)
    Caddy->>KC: reverse_proxy
    KC-->>Att: 401 puis verrouillage temporaire (bruteForceProtected, failureFactor)

    Note over Att,CH: (3) Ingestion OTLP publique
    Att->>Caddy: POST https://otlp.nanko.dev/v1/traces (Origin: https://evil.tld, 50 MB)
    Caddy-->>Att: 413 Payload Too Large (request_body max_size)
    Att->>Caddy: GET https://otlp.nanko.dev/debug/tracez
    Caddy-->>Att: 404 Not Found (chemins hors allowlist)
    Att->>Caddy: OPTIONS /v1/logs (Origin: https://evil.tld)
    Caddy->>OTel: reverse_proxy
    OTel-->>Att: 204 sans Access-Control-Allow-Origin (origine refusée)

    Note over Comp,PG: (1)(2) Mouvement latéral depuis un conteneur compromis
    Comp->>CH: tcp://signoz-clickhouse:9000 (user default, sans mot de passe)
    CH-->>Comp: ÉCHEC : hôte injoignable (ClickHouse retiré de `edge`)
    Comp->>PG: postgresql://nanko-prod-postgres:5432 (superuser nanko)
    PG-->>Comp: ÉCHEC : hôte injoignable (Postgres retiré de `edge`)

    Note over PL,PG: Plausible avec rôles dédiés (nominal)
    PL->>PG: postgresql://plausible:***@nanko-prod-postgres:5432/plausible
    PG-->>PL: OK (rôle plausible, base plausible uniquement)
    PL->>PG: SELECT * FROM nanko.public.organisation
    PG-->>PL: ERROR: permission denied for database nanko
    PL->>CH: http://plausible:***@signoz-clickhouse:8123/plausible_events_db
    CH-->>PL: OK (allow_databases = plausible_events_db)
    PL->>CH: SELECT * FROM signoz_logs.logs_v2
    CH-->>PL: Code 497 ACCESS_DENIED
```

---

## 3. Delta Modèle de données & Base de données

Aucune table métier ni migration Doctrine. Le delta porte sur les **rôles, propriétaires et droits** des deux SGBD.

### 3.1. Rôles PostgreSQL (instance `nanko-prod-postgres` / `nanko-preprod-postgres`)

```mermaid
erDiagram
    ROLE_nanko ||--o{ DB_nanko : "superuser (admin uniquement)"
    ROLE_nanko ||--o{ DB_plausible : "superuser (admin uniquement)"
    ROLE_nanko_app ||--|| SCHEMA_public : "OWNER + CONNECT nanko"
    ROLE_keycloak ||--|| SCHEMA_keycloak : "OWNER + CONNECT nanko"
    ROLE_plausible ||--|| DB_plausible : "OWNER + CONNECT"
    ROLE_backup }o--|| DB_nanko : "pg_read_all_data"
    ROLE_backup }o--|| DB_plausible : "pg_read_all_data"

    ROLE_nanko_app {
        string login "LOGIN, NOSUPERUSER, NOCREATEDB"
        string password "APP_DB_PASSWORD"
    }
    ROLE_keycloak {
        string login "LOGIN, NOSUPERUSER, NOCREATEDB"
        string password "KEYCLOAK_DB_PASSWORD"
    }
    ROLE_plausible {
        string login "LOGIN, NOSUPERUSER, NOCREATEDB"
        string password "PLAUSIBLE_DB_PASSWORD"
    }
    ROLE_backup {
        string login "LOGIN, NOSUPERUSER"
        string password "BACKUP_DB_PASSWORD"
    }
```

#### Matrice cible des droits

| Rôle | Base `nanko` / schéma `public` | Base `nanko` / schéma `keycloak` | Base `plausible` | Autre |
|---|---|---|---|---|
| `nanko` (superuser) | tout | tout | tout | Réservé aux opérations manuelles et à `psql` d'administration. Plus utilisé par aucun conteneur applicatif. |
| `nanko_app` | `OWNER` schéma + tables + séquences, `CREATE` (migrations Doctrine) | aucun (`REVOKE USAGE`) | aucun (`REVOKE CONNECT`) | — |
| `keycloak` | aucun (`REVOKE USAGE ON SCHEMA public`) | `OWNER` schéma + tables + séquences | aucun | `search_path=keycloak` |
| `plausible` | aucun | aucun | `OWNER` base + objets | — |
| `backup` | lecture (`pg_read_all_data`) | lecture | lecture | Utilisé exclusivement par le sidecar `pg_dump`. |

#### Script de migration one-shot (`infra/postgres/harden-roles.sql`, exécuté en `nanko` via `psql -v`)

```sql
-- Exécuter : psql -U nanko -d nanko -v app_pwd='...' -v kc_pwd='...' -v pl_pwd='...' -v bk_pwd='...' -f harden-roles.sql
CREATE ROLE nanko_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'app_pwd';
CREATE ROLE keycloak  LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'kc_pwd';
CREATE ROLE plausible LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'pl_pwd';
CREATE ROLE backup    LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD :'bk_pwd';
GRANT pg_read_all_data TO backup;

-- Base nanko : fermeture par défaut puis ouverture nominative
REVOKE CONNECT ON DATABASE nanko FROM PUBLIC;
GRANT  CONNECT ON DATABASE nanko TO nanko_app, keycloak, backup;

-- Schéma public -> nanko_app (PG16 : USAGE reste accordé à PUBLIC par défaut, on le retire)
REVOKE ALL ON SCHEMA public FROM PUBLIC;
ALTER SCHEMA public OWNER TO nanko_app;
GRANT ALL ON SCHEMA public TO nanko_app;
GRANT USAGE ON SCHEMA public TO backup;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO nanko_app', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER SEQUENCE public.%I OWNER TO nanko_app', r.sequencename);
  END LOOP;
END $$;

-- Schéma keycloak -> keycloak
ALTER SCHEMA keycloak OWNER TO keycloak;
GRANT USAGE ON SCHEMA keycloak TO backup;
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'keycloak' LOOP
    EXECUTE format('ALTER TABLE keycloak.%I OWNER TO keycloak', r.tablename);
  END LOOP;
  FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'keycloak' LOOP
    EXECUTE format('ALTER SEQUENCE keycloak.%I OWNER TO keycloak', r.sequencename);
  END LOOP;
END $$;
ALTER ROLE keycloak SET search_path = keycloak;

-- Base plausible -> plausible (objets internes réassignés dans un second psql -d plausible)
REVOKE CONNECT ON DATABASE plausible FROM PUBLIC;
ALTER DATABASE plausible OWNER TO plausible;
GRANT CONNECT ON DATABASE plausible TO plausible, backup;
```

Second passage `psql -U nanko -d plausible` : même boucle `ALTER TABLE/SEQUENCE ... OWNER TO plausible` sur le schéma `public` de la base `plausible`, plus `ALTER SCHEMA public OWNER TO plausible`.

Pour l'environnement local, `infra/local/init-postgres.sql` crée les mêmes rôles avec des mots de passe fixes (`nanko_app`/`nanko_app`, etc., non secrets) et les schémas vides, exécuté une seule fois sur volume vierge.

### 3.2. Utilisateurs ClickHouse (`infra/signoz/clickhouse-users.xml`)

| Utilisateur | Authentification | Réseaux autorisés | Bases | `access_management` | Consommateur |
|---|---|---|---|---|---|
| `default` | `password_sha256_hex` via `from_env="CLICKHOUSE_DEFAULT_PASSWORD_SHA256"` | `::1`, `127.0.0.1` | toutes | `1` | Administration locale (`docker exec`), scripts `docker-entrypoint-initdb.d`. |
| `signoz` | `password_sha256_hex` via `from_env="CLICKHOUSE_SIGNOZ_PASSWORD_SHA256"` | `::/0` (réseau Docker interne uniquement, ClickHouse n'étant plus sur `edge`) | `signoz_traces`, `signoz_metrics`, `signoz_logs`, `signoz_metadata`, `signoz_analytics` (`<allow_databases>`) | `0` | `signoz-query-service`, `signoz-otel-collector`, `signoz-schema-migrator` (DSN `tcp://signoz:${CLICKHOUSE_SIGNOZ_PASSWORD}@clickhouse:9000`). |
| `plausible` | `password_sha256_hex` via `from_env="CLICKHOUSE_PLAUSIBLE_PASSWORD_SHA256"` | `::/0` (idem) | `plausible_events_db` | `0` | Plausible (`CLICKHOUSE_DATABASE_URL=http://plausible:${PLAUSIBLE_CH_PASSWORD}@signoz-clickhouse:8123/plausible_events_db`). |

> [!NOTE]
> Le fichier `users.d/json.xml` est de la configuration, pas de la donnée : il s'applique au redémarrage même sur un volume existant. Aucune perte de données. Les hashes SHA-256 sont générés sur le VPS avec `echo -n "$PWD" | sha256sum` et stockés dans `~/.config/nanko/signoz.env`.

### 3.3. Règles de migration & Intégrité
* **Ordre impératif sur un environnement existant :** (1) créer les rôles/utilisateurs et réassigner les propriétaires **avant** (2) de redéployer les compose avec les nouveaux DSN, sinon crash-loop des conteneurs au démarrage (entrypoint de migration Doctrine, `--import-realm`, Plausible `db migrate`).
* **Rétrocompatibilité :** le rôle `nanko` reste superuser, les DSN actuels continuent de fonctionner pendant la fenêtre de migration. Rollback = revenir aux DSN précédents.
* **Doctrine :** `doctrine_migration_versions` est réassignée à `nanko_app` par la boucle sur `pg_tables`. Les prochaines migrations créent des tables possédées par `nanko_app` (owner du schéma).
* **Keycloak :** `KC_DB_SCHEMA=keycloak` inchangé ; le rôle `keycloak` est propriétaire du schéma, Liquibase Keycloak peut donc créer/altérer.

---

## 4. Delta Contrats d'API & Protocoles

Aucun endpoint applicatif Symfony n'est ajouté ou modifié. Le delta porte sur les réponses du reverse proxy et les en-têtes HTTP.

### 4.1. `auth.nanko.dev` / `auth.preprod.nanko.dev` — verrouillage administration (`Modifié`)
* **Chemins :** `/admin*`, `/realms/master*`
* **Contrôle d'accès :** matcher Caddy `@admin` = `path /admin* /realms/master*` **et** `not remote_ip ${KC_ADMIN_ALLOWED_IPS}`
* **Réponses :**
  * `403 Forbidden` (corps vide) pour toute IP hors allowlist.
  * Comportement Keycloak inchangé pour les IP allowlistées et pour tous les autres chemins (`/realms/nanko/*`, `/resources/*`, `/js/*`).
* **Header preprod :** `X-Robots-Tag` conservé sur toutes les réponses.

### 4.2. `otlp.nanko.dev` — ingestion OTLP/HTTP (`Modifié`)
* **Chemins acceptés :** `POST` et `OPTIONS` sur `/v1/traces`, `/v1/logs`, `/v1/metrics`. Tout autre chemin ➔ `404 Not Found` (matcher `@blocked` = `not path ...`).
* **Taille maximale du corps :** `request_body max_size 2MB` ➔ `413 Payload Too Large` au-delà. *(Valeur estimée : le plus gros batch frontend observé est de quelques dizaines de Ko ; à ajuster après lecture des métriques du collector.)*
* **CORS :** géré par le collector uniquement (suppression des trois labels `caddy.header.Access-Control-*`). Origines autorisées : `https://app.nanko.dev`, `https://www.nanko.dev`, `https://app.preprod.nanko.dev`, `https://www.preprod.nanko.dev`, `http://localhost:*` (dev). Une origine non listée ne reçoit pas `Access-Control-Allow-Origin`, le navigateur bloque la lecture ; le backend Symfony et Keycloak (appels serveur-à-serveur, sans `Origin`) ne sont pas concernés.
* **Collector :** `max_request_body_size: 2_097_152` sur le receiver `otlp/http`, processeur `memory_limiter` en tête de chaque pipeline (`check_interval: 1s`, `limit_mib: 512`, `spike_limit_mib: 128` — estimations, à caler sur la limite mémoire du conteneur), extension `zpages` supprimée.

### 4.3. `signoz.nanko.dev` — UI SigNoz (`Modifié`)
* **Contrôle d'accès :** `caddy.basicauth: "/*"` + `caddy.basicauth.nanko: ${SIGNOZ_BASICAUTH_HASH}` (bcrypt, `caddy hash-password`). Le login applicatif SigNoz reste actif derrière.
* **Réponse anonyme :** `401 Unauthorized`, `WWW-Authenticate: Basic realm="Nanko SigNoz"`.

### 4.4. En-têtes de sécurité (`app`, `www`, prod et preprod) (`Modifié`)

| En-tête | Valeur | Remarque |
|---|---|---|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | `preload` retiré : sans effet sur un sous-domaine tant que l'apex `nanko.dev` n'est pas soumis à la preload list. |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=(), usb=()` | |
| `X-Content-Type-Options` | `nosniff` | inchangé |
| `X-Frame-Options` | `DENY` | inchangé ; `checkLoginIframe: false` et `check-sso` par redirection dans `KeycloakProvider.tsx`, donc aucune iframe same-origin requise. |
| `Content-Security-Policy-Report-Only` (phase 1) puis `Content-Security-Policy` (phase 2) | voir ci-dessous | |

CSP cible pour `app.nanko.dev` (préprod : remplacer les hôtes par `*.preprod.nanko.dev`) :

```text
default-src 'self';
script-src 'self' https://plausible.nanko.dev;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://api.nanko.dev https://auth.nanko.dev https://otlp.nanko.dev https://plausible.nanko.dev;
frame-ancestors 'none';
base-uri 'self';
form-action 'self' https://auth.nanko.dev;
object-src 'none';
upgrade-insecure-requests
```

CSP cible pour `www.nanko.dev` : identique avec `connect-src 'self' https://plausible.nanko.dev` et `form-action 'self'`.

Prérequis frontend/landing : le script inline d'initialisation du thème (`frontend/index.html:12-20`, `landing/index.html:15`) est déplacé dans un fichier statique (`frontend/public/theme-init.js`, `landing/theme-init.js`) pour éviter `'unsafe-inline'` ou un hash à maintenir sur `script-src`. `'unsafe-inline'` reste nécessaire sur `style-src` (attributs `style=` de la landing, injection de styles par certaines bibliothèques React).

---

## 5. Configuration Réseau, Prérequis DNS & Sécurisation des Endpoints

### 5.1. Prérequis DNS Externes
Aucun nouveau sous-domaine. Tous les hôtes existent déjà.

### 5.2. Topologie réseau Docker cible

```mermaid
flowchart LR
    subgraph edge["réseau edge (partagé, Caddy)"]
        Caddy[caddy-docker-proxy]
        BE[nanko-prod-backend]
        KC[nanko-prod-keycloak]
        FE[nanko-prod-frontend]
        LD[nanko-prod-landing]
        PL[plausible]
        SF[signoz-frontend]
        OC[signoz-otel-collector]
    end
    subgraph prodnet["nanko-prod_default"]
        PG[(nanko-prod-postgres)]
        BK[postgres-backup]
    end
    subgraph signoznet["signoz_default"]
        CH[(signoz-clickhouse)]
        QS[signoz-query-service]
        AM[signoz-alertmanager]
    end
    BE --- PG
    KC --- PG
    BK --- PG
    PL --- PG
    PL --- CH
    QS --- CH
    OC --- CH
    SF --- QS
    KC -. OTLP gRPC 4317 .- OC
    BE -. OTLP HTTP 4318 .- OC
```

* `postgres` : **retiré** de `edge` (suppression du bloc `networks.edge` et de l'alias `nanko-prod-postgres`, `container_name` suffit pour la résolution sur `nanko-prod_default`).
* `clickhouse` : **retiré** de `edge`.
* `plausible` : rejoint `edge` (Caddy) + `nanko-prod_default` (Postgres) + `signoz_default` (ClickHouse), déclarés `external: true` avec `name:` explicite. Le projet compose est `-p plausible`, donc les noms réels des réseaux dépendent des `-p` du `Makefile` (`nanko-prod`, `signoz`).
* Preprod : Plausible n'y est pas déployé ; `nanko-preprod-postgres` n'était déjà pas sur `edge`, inchangé.

### 5.3. Matrice d'Exposition et Sécurisation des Endpoints

| Endpoint / Service | Exposition | Authentification & Contrôle d'accès | Mesures de mitigation |
|---|---|---|---|
| `app.nanko.dev`, `www.nanko.dev` | Publique | Keycloak OIDC (app) / aucune (www) | TLS + HSTS, CSP, Referrer-Policy, Permissions-Policy, X-Frame-Options DENY, `read_only` + `tmpfs`, `cap_drop ALL` |
| `api.nanko.dev` | Publique | Bearer JWT RS256 (`/api/v1/version` public) | CORS sans `localhost`, `no-new-privileges`, FrankenPHP en `www-data` sur `:8080`, limites mémoire/PIDs |
| `auth.nanko.dev` (`/realms/nanko/*`) | Publique | Keycloak, `bruteForceProtected`, `passwordPolicy` | TLS + HSTS, X-Robots-Tag (preprod) |
| `auth.nanko.dev` (`/admin*`, `/realms/master*`) | **Restreinte** | Allowlist IP Caddy (`KC_ADMIN_ALLOWED_IPS`) ➔ `403` sinon | idem |
| `otlp.nanko.dev` | Publique | Aucune (télémétrie navigateur) | Allowlist chemins, `request_body max_size 2MB`, CORS origines Nanko, `memory_limiter`, pas de `zpages`. *Rate limiting Caddy : recommandé, hors repo.* |
| `signoz.nanko.dev` | **Restreinte** | Basic Auth Caddy + login SigNoz | X-Robots-Tag, HSTS |
| `plausible.nanko.dev` | Publique | Login Plausible, `DISABLE_REGISTRATION=invite_only` | HSTS, X-Frame-Options |
| `nanko-prod-postgres:5432` | Interne Docker (`nanko-prod_default`) | Rôles dédiés, `REVOKE CONNECT FROM PUBLIC` | Plus joignable depuis `edge` |
| `signoz-clickhouse:9000/8123` | Interne Docker (`signoz_default`) | Utilisateurs authentifiés, `allow_databases`, `default` limité à localhost | Plus joignable depuis `edge` |
| `signoz-otel-collector:4317/4318` | Interne Docker (`edge`, `signoz_default`) | Aucune (réseau interne) | `memory_limiter` |

### 5.4. Variables d'Environnement & Secrets requis

| Variable | Composant | Environnement | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | `compose` (postgres) | preprod, prod | Inchangé. Mot de passe du superuser `nanko`, désormais utilisé **uniquement** par le conteneur `postgres` lui-même. |
| `APP_DB_PASSWORD` | `compose` (backend `DATABASE_URL`) | preprod, prod | **Nouveau.** Rôle `nanko_app`. |
| `KEYCLOAK_DB_PASSWORD` | `compose` (keycloak `KC_DB_PASSWORD`) | preprod, prod | **Nouveau.** Rôle `keycloak`. `KC_DB_USERNAME=keycloak`. |
| `BACKUP_DB_PASSWORD` | `compose` (postgres-backup) | prod (preprod optionnel) | **Nouveau.** Rôle `backup`. |
| `KC_ADMIN_ALLOWED_IPS` | `compose` (labels keycloak) | preprod, prod | **Nouveau.** Liste d'IP/CIDR séparés par des espaces (`203.0.113.4/32 2001:db8::/48`). Si l'IP opérateur est dynamique, prévoir un VPN/IP fixe ou un `127.0.0.1` + tunnel SSH. |
| `PREPROD_HTTP_HASH` | `compose` | preprod | Inchangé. |
| `PLAUSIBLE_DB_PASSWORD` | `compose` (plausible) | prod | **Nouveau.** Rôle Postgres `plausible`. Remplace l'usage de `POSTGRES_PASSWORD`. |
| `PLAUSIBLE_CH_PASSWORD` | `compose` (plausible) | prod | **Nouveau.** Utilisateur ClickHouse `plausible` (clair, côté client). |
| `CLICKHOUSE_DEFAULT_PASSWORD_SHA256` | `compose` (clickhouse) | signoz | **Nouveau.** SHA-256 hex du mot de passe admin. |
| `CLICKHOUSE_SIGNOZ_PASSWORD` / `CLICKHOUSE_SIGNOZ_PASSWORD_SHA256` | `compose` (clickhouse, query-service, otel-collector, schema-migrator) | signoz | **Nouveau.** Clair pour les DSN clients, hash pour `users.xml`. |
| `CLICKHOUSE_PLAUSIBLE_PASSWORD_SHA256` | `compose` (clickhouse) | signoz | **Nouveau.** Doit correspondre à `PLAUSIBLE_CH_PASSWORD` du fichier `plausible.env`. |
| `SIGNOZ_BASICAUTH_HASH` | `compose` (labels signoz-frontend) | signoz | **Nouveau** (déjà documenté dans `tech.md`, jamais implémenté). bcrypt via `caddy hash-password`. |
| `SIGNOZ_ADMIN_EMAIL` / `SIGNOZ_ADMIN_PASSWORD` | `compose` | signoz | Inchangés. |
| `KEYCLOAK_ADMIN_PASSWORD` | — | preprod | **Supprimé** de `infra/preprod/.env.example` (jamais lu). |

Tous ces secrets vivent dans `~/.config/nanko/{preprod,prod,signoz,plausible}.env` (chmod 600), jamais dans le repo. Les `.env.example` sont mis à jour en conséquence et `/infra/plausible/.env` est ajouté au `.gitignore`.

### 5.5. Hardening des conteneurs (prod, preprod, signoz, plausible)

Bloc commun appliqué à chaque service via une ancre YAML `x-hardening` :

```yaml
x-hardening: &hardening
  security_opt: ["no-new-privileges:true"]
  cap_drop: [ALL]
  pids_limit: 256
  logging:
    driver: json-file
    options: { max-size: "10m", max-file: "3" }
```

| Service | Spécificités | Limite mémoire (estimation initiale, à valider sur SigNoz avant enforce) |
|---|---|---|
| `postgres` | `cap_add: [CHOWN, DAC_OVERRIDE, FOWNER, SETGID, SETUID]` (gosu de l'image officielle) | 512M (prod), 256M (preprod) |
| `backend` | Dockerfile : `SERVER_NAME=:8080`, `EXPOSE 8080`, `chown -R www-data /app/var /data /config`, `USER www-data` ; healthcheck sur `:8080/health` ; label `{{upstreams 8080}}` ; aucune `cap_add` | 512M |
| `keycloak` | image déjà non-root (`1000`) ; aucune `cap_add` | 1G |
| `frontend`, `landing` | `read_only: true`, `tmpfs: [/data, /config, /tmp]` ; aucune `cap_add` (port 8080) | 64M |
| `postgres-backup` | `cap_add: [CHOWN, SETGID, SETUID]` | 128M |
| `clickhouse` | `cap_add: [SYS_NICE, NET_ADMIN, IPC_LOCK]` (recommandation officielle) | 2G |
| `signoz-*`, `otel-collector` | aucune `cap_add` | 512M chacun |
| `plausible` | aucune `cap_add` | 512M |

> [!IMPORTANT]
> La liste des `cap_add` est un point de départ : chaque service est démarré en preprod avec `cap_drop: ALL` et la liste proposée, et les capacités manquantes sont ajoutées **une par une** à partir des erreurs de démarrage observées (`docker logs`). Les limites mémoire sont des estimations sans mesure : elles sont d'abord posées avec une marge de 2× par rapport à la consommation observée sur le dashboard SigNoz `platform-overview`, puis resserrées.

### 5.6. Sauvegarde PostgreSQL (`infra/prod/compose.yaml`)

```yaml
  postgres-backup:
    image: prodrigestivill/postgres-backup-local:16-alpine
    <<: *hardening
    restart: unless-stopped
    environment:
      POSTGRES_HOST: nanko-prod-postgres
      POSTGRES_DB: nanko,plausible
      POSTGRES_USER: backup
      POSTGRES_PASSWORD: ${BACKUP_DB_PASSWORD}
      SCHEDULE: "@daily"
      BACKUP_KEEP_DAYS: 7
      BACKUP_KEEP_WEEKS: 4
      BACKUP_KEEP_MONTHS: 3
      HEALTHCHECK_PORT: 8080
    volumes:
      - nanko-prod-postgres-backups:/backups
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      default: {}
```

Procédure de restauration documentée dans `infra/prod/README.md` (`pg_restore` depuis `/backups/daily/...` vers une base temporaire, vérification, bascule). Un test de restauration est exigé dans la DoD.

### 5.7. Supply chain CI (`.github/`)

* Chaque `uses:` des quatre workflows est épinglé sur le SHA complet du commit correspondant au tag actuel, avec le tag en commentaire (`uses: actions/checkout@<sha> # v4.x.y`). Les SHA sont relevés au moment de l'implémentation via `gh api repos/<owner>/<repo>/git/ref/tags/<tag>`, jamais recopiés de mémoire.
* Actions concernées : `actions/checkout`, `shivammathur/setup-php`, `pnpm/action-setup`, `actions/setup-node`, `docker/login-action`, `docker/setup-buildx-action`, `docker/build-push-action`, `dorny/paths-filter`, `actions/upload-artifact`.
* `.github/dependabot.yml` : `github-actions` (racine, hebdomadaire), `docker` (`/backend`, `/frontend`, `/landing`, `/infra/prod`, `/infra/preprod`, `/infra/signoz`, `/infra/plausible`), `composer` (`/backend`), `npm` (`/`).
* Images SigNoz : `signoz/query-service`, `signoz/frontend`, `signoz/signoz-otel-collector` (×2) épinglées sur la version **effectivement en cours d'exécution sur le VPS** (`docker inspect --format '{{index .RepoDigests 0}}' <container>` puis correspondance de tag), pour ne pas introduire de changement de version en même temps que le hardening. `alpine:latest` ➔ `alpine:3.22` (provisioner).

### 5.8. Keycloak : realms par environnement et durcissement

Arborescence cible :

```text
infra/keycloak/
├── local/realm-nanko.json     # redirectUris: http://localhost:45173/*
├── preprod/realm-nanko.json   # redirectUris: https://app.preprod.nanko.dev/*
└── prod/realm-nanko.json      # redirectUris: https://app.nanko.dev/*
```

Montage : `../keycloak/prod:/opt/keycloak/data/import:ro` (idem preprod, local). Attributs ajoutés aux trois realms :

```json
"bruteForceProtected": true,
"permanentLockout": false,
"failureFactor": 5,
"waitIncrementSeconds": 60,
"maxFailureWaitSeconds": 900,
"maxDeltaTimeSeconds": 43200,
"quickLoginCheckMilliSeconds": 1000,
"minimumQuickLoginWaitSeconds": 60,
"passwordPolicy": "length(12) and notUsername and notEmail and passwordHistory(3)"
```

> [!WARNING]
> `start --import-realm` **ignore un realm déjà présent** en base. Sur preprod et prod, ces attributs doivent être appliqués une fois à la main sur le realm existant :
> ```bash
> docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user <admin>
> docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh update realms/nanko \
>   -s bruteForceProtected=true -s failureFactor=5 -s waitIncrementSeconds=60 -s maxFailureWaitSeconds=900 \
>   -s 'passwordPolicy=length(12) and notUsername and notEmail and passwordHistory(3)'
> docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh update clients/<id-nanko-web> -r nanko \
>   -s 'redirectUris=["https://app.nanko.dev/*"]'
> ```
> Le fichier JSON reste la source de vérité pour tout environnement recréé.

### 5.9. Runbook VPS (hors repo, documentation uniquement) — `infra/README.md`
* **Watchtower :** exécuter avec `WATCHTOWER_LABEL_ENABLE=true` (seuls les conteneurs labellisés sont mis à jour, déjà le cas côté labels), `WATCHTOWER_CLEANUP=true`, intervalle 300 s, et accès au démon via `tecnativa/docker-socket-proxy` (`CONTAINERS=1 IMAGES=1 POST=1 NETWORKS=1`, tout le reste à `0`) plutôt que le socket brut.
* **caddy-docker-proxy :** même principe de socket proxy en lecture seule (`CONTAINERS=1 EVENTS=1`, `POST=0`).
* **Rate limiting `otlp.nanko.dev` :** recommandé, nécessite une image Caddy custom (`xcaddy build --with github.com/mholt/caddy-ratelimit`) ; hors périmètre de ce delta.

---

## 6. Delta Maquettes & Layout UI

Aucune interface Nanko n'est modifiée. Les seules surfaces visibles par un humain sont des réponses natives du navigateur :

| Surface | Rendu |
|---|---|
| `auth.nanko.dev/admin` hors allowlist | Page `403 Forbidden` brute de Caddy. |
| `signoz.nanko.dev` anonyme | Invite Basic Auth native du navigateur (`realm="Nanko SigNoz"`). |
| `app.nanko.dev` avec CSP en violation (phase Report-Only) | Aucun impact visuel ; violations visibles dans la console DevTools uniquement. |

---

## 7. Delta Spécifications Client & Tests E2E

### 7.1. Frontend / Landing (déplacement des scripts inline)
* `frontend/public/theme-init.js` : contenu exact du bloc inline actuel de `frontend/index.html:12-20`, référencé par `<script src="/theme-init.js"></script>` dans `<head>`. Comportement identique (lecture synchrone de `localStorage['nanko-theme']` avant le premier rendu, pas de flash de thème).
* `landing/theme-init.js` : idem pour `landing/index.html:15`, ajouté à la liste `COPY` de `landing/Dockerfile`.
* Aucun changement de schéma Zod ni d'état UI.

### 7.2. Tests E2E Playwright — `tests-e2e/tests/app/security-headers.spec.ts` (nouveau, preprod uniquement)

Même garde que `robots.spec.ts` (`test.skip` si `env.appBaseUrl` ne contient pas `preprod.nanko.dev`). Scénarios :

| Test | Requête | Attendu |
|---|---|---|
| En-têtes de sécurité sur l'app | `GET ${APP_BASE_URL}/` (Basic Auth Playwright) | `content-security-policy` **ou** `content-security-policy-report-only` présent et contenant `frame-ancestors 'none'` ; `referrer-policy = strict-origin-when-cross-origin` ; `permissions-policy` contient `camera=()` ; `strict-transport-security` contient `max-age=31536000` et **ne contient pas** `preload`. |
| Console admin Keycloak bloquée | `fetch('https://auth.preprod.nanko.dev/admin/master/console/')` depuis le runner CI (IP non allowlistée) | `403` |
| Realm master bloqué | `fetch('https://auth.preprod.nanko.dev/realms/master/.well-known/openid-configuration')` | `403` |
| Realm nanko toujours accessible | `fetch('https://auth.preprod.nanko.dev/realms/nanko/.well-known/openid-configuration')` | `200`, JSON avec `issuer` |
| OTLP : chemin hors allowlist | `fetch('https://otlp.nanko.dev/debug/tracez')` | `404` |
| OTLP : origine refusée | `OPTIONS https://otlp.nanko.dev/v1/traces` avec `Origin: https://evil.example` | pas d'en-tête `access-control-allow-origin` |
| OTLP : origine Nanko acceptée | `OPTIONS https://otlp.nanko.dev/v1/traces` avec `Origin: https://app.preprod.nanko.dev` | `access-control-allow-origin = https://app.preprod.nanko.dev` |
| SigNoz derrière Basic Auth | `fetch('https://signoz.nanko.dev/')` sans credentials | `401`, `www-authenticate` commence par `Basic` |
| App toujours fonctionnelle sous CSP | scénario existant `auth.spec.ts` (login Keycloak complet) | inchangé, vert. Aucune erreur console `Refused to load` (écoute `page.on('console')`, filtre `Content Security Policy`). |

### 7.3. Vérifications opérateur sur le VPS (scripts `infra/scripts/verify-hardening.sh`, exécution manuelle)

```bash
# Cloisonnement Postgres : depuis le conteneur Plausible, la base nanko doit être refusée
docker exec plausible sh -c 'psql "postgresql://plausible:$PLAUSIBLE_DB_PASSWORD@nanko-prod-postgres:5432/nanko" -c "select 1"'  # attendu : permission denied for database "nanko"
# Le rôle applicatif ne doit pas voir le schéma keycloak (psql via le conteneur postgres, réseau interne)
docker exec nanko-prod-postgres psql "postgresql://nanko_app:$APP_DB_PASSWORD@localhost:5432/nanko" -c "select count(*) from keycloak.user_entity"  # attendu : permission denied for schema keycloak
# Réseau : Postgres et ClickHouse injoignables depuis edge
docker run --rm --network edge alpine:3.22 sh -c 'nc -zvw2 nanko-prod-postgres 5432; nc -zvw2 signoz-clickhouse 9000'  # attendu : 2 échecs de résolution/connexion
# ClickHouse : accès anonyme refusé, plausible cantonné
docker exec plausible sh -c 'wget -qO- "http://signoz-clickhouse:8123/?query=SELECT%201"'  # attendu : 516 Authentication failed
docker exec plausible sh -c 'wget -qO- "http://plausible:$PLAUSIBLE_CH_PASSWORD@signoz-clickhouse:8123/?query=SELECT%20count()%20FROM%20signoz_logs.logs_v2"'  # attendu : 497 ACCESS_DENIED
# Conteneurs : non-root et sans capacités
docker exec nanko-prod-backend id -u   # attendu : uid www-data (33)
docker inspect nanko-prod-frontend --format '{{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}'  # attendu : true [ALL] [no-new-privileges:true]
# Sauvegarde : un dump du jour existe et se restaure
docker exec postgres-backup ls -la /backups/daily/
```

---

## 8. Invariants & Cas Limites (*Edge cases*)

* **Zéro régression fonctionnelle :** le flux OIDC (`check-sso` par redirection, PKCE S256), l'ingestion télémétrie depuis `app`/`www`, Plausible et la boucle CI `/api/v1/version` doivent rester verts avant et après chaque phase.
* **Ordre de migration des rôles :** rôles créés et propriétaires réassignés **avant** tout `compose up` avec les nouveaux DSN. Un `compose up` prématuré met backend/Keycloak/Plausible en crash-loop (visible, non silencieux, conforme à l'ADR-0010) ; rollback = restaurer les DSN précédents.
* **Superuser conservé :** `nanko` reste superuser et n'est référencé par aucun conteneur applicatif. Il n'est jamais supprimé (rollback, administration).
* **Realm Keycloak existant :** l'import ne met pas à jour un realm présent ; les attributs de durcissement et le retrait de `localhost` sont appliqués par `kcadm` sur preprod/prod (section 5.8). Le fichier JSON reste la référence pour toute recréation.
* **Allowlist IP admin Keycloak :** si l'opérateur perd son IP fixe, l'accès admin passe par un tunnel SSH vers le VPS (`ssh -L 8080:nanko-prod-keycloak:8080`) : `127.0.0.1` n'a pas besoin d'être dans la liste puisque le tunnel contourne Caddy. Documenté dans `infra/prod/README.md`.
* **Bruteforce Keycloak et tests E2E :** `failureFactor: 5` ne doit pas verrouiller `e2e-tester@nanko.dev` : les tests ne tentent jamais de mauvais mot de passe. Si un test négatif de login est ajouté plus tard, il devra utiliser un compte dédié.
* **CSP en deux temps :** `Content-Security-Policy-Report-Only` pendant au moins un cycle complet de tests E2E preprod et une navigation manuelle de toutes les pages ; passage en enforce seulement si aucune violation n'est constatée dans la console. Aucun endpoint `report-uri` n'est mis en place (pas de collecteur de rapports CSP ; hors périmètre).
* **`'unsafe-inline'` sur `style-src` :** concession assumée ; `script-src` reste strict grâce à l'externalisation des scripts inline. Aucune directive `script-src` ne doit jamais contenir `'unsafe-inline'` ou `'unsafe-eval'`.
* **CORS OTLP et backend :** le backend Symfony et Keycloak appellent le collector en interne sans en-tête `Origin` ; la restriction CORS ne les affecte pas.
* **`request_body max_size` et lots de logs :** si des `413` apparaissent dans les logs Caddy pour `otlp.nanko.dev`, augmenter la limite plutôt que la supprimer. Le logger frontend est fail-open : un `413` ne casse pas l'application.
* **Idempotence :** `harden-roles.sql` utilise des `CREATE ROLE` non idempotents ; le script est exécuté une seule fois par instance. Pour une ré-exécution, préfixer les `CREATE ROLE` d'un `DROP ROLE IF EXISTS` uniquement si aucun objet n'est encore possédé (sinon `REASSIGN OWNED` d'abord).
* **Read-only rootfs :** seuls `frontend` et `landing` (Caddy statique) passent en `read_only`. Le backend écrit dans `/app/var` (cache Symfony) et Postgres/ClickHouse/Keycloak ont des besoins d'écriture étendus : exclus volontairement.
* **Épinglage SigNoz :** on épingle la version *actuellement* en production pour ne pas coupler mise à jour et hardening. Les montées de version SigNoz deviennent des PR Dependabot explicites.
* **Sauvegarde locale seulement :** protège contre une suppression accidentelle ou un rançongiciel conteneurisé, pas contre la perte du VPS. La copie hors-site est un suivi séparé.
* **Rate limiting OTLP :** non implémenté ici (plugin Caddy hors repo). La surface résiduelle est un déni de service par volume sur ClickHouse, atténuée par `max_size`, `memory_limiter` et la limite mémoire du conteneur.

---

## 9. Plan d'exécution séquentiel

Ordre pensé pour que chaque phase soit déployable et réversible indépendamment. Preprod d'abord, prod ensuite, à chaque phase.

### Phase 0 : Hygiène repo (aucun impact runtime)
- [x] Ajouter `/infra/plausible/.env` au `.gitignore`.
- [x] Retirer `KEYCLOAK_ADMIN_PASSWORD` de `infra/preprod/.env.example`.
- [x] Mettre à jour tous les `.env.example` avec les nouvelles variables (section 5.4).
- [x] Épingler les `uses:` des 4 workflows par SHA (relevés via `gh api`), ajouter `.github/dependabot.yml`.
- [x] Vérifier que CI (`ci.yml`) reste verte.

### Phase 1 : Postgres — rôles dédiés et retrait de `edge`
- [x] Écrire `infra/postgres/harden-roles.sql` (section 3.1) et mettre à jour `infra/local/init-postgres.sql` (rôles + schémas locaux).
- [ ] Local : `make stop`, suppression du volume `nanko-postgres-data`, `make dev`, `make test-backend`, `make test-e2e` verts avec `nanko_app`/`keycloak`.
- [ ] Preprod : exécuter `harden-roles.sql` en `nanko` ; renseigner `APP_DB_PASSWORD`, `KEYCLOAK_DB_PASSWORD` dans `preprod.env` ; modifier `infra/preprod/compose.yaml` (DSN backend, `KC_DB_USERNAME`/`KC_DB_PASSWORD`) ; `make deploy-preprod` ; vérifier `/api/v1/version`, login E2E, `docker logs` Keycloak sans erreur Liquibase.
- [x] Prod : idem + rôle `plausible` + `backup` ; retirer `postgres` du réseau `edge` dans `infra/prod/compose.yaml` ; ajouter le sidecar `postgres-backup` ; `make deploy-prod`.
- [x] Plausible : `infra/plausible/compose.yaml` rejoint `nanko-prod_default`, `DATABASE_URL` sur le rôle `plausible` ; `make deploy-plausible` ; vérifier le dashboard Plausible.
- [ ] Exécuter les vérifications Postgres de la section 7.3.

### Phase 2 : ClickHouse — authentification et retrait de `edge`
- [x] Réécrire `infra/signoz/clickhouse-users.xml` (3 utilisateurs, `from_env`, `allow_databases`).
- [x] Ajouter les DSN authentifiés dans `infra/signoz/compose.yaml` (query-service, otel-collector, schema-migrator) et les variables `CLICKHOUSE_*` ; retirer `clickhouse` de `edge`.
- [x] Épingler les images SigNoz sur les versions en cours (relevées par `docker inspect` sur le VPS), `alpine:3.22`.
- [x] Ajouter Basic Auth Caddy sur `signoz-frontend` (`SIGNOZ_BASICAUTH_HASH`).
- [ ] Local : `make signoz-down`, suppression du volume, `make signoz-up`, vérifier l'ingestion d'une trace depuis `make dev`.
- [ ] VPS : renseigner `signoz.env`, `make deploy-signoz` ; Plausible rejoint `signoz_default` avec `CLICKHOUSE_DATABASE_URL` authentifié ; `make deploy-plausible`.
- [ ] Vérifications ClickHouse de la section 7.3 ; dashboard `platform-overview` toujours alimenté.

### Phase 3 : OTLP public et Keycloak
- [x] `infra/signoz/otel-collector-config.yaml` : `allowed_origins` Nanko, `max_request_body_size`, `memory_limiter` en tête des 3 pipelines, retrait de `zpages`.
- [x] Labels Caddy `otel-collector` : suppression des `Access-Control-*`, ajout `@blocked` ➔ `404`, `request_body max_size 2MB`.
- [x] Découper `infra/keycloak/realm-nanko.json` en `local/`, `preprod/`, `prod/` ; ajouter bruteforce + `passwordPolicy` ; mettre à jour les montages dans les 3 compose.
- [x] Labels Caddy Keycloak (prod + preprod) : matcher `@admin` + `respond 403`, variable `KC_ADMIN_ALLOWED_IPS`.
- [ ] Appliquer `kcadm update realms/nanko` et `update clients/nanko-web` sur preprod puis prod (section 5.8).
- [x] `CORS_ALLOW_ORIGIN` prod sans `localhost` dans `infra/prod/compose.yaml`.
- [ ] Déployer preprod, vérifier login E2E + console admin depuis IP allowlistée + `403` depuis une autre IP ; puis prod.

### Phase 4 : En-têtes HTTP et scripts inline
- [x] `frontend/public/theme-init.js` + `frontend/index.html` ; `landing/theme-init.js` + `landing/index.html` + `landing/Dockerfile`.
- [x] Labels Caddy `app`/`www` (prod + preprod) : `Referrer-Policy`, `Permissions-Policy`, HSTS sans `preload`, `Content-Security-Policy-Report-Only`.
- [ ] Déployer preprod ; naviguer toutes les pages + suite E2E complète ; relever les violations CSP en console. Corriger la CSP si besoin.
- [ ] Basculer `Content-Security-Policy-Report-Only` ➔ `Content-Security-Policy` sur preprod, re-vérifier, puis prod.

### Phase 5 : Hardening des conteneurs
- [x] `backend/Dockerfile` : `SERVER_NAME=:8080`, `EXPOSE 8080`, `chown` de `/app/var`, `/data`, `/config`, `USER www-data`, healthcheck `:8080`. Labels `{{upstreams 8080}}` dans prod/preprod.
- [x] Ancre `x-hardening` + `cap_add` par service + `read_only`/`tmpfs` frontend & landing + `deploy.resources.limits.memory` dans les 4 compose VPS.
- [ ] Preprod : déployer, itérer sur les `cap_add` manquants d'après `docker logs`, laisser tourner 24 h et comparer la mémoire observée sur SigNoz aux limites.
- [ ] Prod, signoz, plausible : déployer avec les valeurs validées.

### Phase 6 : Tests E2E, documentation et synchronisation
- [x] `tests-e2e/tests/app/security-headers.spec.ts` (section 7.2), vert sur preprod via `pr-preprod-e2e.yml`.
- [x] `infra/scripts/verify-hardening.sh` (section 7.3) exécuté sur le VPS, sortie archivée dans la PR.
- [ ] Test de restauration `pg_restore` d'un dump du sidecar vers une base temporaire, documenté dans `infra/prod/README.md`.
- [x] `infra/README.md` : runbook Watchtower / socket proxy / rate limiting recommandé. READMEs preprod, prod, signoz, plausible : nouvelles variables et procédures (`harden-roles.sql`, `kcadm`).
- [ ] `/sync-current platform` : mettre à jour `tech.md` (et corriger au passage les dérives constatées : `deploy-prod.yml` est `workflow_dispatch` et non déclenché sur tag, ClickHouse `25.12` et non `25.1`, groupe de concurrence `preprod-deployment` et non `preprod-shared-env`, Basic Auth SigNoz désormais réel).
- [x] Nouvel ADR `docs/adr/0012-least-privilege-shared-datastores.md` : un rôle par consommateur sur les datastores mutualisés (complète l'ADR-0007).
- [ ] Archiver cette spec dans `.specs/changes/archive/`.

---

## 10. Definition of Done & Stratégie de tests

### 10.1. Scénarios de validation (Gherkin)

```gherkin
@e2e @preprod
Fonctionnalité: En-têtes de sécurité sur l'application
  Scénario: La page d'accueil expose les en-têtes durcis
    Étant donné que je requête "https://app.preprod.nanko.dev/" avec les identifiants Basic Auth
    Alors la réponse contient un en-tête "Content-Security-Policy" ou "Content-Security-Policy-Report-Only" incluant "frame-ancestors 'none'"
    Et l'en-tête "Referrer-Policy" vaut "strict-origin-when-cross-origin"
    Et l'en-tête "Permissions-Policy" contient "camera=()"
    Et l'en-tête "Strict-Transport-Security" contient "max-age=31536000" et ne contient pas "preload"

@e2e @preprod
Fonctionnalité: Console d'administration Keycloak restreinte
  Scénario: Une IP non allowlistée est refusée
    Quand je requête "https://auth.preprod.nanko.dev/admin/master/console/" depuis le runner CI
    Alors le statut HTTP est 403
  Scénario: Le realm master est inaccessible
    Quand je requête "https://auth.preprod.nanko.dev/realms/master/.well-known/openid-configuration"
    Alors le statut HTTP est 403
  Scénario: Le realm nanko reste public
    Quand je requête "https://auth.preprod.nanko.dev/realms/nanko/.well-known/openid-configuration"
    Alors le statut HTTP est 200 et le JSON contient "issuer"

@e2e @preprod
Fonctionnalité: Ingestion OTLP publique à surface réduite
  Scénario: Chemin hors allowlist
    Quand je requête "https://otlp.nanko.dev/debug/tracez"
    Alors le statut HTTP est 404
  Scénario: Origine inconnue refusée
    Quand j'envoie OPTIONS "https://otlp.nanko.dev/v1/traces" avec Origin "https://evil.example"
    Alors la réponse ne contient pas d'en-tête "Access-Control-Allow-Origin"
  Scénario: Origine Nanko acceptée
    Quand j'envoie OPTIONS "https://otlp.nanko.dev/v1/traces" avec Origin "https://app.preprod.nanko.dev"
    Alors l'en-tête "Access-Control-Allow-Origin" vaut "https://app.preprod.nanko.dev"

@e2e @preprod
Fonctionnalité: SigNoz derrière un sas Basic Auth
  Scénario: Accès anonyme
    Quand je requête "https://signoz.nanko.dev/" sans identifiants
    Alors le statut HTTP est 401 et l'en-tête "WWW-Authenticate" commence par "Basic"

@e2e @preprod
Fonctionnalité: Non-régression du parcours d'authentification sous CSP
  Scénario: Connexion Keycloak complète
    Étant donné la CSP déployée sur app.preprod.nanko.dev
    Quand j'exécute le scénario existant de connexion de auth.spec.ts
    Alors le tableau de bord s'affiche
    Et aucun message console ne contient "Content Security Policy"

@ops @vps
Fonctionnalité: Cloisonnement des datastores mutualisés
  Scénario: Plausible ne voit pas la base métier
    Quand le conteneur plausible se connecte à la base "nanko" avec le rôle "plausible"
    Alors Postgres répond "permission denied for database"
  Scénario: Le backend ne voit pas le schéma Keycloak
    Quand le rôle "nanko_app" lit "keycloak.user_entity"
    Alors Postgres répond "permission denied for schema keycloak"
  Scénario: Postgres et ClickHouse ne sont plus joignables depuis edge
    Quand un conteneur attaché uniquement au réseau "edge" tente nanko-prod-postgres:5432 et signoz-clickhouse:9000
    Alors les deux connexions échouent
  Scénario: ClickHouse refuse l'anonyme et cantonne plausible
    Quand une requête sans identifiants atteint signoz-clickhouse:8123
    Alors ClickHouse répond 516 Authentication failed
    Quand l'utilisateur "plausible" lit "signoz_logs.logs_v2"
    Alors ClickHouse répond 497 ACCESS_DENIED

@ops @vps
Fonctionnalité: Conteneurs durcis et sauvegardes
  Scénario: Backend non-root
    Quand j'exécute "id -u" dans nanko-prod-backend
    Alors l'uid est celui de www-data
  Scénario: Frontend en lecture seule sans capacités
    Quand j'inspecte nanko-prod-frontend
    Alors ReadonlyRootfs est true, CapDrop contient ALL et SecurityOpt contient "no-new-privileges:true"
  Scénario: Un dump quotidien existe et se restaure
    Étant donné un fichier dans /backups/daily/ daté du jour
    Quand je le restaure dans une base temporaire "nanko_restore_test"
    Alors "select count(*) from organisation" retourne le même nombre qu'en prod
```

### 10.2. Commandes de validation automatisée

```bash
# Repo / CI
make lint && make static-analysis && make deptrac && make test-backend
pnpm --filter frontend typecheck && pnpm --filter frontend test
grep -rn 'uses: .*@v[0-9]' .github/workflows/ && echo "KO: action non épinglée par SHA" || echo "OK: actions épinglées"
grep -rn ':latest' infra/ && echo "KO: image :latest" || echo "OK: pas d'image :latest"
git check-ignore -q infra/plausible/.env && echo "OK: plausible .env ignoré"

# E2E preprod (via pr-preprod-e2e.yml ou en local avec APP_BASE_URL + PREPROD_HTTP_*)
APP_BASE_URL=https://app.preprod.nanko.dev pnpm --filter tests-e2e exec playwright test tests/app/security-headers.spec.ts tests/app/auth.spec.ts

# VPS (manuel, sortie archivée dans la PR)
ssh nanko-vps 'bash -s' < infra/scripts/verify-hardening.sh
```

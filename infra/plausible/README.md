# Plausible Analytics — Stack Mutualisée

Stack d'analytics produit et mesure d'audience anonyme (Plausible Community Edition), sans cookie et exemptée de consentement (RGPD/CNIL).

## Architecture & Mutualisation des Données (ADR-0007, ADR-0012)
* **Conteneur applicatif unique :** `plausible` (`ghcr.io/plausible/community-edition:v2.1.4`).
* **PostgreSQL partagé :** Utilise l'instance PostgreSQL 16 existante sur la base dédiée `plausible` avec le rôle applicatif dédié `plausible` (`PLAUSIBLE_DB_PASSWORD`), sans accès à la base `nanko`.
* **ClickHouse partagé :** Utilise l'instance ClickHouse existante de SigNoz (`signoz-clickhouse`) sur la base `plausible_events_db` avec l'utilisateur dédié `plausible` (`PLAUSIBLE_CH_PASSWORD`), sans accès aux bases `signoz_*`.
* **Réseaux :** Rattaché à `edge` (ingress Caddy), `nanko-prod_default` (Postgres) et `signoz_default` (ClickHouse).

## Variables d'Environnement (`~/.config/nanko/plausible.env`)
* `PLAUSIBLE_SECRET_KEY_BASE`
* `PLAUSIBLE_DB_PASSWORD`
* `PLAUSIBLE_CH_PASSWORD`
* `PLAUSIBLE_ADMIN_PWD`

## Déploiement VPS
```bash
make deploy-plausible
```

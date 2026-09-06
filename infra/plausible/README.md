# Plausible Analytics — Stack Mutualisée

Stack d'analytics produit et mesure d'audience anonyme (Plausible Community Edition), sans cookie et exemptée de consentement (RGPD/CNIL).

## Architecture & Mutualisation des Données
* **Conteneur applicatif unique :** `plausible` (`ghcr.io/plausible/community-edition:v2.1.4`).
* **PostgreSQL partagé :** Utilise l'instance PostgreSQL 16 existante sur la base dédiée `plausible` (`CREATE DATABASE plausible;`), respectant l'ADR-0007.
* **ClickHouse partagé :** Utilise l'instance ClickHouse existante de SigNoz (`signoz-clickhouse`) sur la base `plausible_events_db`.
* **Réseau :** Rattaché au réseau externe `edge` géré par Caddy.

## Déploiement VPS
```bash
make deploy-plausible
```

# ADR-007 : PostgreSQL unique comme runtime source de vérité pour le MVP

* **Statut :** Validé (Amendé)
* **Date :** 2026-08-30
* **Impact :** `backend` | `infra`

## 1. Contexte & Problématique
Lors de la conception initiale, l'adjonction de Redis pour la mise en cache de sessions/requêtes et d'un moteur de recherche dédié (type Elasticsearch ou Meilisearch) pour indexer les schémas d'architecture avait été envisagée.  
Quelle infrastructure de persistance retenir pour le MVP sans tomber dans l'écueil de la sur-ingénierie et de la dispersion des datastores ?

## 2. Options techniques étudiées
* **Option A : Multi-datastores dès le départ (PostgreSQL + Redis + Moteur de recherche dédié)**
  * *Inconvénients :* Optimisation prématurée sans métriques réelles de charge ; complexité opérationnelle démultipliée sur un VPS modeste ; synchronisation asynchrone fragile entre la base primaire et le moteur d'indexation ; consommation mémoire excessive.
* **Option B : PostgreSQL comme unique source de vérité relationnelle et moteur de recherche intégré**
  * *Avantages :* Exploitation d'un seul moteur de base de données ultra-éprouvé (PostgreSQL 16) ; transactions ACID natives ; recherche full-text intégrée (`to_tsvector`, index GIN) amplement suffisante pour la volumétrie initiale ; sauvegardes unifiées (`pg_dump`).

## 3. Décision
Retenir l'**Option B** : PostgreSQL seul pour l'ensemble des données métier de l'application Nanko (Organisations, Membres, Projets, Documents, AST).

**Amendement Télémétrie (2026-08) :** L'introduction de SigNoz (adossé à ClickHouse) et Plausible Community Edition sur l'infrastructure partagée constitue une exception d'infrastructure explicitement documentée. ClickHouse gère exclusivement les séries temporelles et les volumes massifs de logs/traces/métriques sans jamais intervenir dans le chemin de requête métier ni dans le modèle relationnel de Nanko.

## 4. Justifications & Conséquences
* **Sobriété d'infrastructure :** Réduction drastique de la consommation mémoire et CPU sur le VPS.
* **Intégrité forte :** Cohérence immédiate sans gestion de caches distribués ni synchronisation inter-datastores.
* **Évolutivité maîtrisée :** L'introduction de Redis ou d'un moteur de recherche externe reste envisageable ultérieurement, uniquement lorsque des patterns d'accès mesurés et une volumétrie concrète le justifieront.

# ADR-012 : Cloisonnement et principe de moindre privilège sur les datastores mutualisés

* **Statut :** Validé
* **Date :** 2026-09-07
* **Impact :** `infra` | `backend`

## 1. Contexte & Problématique
Sur l'infrastructure mutualisée du VPS où cohabitent l'application Nanko, Keycloak (IAM), Plausible Analytics et la stack d'observabilité SigNoz (ADR-0007), comment prévenir le risque d'élévation de privilèges ou de mouvement latéral si l'un des composants périphériques venait à être compromis ?  
L'utilisation historique d'un superutilisateur unique (`nanko`) ou d'un réseau Docker partagé universel créait une surface d'attaque inacceptable.

## 2. Options techniques étudiées
* **Option A : Mutualisation permissive (Rôle superadmin partagé & réseau universel)**
  * *Inconvénients :* Tous les conteneurs partagent les mêmes droits d'accès ; une faille dans un service tiers (ex: conteneur analytics) donnerait immédiatement accès en lecture/écriture à l'annuaire Keycloak et aux données applicatives Nanko ; audit de sécurité non conforme.
* **Option B : Cloisonnement strict des rôles par schéma/base et isolement réseau Docker interne**
  * *Avantages :* Application rigoureuse du principe de moindre privilège ; chaque composant dispose d'un compte utilisateur dédié restreint à son propre schéma de base ; les serveurs de base de données sont totalement retirés du réseau public `edge` et ne communiquent que sur des sous-réseaux internes étanches.

## 3. Décision
Retenir l'**Option B** : Cloisonnement granulaire des datastores (PostgreSQL et ClickHouse) :

1. **Rôles PostgreSQL dédiés par composant :**
   * `nanko_app` : propriétaire exclusif du schéma `public` de la base `nanko` (migrations et requêtes applicatives). Zéro accès au schéma `keycloak` ni à la base `plausible`.
   * `keycloak` : propriétaire exclusif du schéma `keycloak` de la base `nanko`. Zéro accès au schéma `public`.
   * `plausible` : propriétaire exclusif de la base distincte `plausible`.
   * `backup` : rôle de lecture seule (`pg_read_all_data`) restreint au sidecar de sauvegarde.
2. **Cloisonnement ClickHouse (Télémétrie) :**
   * L'utilisateur `default` non authentifié est strictement restreint à `localhost` (`127.0.0.1`, `::1`) avec mot de passe fort.
   * Des utilisateurs dédiés (`signoz`, `plausible`) disposent de mots de passe injectés par l'environnement et de permissions scopées à leurs bases respectives (`allow_databases`).
3. **Isolement Réseau Interne :**
   * Les serveurs PostgreSQL et ClickHouse sont exclus du réseau partagé `edge` (réservé au reverse proxy Caddy).
   * Ils ne communiquent qu'au travers des réseaux Docker internes dédiés (`nanko-prod_default`, `signoz_default`), rendant impossible tout mouvement latéral depuis un conteneur d'entrée compromis.

## 4. Justifications & Conséquences
* **Sécurité & Défense en Profondeur :** Une compromission d'un service applicatif ne permet en aucun cas d'accéder aux données des autres tenants ou composants.
* **Traçabilité :** Les logs d'audit et de connexion de PostgreSQL identifient précisément le composant source de chaque requête.
* **Contrepartie assumée :** Scripts d'initialisation SQL légèrement plus étoffés lors du provisionnement initial du VPS.

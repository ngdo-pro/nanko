# ADR-008 : Analytics respectueuses de la vie privée avec Plausible auto-hébergé

* **Statut :** Validé (Livré en prod via spec 011)
* **Date :** 2026-09-01
* **Impact :** `infra` | `frontend` | `landing`

## 1. Contexte & Problématique
Nanko a besoin de mesurer l'audience de sa landing page et l'usage de la web app sans dégrader l'expérience utilisateur par un bandeau de cookies intrusif et sans compromettre la conformité RGPD.

## 2. Options techniques étudiées
* **Option A : Google Analytics (GA4)**
  * Inconvénients : Collecte de données personnelles, transferts transatlantiques, bandeau de consentement aux cookies (CMP) obligatoire bloquant la navigation.
* **Option B : Plausible Analytics auto-hébergé sur le VPS**
  * Avantages : Aucune utilisation de cookies, conformité RGPD native par conception, script ultra-léger (< 1 Ko), respect total de la vie privée des utilisateurs, hébergement souverain sur l'infrastructure existante adossé à ClickHouse et PostgreSQL.

## 3. Décision
Option B : Déploiement de Plausible Analytics en conteneur Docker auto-hébergé avec proxy inverse Caddy, sans aucun bandeau cookie nécessaire.

## 4. Justifications & Conséquences
* Zéro friction pour les visiteurs de la landing page (aucun bandeau RGPD à valider).
* Données d'audience hébergées sur le propre VPS de Nanko.

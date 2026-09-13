# Système de Développement Spec-Driven (Nanko)

Ce dépôt applique une méthodologie de développement piloté par les spécifications (Spec-Driven Development) documentée sous `.specs/`.

## 1. Principes Fondamentaux

> [!IMPORTANT]
> **Loi d'Airain : Zéro Travail Hors Chaîne (`Initiative` ➔ `Feature` ➔ `Spec` ➔ `Code`).**  
> Il est **strictement interdit** d'effectuer du travail "fait à part", d'écrire du code ad-hoc, de prototyper ou de retoucher l'application sans passer par la chaîne continue de traçabilité :
> 1. **Initiative** : Rattachée à une initiative active sous `.specs/initiatives/active/<nom-initiative>/`.
> 2. **Feature** : Cadrée dans la feuille de route de l'initiative (`planned/<slug>.md` ou `active/<slug>.md`).
> 3. **Spec** : Spécifiée techniquement sous `.specs/specs/active/XXX-<slug>.md` avec approbation préalable.
> Toute demande utilisateur (même brève ou corrective) doit être rattachée à cette chaîne via le `product-orchestrator` avant d'ouvrir un chantier technique.

1. **La base de connaissance vivante (`.specs/knowledge/domains/[domaine]/`) est la source de vérité.**
   * Chaque domaine possède `behavior.md` (UX & règles métier), `tech.md` (architecture), `contracts.md` (endpoints REST & schémas Zod, adossé à `openapi.yaml`), et `models.md` (schéma SQL DBAL et agrégats Core).
2. **Traçabilité Linéaire Absolue :**
   * Aucun fichier source ne doit être modifié sans qu'une Spec active ne référence précisément cette modification dans son inventaire de fichiers (Section 3.1) et ne l'associe à sa Feature parente.
3. **Qualité et vérification impérative (Quality Gates) :**
   * Backend : `make deptrac`, `make test-backend`, `make static-analysis`, `make lint`.
   * Frontend : `pnpm --filter frontend test` (suite complète), `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint`.
   * E2E : `pnpm --filter tests-e2e test` (suite E2E globale complète) obligatoirement en local avant tout commit/push et validation de review.
4. **Synchronisation et archivage post-livraison (`/sync-knowledge`) :**
   * Une fois le code et les tests validés, les modifications sont répercutées dans `.specs/knowledge/domains/[domaine]/` via les sub-skills dédiés (`sync-behavior`, `sync-contracts`, `sync-models`, `sync-tech`) et la spec est archivée dans `.specs/specs/archive/`.
5. **Invariance Spec-Code (Zéro dérive en cours de vol) :**
   * Toute demande d'ajustement, de retrait ou de pivot sur une spec active formulée en cours de route (pendant ou après `/build-spec`) DOIT obligatoirement être répercutée dans le fichier `.specs/specs/active/XXX-*.md` immédiatement (via `/update-spec` ou de manière proactive par l'agent avant de coder).
   * Le code et la spec active doivent TOUJOURS être parfaitement alignés : il est strictement interdit de modifier le comportement sans mettre à jour le contrat documentaire correspondant.
6. **Réflexe de Test Systématique & Synchronisation Gherkin (Skill `test-spec`) :**
   * Toute modification de comportement, logique, géométrie, règle métier ou cas limite DOIT s'accompagner de ses tests unitaires ou d'intégration.
   * Tout test ajouté ou modifié DOIT obligatoirement être répercuté sous forme de scénario Gherkin dans la Section 8 de la spec active (`.specs/specs/active/XXX-*.md`). L'agent ne doit jamais omettre d'écrire les tests correspondants ni d'aligner les scénarios de la spec.
7. **Exécution Locale Obligatoire des Tests E2E Globaux (Zéro Découverte en CI) :**
   * Pendant l'itération de développement, l'exécution ciblée (`pnpm --filter tests-e2e test <spec>`) est utile pour aller vite.
   * **Porte de Qualité & Reviewer :** Le reviewer (Clean-Room Reviewer) et la validation QA finale DOIVENT impérativement exécuter la **suite E2E globale** (`pnpm --filter tests-e2e test`) ainsi que les suites globales unitaires (`pnpm --filter frontend test`, `make test-backend`) AVANT tout commit, push ou ouverture de Pull Request.
   * Il est formellement interdit de se contenter d'un test ciblé pour valider un delivery : les régressions collatérales sur les parcours adjacents (interactions canvas, drag & drop, sélection) doivent être détectées en local et non en CI.
8. **Portabilité et Liens Markdown Relatifs Stricts :**
   * Tout lien Markdown (`[texte](cible)`) au sein des spécifications, initiatives, ADRs/PDRs ou fichiers de knowledge DOIT impérativement être un chemin relatif au fichier source (ex: `../../../decisions/architecture/ADR-0002.md`, `./openapi.yaml`).
   * Il est formellement interdit d'insérer des chemins absolus machine (`/Users/...`, `file:///...`, `C:\...`).
9. **Routage Obligatoire vers le `product-orchestrator` :**
   * Dès que l'utilisateur mentionne ou aborde le **produit** (vision, cadrage, fonctionnalités/features, feuille de route, décisions produit PDR, expérience utilisateur UX, parcours utilisateurs ou règles métier) :
   * L'agent DOIT **obligatoirement et systématiquement déclencher le workflow du `product-orchestrator`** avant toute tentative d'implémentation ou de spécification technique.

## 2. Invariants d'Architecture (cf. .specs/architecture.md & ADR 0011)
* **Backend (`backend/`) :** Architecture hexagonale stricte avec Doctrine DBAL (pas d'ORM).
  * `Core/Domain` (entités et value objects purs, identifiants UUIDv7)
  * `Core/Port` (interfaces Repository)
  * `Core/UseCase` (Command/Handler)
  * `Adapter/Driven/Persistence` (repositories DBAL et hydratation manuelle)
  * `Adapter/Driver/Http/Controller` (contrôleurs HTTP et DTOs d'entrée avec contraintes `Assert\*`).
* **Frontend (`frontend/`) :** React 19, TypeScript strict, TanStack Query, validation Zod systématique, Tailwind CSS.

---

## 3. Orchestrateurs & Routage des Workflows

### A. `product-orchestrator` (Déclencheur Produit)
* **Quand se déclenche-t-il ?**
  * Dès que l'utilisateur parle de produit, d'idée de feature, d'ergonomie, de scope, de backlog, de priorisation ou de règles métier.
* **Protocole d'exécution :**
  1. **Analyse de Contexte :** Identifier l'initiative concernée (`.specs/initiatives/active/<initiative>/`) et le domaine fonctionnel associé (`.specs/knowledge/domains/<domaine>/`).
  2. **Cadrage de la Feature :** Créer ou affiner le document de feature (`planned/<slug>.md` ou `active/<slug>.md`) avec problème/déclencheur, wireframe/visual ASCII, parcours nominal et invariants métier.
  3. **Décisions Produit (PDR) :** Si un arbitrage structurant UX/produit émerge, créer le PDR correspondant sous `.specs/decisions/product/PDR-xxx-<slug>.md`.
  4. **Alignement Comportemental :** Mettre à jour `behavior.md` (personas, fiches de parcours `JRN-xx`, invariants `INV-BUS-xx`).
  5. **Mise à Jour de la Roadmap :** Inscrire et ordonnancer la feature dans le `README.md` de l'initiative.
  6. **Validation Utilisateur :** Présenter la synthèse du cadrage produit pour alignement avant tout passage au `delivery-orchestrator`.

### B. `delivery-orchestrator` (Déclencheur Delivery & Technique)
* **Quand se déclenche-t-il ?**
  * Lorsque l'utilisateur demande d'implémenter, coder, délivrer une feature cadrée, ou formule explicitement `delivery orchestrator, go`.
* **Protocole d'exécution :**
  1. **Spec Framing :** Spécification technique découpée (`.specs/specs/active/XXX-<slug>.md`) selon `SPEC_TEMPLATE.md` avec approbation utilisateur.
  2. **Implémentation :** Écriture du code (frontend, backend, schémas).
  3. **Quality Gates & QA :** Exécution **globale** obligatoire (`pnpm --filter frontend test`, `make test-backend`, `make deptrac`, `pnpm --filter tests-e2e test`).
  4. **Clean-Room Review :** Audit strict d'invariants et de périmètre.
  5. **Capitalisation & Release :** Synchronisation `behavior.md` / `tech.md`, archivage de la spec/feature, génération du `walkthrough.md` et création de la PR GitHub.

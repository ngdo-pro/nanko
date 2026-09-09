# Système de Développement Spec-Driven (Nanko)

Ce dépôt applique une méthodologie de développement piloté par les spécifications (Spec-Driven Development) documentée sous `.specs/`.

## 1. Principes Fondamentaux
1. **L'état courant (`.specs/current/domains/[domaine]/`) est la source de vérité vivante.**
   * Chaque domaine possède `behavior.md` (UX & règles métier), `tech.md` (architecture), `contracts.md` (endpoints REST & schémas Zod), et `models.md` (schéma SQL DBAL et agrégats Core).
2. **Tout changement non trivial passe par un Delta (`.specs/changes/active/XXX-[nom].md`).**
   * Un delta est rédigé selon `.specs/CHANGE_TEMPLATE.md` avec diagrammes Mermaid, wireframes ASCII, DTOs avec validation, schéma Zod et scénarios Gherkin.
3. **Qualité et vérification impérative (Quality Gates) :**
   * Backend : `make deptrac`, `make test-backend`, `make static-analysis`, `make lint`.
   * Frontend : `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint`.
   * E2E : `pnpm --filter tests-e2e exec playwright test`.
4. **Synchronisation et archivage post-livraison :**
   * Une fois le code et les tests validés, les modifications sont répercutées dans `.specs/current/domains/[domaine]/` et la spec est archivée dans `.specs/changes/archive/`.
5. **Invariance Spec-Code (Zéro dérive en cours de vol) :**
   * Toute demande d'ajustement, de retrait ou de pivot sur une spec active formulée en cours de route (pendant ou après `/build-spec`) DOIT obligatoirement être répercutée dans le fichier `.specs/changes/active/XXX-*.md` immédiatement (via `/update-spec` ou de manière proactive par l'agent avant de coder).
   * Le code et la spec active doivent TOUJOURS être parfaitement alignés : il est strictement interdit de modifier le comportement sans mettre à jour le contrat documentaire correspondant.
6. **Réflexe de Test Systématique & Synchronisation Gherkin (Skill `test-spec`) :**
   * Toute modification de comportement, logique, géométrie, règle métier ou cas limite DOIT s'accompagner de ses tests unitaires ou d'intégration.
   * Tout test ajouté ou modifié DOIT obligatoirement être répercuté sous forme de scénario Gherkin dans la Section 10 de la spec active (`.specs/changes/active/XXX-*.md`). L'agent ne doit jamais omettre d'écrire les tests correspondants ni d'aligner les scénarios de la spec.

## 2. Invariants d'Architecture (cf. .specs/architecture.md & ADR 0011)
* **Backend (`backend/`) :** Architecture hexagonale stricte avec Doctrine DBAL (pas d'ORM).
  * `Core/Domain` (entités et value objects purs, identifiants UUIDv7)
  * `Core/Port` (interfaces Repository)
  * `Core/UseCase` (Command/Handler)
  * `Adapter/Driven/Persistence` (repositories DBAL et hydratation manuelle)
  * `Adapter/Driver/Http/Controller` (contrôleurs HTTP et DTOs d'entrée avec contraintes `Assert\*`).
* **Frontend (`frontend/`) :** React 19, TypeScript strict, TanStack Query, validation Zod systématique, Tailwind CSS.

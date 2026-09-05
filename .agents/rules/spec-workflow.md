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

## 2. Invariants d'Architecture (cf. .specs/architecture.md & ADR 0011)
* **Backend (`backend/`) :** Architecture hexagonale stricte avec Doctrine DBAL (pas d'ORM).
  * `Core/Domain` (entités et value objects purs, identifiants UUIDv7)
  * `Core/Port` (interfaces Repository)
  * `Core/UseCase` (Command/Handler)
  * `Adapter/Driven/Persistence` (repositories DBAL et hydratation manuelle)
  * `Adapter/Driver/Http/Controller` (contrôleurs HTTP et DTOs d'entrée avec contraintes `Assert\*`).
* **Frontend (`frontend/`) :** React 19, TypeScript strict, TanStack Query, validation Zod systématique, Tailwind CSS.

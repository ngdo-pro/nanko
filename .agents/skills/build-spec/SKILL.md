---
name: build-spec
description: Implémenter le code Backend et Frontend, jouer les migrations et valider les quality gates pour une spec delta active.
---

# Skill : build-spec

Utilisez ce skill lorsque l'utilisateur demande d'implémenter une spécification validée (`/build-spec [id]`).

## Procédure

1. **Chargement de la spec :**
   * Lire `.specs/changes/active/[id]*.md`, `.specs/architecture.md` et l'état courant du domaine.
2. **Implémentation Backend (`backend/`) :**
   * Migrations Doctrine (`backend/migrations/`). Clés UUIDv7.
   * `Core/Domain`, `Core/Port`, `Core/UseCase`.
   * `Adapter/Driven/Persistence` (DBAL DoctrineRepository) et `Adapter/Driver/Http/Controller` (contrôleurs et DTOs avec contraintes `Assert\*`).
   * Tests unitaires (`backend/tests/Unit/`) et d'intégration (`backend/tests/Integration/`).
3. **Implémentation Frontend (`frontend/`) :**
   * Schémas Zod et types dans `frontend/src/features/[feature]/schemas.ts`.
   * Hooks TanStack Query et composants UI (gestion des 5 états : Idle, Submitting, Error Validation, Error Server, Success).
4. **Implémentation E2E (`tests-e2e/`) :**
   * Tests Playwright dans `tests-e2e/tests/` d'après les scénarios Gherkin.
5. **Quality Gates :**
   * Exécuter :
     * `make deptrac`
     * `make test-backend`
     * `make static-analysis`
     * `make lint`
   * Corriger immédiatement toute anomalie jusqu'à 100 % de succès.
6. **Mise à jour et confirmation :**
   * Cocher les tâches du plan dans la spec active.
   * Inviter l'utilisateur à exécuter `/sync-current [id]`.

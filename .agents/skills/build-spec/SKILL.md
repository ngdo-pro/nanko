---
name: build-spec
description: Implémenter le code Backend et Frontend, jouer les migrations et valider les quality gates pour une spec delta active.
---

# Skill : build-spec

Utilisez ce skill lorsque l'utilisateur demande d'implémenter une spécification validée (`/build-spec [id]`).

## Procédure

1. **Chargement de la spec :**
   * Lire `.specs/changes/active/[id]*.md`, `.specs/architecture.md` et l'état courant du domaine.
   * *Règle d'invariance :* Si l'utilisateur demande un ajustement, un retrait ou une modification de scope en cours de dev, mettre à jour immédiatement la spec active (via `/update-spec`) avant d'altérer le code.
2. **Implémentation Backend (`backend/`) :**
   * Migrations Doctrine (`backend/migrations/`). Clés UUIDv7.
   * `Core/Domain`, `Core/Port`, `Core/UseCase`.
   * `Adapter/Driven/Persistence` (DBAL DoctrineRepository) et `Adapter/Driver/Http/Controller` (contrôleurs et DTOs avec contraintes `Assert\*`).
   * Tests unitaires (`backend/tests/Unit/`) et d'intégration (`backend/tests/Integration/`).
3. **Implémentation Frontend (`frontend/`) :**
   * Schémas Zod et types dans `frontend/src/features/[feature]/schemas.ts`.
   * Hooks TanStack Query et composants UI (gestion des 5 états : Idle, Submitting, Error Validation, Error Server, Success).
   * **Variables d'environnement `VITE_*` :** En cas d'ajout ou modification de variables dans `frontend/src/config/env.ts` et `frontend/Dockerfile`, répercuter obligatoirement les variables et `build-args` dans TOUS les workflows CI/CD (`.github/workflows/deploy-prod.yml`, `deploy-preprod.yml`, `pr-preprod-e2e.yml`).
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

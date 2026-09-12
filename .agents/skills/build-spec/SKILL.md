---
name: build-spec
description: Implémenter le code Backend et Frontend, jouer les migrations et valider les quality gates pour une spec delta active.
---

# Skill : build-spec

Utilisez ce skill lorsque l'utilisateur demande d'implémenter une spécification validée (`/build-spec [id]`).

## Procédure

1. **Chargement & Analyse de la Spec :**
   * Lire `.specs/specs/active/[id]*.md` (ou basculer depuis `planned/` vers `active/`), `.specs/architecture.md` et la base de connaissances du domaine (`.specs/knowledge/domains/[domaine]/`).
   * **Inventaire & Signatures :** Analyser l'arborescence `tree` (Section 3.1) et les contrats clés (Section 3.2).
   * **Pièges Techniques (Watchouts) :** Lire impérativement la **Section 6** avant toute écriture de code pour éviter les écueils anticipés.
   * **Exigences BDD :** Parcourir les scénarios Gherkin de la **Section 8.1** (Unitaires ➔ Composants ➔ E2E) qui constituent la feuille de route directe de développement en TDD/BDD.
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
   * Tests Playwright dans `tests-e2e/tests/` d'après les scénarios Gherkin de la Section 8.1.

5. **Quality Gates & Validation des Commandes (Section 8.2) :**
   * Lancer en priorité les commandes ciblées de la spec (Section 8.2).
   * Exécuter l'ensemble des quality gates du projet :
     * `make deptrac`
     * `make test-backend`
     * `make static-analysis`
     * `make lint`
     * `pnpm --filter frontend test --run`
     * `pnpm --filter frontend typecheck && pnpm --filter frontend lint`
   * Corriger immédiatement toute anomalie jusqu'à 100 % de succès.

6. **Mise à jour et confirmation :**
   * Cocher systématiquement les tâches de la **Section 7 (Plan d'Exécution Séquentiel)** dans la spec active au fur et à mesure de leur réalisation.
   * Inviter l'utilisateur à exécuter `/sync-knowledge [id]`.

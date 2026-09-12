# Système de Développement Spec-Driven (Nanko)

Ce dépôt applique une méthodologie de développement piloté par les spécifications (Spec-Driven Development) documentée sous `.specs/`.

## 1. Principes Fondamentaux
1. **La base de connaissance vivante (`.specs/knowledge/domains/[domaine]/`) est la source de vérité.**
   * Chaque domaine possède `behavior.md` (UX & règles métier), `tech.md` (architecture), `contracts.md` (endpoints REST & schémas Zod, adossé à `openapi.yaml`), et `models.md` (schéma SQL DBAL et agrégats Core).
2. **Tout changement non trivial passe par une Spec Delta (`.specs/specs/active/XXX-[nom].md`).**
   * Une spec est rédigée selon `.specs/templates/SPEC_TEMPLATE.md` avec diagrammes Mermaid, wireframes ASCII, DTOs avec validation, schémas de validation et scénarios Gherkin.
3. **Qualité et vérification impérative (Quality Gates) :**
   * Backend : `make deptrac`, `make test-backend`, `make static-analysis`, `make lint`.
   * Frontend : `pnpm --filter frontend test`, `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint`.
   * E2E : `pnpm --filter tests-e2e test <spec-impactée>` obligatoirement en local avant tout commit/push.
4. **Synchronisation et archivage post-livraison (`/sync-knowledge`) :**
   * Une fois le code et les tests validés, les modifications sont répercutées dans `.specs/knowledge/domains/[domaine]/` via les sub-skills dédiés (`sync-behavior`, `sync-contracts`, `sync-models`, `sync-tech`) et la spec est archivée dans `.specs/specs/archive/`.
5. **Invariance Spec-Code (Zéro dérive en cours de vol) :**
   * Toute demande d'ajustement, de retrait ou de pivot sur une spec active formulée en cours de route (pendant ou après `/build-spec`) DOIT obligatoirement être répercutée dans le fichier `.specs/specs/active/XXX-*.md` immédiatement (via `/update-spec` ou de manière proactive par l'agent avant de coder).
   * Le code et la spec active doivent TOUJOURS être parfaitement alignés : il est strictement interdit de modifier le comportement sans mettre à jour le contrat documentaire correspondant.
6. **Réflexe de Test Systématique & Synchronisation Gherkin (Skill `test-spec`) :**
   * Toute modification de comportement, logique, géométrie, règle métier ou cas limite DOIT s'accompagner de ses tests unitaires ou d'intégration.
   * Tout test ajouté ou modifié DOIT obligatoirement être répercuté sous forme de scénario Gherkin dans la Section 8 de la spec active (`.specs/specs/active/XXX-*.md`). L'agent ne doit jamais omettre d'écrire les tests correspondants ni d'aligner les scénarios de la spec.
7. **Exécution Locale Obligatoire des Tests E2E (Zéro Découverte en CI) :**
   * Tout test E2E (Playwright) ajouté ou touché par un delivery DOIT impérativement être exécuté et passer avec succès localement (`pnpm --filter tests-e2e test <spec>`) AVANT tout commit, push ou ouverture de Pull Request.
   * Il est strictement interdit de supposer qu'un test Playwright passera sans exécution réelle : les contraintes de dimensionnement de viewport (ex: 1280x720 en split view), les hit-testings de collision (`elementFromPoint`, `pointer-events`) et les interactions de drag & drop doivent être éprouvées dans le navigateur local.
8. **Portabilité et Liens Markdown Relatifs Stricts :**
   * Tout lien Markdown (`[texte](cible)`) au sein des spécifications, initiatives, ADRs/PDRs ou fichiers de knowledge DOIT impérativement être un chemin relatif au fichier source (ex: `../../../decisions/architecture/ADR-0002.md`, `./openapi.yaml`).
   * Il est formellement interdit d'insérer des chemins absolus machine (`/Users/...`, `file:///...`, `C:\...`).

## 2. Invariants d'Architecture (cf. .specs/architecture.md & ADR 0011)
* **Backend (`backend/`) :** Architecture hexagonale stricte avec Doctrine DBAL (pas d'ORM).
  * `Core/Domain` (entités et value objects purs, identifiants UUIDv7)
  * `Core/Port` (interfaces Repository)
  * `Core/UseCase` (Command/Handler)
  * `Adapter/Driven/Persistence` (repositories DBAL et hydratation manuelle)
  * `Adapter/Driver/Http/Controller` (contrôleurs HTTP et DTOs d'entrée avec contraintes `Assert\*`).
* **Frontend (`frontend/`) :** React 19, TypeScript strict, TanStack Query, validation Zod systématique, Tailwind CSS.

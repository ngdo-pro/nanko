# Architecture Technique & Invariants Globaux

## 1. Topologie du Monorepo

```text
monorepo/
├── backend/       # API Symfony 8 (PHP 8.4+) - Architecture hexagonale, DBAL, API REST & OAuth 2.0
├── frontend/      # SPA React 19 (TypeScript, Vite, Tailwind CSS, TanStack Query, Zod)
├── landing/       # Site vitrine public (www.nanko.dev)
├── library/       # Catalogue de composants partagés (library.nanko.dev)
├── tests-e2e/     # Tests End-to-End Playwright (exécution ciblée préprod)
├── infra/         # Environnements Docker local, préprod et prod
└── .specs/        # Documentation vivante, décisions et flux de changements
```

---

## 2. Stack Technique & Versions de Référence
* **Backend (`backend/`) :** PHP 8.4+, Symfony 8.x, PostgreSQL 16+, Doctrine DBAL (pas d'ORM - cf. ADR 0011), `symfony/uid` (UUIDv7), architecture hexagonale (`Core/Domain`, `Core/UseCase`, `Core/Port`, `Adapter/Driven`, `Adapter/Driver`), vérification des frontières avec Deptrac.
* **Frontend (`frontend/`) :** Node.js 22+, React 19, TypeScript 5+, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod, Oxlint.
* **E2E & Outillage (`tests-e2e/`) :** Playwright, pnpm workspaces (`pnpm-workspace.yaml`).

---

## 3. Invariants Techniques & Standards

### Conventions d'API REST & Contrats
* **Routage :** Endpoints préfixés par `/api/v1/`, ressources nommées en kebab-case au pluriel (ex. `/api/v1/workspace-members`).
* **Format payload :** JSON strict (`Content-Type: application/json`).
* **DTOs Backend :** Classes PHP `final readonly` avec contraintes Symfony Validator (`#[Assert\*]`).
* **Architecture Hexagonale Backend :**
  * `Core/Domain` : Entités et value objects purs, indépendants du framework.
  * `Core/UseCase` : Commandes et handlers d'orchestration métier.
  * `Core/Port` : Interfaces de ports (Repository, etc.).
  * `Adapter/Driven` : Implémentations techniques (DBAL Persistence).
  * `Adapter/Driver` : Contrôleurs HTTP et commandes CLI.
  * Respect strict des frontières vérifié par Deptrac (`make deptrac`).
* **Format des erreurs :**
  * Erreur de validation (`422`) : `{"violations": [{"propertyPath": "email", "title": "Format invalide"}]}`.
  * Erreur métier / Conflit (`409`, `400`, `403`) : `{"code": "MACHINE_READABLE_CODE", "message": "Description lisible."}`.

### Sécurité & Authentification
* **Sessions :** Spécification OAuth 2.0 (RFC 6749) avec jetons JWT Bearer signés en RS256.
* **Rotation :** Jetons d'accès courts (60 min) + refresh tokens à usage unique révoqués à la rotation.
* **Stockage sensible :** Mots de passe hashés avec Argon2id. Interdiction stricte de loguer des identifiants ou tokens dans Monolog.

### Frontend & Logique Client
* **Typage :** TypeScript en mode `strict: true`. Aucun usage de `any` toléré.
* **Validation :** Schémas Zod systématiques à la frontière des formulaires et des réponses API.
* **Intercepteur HTTP :** Gestion transparente du rafraîchissement des jetons sur réception d'un code `401` avec file d'attente des requêtes concurrentes.

---

## 4. Stratégie de Tests & Portes de Qualité (*Quality Gates*)

| Composant | Niveau de test | Outil | Commande d'exécution |
|---|---|---|---|
| `backend/` | Architecture | Deptrac | `make deptrac` |
| `backend/` | Analyse statique | PHPStan (Niveau 8+) | `make static-analysis` (ou `vendor/bin/phpstan analyse src/`) |
| `backend/` | Lint / Code style | PHP-CS-Fixer | `make lint` (ou `make lint-fix`) |
| `backend/` | Unit & Intégration | PHPUnit + DB de test | `make test-backend` (ou `vendor/bin/phpunit`) |
| `frontend/` | Typage | `tsc` project reference | `pnpm --filter frontend typecheck` |
| `frontend/` | Lint | Oxlint | `pnpm --filter frontend lint` |
| `frontend/` | Unit & Intégration UI | Vitest + RTL + MSW | `pnpm --filter frontend test` |
| `tests-e2e/` | End-to-End | Playwright | `pnpm --filter tests-e2e exec playwright test` |

---

## 5. Règles de Base de Données & Migrations
* **Identifiants :** UUIDv7 obligatoire pour les clés primaires de toutes les entités métier (`Symfony\Component\Uid\Uuid::v7()`).
* **Migrations :** Toute évolution de schéma passe obligatoirement par une migration Doctrine versionnée sous `backend/migrations/`.
* **Persistance explicite :** Repositories DBAL dédiés écrivant les requêtes SQL/QueryBuilder et assurant l'hydratation manuelle.
* **Rétrocompatibilité :** Interdiction d'ajouter une colonne `NOT NULL` sans valeur par défaut sur des tables existantes en production.

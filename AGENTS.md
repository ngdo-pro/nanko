# Nanko

Monorepo pnpm : backend Symfony + Mercure (`apps/api`), frontend React SPA (`apps/web`). Bootstrap uniquement — aucune décision d'architecture d'implémentation actée au-delà de cette structure.

`PRODUCT_STATUS.md` (objectifs, décisions, roadmap) et `TECHNICAL_REFERENCE.md` (scope, modèle de données, logique métier, API — sa section stack décrit encore Next.js, obsolète, voir note en tête de ce fichier) sont les sources de vérité produit. `ENGINEERING_LOG.md` porte le journal détaillé d'implémentation (pièges, bugs).

## Tests

Trois couches, chacune avec son propre déclencheur :

- `apps/api/tests/Unit/` — PHPUnit, aucune dépendance externe (`make unit-test`, rapide).
- `apps/api/tests/Functional/` — PHPUnit, boot du kernel + Postgres réel (`make functional-test`, nécessite `make test-db` au préalable).
- `apps/web/src/*.test.tsx` — Vitest + Testing Library (`pnpm --filter web test`).
- `apps/e2e/tests/` — Playwright contre l'environnement `make dev` réel (`make test-e2e`).

`make test` lance unit + functional (api) + web. `make phpstan` lance l'analyse statique (niveau max, zéro erreur toléré — corriger la cause, pas de `@phpstan-ignore` ni de baseline).

### Conventions

- Un test = `// GIVEN` / `// WHEN` / `// THEN` en commentaires, méthode `#[Test]` nommée en langage naturel (`it returns an empty array when no project exists()`). **Piège** : les espaces dans ces noms de méthode sont des espaces insécables (U+00A0), pas des espaces ASCII — sinon PHP refuse de parser le fichier. Ne pas taper une espace normale en éditant un nom de méthode existant.
- Doubles de test : préférer un **Fake** (implémentation en mémoire fonctionnelle, ex. `App\Tests\Support\InMemoryProjectRepository`, `App\Tests\Support\FakeHub`) à un mock qui vérifie des interactions. Un fake doit être honnête : s'il existe une règle métier (ex. slug dupliqué → échec), le fake doit la reproduire fidèlement, pas seulement le happy path.
- **Shared Behavioral Testing** : dès qu'une interface a plusieurs implémentations (ex. `ProjectRepositoryInterface` → `DoctrineProjectRepository` + `InMemoryProjectRepository` en test), le contrat de comportement vit dans une classe abstraite unique (`App\Tests\Support\ProjectRepositoryTestCase`) ; chaque implémentation fournit juste `createRepository()` et hérite des mêmes tests. Objectif : un fake qui divergerait du comportement réel casse immédiatement, des deux côtés.
- Les échecs métier (ex. slug dupliqué) sont des exceptions de domaine dédiées (`App\Repository\DuplicateSlugException`), pas des exceptions d'infrastructure (Doctrine, DBAL...) qui fuiteraient jusqu'au contrôleur — c'est ce qui rend un fake capable de reproduire fidèlement l'échec sans dépendre de Postgres.

# Skill Claude Code : /build-spec

Implémente le code, exécute les migrations et valide la Definition of Done pour une spécification delta active.

## Rôle & Objectif
Prend en charge une spec validée dans `.specs/changes/active/XXX-[nom].md`, implémente le code Backend (Symfony 8 / Architecture hexagonale DBAL) et Frontend (React 19 / Vite / Tailwind), écrit les tests unitaires, d'intégration et E2E correspondant aux scénarios Gherkin, et boucle jusqu'à ce que 100 % des quality gates soient au vert.

## Arguments attendus
`$ARGUMENTS` : `[id]`
* L'identifiant numérique ou le nom de la spec active (ex. `001` ou `001-init-auth`).

## Procédure d'exécution

### Étape 1 : Localisation et lecture des invariants
1. Rechercher le fichier correspondant dans `.specs/changes/active/[id]*.md`.
   * Si introuvable, afficher une erreur et lister les specs présentes dans `.specs/changes/active/`.
2. Charger les invariants techniques et produit :
   * `.specs/architecture.md`
   * `.specs/vision.md`
   * Le fichier de spec active
   * Les fichiers de l'état courant du domaine cible (`.specs/current/domains/[domaine]/*`)

### Étape 2 : Exécution séquentielle du plan de la spec

#### 1. Backend (`backend/`)
* **Base de données & Migrations :**
  * Créer le fichier de migration sous `backend/migrations/VersionYYYYMMDDHHMMSS.php`.
  * Utiliser des clés primaires UUIDv7 (`Symfony\Component\Uid\Uuid::v7()`).
* **Architecture Hexagonale (cf. ADR 0011 & `.specs/architecture.md`) :**
  * `Core/Domain/[Aggregate]/` : Entité pure et Value Objects (dont `Id.php`).
  * `Core/Port/[Aggregate]/` : Interface `Repository.php`.
  * `Core/UseCase/[Aggregate]/[Verbe][Aggregate]/` : `Command.php` et `Handler.php`.
  * `Adapter/Driven/Persistence/[Aggregate]/` : `DoctrineRepository.php` (requêtes DBAL explicites et hydratation manuelle) et `DoctrineId.php`.
  * `Adapter/Driver/Http/Controller/[Aggregate]/` : Contrôleur HTTP et DTOs d'entrée `final readonly` avec validation Symfony `#[Assert\*]`.
* **Tests Backend :**
  * Tests unitaires de la logique métier et DTOs dans `backend/tests/Unit/`.
  * Tests d'intégration du repository DBAL et contrôleurs dans `backend/tests/Integration/`.

#### 2. Frontend (`frontend/`)
* **Contrats & Schémas :**
  * Déclarer les schémas Zod et types TypeScript dans `frontend/src/features/[feature]/schemas.ts`. Typage strict (aucun `any`).
* **Hooks & Composants :**
  * Créer les hooks TanStack Query d'accès API.
  * Implémenter les composants UI et le layout Tailwind en respectant les wireframes ASCII et la matrice des 5 états UI (Idle, Submitting, Error Validation, Error Serveur, Success).
* **Tests Frontend :**
  * Tests unitaires et intégration de formulaire avec RTL / Vitest.

#### 3. End-to-End (`tests-e2e/`)
* Implémenter le parcours dans `tests-e2e/tests/[feature].spec.ts` selon les scénarios Gherkin taggés `@e2e`.

### Étape 3 : Exécution des Portes de Qualité (Quality Gates)
Exécuter impérativement les commandes de validation :
```bash
# 1. Vérification des frontières hexagonales
make deptrac

# 2. Tests backend & base de données
make test-backend

# 3. Analyse statique & typage
make static-analysis

# 4. Linters
make lint
```
* **En cas d'erreur :** Analyser le message, corriger le code immédiatement et ré-exécuter jusqu'à obtention d'un résultat 100 % au vert.

### Étape 4 : Mise à jour de la spec
* Cocher les cases `- [x]` dans la section « 8. Plan d'exécution séquentiel » du fichier `.specs/changes/active/[id]*.md`.

### Étape 5 : Restitution au développeur
Indiquer que l'implémentation est terminée, tous les tests sont au vert, et inviter à synchroniser l'état courant :
« L'implémentation et les tests de la spec `[id]` sont terminés et validés. Vous pouvez maintenant exécuter `/sync-current [id]` pour mettre à jour la documentation vivante et archiver la spec. »

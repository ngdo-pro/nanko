# Domaine : Espaces de Travail (workspace-management) - Architecture Technique

## 1. Stack & Composants Cibles
* **Backend (`backend/`) :**
  * Architecture hexagonale stricte avec `Organisation` comme agrégat racine (cf. ADR 0011 et ADR-002).
  * Structure : `WorkspaceManagement/Core/Domain/Organisation/`, `WorkspaceManagement/Core/UseCase/Organisation/`, `WorkspaceManagement/Core/Port/Organisation/`, `WorkspaceManagement/Adapter/Driven/Persistence/Organisation/`, `WorkspaceManagement/Adapter/Driver/Http/Controller/Organisation/`.
  * Persistance via Doctrine DBAL (`Doctrine\DBAL\Connection`), hydratation manuelle.
  * Validation des frontières d'architecture avec Deptrac (`backend/deptrac.php`).
* **Frontend (`frontend/`) :**
  * Gestion du contexte d'organisation active.
  * Pages d'administration d'organisation et de listing de projets.
* **Base de données :**
  * Tables PostgreSQL : `organisation`, `project`, `organisation_member`, `capability`. Clés primaires UUIDv7.

## 2. Invariants Techniques & Sécurité
* Vérification des `Capability` via Voters Symfony dédiés sur chaque action de mutation.
* Isolation stricte des données entre organisations.

## 3. ADRs de Référence
* `ADR-0007` : PostgreSQL unique comme runtime source of truth pour le MVP.
* `ADR-0011` : Architecture hexagonale (Core/Port/Adapter) et persistance DBAL sans ORM.

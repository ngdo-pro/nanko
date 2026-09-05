# Domaine : Espaces de Travail (workspace-management) - Architecture Technique

## 1. Stack & Composants Cibles
* **Backend (`backend/`) :**
  * Architecture hexagonale stricte avec `Org` comme agrégat racine (cf. ADR 0011).
  * Structure : `Core/Domain/Org/`, `Core/UseCase/Org/`, `Core/Port/Org/`, `Adapter/Driven/Persistence/Org/`, `Adapter/Driver/Http/Controller/Org/`.
  * Persistance via Doctrine DBAL (`Doctrine\DBAL\Connection`), hydratation manuelle.
  * Validation des frontières d'architecture avec Deptrac (`backend/deptrac.php`).
* **Frontend (`frontend/`) :**
  * Gestion du contexte d'organisation active.
  * Pages d'administration d'organisation et de listing de projets.
* **Base de données :**
  * Tables PostgreSQL : `org`, `project`, `org_member`, `capability`. Clés primaires UUIDv7.

## 2. Invariants Techniques & Sécurité
* Vérification des `Capability` via Voters Symfony dédiés sur chaque action de mutation.
* Isolation stricte des données entre organisations.

## 3. ADRs de Référence
* `ADR-0007` : PostgreSQL unique comme runtime source of truth pour le MVP.
* `ADR-0011` : Architecture hexagonale (Core/Port/Adapter) et persistance DBAL sans ORM.

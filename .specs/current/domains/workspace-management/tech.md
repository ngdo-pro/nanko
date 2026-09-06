# Domaine : Espaces de Travail (workspace-management) - Architecture Technique

## 1. Stack & Découpage Hexagonal

### Backend (`backend/src/WorkspaceManagement/`)
* **Architecture hexagonale stricte :**
  * `Core/Domain/` : Entités pures et Value Objects (`Organisation`, `OrganisationMember`, `Project`, `Id`, `Role`). Zéro dépendance vers le framework.
  * `Core/Port/` : Interfaces des repositories (`Organisation/Repository`, `OrganisationMember/Repository`, `Project/Repository`).
  * `Core/UseCase/` : Orchestration métier (`GetOrCreatePersonalOrganisationUseCase`, `ListProjectsUseCase`, `CreateProjectUseCase`) et exceptions associées (`AccessDeniedException`, `OrganisationNotFoundException`, `ProjectSlugAlreadyExistsException`).
  * `Adapter/Driven/Persistence/` : Implémentations concrètes Doctrine DBAL (`Doctrine\DBAL\Connection`) avec hydratation manuelle.
  * `Adapter/Driver/Http/` : Contrôleurs REST (`ListOrganisations`, `ListProjects`, `CreateProject`) et DTOs d'entrée (`CreateProjectInput`).
* **Validation & Dépendances :**
  * `symfony/validator` utilisé pour la validation des DTOs HTTP avec renvoi d'erreurs au format RFC-7807 (422).
  * `Symfony\Component\Uid\Uuid::v7()` pour la génération d'identifiants temporels séquentiels côté application.
* **Garde-fous architecturaux :**
  * Contrôle Deptrac (`backend/deptrac.php`) garantissant l'isolation du bounded context et l'étanchéité du Domaine Core.

### Frontend (`frontend/src/features/workspaces/`)
* **Architecture de fonctionnalité :**
  * `api/` : Requêtes fetch TanStack Query (`getOrganisations`, `getProjects`, `createProject`).
  * `schemas.ts` : Contrats Zod garantissant le typage d'exécution des réponses et formulaires.
  * `context/` : `WorkspaceContext` gérant la détection du mode solo vs multi-organisation, l'organisation active et le projet actif.
  * `components/` :
    * `OrganisationSwitcher` : Masqué si 1 seule organisation (mode solo), activé si organisations d'équipe.
    * `ProjectSwitcher` : Composant de sélection rapide inséré dans la barre de navigation.
    * `CreateProjectModal` : Modale accessible de création de projet avec auto-génération de slug.
  * Persistance locale : Conservation du projet actif dans le `localStorage` pour préserver le contexte utilisateur entre deux sessions.

## 2. Infrastructure & Sécurité Réseau
* **Contrôle d'accès :** Chaque UseCase valide explicitement l'appartenance de l'utilisateur à l'organisation ciblée via `OrganisationMemberRepository`.
* **Authentification JWT :** Token Keycloak RS256 requis sur tous les endpoints `/api/v1/organisations*`.
* **Compatibilité Caddy Preprod :**
  * Règle de filtrage `caddy.@protected.not_2.header_regexp: Authorization ^Bearer\s+` dans `infra/preprod/compose.yaml` : permet aux requêtes API du frontend portant un Bearer token d'accéder au backend sans être interceptées par le Basic Auth HTTP de préprod.

## 3. ADRs de Référence
* `ADR-0002` : Modular Monolith & découpage en Bounded Contexts.
* `ADR-0007` : PostgreSQL unique comme runtime source of truth pour le MVP.
* `ADR-0011` : Architecture hexagonale (Core/Port/Adapter) et persistance DBAL sans ORM.

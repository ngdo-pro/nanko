# Domaine : Espaces de Travail (workspace-management) - Architecture Technique

## 1. Stack & Découpage Hexagonal

### Backend (`backend/src/WorkspaceManagement/`)
* **Architecture hexagonale stricte :**
  * `Core/Domain/` : Entités pures et Value Objects (`Organisation`, `OrganisationMember`, `Project`, `Document`, `Id`, `Role`, `Layer`). Parsing syntaxique pur du format `.nanko` (`NankoParser`, `Ast`, `Shape`, `Connector`). Zéro dépendance vers le framework.
  * `Core/Port/` : Interfaces des repositories (`Organisation/Repository`, `OrganisationMember/Repository`, `Project/Repository`, `Document/Repository`).
  * `Core/UseCase/` : Orchestration métier (`GetOrCreatePersonalOrganisationUseCase`, `ListProjectsUseCase`, `CreateProjectUseCase`, `ListDocumentsUseCase`, `CreateDocumentUseCase`, `GetDocumentUseCase`, `UpdateDocumentUseCase`) et exceptions associées (`AccessDeniedException`, `OrganisationNotFoundException`, `ProjectSlugAlreadyExistsException`, `DocumentNotFoundException`, `DocumentSlugAlreadyExistsException`, `InvalidNankoSyntaxException`).
  * `Adapter/Driven/Persistence/` : Implémentations concrètes Doctrine DBAL (`Doctrine\DBAL\Connection`) avec hydratation manuelle et sérialisation/désérialisation JSONB du champ `ast`.
  * `Adapter/Driver/Http/` : Contrôleurs REST (`ListOrganisations`, `ListProjects`, `CreateProject`, `ListDocuments`, `CreateDocument`, `GetDocument`, `UpdateDocument`) et DTOs d'entrée validés (`CreateProjectInput`, `CreateDocumentInput`, `UpdateDocumentInput`).
* **Validation & Dépendances :**
  * `symfony/validator` utilisé pour la validation des DTOs HTTP avec renvoi d'erreurs au format RFC-7807 (422).
  * `Symfony\Component\Uid\Uuid::v7()` pour la génération d'identifiants temporels séquentiels côté application.
* **Garde-fous architecturaux :**
  * Contrôle Deptrac (`backend/deptrac.php`) garantissant l'isolation du bounded context et l'étanchéité du Domaine Core.

### Frontend (`frontend/src/`)
* **Module Workspaces (`features/workspaces/`) :**
  * `api/` : Requêtes fetch TanStack Query (`getOrganisations`, `getProjects`, `createProject`).
  * `schemas.ts` : Contrats Zod garantissant le typage d'exécution des réponses et formulaires.
  * `context/` : `WorkspaceContext` gérant la détection du mode solo vs multi-organisation, l'organisation active et le projet actif.
  * `components/` : `OrganisationSwitcher`, `ProjectSwitcher`, `CreateProjectModal`.
  * Persistance locale : Conservation du projet actif dans le `localStorage`.
* **Module Documents (`features/documents/`) :**
  * `api/` : `getDocuments`, `getDocument`, `createDocument`, `updateDocument`.
  * `schemas.ts` : Schémas Zod pour l'AST (`nankoAstSchema`, `nodeCoordinatesSchema`, `nankoAstLayoutSchema`), items de liste (`documentListItemSchema`), détails (`documentDetailSchema`) et mutations.
  * `components/` : `CreateDocumentModal`, `DocumentCard`, `DocumentList`, `SourceCodeEditor`, `AstInspector`.
    * `components/canvas/` : `NankoCanvas` (composant React Flow principal avec gestion dark/light et minimap), `LayoutSelector` (sélecteur Split / Canvas / Code), `CanvasControls` (barre flottante dans `<Panel position="bottom-left">`), `nodes/` (`RectangleNode`, `CircleNode` avec vraie géométrie circulaire 130px × 130px, `TextNode`), `edges/` (`NankoEdge`).
    * `components/canvas/utils/` : `dagreLayout.ts` (agencement hiérarchique spatial via `@dagrejs/dagre` intégrant les dimensions circulaires), `nankoParser.ts` (parseur client réactif avec détection d'erreurs en temps réel), `syncLayoutToSource.ts` (injection et synchronisation du bloc `!LAYOUT ... !END`).
  * `hooks/` : `useDocuments`, `useDocument`.
  * **Dépendances graphiques :** `@xyflow/react` (moteur de graphe interactif) et `@dagrejs/dagre` (calcul d'auto-layout).
* **Mise en Page & Vue Éditeur (`components/layout/AppLayout.tsx` & `views/DocumentEditorView.tsx`) :**
  * Route `/projects/:projectId/documents/:documentId` en mode **Pleine Largeur (*Edge-to-Edge*)** :
    * `AppLayout.tsx` applique dynamiquement `.app-container-fullscreen` et `.app-main-fullscreen` lors de l'accès à un document pour exploiter 100% de la largeur disponible et calibrer la hauteur utile entre la Navbar et le Footer, éliminant tout défilement global externe.
  * Trois modes d'agencement via `LayoutSelector` :
    * `Split` : Barre d'outils ancrée (`.editor-topbar.is-static`), code source à gauche et canvas à droite (50/50).
    * `Canvas` : Barre d'outils flottante (`.editor-topbar.is-floating`) centrée au sommet (`top: 14px; left: 50%; transform: translateX(-50%)`) avec `backdrop-filter: blur(12px)`, fond translucide et bordure Blueprint. Le canvas React Flow s'étend en continu sur 100% de la surface sous la barre flottante.
    * `Code` : Barre d'outils ancrée (`.editor-topbar.is-static`), éditeur de code et inspecteur AST textuel en plein écran.
  * Design System Blueprint : Token `--canvas-bg` dédié (`#011C25` en Dark Mode conforme au mockup vert nuit pétrole, `#FFFFFF` en Light Mode) avec trame orthogonale de 26px (`BackgroundVariant.Lines`).
  * Raccourci clavier de sauvegarde (`Cmd+S` / `Ctrl+S`), indicateurs d'état (sauvegardé, modifications en cours, sauvegarde en cours), affichage des erreurs de syntaxe 422 avec numéro de ligne.
  * Interception de l'événement `beforeunload` pour prévenir la perte accidentelle de données non sauvegardées.

## 2. Tests E2E (`tests-e2e/`)
* **Gestion des documents (`tests/app/document-management.spec.ts`) :**
  * Validation du flux nominal complet : création d'un document dans le projet actif, redirection vers l'éditeur, saisie de code source `.nanko`, sauvegarde via raccourci, persistance après rechargement.
  * Validation des cas d'erreur : affichage des erreurs de syntaxe à la ligne et rejet des doublons de slug (409).
* **Visualisation Canvas React Flow & Disposition Studio (`tests/app/canvas-visualization.spec.ts`) :**
  * Validation de la disposition pleine largeur (`.app-main-fullscreen`).
  * Validation du rendu visuel des nœuds typés selon la shape (`rectangle`, `circle`, `text`).
  * Basculement fluide entre les modes Split (barre ancrée `.is-static`), Canvas plein écran (barre flottante `.is-floating`) et Code plein écran (`.is-static`).
  * Déplacement de nœud via drag & drop sur le canvas et mise à jour immédiate du bloc `!LAYOUT`.
  * Réorganisation automatique du graphe (Auto-Layout Dagre) et sauvegarde par raccourci clavier.

## 3. Infrastructure & Sécurité Réseau
* **Contrôle d'accès :** Chaque UseCase valide explicitement l'appartenance de l'utilisateur à l'organisation ciblée via `OrganisationMemberRepository`.
* **Authentification JWT :** Token Keycloak RS256 requis sur tous les endpoints `/api/v1/organisations*`, `/api/v1/projects*` et `/api/v1/documents*`.
* **Compatibilité Caddy Preprod :**
  * Règle de filtrage `caddy.@protected.not_2.header_regexp: Authorization ^Bearer\s+` dans `infra/preprod/compose.yaml` : permet aux requêtes API du frontend portant un Bearer token d'accéder au backend sans être interceptées par le Basic Auth HTTP de préprod.

## 4. ADRs de Référence
* `ADR-0002` : Modular Monolith & découpage en Bounded Contexts.
* `ADR-0007` : PostgreSQL unique comme runtime source of truth pour le MVP.
* `ADR-0011` : Architecture hexagonale (Core/Port/Adapter) et persistance DBAL sans ORM.


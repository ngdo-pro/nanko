# Domaine : Espaces de Travail (workspace-management) - Modèles & Schéma DB

## 1. Modèle Domaine & Hexagone (Core)

### Agrégat : `Organisation`
* **Entité racine :** `backend/src/WorkspaceManagement/Core/Domain/Organisation/Organisation.php`
* **Identifiant :** `backend/src/WorkspaceManagement/Core/Domain/Organisation/Id.php` (UUIDv7)
* **Port Repository :** `backend/src/WorkspaceManagement/Core/Port/Organisation/Repository.php`
* **Adapter Persistence :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/Organisation/DoctrineRepository.php`

### Entité : `OrganisationMember`
* **Entité :** `backend/src/WorkspaceManagement/Core/Domain/OrganisationMember/OrganisationMember.php`
* **Identifiant :** `backend/src/WorkspaceManagement/Core/Domain/OrganisationMember/Id.php` (UUIDv7)
* **Enum Rôle :** `backend/src/WorkspaceManagement/Core/Domain/OrganisationMember/Role.php` (`owner`, `member`)
* **Port Repository :** `backend/src/WorkspaceManagement/Core/Port/OrganisationMember/Repository.php`
* **Adapter Persistence :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/OrganisationMember/DoctrineRepository.php`

### Entité : `Project`
* **Entité :** `backend/src/WorkspaceManagement/Core/Domain/Project/Project.php`
* **Identifiant :** `backend/src/WorkspaceManagement/Core/Domain/Project/Id.php` (UUIDv7)
* **Port Repository :** `backend/src/WorkspaceManagement/Core/Port/Project/Repository.php`
* **Adapter Persistence :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/Project/DoctrineRepository.php`

### Entité : `Document`
* **Entité :** `backend/src/WorkspaceManagement/Core/Domain/Document/Document.php`
* **Identifiant :** `backend/src/WorkspaceManagement/Core/Domain/Document/Id.php` (UUIDv7)
* **Value Object :** `backend/src/WorkspaceManagement/Core/Domain/Document/Layer.php`
* **Service Parseur & AST :** `backend/src/WorkspaceManagement/Core/Domain/Document/Parser/NankoParser.php`, `Ast.php`, `Shape.php`, `Connector.php`
* **Port Repository :** `backend/src/WorkspaceManagement/Core/Port/Document/Repository.php`
* **Adapter Persistence :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/Document/DoctrineRepository.php`

---

## 2. Cas d'Usage Métier (UseCases)

* **`GetOrCreatePersonalOrganisationUseCase` :**
  Assure l'auto-provisioning idempotent de l'Espace personnel et de son projet initial lors de la première connexion de l'utilisateur, puis retourne l'ensemble des organisations accessibles avec leurs projets.
* **`ListProjectsUseCase` :**
  Vérifie l'appartenance de l'utilisateur à l'organisation demandée avant de retourner la liste ordonnée des projets.
* **`CreateProjectUseCase` :**
  Contrôle les droits d'écriture, vérifie l'unicité du slug au sein de l'organisation et persiste la nouvelle entité `Project`.
* **`ListDocumentsUseCase` :**
  Liste tous les documents rattachés à un projet après vérification des droits d'accès au projet et à l'organisation parente.
* **`CreateDocumentUseCase` :**
  Vérifie l'unicité du slug de document dans le projet, initialise le document avec un code template `.nanko`, analyse sa syntaxe et le persiste.
* **`GetDocumentUseCase` :**
  Charge un document par son identifiant avec vérification d'accès et retourne ses métadonnées, son code source et son AST.
* **`UpdateDocumentUseCase` :**
  Met à jour le code source `.nanko` d'un document existant, valide la syntaxe via `NankoParser`, extrait l'AST dénormalisé et actualise la ligne en base.

---

## 3. Schéma de Base de Données Actif

* **Migrations sources :**
  * `backend/migrations/Version20260906000001.php` (organisations, membres, projets)
  * `backend/migrations/Version20260907000001.php` (documents)

### Table : `organisation`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 de l'organisation |
| `name` | `varchar(255)` | Non | - | Nom d'affichage de l'organisation |
| `slug` | `varchar(100)` | Non | `UNIQUE INDEX uniq_organisation_slug` | Slug unique d'URL |
| `is_personal` | `boolean` | Non | `DEFAULT false` | Espace personnel implicite de l'utilisateur |
| `created_at` | `timestamp with time zone` | Non | - | Date de création |
| `updated_at` | `timestamp with time zone` | Non | - | Date de dernière mise à jour |

### Table : `organisation_member`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 de l'adhésion |
| `organisation_id` | `uuid` | Non | `FOREIGN KEY REFERENCES organisation(id) ON DELETE CASCADE` | Organisation liée |
| `user_id` | `uuid` | Non | `FOREIGN KEY REFERENCES app_user(id) ON DELETE CASCADE` | Utilisateur membre |
| `role` | `varchar(50)` | Non | `DEFAULT 'owner'` | Rôle (`owner`, `member`) |
| `created_at` | `timestamp with time zone` | Non | - | Date d'adhésion |
| *(composite)* | `(organisation_id, user_id)` | Non | `UNIQUE INDEX uniq_org_member` | Unicité membre par organisation |

### Table : `project`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 du projet |
| `organisation_id` | `uuid` | Non | `FOREIGN KEY REFERENCES organisation(id) ON DELETE CASCADE` | Organisation propriétaire |
| `name` | `varchar(255)` | Non | - | Nom du projet |
| `slug` | `varchar(100)` | Non | - | Slug lisible du projet |
| `created_at` | `timestamp with time zone` | Non | - | Date de création |
| `updated_at` | `timestamp with time zone` | Non | - | Date de dernière mise à jour |
| *(composite)* | `(organisation_id, slug)` | Non | `UNIQUE INDEX uniq_project_org_slug` | Unicité du slug de projet par organisation |

### Table : `document`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 du document |
| `project_id` | `uuid` | Non | `FOREIGN KEY REFERENCES project(id) ON DELETE CASCADE` | Projet propriétaire |
| `name` | `varchar(255)` | Non | - | Nom du document |
| `slug` | `varchar(100)` | Non | - | Slug lisible du document |
| `layer` | `integer` | Non | `DEFAULT 0` | Attribut de profondeur du Document au sein du Projet |
| `source_code` | `text` | Non | - | Code source textuel brut au format `.nanko` |
| `ast` | `jsonb` | Non | `DEFAULT '{}'::jsonb` | Arbre syntaxique dénormalisé (shapes, connectors, layout) |
| `created_at` | `timestamp with time zone` | Non | - | Date de création |
| `updated_at` | `timestamp with time zone` | Non | - | Date de dernière mise à jour |
| *(composite)* | `(project_id, slug)` | Non | `UNIQUE INDEX uniq_document_project_slug` | Unicité du slug de document par projet |
| `project_id` | `uuid` | Non | `INDEX idx_document_project_id` | Index de recherche des documents par projet |


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

---

## 2. Cas d'Usage Métier (UseCases)

* **`GetOrCreatePersonalOrganisationUseCase` :**
  Assure l'auto-provisioning idempotent de l'Espace personnel et de son projet initial lors de la première connexion de l'utilisateur, puis retourne l'ensemble des organisations accessibles avec leurs projets.
* **`ListProjectsUseCase` :**
  Vérifie l'appartenance de l'utilisateur à l'organisation demandée avant de retourner la liste ordonnée des projets.
* **`CreateProjectUseCase` :**
  Contrôle les droits d'écriture, vérifie l'unicité du slug au sein de l'organisation et persiste la nouvelle entité `Project`.

---

## 3. Schéma de Base de Données Actif

* **Migration source :** `backend/migrations/Version20260906000001.php`

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

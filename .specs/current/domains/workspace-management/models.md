# Domaine : Espaces de Travail (workspace-management) - Modèles & Schéma DB

## 1. Modèle Domaine (Core)

### Agrégat : `Organisation`
* **Entité racine :** `backend/src/WorkspaceManagement/Core/Domain/Organisation/Organisation.php`
* **Identifiant :** `backend/src/WorkspaceManagement/Core/Domain/Organisation/Id.php` (UUIDv7)
* **Ports Repository :** `backend/src/WorkspaceManagement/Core/Port/Organisation/Repository.php`
* **Adapter Persistence :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/Organisation/DoctrineRepository.php`
* **Type DBAL :** `backend/src/WorkspaceManagement/Adapter/Driven/Persistence/Organisation/DoctrineId.php`

---

## 2. Schéma de Base de Données Actif

### Table : `organisation`
* **Migration :** `backend/migrations/Version*.php`

| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 de l'organisation |
| `name` | `varchar(255)` | Non | - | Nom affiché de l'organisation |
| `slug` | `varchar(100)` | Non | `UNIQUE INDEX uniq_organisation_slug` | Identifiant d'URL unique |
| `created_at` | `timestamp with time zone` | Non | `DEFAULT NOW()` | Date de création |

### Table : `project`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 du projet |
| `organisation_id` | `uuid` | Non | `FOREIGN KEY REFERENCES organisation(id)` | Rattachement à l'organisation |
| `name` | `varchar(255)` | Non | - | Nom du projet |
| `created_at` | `timestamp with time zone` | Non | `DEFAULT NOW()` | Date de création |

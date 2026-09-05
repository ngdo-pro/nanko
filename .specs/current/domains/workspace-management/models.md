# Domaine : Espaces de Travail (workspace-management) - Modèles & Schéma DB

## 1. Modèle Domaine (Core)

### Agrégat : `Org`
* **Entité racine :** `backend/src/Core/Domain/Org/Org.php`
* **Identifiant :** `backend/src/Core/Domain/Org/Id.php` (UUIDv7)
* **Ports Repository :** `backend/src/Core/Port/Org/Repository.php`
* **Adapter Persistence :** `backend/src/Adapter/Driven/Persistence/Org/DoctrineRepository.php`
* **Type DBAL :** `backend/src/Adapter/Driven/Persistence/Org/DoctrineId.php`

---

## 2. Schéma de Base de Données Actif

### Table : `org`
* **Migration :** `backend/migrations/Version*.php`

| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 de l'organisation |
| `name` | `varchar(255)` | Non | - | Nom affiché de l'organisation |
| `slug` | `varchar(100)` | Non | `UNIQUE INDEX uniq_org_slug` | Identifiant d'URL unique |
| `created_at` | `timestamp with time zone` | Non | `DEFAULT NOW()` | Date de création |

### Table : `project`
| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | UUIDv7 du projet |
| `org_id` | `uuid` | Non | `FOREIGN KEY REFERENCES org(id)` | Rattachement à l'organisation |
| `name` | `varchar(255)` | Non | - | Nom du projet |
| `created_at` | `timestamp with time zone` | Non | `DEFAULT NOW()` | Date de création |

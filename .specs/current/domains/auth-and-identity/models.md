# Domaine : Identité & Accès (auth-and-identity) - Modèles & Schéma DB

## 1. Modèle Domaine (Core Hexagonal)

### Agrégat : `User`
* **Entité racine :** `backend/src/AuthAndIdentity/Core/Domain/User/User.php`
* **Identifiant interne :** `backend/src/AuthAndIdentity/Core/Domain/User/Id.php` (UUIDv7)
* **Value Object Identité Externe :** `backend/src/AuthAndIdentity/Core/Domain/User/KeycloakId.php` (UUID correspondant au claim `sub` du JWT Keycloak)
* **Port Repository :** `backend/src/AuthAndIdentity/Core/Port/User/Repository.php`
* **Use Case JIT :** `backend/src/AuthAndIdentity/Core/UseCase/User/SynchronizeUser/`

---

## 2. Schéma de Base de Données Actif

### Table : `app_user`
* **Migration de référence :** `backend/migrations/Version20260905000001.php`
* **Repository DBAL :** `backend/src/AuthAndIdentity/Adapter/Driven/Persistence/User/DoctrineRepository.php`

| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | Clé primaire interne UUIDv7 |
| `keycloak_id` | `uuid` | Non | `UNIQUE INDEX uniq_user_keycloak_id` | Identifiant `sub` émis par Keycloak |
| `email` | `varchar(180)` | Non | `INDEX idx_user_email` | Adresse email synchronisée depuis le JWT |
| `created_at` | `timestamptz` | Non | - | Horodatage de première connexion |
| `updated_at` | `timestamptz` | Non | - | Horodatage de dernière synchronisation |

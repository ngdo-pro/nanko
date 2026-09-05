# Domaine : Identité & Accès (auth-and-identity) - Modèles & Schéma DB

## 1. Modèle Domaine (Core)

### Agrégat : `User`
* **Entité racine :** `backend/src/Core/Domain/User/User.php`
* **Identifiant :** `backend/src/Core/Domain/User/Id.php` (UUIDv7)
* **Value Objects :**
  * `Email` : Adresse électronique normalisée et validée.
  * `HashedPassword` : Hash Argon2id.

---

## 2. Schéma de Base de Données Actif

### Table : `app_user`
* **Repository DBAL :** `backend/src/Adapter/Driven/Persistence/User/DoctrineRepository.php`
* **Type DBAL :** `backend/src/Adapter/Driven/Persistence/User/DoctrineId.php`

| Colonne | Type SQL | Nullable | Contraintes / Index | Description |
|---|---|---|---|---|
| `id` | `uuid` | Non | `PRIMARY KEY` | Clé primaire UUIDv7 |
| `email` | `varchar(180)` | Non | `UNIQUE INDEX uniq_user_email` | Email unique de connexion |
| `password_hash` | `varchar(255)` | Non | - | Hash de mot de passe Argon2id |
| `created_at` | `timestamp with time zone` | Non | `DEFAULT NOW()` | Date d'inscription |

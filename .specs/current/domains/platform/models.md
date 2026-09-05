# Domaine : Plateforme & Livraison Continue (platform) - Modèles & Schéma DB

## 1. Modèle Domaine & Schéma de Données
* **Aucune entité persistée en base de données relationnelle :** Le domaine Plateforme ne possède pas de table SQL dans PostgreSQL.
* Les états de version sont injectés dynamiquement à la compilation/démarrage du conteneur sans état persistant.
* **Datastore Télémétrique Dédié (ADR-0007) :** L'observabilité (traces, métriques, logs) repose sur un moteur ClickHouse dédié et isolé (`signoz-clickhouse-data`) géré par la stack SigNoz, sans aucun impact sur la base PostgreSQL applicative.

---

## 2. DTO Système & Structure de Version

### DTO Réponse Version (`GET /api/v1/version`)
* **Contrôleur :** `backend/src/Adapter/Driver/Http/Controller/System/VersionController.php`

```typescript
export interface VersionResponse {
  status: 'ok'
  version: string      // Format SemVer (ex. "v0.1.0-pr.14.2", "v0.1.0-rc.35", "v0.1.0")
  commit: string       // Hash Git court ou complet (ex. "a1b2c3d4e5f67890")
  environment: string  // Nom de l'environnement ("local", "test", "preprod", "prod")
}
```

---

## 3. Conventions de Versionnement SemVer
* **Branches Pull Request :** `<base-tag>-pr.<pr_number>.<run_number>` (ex. `v0.1.0-pr.14.2`)
* **Branche Main (Release Candidates) :** `<base-tag>-rc.<run_number>` (ex. `v0.1.0-rc.35`)
* **Releases / Tags Git :** `<base-tag>` (ex. `v0.1.0`)
* **Environnement de développement local :** `v0.0.0-dev`

# Domaine : Espaces de Travail (workspace-management) - Contrats d'API & Schémas

## 1. Endpoints REST Actifs

### `POST /api/v1/orgs`
* **Authentification :** `ROLE_USER`
* **Headers :** `Content-Type: application/json`, `Authorization: Bearer <token>`
* **Description :** Création d'une nouvelle Organisation.

#### Request Payload (`CreateOrgInput`)
```json
{
  "name": "Acme Corp",
  "slug": "acme-corp"
}
```

#### Réponses
* `201 Created` :
  ```json
  {
    "id": "01918a24-7b3b-7c99-b1d5-2a1d2f34e567",
    "name": "Acme Corp",
    "slug": "acme-corp",
    "createdAt": "2026-08-31T01:00:00Z"
  }
  ```
* `409 Conflict` : `{ "code": "ORG_SLUG_EXISTS", "message": "Ce slug d'organisation est déjà utilisé." }`
* `422 Unprocessable Entity` : Violations de validation du nom/slug.

---

## 2. Schémas de Validation Frontend (Zod)

```typescript
import { z } from 'zod';

export const createOrgSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères'),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des minuscules, chiffres et tirets')
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>;
```

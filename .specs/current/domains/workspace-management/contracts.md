# Domaine : Espaces de Travail (workspace-management) - Contrats d'API & Schémas

## 1. Endpoints REST Actifs

### `GET /api/v1/organisations`
* **Authentification :** `ROLE_USER`
* **Headers :** `Authorization: Bearer <token>`
* **Description :** Liste toutes les organisations dont l'utilisateur authentifié est membre, avec leurs projets associés. Si l'utilisateur accède pour la première fois à la plateforme sans organisation personnelle, celle-ci ainsi que son projet initial sont provisionnés automatiquement et retournés immédiatement.

#### Responses
* `200 OK` :
  ```json
  [
    {
      "id": "0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567",
      "name": "Espace personnel",
      "slug": "personal-0191c0a1",
      "isPersonal": true,
      "role": "owner",
      "createdAt": "2026-09-06T12:00:00Z",
      "projects": [
        {
          "id": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
          "organisationId": "0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567",
          "name": "Mon premier projet",
          "slug": "mon-premier-projet",
          "createdAt": "2026-09-06T12:00:00Z"
        }
      ]
    }
  ]
  ```

---

### `GET /api/v1/organisations/{organisationId}/projects`
* **Authentification :** `ROLE_USER`
* **Headers :** `Authorization: Bearer <token>`
* **Description :** Retourne la liste des projets d'une organisation donnée. L'accès est conditionné à l'appartenance de l'utilisateur à l'organisation.

#### Responses
* `200 OK` :
  ```json
  [
    {
      "id": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
      "organisationId": "0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567",
      "name": "Mon premier projet",
      "slug": "mon-premier-projet",
      "createdAt": "2026-09-06T12:00:00Z"
    }
  ]
  ```
* `403 Forbidden` : `{ "code": "ACCESS_DENIED", "message": "Vous n'avez pas accès à cette organisation." }`
* `404 Not Found` : `{ "code": "ORGANISATION_NOT_FOUND", "message": "Organisation introuvable." }`

---

### `POST /api/v1/organisations/{organisationId}/projects`
* **Authentification :** `ROLE_USER`
* **Headers :** `Content-Type: application/json`, `Authorization: Bearer <token>`
* **Description :** Crée un nouveau projet au sein de l'organisation spécifiée.

#### Request Payload (`CreateProjectInput`)
```json
{
  "name": "Architecture E-Commerce",
  "slug": "architecture-ecommerce"
}
```

#### Responses
* `201 Created` :
  ```json
  {
    "id": "0191c0b3-2222-7f88-82bc-3e2c1d45f678",
    "organisationId": "0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567",
    "name": "Architecture E-Commerce",
    "slug": "architecture-ecommerce",
    "createdAt": "2026-09-06T12:10:00Z"
  }
  ```
* `403 Forbidden` : `{ "code": "ACCESS_DENIED", "message": "Action non autorisée sur cette organisation." }`
* `409 Conflict` : `{ "code": "PROJECT_SLUG_EXISTS", "message": "Un projet avec ce slug existe déjà dans cette organisation." }`
* `422 Unprocessable Entity` : `{ "violations": [{ "propertyPath": "name", "title": "Le nom doit comporter au moins 2 caractères." }] }`

---

## 2. Schémas de Validation Frontend (Zod)

Fichier source : `frontend/src/features/workspaces/schemas.ts`

```typescript
import { z } from 'zod';

export const projectSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string(),
});

export const organisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isPersonal: z.boolean(),
  role: z.string(),
  createdAt: z.string(),
  projects: z.array(projectSchema),
});

export const organisationsResponseSchema = z.array(organisationSchema);
export const projectsResponseSchema = z.array(projectSchema);

export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Le nom doit comporter au moins 2 caractères')
    .max(100, 'Le nom ne peut pas dépasser 100 caractères'),
  slug: z
    .string()
    .trim()
    .min(2, 'Le slug doit comporter au moins 2 caractères')
    .max(100, 'Le slug ne peut pas dépasser 100 caractères')
    .regex(/^[a-z0-9-]+$/, 'Le slug ne peut contenir que des minuscules, des chiffres et des tirets'),
});

export type Project = z.infer<typeof projectSchema>;
export type Organisation = z.infer<typeof organisationSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
```

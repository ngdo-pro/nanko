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

### `GET /api/v1/projects/{projectId}/documents`
* **Authentification :** `ROLE_USER`
* **Headers :** `Authorization: Bearer <token>`
* **Description :** Liste tous les documents contenus dans le projet indiqué (avec métadonnées et résumé de l'AST).

#### Responses
* `200 OK` :
  ```json
  [
    {
      "id": "0191c0a1-7b3b-7c99-b1d5-2a1d2f34e567",
      "projectId": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
      "name": "Architecture Globale",
      "slug": "architecture-globale",
      "layer": 0,
      "shapesCount": 3,
      "connectorsCount": 2,
      "createdAt": "2026-09-07T10:00:00Z",
      "updatedAt": "2026-09-07T10:30:00Z"
    }
  ]
  ```
* `403 Forbidden` : `{"code": "ACCESS_DENIED", "message": "Accès refusé à ce projet."}`
* `404 Not Found` : `{"code": "PROJECT_NOT_FOUND", "message": "Projet introuvable."}`

---

### `POST /api/v1/projects/{projectId}/documents`
* **Authentification :** `ROLE_USER`
* **Headers :** `Content-Type: application/json`, `Authorization: Bearer <token>`
* **Description :** Crée un nouveau document dans le projet avec un code source initial template `.nanko`.

#### Request Payload (`CreateDocumentInput`)
```json
{
  "name": "Architecture Globale",
  "slug": "architecture-globale",
  "layer": 0
}
```

#### Responses
* `201 Created` :
  ```json
  {
    "id": "0191d011-7b3b-7c99-b1d5-2a1d2f34e567",
    "projectId": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
    "name": "Architecture Globale",
    "slug": "architecture-globale",
    "layer": 0,
    "sourceCode": "@id architecture-globale\n@layer 0\n\nrectangle app \"Application\"\n",
    "ast": {
      "shapes": [{ "id": "app", "type": "rectangle", "label": "Application" }],
      "connectors": []
    },
    "createdAt": "2026-09-07T10:00:00Z",
    "updatedAt": "2026-09-07T10:00:00Z"
  }
  ```
* `403 Forbidden` : `{"code": "ACCESS_DENIED", "message": "Action non autorisée sur ce projet."}`
* `409 Conflict` : `{"code": "DOCUMENT_SLUG_EXISTS", "message": "Un document avec ce slug existe déjà dans ce projet."}`
* `422 Unprocessable Entity` : Format standard des violations Symfony.

---

### `GET /api/v1/documents/{documentId}`
* **Authentification :** `ROLE_USER`
* **Headers :** `Authorization: Bearer <token>`
* **Description :** Retourne le document complet avec son code source `.nanko` et son AST dénormalisé.

#### Responses
* `200 OK` :
  ```json
  {
    "id": "0191d011-7b3b-7c99-b1d5-2a1d2f34e567",
    "projectId": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
    "organisationId": "0191c0a1-1111-7c99-b1d5-2a1d2f34e567",
    "name": "Architecture Globale",
    "slug": "architecture-globale",
    "layer": 0,
    "sourceCode": "@id architecture-globale\n@layer 0\n\nrectangle app \"Application\"\n",
    "ast": {
      "shapes": [{ "id": "app", "type": "rectangle", "label": "Application" }],
      "connectors": []
    },
    "createdAt": "2026-09-07T10:00:00Z",
    "updatedAt": "2026-09-07T10:30:00Z"
  }
  ```
* `403 Forbidden` : `{"code": "ACCESS_DENIED", "message": "Accès refusé à ce document."}`
* `404 Not Found` : `{"code": "DOCUMENT_NOT_FOUND", "message": "Document introuvable."}`

---

### `PUT /api/v1/documents/{documentId}`
* **Authentification :** `ROLE_USER`
* **Headers :** `Content-Type: application/json`, `Authorization: Bearer <token>`
* **Description :** Met à jour le code source `.nanko` du document, exécute le parseur syntaxique, extrait l'AST dénormalisé et sauvegarde le document.

#### Request Payload (`UpdateDocumentInput`)
```json
{
  "sourceCode": "@id architecture-globale\n@layer 0\n\nrectangle app \"Application\"\ncircle db \"Database\"\napp -> db \"requêtes SQL\"\n"
}
```

#### Responses
* `200 OK` :
  ```json
  {
    "id": "0191d011-7b3b-7c99-b1d5-2a1d2f34e567",
    "projectId": "0191c0a1-9a1c-7f88-82bc-3e2c1d45f678",
    "name": "Architecture Globale",
    "slug": "architecture-globale",
    "layer": 0,
    "sourceCode": "@id architecture-globale\n@layer 0\n\nrectangle app \"Application\"\ncircle db \"Database\"\napp -> db \"requêtes SQL\"\n",
    "ast": {
      "shapes": [
        { "id": "app", "type": "rectangle", "label": "Application" },
        { "id": "db", "type": "circle", "label": "Database" }
      ],
      "connectors": [
        { "source": "app", "target": "db", "label": "requêtes SQL" }
      ],
      "layout": {}
    },
    "updatedAt": "2026-09-07T10:35:00Z"
  }
  ```
* `422 Unprocessable Entity` :
  ```json
  {
    "code": "INVALID_NANKO_SYNTAX",
    "message": "Erreur de syntaxe à la ligne 4 : connecteur 'app -> inconnue' référence une Shape inexistante.",
    "line": 4
  }
  ```
* `403 Forbidden` : `{"code": "ACCESS_DENIED", "message": "Action non autorisée sur ce document."}`

---

## 2. Schémas de Validation Frontend (Zod)

### Workspaces & Projets (`frontend/src/features/workspaces/schemas.ts`)

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

### Documents & AST .nanko (`frontend/src/features/documents/schemas.ts`)

```typescript
import { z } from 'zod';

export const nankoAstShapeSchema = z.object({
  id: z.string(),
  type: z.enum(['rectangle', 'circle', 'text']),
  label: z.string(),
});

export const nankoAstConnectorSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().optional().nullable(),
});

export const nodeCoordinatesSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const nankoAstLayoutSchema = z.record(z.string(), nodeCoordinatesSchema);

export const nankoAstSchema = z.object({
  shapes: z.array(nankoAstShapeSchema).default([]),
  connectors: z.array(nankoAstConnectorSchema).default([]),
  layout: z
    .union([nankoAstLayoutSchema, z.array(z.any()).transform(() => ({}))])
    .optional()
    .default({}),
});

export const documentListItemSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  layer: z.number().int(),
  shapesCount: z.number().int().optional().default(0),
  connectorsCount: z.number().int().optional().default(0),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const documentDetailSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(2),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  layer: z.number().int(),
  sourceCode: z.string(),
  ast: nankoAstSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createDocumentSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit comporter au moins 2 caractères').max(255),
  slug: z.string().trim().min(2, 'Le slug doit comporter au moins 2 caractères').max(100).regex(/^[a-z0-9-]+$/, 'Minuscules, chiffres et tirets uniquement'),
  layer: z.coerce.number().int('Le layer doit être un entier').default(0),
});

export const updateDocumentSchema = z.object({
  sourceCode: z.string(),
});

export type NankoAstShape = z.infer<typeof nankoAstShapeSchema>;
export type NankoAstConnector = z.infer<typeof nankoAstConnectorSchema>;
export type NodeCoordinates = z.infer<typeof nodeCoordinatesSchema>;
export type NankoAstLayout = z.infer<typeof nankoAstLayoutSchema>;
export type NankoAst = z.infer<typeof nankoAstSchema>;
export type DocumentListItem = z.infer<typeof documentListItemSchema>;
export type DocumentDetail = z.infer<typeof documentDetailSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
```


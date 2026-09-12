# Domaine : Espaces de Travail (workspace-management) — Contrats d'API & Schémas

> **Spécification Formelle :** [`./openapi.yaml`](./openapi.yaml) (OpenAPI 3.1)  
> **Base URL :** `/api/v1`  
> **Format d'échange :** `application/json`

---

## 1. Périmètre & Frontières des Contrats

* **Ressources & Endpoints gérés dans ce domaine :**
  * `/api/v1/organisations` (Listing et auto-provisioning de l'espace personnel)
  * `/api/v1/organisations/{organisationId}/projects` (Listing et création de projets)
  * `/api/v1/projects/{projectId}/documents` (Listing et création de documents conteneurs)
* **Contrats délégués à d'autres domaines :**
  * *Édition et compilation de l'AST du document :* Délégué à `studio-modeling` (`/api/v1/documents/{id}`).

---

## 2. Cartographie des Endpoints REST

| Méthode | Endpoint | OperationId | Auth | Description |
|---|---|---|:---:|---|
| `GET` | `/api/v1/organisations` | `listOrganisations` | Bearer JWT | Liste les organisations du membre (auto-provisionne si 1ère visite) |
| `GET` | `/api/v1/organisations/{id}/projects` | `listProjects` | Bearer JWT | Liste les projets d'une organisation |
| `POST` | `/api/v1/organisations/{id}/projects` | `createProject` | Bearer JWT | Crée un projet au sein de l'organisation active |
| `GET` | `/api/v1/projects/{id}/documents` | `listDocuments` | Bearer JWT | Liste les conteneurs de documents d'un projet |
| `POST` | `/api/v1/projects/{id}/documents` | `createDocument` | Bearer JWT | Crée un conteneur de document avec template source |

> ℹ️ **Spécification Formelle des Requêtes & Réponses :**  
> Les corps de requêtes, paramètres, modèles de données et codes de statut HTTP sont intégralement spécifiés dans [`./openapi.yaml`](./openapi.yaml).

---

## 3. Schémas de Validation Client / Consommateurs (TypeScript & Zod)

```typescript
import { z } from 'zod';

export const organisationSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  isPersonal: z.boolean(),
  role: z.enum(['owner', 'member']),
  createdAt: z.string().datetime(),
  projects: z.array(z.lazy(() => projectSchema)),
});

export const projectSchema = z.object({
  id: z.string().uuid(),
  organisationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.string().datetime(),
});

export const createProjectInputSchema = z.object({
  name: z.string().min(1, 'Le nom du projet est requis').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide (kebab-case requis)'),
});

export const documentSummarySchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  layer: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createDocumentInputSchema = z.object({
  name: z.string().min(1, 'Le nom du document est requis').max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug invalide (kebab-case requis)'),
  layer: z.number().int().default(0),
});

export type Organisation = z.infer<typeof organisationSchema>;
export type Project = z.infer<typeof projectSchema>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type DocumentSummary = z.infer<typeof documentSummarySchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;
```

---

## 4. Modèle Standard d'Erreur

| Code HTTP | Format du Payload | Signification / Usage |
|---|---|---|
| `400 Bad Request` | `{ "code": "VALIDATION_ERROR", "message": "..." }` | Paramètres ou corps de requête non conforme |
| `401 Unauthorized` | `{ "code": "UNAUTHORIZED", "message": "..." }` | Authentification requise ou jeton expiré |
| `403 Forbidden` | `{ "code": "FORBIDDEN", "message": "..." }` | Utilisateur non membre de l'organisation ciblée |
| `404 Not Found` | `{ "code": "NOT_FOUND", "message": "..." }` | Organisation ou projet introuvable |
| `409 Conflict` | `{ "code": "PROJECT_SLUG_EXISTS", "message": "..." }` | Collision d'unicité de slug dans l'organisation |

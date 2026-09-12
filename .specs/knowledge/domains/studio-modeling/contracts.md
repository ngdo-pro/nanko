# Domaine : Studio de Modélisation (studio-modeling) — Contrats d'API & Schémas

> **Spécification Formelle :** [`./openapi.yaml`](./openapi.yaml) (OpenAPI 3.1)  
> **Base URL :** `/api/v1/documents`  
> **Format d'échange :** `application/json`

---

## 1. Périmètre & Frontières des Contrats

* **Ressources & Endpoints gérés dans ce domaine :**
  * `GET /api/v1/documents/{id}` (Lecture du document source et de l'AST compilé)
  * `PUT /api/v1/documents/{id}` (Compilation, validation syntaxique DSL et mise à jour de l'AST)
* **Contrats délégués à d'autres domaines :**
  * *Création et listing des documents conteneurs :* Délégué à `workspace-management` (`/api/v1/projects/{projectId}/documents`).

---

## 2. Cartographie des Endpoints REST

| Méthode | Endpoint | OperationId | Auth | Description |
|---|---|---|:---:|---|
| `GET` | `/api/v1/documents/{id}` | `getDocument` | Bearer JWT | Récupère le code `.nanko` et l'AST compilé |
| `PUT` | `/api/v1/documents/{id}` | `updateDocument` | Bearer JWT | Valide la syntaxe `.nanko`, persiste le code et recalcule l'AST |

> ℹ️ **Spécification Complète des Schémas et Payloads :**  
> Les corps de requêtes, paramètres de chemin, types détaillés et réponses d'erreurs sont spécifiés dans [`./openapi.yaml`](./openapi.yaml).

---

## 3. Schémas de Validation Client / Consommateurs (TypeScript & Zod)

```typescript
import { z } from 'zod';

export const shapeTypeSchema = z.enum(['rectangle', 'circle', 'text']);

export const astShapeSchema = z.object({
  id: z.string().min(1),
  type: shapeTypeSchema,
  label: z.string(),
  desc: z.string().nullable().optional(),
  x: z.number().nullable().optional(),
  y: z.number().nullable().optional(),
});

export const astConnectorSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().nullable().optional(),
  desc: z.string().nullable().optional(),
});

export const nankoAstSchema = z.object({
  dslVersion: z.number().int().min(1).default(1),
  shapes: z.array(astShapeSchema),
  connectors: z.array(astConnectorSchema),
});

export const documentResponseSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  content: z.string(),
  layer: z.number().int(),
  ast: nankoAstSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const updateDocumentInputSchema = z.object({
  content: z.string().min(1, 'Le contenu du document ne peut être vide'),
  layer: z.number().int().default(0),
});

export type NankoAst = z.infer<typeof nankoAstSchema>;
export type AstShape = z.infer<typeof astShapeSchema>;
export type AstConnector = z.infer<typeof astConnectorSchema>;
export type DocumentResponse = z.infer<typeof documentResponseSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>;
```

---

## 4. Modèle Standard d'Erreur

| Code HTTP | Format du Payload | Signification / Usage |
|---|---|---|
| `400 Bad Request` | `{ "code": "SYNTAX_ERROR", "message": "Ligne 5: ..." }` | Syntaxe DSL `.nanko` invalide ou version non supportée |
| `401 Unauthorized` | `{ "code": "UNAUTHORIZED", "message": "..." }` | Jeton JWT manquant ou expiré |
| `403 Forbidden` | `{ "code": "FORBIDDEN", "message": "..." }` | Non membre de l'organisation détenant le document |
| `404 Not Found` | `{ "code": "DOCUMENT_NOT_FOUND", "message": "..." }` | Document inexistant |

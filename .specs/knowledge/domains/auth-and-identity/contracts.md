# Domaine : Identité & Accès (auth-and-identity) — Contrats d'API & Schémas

> **Spécification Formelle :** [`./openapi.yaml`](./openapi.yaml) (OpenAPI 3.1)  
> **Base URL :** `/api/v1`  
> **Format d'échange :** `application/json`

---

## 1. Périmètre & Frontières des Contrats

* **Ressources & Endpoints gérés dans ce domaine :**
  * `/api/v1/me` (Profil interne de l'utilisateur authentifié avec JIT provisioning)
* **Contrats délégués à l'IdP (Keycloak OIDC) :**
  * Authentification interactive PKCE (`/realms/nanko/protocol/openid-connect/auth`)
  * Échange de code & refresh token (`/realms/nanko/protocol/openid-connect/token`)
  * Clés publiques JWKS (`/realms/nanko/protocol/openid-connect/certs`)
  * Déconnexion globale (`/realms/nanko/protocol/openid-connect/logout`)

---

## 2. Cartographie des Endpoints REST

| Méthode | Endpoint | OperationId | Auth | Description |
|---|---|---|:---:|---|
| `GET` | `/api/v1/me` | `getMe` | Bearer JWT | Retourne le profil utilisateur interne synchronisé |

> ℹ️ **Spécification Formelle des Requêtes & Réponses :**  
> Les schémas de payload et d'erreur sont décrits dans [`./openapi.yaml`](./openapi.yaml).

---

## 3. Schémas de Validation Client / Consommateurs (TypeScript & Zod)

```typescript
import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  keycloakId: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export type UserProfile = z.infer<typeof userProfileSchema>;
```

---

## 4. Modèle Standard d'Erreur

| Code HTTP | Format du Payload | Signification / Usage |
|---|---|---|
| `401 Unauthorized` | `{ "code": "UNAUTHORIZED", "message": "Token JWT manquant, invalide ou expiré." }` | Session expirée ou jeton falsifié |

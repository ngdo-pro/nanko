# Domaine : Identité & Accès (auth-and-identity) - Contrats d'API & Schémas

## 1. Endpoints REST Actifs

### `GET /api/v1/me`
* **Authentification :** `ROLE_USER` (Jeton Bearer JWT émis par Keycloak valide)
* **Headers :** `Authorization: Bearer <access_token>`
* **Description :** Retourne le profil interne Nanko associé au compte Keycloak connecté (avec JIT provisioning automatique si premier appel).

#### Réponses
* `200 OK` :
  ```json
  {
    "id": "0191c280-496a-7312-bf91-a1b2c3d4e5f6",
    "keycloakId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "user@nanko.dev",
    "createdAt": "2026-09-05T08:00:00.000Z"
  }
  ```
* `401 Unauthorized` :
  ```json
  {
    "code": "UNAUTHORIZED",
    "message": "Token JWT manquant, invalide ou expiré."
  }
  ```

---

## 2. Contrats & Types Frontend (TypeScript)

### Type & Schéma Zod : `UserProfile` (`frontend/src/auth/schemas.ts`, `frontend/src/auth/types.ts`)
```typescript
import { z } from 'zod';

export const userProfileSchema = z.object({
  id: z.string().uuid(),
  keycloakId: z.string().min(1),
  email: z.string().email(),
  createdAt: z.string().datetime(),
});

export type ValidatedUserProfile = z.infer<typeof userProfileSchema>;

export interface UserProfile {
  id: string
  keycloakId: string
  email: string
  createdAt: string
}
```

export interface AuthContextValue {
  isAuthenticated: boolean
  isLoading: boolean
  user: UserProfile | null
  token: string | null
  login: () => Promise<void>
  logout: () => Promise<void>
}
```

### Configuration OIDC Client
* **Client ID :** `nanko-web` (Public client avec PKCE standard S256).
* **Realm :** `nanko`.
* **Endpoints OIDC standards :**
  * Authorization : `/realms/nanko/protocol/openid-connect/auth`
  * Token : `/realms/nanko/protocol/openid-connect/token`
  * JWKS Certs : `/realms/nanko/protocol/openid-connect/certs`
  * Logout : `/realms/nanko/protocol/openid-connect/logout`

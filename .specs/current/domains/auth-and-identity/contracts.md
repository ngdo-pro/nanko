# Domaine : Identité & Accès (auth-and-identity) - Contrats d'API & Schémas

## 1. Endpoints REST & OAuth Actifs

### `POST /api/v1/auth/token`
* **Authentification :** `PUBLIC_ACCESS`
* **Headers :** `Content-Type: application/json`
* **Description :** Émission d'un token d'accès JWT et d'un refresh token.

#### Request Payload
```json
{
  "grantType": "password",
  "email": "user@example.com",
  "password": "SecretPassword123!"
}
```

#### Réponses
* `200 OK` :
  ```json
  {
    "tokenType": "Bearer",
    "expiresIn": 3600,
    "accessToken": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "def50200..."
  }
  ```
* `401 Unauthorized` : `{ "code": "INVALID_CREDENTIALS", "message": "Identifiant ou mot de passe invalide." }`

---

## 2. Schémas de Validation Frontend (Zod)

```typescript
import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Format email invalide'),
  password: z.string().min(12, 'Le mot de passe doit contenir au moins 12 caractères')
});

export type LoginInput = z.infer<typeof loginSchema>;
```

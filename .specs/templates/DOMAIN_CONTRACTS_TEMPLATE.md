# Domaine : [Nom du Domaine] - Contrats d'API & Schémas

## 1. Endpoints REST Actifs

### `[METHOD] /api/v1/[resource]`
* **Authentification :** `PUBLIC_ACCESS` | `ROLE_USER` | `Capability:[capability_name]`
* **Headers :** `Content-Type: application/json`, `Authorization: Bearer <token>`
* **Description :** [Rôle de l'endpoint]

#### Request DTO (`[InputDtoName]`)
```php
final readonly class [InputDtoName]
{
    public function __construct(
        #[Assert\NotBlank]
        public string $field,
    ) {}
}
```

#### Réponses
* `200 OK` / `201 Created` :
  ```json
  {
    "id": "01918a24-7b3b-7c99-b1d5-2a1d2f34e567",
    "field": "value"
  }
  ```
* `422 Unprocessable Entity` : Violations Symfony
* `401 / 403 / 404 / 409` : `{ "code": "ERROR_CODE", "message": "..." }`

---

## 2. Schémas de Validation Frontend (Zod)

```typescript
import { z } from 'zod';

export const [featureSchema] = z.object({
  field: z.string().min(1, 'Champ requis')
});

export type [FeatureInput] = z.infer<typeof [featureSchema]>;
```

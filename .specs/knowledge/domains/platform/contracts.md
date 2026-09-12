# Domaine : Plateforme & Observabilité (platform) — Contrats d'API & Schémas

> **Spécification Formelle :** [`./openapi.yaml`](./openapi.yaml) (OpenAPI 3.1)  
> **Base URL :** `/api/v1`  
> **Format d'échange :** `application/json`

---

## 1. Périmètre & Frontières des Contrats

* **Ressources & Endpoints gérés dans ce domaine :**
  * `GET /api/v1/version` (Diagnostic de version applicative active)
  * `GET /robots.txt` (Exclusion d'indexation préproduction RFC 9309 gérée par Caddy)
  * `POST /v1/logs` (Endpoint OTLP/HTTP collecteur OpenTelemetry SigNoz)
  * `POST /api/event` (Endpoint d'ingestion Plausible Analytics)

---

## 2. Cartographie des Endpoints REST

| Méthode | Endpoint | OperationId | Auth | Description |
|---|---|---|:---:|---|
| `GET` | `/api/v1/version` | `getVersion` | Public | Retourne version SemVer, commit Git et environnement |
| `GET` | `/robots.txt` | `getRobotsTxt` | Public | Interdiction d'indexation sur la préproduction (`Disallow: /`) |
| `POST` | `/v1/logs` | `ingestLogs` | Public / Interne | Ingestion de traces et logs OTLP HTTP (SigNoz) |
| `POST` | `/api/event` | `trackEvent` | Public | Télémétrie anonyme d'audience Plausible |

> ℹ️ **Spécification Formelle :**  
> Les schémas de payload et statuts HTTP sont détaillés dans [`./openapi.yaml`](./openapi.yaml).

---

## 3. Schémas de Validation Client / Consommateurs (TypeScript & Zod)

```typescript
import { z } from 'zod';

export const versionResponseSchema = z.object({
  status: z.string(),
  version: z.string(),
  commit: z.string(),
  environment: z.enum(['local', 'preprod', 'prod']),
});

export type VersionResponse = z.infer<typeof versionResponseSchema>;
```

---

## 4. Modèle Standard d'Erreur

| Code HTTP | Format du Payload | Signification / Usage |
|---|---|---|
| `401 Unauthorized` | Réponse native HTTP Basic Auth | Accès restreint à la préproduction hors `/robots.txt` |
| `500 Internal Error` | `{ "status": "error", "message": "..." }` | Défaillance d'infrastructure ou de supervision |

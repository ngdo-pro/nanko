---
name: sync-contracts
description: Synchronize API contracts, endpoints, and validation schemas from a delivered specification into .specs/knowledge/domains/[domain]/contracts.md.
---

# Skill: sync-contracts

Use this skill to update the living API contracts documentation of a domain (`/sync-contracts [id]`), following the strict structure of `DOMAIN_CONTRACTS_TEMPLATE.md`.

---

## Procedure

1. **Load Inputs:**
   * Read the delivered specification `.specs/specs/active/[id]*.md` and identify its target domain (`[domain]`).
   * Read `.specs/knowledge/domains/[domain]/contracts.md` (or initialize from `templates/DOMAIN_CONTRACTS_TEMPLATE.md`).

2. **Extract Interface Deltas:**
   * **REST Endpoints:** Add or update route definitions (`[METHOD] /api/v1/...`), required headers, authentication requirements, and permissions/capabilities.
   * **Request / Response DTOs:** Add PHP DTO definitions with validation assertions (`#[Assert\...]`).
   * **Response Payloads & HTTP Statuses:** Document standard success responses (`200 OK`, `201 Created`) and error formats (`422`, `401`, `403`, `404`, `409`).
   * **Frontend Schemas:** Add or update TypeScript Zod validation schemas (`z.object({...})`) and inferred types.

3. **Save & Report:**
   * Write updated content to `.specs/knowledge/domains/[domain]/contracts.md`.
   * Return a concise summary of endpoints and schemas synchronized.

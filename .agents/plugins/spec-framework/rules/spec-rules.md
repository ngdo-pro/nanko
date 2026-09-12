# Core Specification Rules (Spec Rules)

These rules apply universally to all agents operating within the **Spec Framework**:

---

## 1. Absolute Path Portability Rule
* **All file paths in specs, initiatives, and features must be strictly workspace-relative** (relative to repository root, e.g., `src/...`, `tests/...`, `config/...`).
* Never include machine-specific absolute paths (`/Users/...`, `file://`, `/tmp/...`).

---

## 2. Scannability & Conciseness Rule
* **Initiatives and Features: 1 to 2 pages maximum.** Avoid narrative prose essays. Prioritize ASCII diagrams, invariant lists, and behavioral tables.
* **Engineering Specs (`SPEC_TEMPLATE.md`):**
  - Section 3.1: File inventory must be presented as a factorized text `tree` with `[NEW]` and `[MOD]` tags. Bullet lists repeating the full path on every line are forbidden.
  - Clean omission notes: Condense irrelevant technical tiers into a single clear omission line (e.g., if UI-only, condense Data/Infra tiers into an explicit omission note).

---

## 3. BDD Traceability Rule
* **Every Invariant (`INV-X`)** defined in Section 5 of an engineering spec must have:
  1. A direct file coverage mapping in the appendix (`↳ Covered by: [files]`).
  2. A dedicated Gherkin test scenario in Section 8.1.
* Zero unverified or orphan invariants allowed.

---

## 4. Integrity & Non-Regression Rule
* A spec can only be marked as completed and synced into `current/` when **100% of quality gates** (unit tests, component/integration tests, e2e tests, linter, typechecker) pass cleanly.

---

## 5. Language Consistency Rule
* Agent definitions, skills instructions, rules, and tooling files are maintained in **English**.
* All generated deliverables (Vision, Initiatives, Features, Specs, Decisions, and user communications) must be authored in the **user's language**.

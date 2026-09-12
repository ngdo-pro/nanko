---
name: sync-current
description: Propagate a delivered specification into the ground truth documentation (.specs/current/) and archive the spec.
---

# Skill: sync-current

Use this skill after an engineering specification has passed all quality gates and review audits (`/sync-current [id]`).

All updated ground truth documents must be maintained in the user's language.

---

## Procedure

1. **Locate Specification:**
   * Read `.specs/changes/active/[id]*.md` and identify the target domain from its metadata.

2. **Update Domain Ground Truth:**
   * Create directory `.specs/current/domains/[domain]/` if it does not exist yet (Greenfield bootstrap).
   * `.specs/current/domains/[domain]/behavior.md`: Document user flows and business rules.
   * `.specs/current/domains/[domain]/contracts.md`: Document endpoints, contracts, schemas, and events.
   * `.specs/current/domains/[domain]/models.md`: Document aggregates, database tables, models, and columns.
   * `.specs/current/domains/[domain]/tech.md`: Document patterns, libraries, and architecture choices.

3. **Identify & Formalize Structural Decisions (PDR / ADR):**
   * Scan the delivered delta for non-trivial trade-offs:
     - **Product / Ergonomic Decision (PDR):** Access models, disruptive UX choices, simplified workflows.  
       $\rightarrow$ Generate PDR in `.specs/decisions/pdr/PDR-XXX-[slug].md` using `templates/PDR_TEMPLATE.md`.
     - **Technical / Architectural Decision (ADR):** New dependencies, rendering engines, persistence patterns, protocols.  
       $\rightarrow$ Generate ADR in `.specs/decisions/adr/ADR-XXX-[slug].md` using `templates/ADR_TEMPLATE.md`.
   * Ask the user if any ambiguity remains regarding a potential decision.

4. **Archive Specification & Cascading Roadmap Completion:**
   * Move the specification file from `.specs/changes/active/` to `.specs/changes/archive/`.
   * **Level 1 (Feature):** If derived from an initiative feature:
     - Check off this spec under `## 6. Implementation Spec(s)`: `- [x] **`[XXX-[slug]]`**`.
     - **Cascade Check:** Are all specs in Section 6 now marked `[x]`?
       - If yes:
         * Update Feature header to `Status: Archived`.
         * Move the feature file from `active/[feature].md` to `archive/[feature].md`.
   * **Level 2 (Initiative):** If the Feature was archived:
     - In the parent initiative's `README.md`, update the feature link to `archive/[feature].md` and check it off: `- [x] **`[feature-slug]`**: ...`.
     - **Cascade Check:** Are all features of the initiative now in `archive/`?
       - If yes: update Initiative header to `Status: Archived` and move the initiative directory from `.specs/initiatives/active/[initiative]` to `.specs/initiatives/archive/[initiative]`.
   * **Level 3 (Vision):** If the Initiative was archived:
     - In `.specs/vision.md` under Section 5 (*Strategic Initiatives Roadmap*), check off the initiative: `- [x] **`[initiative-slug]`**: ...`.

5. **Confirmation:**
   * Summarize all performed updates (updated domain files, created PDRs/ADRs, archived spec, and cascaded completion milestones).

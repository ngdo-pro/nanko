---
name: feature
description: Frame a discrete functional or technical feature in .specs/initiatives/active/[initiative]/[feature].md, ready for technical spec.
---

# Skill: feature

Use this skill when the user wants to define or frame a discrete feature within an active initiative (`/feature [initiative] [feature-slug]`).

All generated feature documents (`.specs/initiatives/active/[initiative]/[feature-slug].md`) and user discussions must be authored in the user's language.

A **Feature** represents a concrete, cohesive unit of user experience or technical capability ideally sized for **1 engineering Spec Delta** (a few days of implementation).

The document must remain concise (**1 page maximum**), visual, and behavior-oriented.

---

## Procedure

### 1. Immersion
1. Read the parent initiative's overview in `.specs/initiatives/active/[initiative]/README.md`.
2. Inspect active domain ground truth in `.specs/current/domains/[domain]/` to understand current baseline behavior.

### 2. Interaction & Invariants Interview (Max 2 questions via `ask_question`)
Clarify interaction specifics:
* **Trigger & Wireframe:** How does the user/system initiate the action? What does the interaction look like visually (inline editing, popover, canvas connector)?
* **Functional Invariants:** What are the non-negotiable integrity rules (`INV-1`, `INV-2`...)? What happens on edge cases or invalid inputs?
* **Out of Scope:** What elements are deliberately deferred to ensure rapid, focused delivery?

### 3. Generate Feature Document
1. Instantiate `templates/FEATURE_TEMPLATE.md` in `.specs/initiatives/active/[initiative]/[feature-slug].md`.
2. Complete thoroughly in the user's language:
   - 2-sentence Problem & Trigger.
   - Precise ASCII wireframe.
   - 3-step nominal user flow (*Happy Path*: Trigger, Interaction, Validation).
   - Numbered functional invariants (`INV-1`, `INV-2`...).
   - Strict Out-of-Scope boundaries.
3. Update the feature roadmap in the parent initiative's `README.md`:
   - Turn the feature reference into a relative link to the new file: `[`[feature-slug].md`](./[feature-slug].md)`.
   - Update its state indicator (e.g., `*(Framed ✅ — Ready for `/spec`)*`).

### 4. Next Step
Propose generating the corresponding technical engineering spec via `/spec [domain] [topic]`.

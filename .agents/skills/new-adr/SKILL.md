---
name: new-adr
description: Formaliser un arbitrage technique, de protocole ou de stockage sous forme d'ADR.
---

# Skill : new-adr

Utilisez ce skill pour consigner une décision technique (`/new-adr [sujet]`).

## Procédure

1. Déterminer le prochain ID (`ADR-XXX`) dans `.specs/decisions/architecture/` et `docs/adr/`.
2. Utiliser le template `.specs/templates/ADR_TEMPLATE.md`.
3. Consigner la problématique, les options techniques comparées, la solution retenue et les conséquences / trade-offs acceptés.
4. Créer le document dans `.specs/decisions/architecture/ADR-XXX-[slug].md`.

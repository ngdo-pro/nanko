---
name: spec
description: Cadrer un besoin d'évolution et générer une spécification delta structurée dans .specs/changes/active/.
---

# Skill : spec

Utilisez ce skill lorsque l'utilisateur demande de concevoir, spécifier ou cadrer une évolution pour un domaine (`/spec [domaine] [besoin]`).

## Procédure

1. **Isolation du domaine :**
   * Vérifier que `.specs/current/domains/[domaine]/` existe.
   * Lire les fichiers de l'état courant : `behavior.md`, `tech.md`, `contracts.md`, `models.md`.
   * Lire `.specs/vision.md` et `.specs/architecture.md`.
2. **Interview (2 questions max) :**
   * Si des zones d'ombre subsistent, poser au maximum 2 questions précises à l'utilisateur.
3. **Numéro de séquence :**
   * Déterminer le prochain ID sur 3 chiffres (`XXX`) d'après `.specs/changes/active/` et `.specs/changes/archive/`.
4. **Génération du Delta :**
   * Instancier `.specs/CHANGE_TEMPLATE.md` dans `.specs/changes/active/XXX-[slug].md`.
   * Remplir toutes les sections : intention, diagramme Mermaid, DB delta, DTOs & contrats d'API, wireframes ASCII & JSX, schéma Zod & états UI, plan séquentiel et scénarios Gherkin.
5. **Validation :**
   * Inviter l'utilisateur à relire la spec dans son éditeur avant l'implémentation (`/build-spec XXX`).

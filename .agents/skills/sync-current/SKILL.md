---
name: sync-current
description: Répercuter une spécification livrée dans l'état courant (.specs/current/) et archiver la spec.
---

# Skill : sync-current

Utilisez ce skill après validation et exécution d'une spécification (`/sync-current [id]`).

## Procédure

1. **Localiser la spec :**
   * Lire `.specs/changes/active/[id]*.md` et identifier le domaine dans ses métadonnées.
2. **Mettre à jour l'état courant :**
   * `.specs/current/domains/[domaine]/behavior.md` : Ajouter les parcours utilisateurs et nouvelles règles métier.
   * `.specs/current/domains/[domaine]/contracts.md` : Ajouter les nouveaux endpoints REST et schémas Zod.
   * `.specs/current/domains/[domaine]/models.md` : Ajouter les agrégats, tables SQL et colonnes.
   * `.specs/current/domains/[domaine]/tech.md` : Ajouter les nouveaux patterns ou dépendances si besoin.
3. **Archiver la spec :**
   * Déplacer le fichier de `.specs/changes/active/` vers `.specs/changes/archive/`.
4. **Confirmer :**
   * Résumer les mises à jour effectuées à l'utilisateur.

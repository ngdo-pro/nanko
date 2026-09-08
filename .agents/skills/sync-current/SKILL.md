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

3. **Détecter et formaliser les Décisions Structurantes (PDR / ADR) :**
   * Analyser le delta livré pour repérer tout arbitrage non trivial :
     - **Arbitrage Produit / Ergonomie (PDR)** : modèle d'accès, choix UX disruptif, simplification fonctionnelle, arbitrage de flow.  
       $\rightarrow$ Générer le PDR dans `.specs/decisions/product/PDR-XXX-[slug].md` via `.specs/templates/PDR_TEMPLATE.md`.
     - **Arbitrage Technique / Architecture (ADR)** : nouvelle dépendance, protocole, moteur de rendu, pattern de persistance, choix d'infrastructure.  
       $\rightarrow$ Générer l'ADR dans `.specs/decisions/architecture/ADR-XXX-[slug].md` via `.specs/templates/ADR_TEMPLATE.md`.
   * Si un doute subsiste, demander confirmation à l'utilisateur.

4. **Archiver la spec :**
   * Déplacer le fichier de `.specs/changes/active/` vers `.specs/changes/archive/`.

5. **Confirmer :**
   * Résumer les mises à jour effectuées (fichiers de domaine, PDRs/ADRs créés, et spec archivée).

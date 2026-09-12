---
name: sync-knowledge
description: Répercuter une spécification livrée dans la documentation de référence (.specs/knowledge/) et archiver la spec.
---

# Skill : sync-knowledge

Utilisez ce skill après validation et exécution d'une spécification (`/sync-knowledge [id]`).

## Procédure

1. **Localiser la spec :**
   * Lire `.specs/specs/active/[id]*.md` et identifier le domaine dans ses métadonnées.

2. **Mettre à jour la base de connaissances du domaine (.specs/knowledge/domains/[domaine]/) :**
   * `behavior.md` : Parcours utilisateurs, flux Mermaid, règles métier et matrice d'états (zéro pollution technique).
   * `contracts.md` : Nouveaux endpoints REST, DTOs et schémas Zod.
   * `models.md` : Agrégats, entités Doctrine, tables SQL, colonnes et diagramme ERD.
   * `tech.md` : Nouveaux patterns, services, dépendances et sécurité.

3. **Détecter et formaliser les Décisions Structurantes (PDR / ADR) :**
   * Analyser le delta livré pour repérer tout arbitrage non trivial :
     - **Arbitrage Produit / Ergonomie (PDR)** : modèle d'accès, choix UX disruptif, simplification fonctionnelle, arbitrage de flow.  
       $\rightarrow$ Générer le PDR dans `.specs/decisions/product/PDR-XXX-[slug].md`.
     - **Arbitrage Technique / Architecture (ADR)** : nouvelle dépendance, protocole, moteur de rendu, pattern de persistance, choix d'infrastructure.  
       $\rightarrow$ Générer l'ADR dans `.specs/decisions/architecture/ADR-XXX-[slug].md`.
   * Si un doute subsiste, demander confirmation à l'utilisateur.

4. **Archiver la spec & Clôture en cascade :**
   * Déplacer le fichier de `.specs/specs/active/` vers `.specs/specs/archive/`.
   * Mettre à jour la feature parente dans l'initiative et clore en cascade si tout est livré.

5. **Confirmer :**
   * Résumer les mises à jour effectuées (fichiers de domaine, PDRs/ADRs créés, et spec archivée).

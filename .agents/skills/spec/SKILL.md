---
name: spec
description: Cadrer un besoin d'évolution et générer une spécification delta structurée dans .specs/specs/planned/ ou active/.
---

# Skill : spec

Utilisez ce skill lorsque l'utilisateur demande de concevoir, spécifier ou cadrer une évolution pour un domaine (`/spec [domaine] [besoin]`).

## Procédure

1. **Isolation du domaine :**
   * Vérifier que `.specs/baseline/domains/[domaine]/` existe.
   * Lire les fichiers de l'état de référence (baseline) : `behavior.md`, `tech.md`, `contracts.md`, `models.md`.
   * Lire `.specs/vision.md` et `.specs/architecture.md`.

2. **Interview :**
   * Si des zones d'ombre subsistent (notamment sur l'exposition réseau, la sécurité des endpoints ou le périmètre), poser des questions précises à l'utilisateur (sans cap artificiel, en suggérant de découper si le scope est trop lourd).

3. **Numéro de séquence :**
   * Déterminer le prochain ID sur 3 chiffres (`XXX`) d'après `.specs/specs/planned/`, `.specs/specs/active/` et `.specs/specs/archive/`.

4. **Génération du Delta (`.specs/specs/planned/XXX-[slug].md`) :**
   * Instancier le modèle `.specs/CHANGE_TEMPLATE.md` en respectant scrupuleusement les règles de concision et de structure suivantes :
     - **Règle absolue de portabilité :** Tous les chemins de fichiers doivent impérativement être relatifs à la racine du projet (`frontend/...`, `backend/...`, `tests-e2e/...`). Aucun chemin absolu machine (`/Users/...`, `file://`) n'est toléré dans les specs versionnées.
     - **Section 1 (Intention & Contexte) :** Pourquoi, impact, In Scope, Out of Scope. Mentionner une ligne d'omission propre pour les pans sans objet (ex: si 100% frontend, condenser DBAL/API/Réseau en une note d'omission).
     - **Section 2 (Flux & Architecture) :** Diagramme Mermaid synthétique (nominal + erreurs).
     - **Section 3 (Inventaire & Contrats) :**
       * `3.1 Arborescence & Responsabilités` : Présentation obligatoire sous forme de `tree` textuel factorisé avec statuts `[NEW]` (création) / `[MOD]` (modification) et rôles en 1 ligne (interdiction des listes à puces répétant le chemin complet sur chaque ligne).
       * `3.2 Contrats & Signatures Clés` : Signatures TypeScript / PHP des types, DTOs ou callbacks critiques.
     - **Section 4 (Spécifications Détaillées) :** Modèle DBAL & Contrats DTO (si backend) / Wireframes ASCII & Matrice des états UI (si frontend).
     - **Section 5 (Invariants Métier & Traçabilité) :** Invariants binaires numérotés (`INV-1`, `INV-2`, etc.) avec règle courte et flèche `↳ *Couvert par :* [fichiers courts](#annexe-index-des-fichiers)`.
     - **Section 6 (Pièges Techniques / Watchouts) :** 3-4 pièges techniques concrets anticipés (React compiler, collisions d'événements, formats Zod, jsdom/SVG, DBAL gotchas).
     - **Section 7 (Plan d'Exécution Séquentiel) :** Checklist phasée avec tâches atomiques et liens cliquables vers l'annexe.
     - **Section 8 (Validation BDD & Commandes) :**
       * `8.1 Scénarios Gherkin Exhaustifs` : **Exhaustivité obligatoire** (chaque invariant de la Section 5 dispose obligatoirement d'un scénario Gherkin correspondant). Ordonnancement strict en 3 blocs :
         1. Tests Unitaires (`@unit`)
         2. Tests d'Intégration & Composants (`@component` / `@integration`)
         3. Tests End-to-End (`@e2e` / `@web`)
       * `8.2 Commandes d'Exécution & Quality Gates` : Commandes prêtes à copier-coller (tests ciblés, typecheck, lint, e2e).
     - **Annexe (Index des Fichiers) :** Table de correspondance en fin de document (Nom court $\rightarrow$ Chemin relatif racine complet) avec ancre HTML `<a id="annexe-index-des-fichiers"></a>`.

5. **Validation :**
   * Inviter l'utilisateur à relire la spec dans son éditeur avant l'implémentation (`/build-spec XXX`).

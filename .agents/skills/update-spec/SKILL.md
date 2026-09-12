---
name: update-spec
description: Mettre à jour une spécification active lors d'un pivot, d'un changement de scope ou d'un ajustement de règles métier.
---

# Skill : update-spec

Utilisez ce skill lorsque l'utilisateur demande de modifier, ajuster, réduire ou enrichir le périmètre d'une spécification active (`/update-spec [id] [ajustements]`), ou lors de tout pivot intervenant pendant le développement.

## Procédure

1. **Chargement de la spec active :**
   * Localiser et lire `.specs/specs/active/[id]*.md`.
   * Si le fichier n'existe pas dans `active/`, renvoyer une erreur explicite invitant à vérifier l'identifiant.
2. **Analyse d'impact exhaustive :**
   * Identifier avec rigueur toutes les sections impactées par la demande :
     * **Section 1 (Intention, Scope & Out of Scope) :** Ajouter/retirer les éléments de scope, ajuster le « Why » et l'impact utilisateur.
     * **Section 2 (Flux & Diagramme Mermaid) :** Mettre à jour les séquences d'interactions et flux de données.
     * **Section 3 & 4 (Modèle de données & Contrats d'API) :** Adapter les champs, DTOs ou requêtes SQL si le contrat change.
     * **Section 6 (Maquettes & Wireframes) :** Mettre à jour les wireframes ASCII et l'arborescence attendue.
     * **Section 7 (Spécifications UI & Logique) :** Adapter les schémas Zod, helpers sémantiques et la matrice des états.
     * **Section 8 (Invariants & Cas limites) :** Ajouter ou ajuster les règles de gestion et invariants métier.
     * **Section 9 (Plan d'exécution séquentiel) :** Réajuster les tâches (cochées `[x]` ou `[ ]`) selon le nouvel état réel.
     * **Section 10 (DoD & Scénarios Gherkin) :** Adapter les scénarios de test pour refléter fidèlement le nouveau comportement attendu.
3. **Mise à jour du fichier :**
   * Appliquer les modifications directement dans `.specs/specs/active/[id]*.md`.
   * Veiller à purger toute mention devenue obsolète (anciennes options retirées, anciens raccourcis).
4. **Restitution synthétique :**
   * Résumer les ajustements apportés au contrat documentaire.
   * Si le code associé doit être synchronisé, enchaîner immédiatement sur l'implémentation.

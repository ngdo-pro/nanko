# Feature : Sélection, Surbrillance & Suppression de Connecteur (12-connector-selection-and-deletion)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Backlog Feature)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Actuellement, il est impossible de supprimer un connecteur directement depuis le canvas : l'utilisateur doit basculer en mode Code ou Split pour rechercher et effacer textuellement la ligne `source -> target`. L'utilisateur déclenche l'action en cliquant sur le connecteur pour le sélectionner (mise en surbrillance) puis en frappant la touche `Backspace` ou `Delete` (ou clic sur un bouton poubelle contextuel).

---

## 2. Wireframe / Visual Behavior

```text
CONNECTEUR AU REPOS                 SÉLECTION AU CLIC                   SUPPRESSION (Suppr / Backspace)
                                                                        
gateway ────────> auth              gateway ════════> auth              gateway           auth
 (trait fin var(--brand))            (lueur cyan / surépaisseur           (connecteur retiré du canvas
                                      + bouton poubelle [x])              et du code .nanko)
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur clique sur la ligne ou le badge d'un connecteur sur le canvas.
2. **Interaction & Affichage (Interaction & Display) :** Le connecteur passe en état sélectionné (`.selected`) : son trait s'épaissit, sa couleur s'illumine (lueur cyan), et une zone d'action rapide apparaît au survol.
3. **Validation & Persistance (Validation & Persistence) :** L'utilisateur appuie sur la touche `Backspace` ou `Delete` :
   * Le connecteur est immédiatement retiré du canvas.
   * La ligne déclarative `source -> target` correspondante est supprimée du texte `.nanko`.
   * Les éventuelles surcharges associées dans `!LAYOUT` (`source->target: from=..., to=...`) sont également nettoyées.
   * Le document passe en état non enregistré (`Cmd+S`).

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Isolation de suppression) :** Supprimer un connecteur ne supprime en aucun cas les Shapes source ou cible qui y étaient reliées.
* **INV-2 (Nettoyage intégral du code DSL et de !LAYOUT) :** La suppression éradique à la fois la ligne déclarative dans le corps sémantique et la ligne de métadonnées géométriques éventuelle dans le bloc `!LAYOUT`.
* **INV-3 (Annulabilité unifiée) :** L'action est annulable via `Cmd+Z`, restaurant instantanément le connecteur et son tracé à l'identique.

---

## 5. Out of Scope

* Suppression en cascade des connecteurs lors de la suppression d'une Shape (couverte par la feature dédiée de cascade).
* Historique dédié de corbeille (la restauration repose sur `Cmd+Z` et l'Activity Log).

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

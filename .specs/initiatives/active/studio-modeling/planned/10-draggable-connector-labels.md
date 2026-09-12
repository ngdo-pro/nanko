# Feature : Repositionnement Manuel des Labels de Connecteurs (10-draggable-connector-labels)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Backlog Feature)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Bien que les labels de flux soient positionnés par défaut à proximité déterministe de la source (Feature 08), certains schémas denses ou carrefours de connecteurs peuvent masquer ou chevaucher des lignes adjacentes. L'utilisateur déclenche l'ajustement en cliquant-glissant directement le badge du label d'un connecteur sur le canvas pour le déplacer le long de la ligne ou dans son voisinage immédiat.

---

## 2. Wireframe / Visual Behavior

```text
POSITION INITIALE DÉTERMINISTE            REPOSITIONNEMENT MANUEL PAR GLISSER
(36px de la source par défaut)            (L'utilisateur glisse le badge pour dégager)

gateway ──[HTTPS]──────────────────> auth  gateway ─────────────────[HTTPS]──> auth
                                                                       ^
                                                                       | (Décalé manuellement)

PERSISTANCE DANS !LAYOUT
!LAYOUT
gateway->auth: labelX=180, labelY=95
!END
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur survole le badge de libellé d'un connecteur (`NankoEdge`). Le curseur de souris adopte l'indicateur de déplacement (`cursor: grab`).
2. **Interaction & Affichage (Interaction & Display) :** L'utilisateur clique-glisse le badge de label. Le badge suit fluidement le pointeur sans déplacer le connecteur sous-jacent ni déclencher de pan/zoom sur le canvas React Flow (`nodrag`).
3. **Validation & Persistance (Validation & Persistence) :** Au relâchement de la souris (`pointerup`) :
   * Les coordonnées relatives du label sont enregistrées dans le bloc `!LAYOUT` sous la forme `source->target: labelX=..., labelY=...`.
   * Le document passe en état non enregistré (`Cmd+S`).
   * Au rechargement, le label est restauré exactement aux coordonnées sauvegardées dans `!LAYOUT`.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Isolation événementielle) :** Le glisser du badge de label est strictement isolé des événements de canvas (pas de déclenchement de sélection multiple, ni de translation du viewport React Flow).
* **INV-2 (Persistance conditionnelle dans `!LAYOUT`) :** Seuls les labels ayant été déplacés manuellement par l'utilisateur sont sérialisés dans `!LAYOUT`. En l'absence de coordonnées explicites dans `!LAYOUT`, la règle de positionnement déterministe par défaut (36px de la source) s'applique.
* **INV-3 (Réinitialisation au double-clic) :** Un double-clic sur un badge de label repositionné réinitialise sa position à son ancrage déterministe par défaut et supprime l'entrée correspondante dans `!LAYOUT`.

---

## 5. Out of Scope

* Modification de l'orientation angulaire ou rotation du badge textuel (le texte reste toujours horizontal).
* Édition in-place du texte au clic sur le label (couverte par la feature dédiée `05-in-place-editing-popover`).

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

# Feature : Reconnexion Interactive & Déplacement d'Extrémités (13-connector-reconnection)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Backlog Feature)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Pour réorienter un connecteur existant vers un autre composant ou changer son point d'ancrage, l'utilisateur doit aujourd'hui supprimer et recréer le connecteur ou éditer textuellement le code. Inspiré de l'ergonomie Miro, sélectionner un connecteur fait apparaître des poignées interactives à ses deux extrémités (source et cible), permettant de décrocher un embout par glisser pour le brancher sur un autre port ou un autre composant.

---

## 2. Wireframe / Visual Behavior

```text
CONNECTEUR SÉLECTIONNÉ AVEC POIGNÉES D'EXTRÉMITÉS      DÉCROCHAGE ET RECONNEXION SUR CIBLE 2

         [Poignée Source]     [Poignée Cible]                               +--------------+
                ●                    ●                                      | auth-service |
gateway ────────┴────────────────────┴────────> auth     gateway ───────┐  +--------------+
                                                                        │
                                                                        └───● (Déplacé vers
                                                                            │  billing-service)
                                                                            v
                                                                    +-----------------+
                                                                    | billing-service |
                                                                    +-----------------+
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur clique sur un connecteur existant sur le canvas : deux poignées de contrôle circulaires apparaissent à ses extrémités source et cible.
2. **Interaction & Affichage (Interaction & Display) :** L'utilisateur clique-glisse l'une des deux poignées (ex: la poignée cible). Le câble se détache de son ancre initiale et suit le curseur avec le fil élastique magnétique. À l'approche d'une autre Shape ou d'une autre poignée cardinale, le magnétisme s'active (`.valid`).
3. **Validation & Persistance (Validation & Persistence) :** Au relâchement de la souris :
   * Si relâché sur une nouvelle ancre valide : la déclaration `source -> target` est mise à jour dans le code `.nanko` (ex: `gateway -> billing`). Les attributs existants (`label`, `desc`) sont intégralement préservés.
   * Si relâché dans le vide : la reconnexion est annulée et le câble se ré-enclenche automatiquement sur son ancre d'origine sans modification.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Préservation des métadonnées du flux) :** La reconnexion d'une extrémité modifie uniquement l'identifiant de la source ou de la cible ; les attributs `label="..."` et `desc="..."` existants sont scrupuleusement conservés.
* **INV-2 (Annulation automatique au drop dans le vide) :** Décrocher une extrémité et la relâcher dans le vide annule l'opération et rétablit l'ancrage initial (aucun connecteur orphelin ou corrompu).
* **INV-3 (Mise à jour synchronisée de !LAYOUT) :** Si l'extrémité est rebranchée sur une face fixe spécifique, la directive d'ancrage dans `!LAYOUT` est mise à jour en cohérence.

---

## 5. Out of Scope

* Scission d'un connecteur en deux connecteurs divergents.
* Reconnexion simultanée des deux extrémités en un seul geste.

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

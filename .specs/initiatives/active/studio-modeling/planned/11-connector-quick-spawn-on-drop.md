# Feature : Création Rapide Connectée par Dépôt dans le Vide (11-connector-quick-spawn-on-drop)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Backlog Feature)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Actuellement, relâcher un connecteur en cours de tracé dans le vide annule l'opération, obligeant l'utilisateur à créer d'abord une forme via la roue radiale, puis à revenir tirer son fil. Inspiré de l'ergonomie Miro, relâcher le câble sur un espace vide du canvas ouvre immédiatement un mini-sélecteur de formes à la pointe du curseur pour instancier la nouvelle Shape et créer le lien d'un seul geste continu.

---

## 2. Wireframe / Visual Behavior

```text
1. GLISSER VERS LE VIDE ET RELÂCHER      2. SÉLECTION ET CRÉATION CONNECTÉE
                                         
   +--------------+                         +--------------+
   |   gateway    |                         |   gateway    |
   +--------------+                         +--------------+
          │                                        │
          │ (glisser continu)                      │ (flux relié automatiquement)
          v                                        v
          ○ (relâché dans le vide)          +--------------+
          |                                 | auth-service | [ElementPopover de
     +----+------------+                    +--------------+  nommage direct]
     | [Rect] [Circle] | (Mini-picker)
     +-----------------+
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur tire un câble depuis une poignée source et le relâche dans une zone vide du canvas (hors de toute Shape cible).
2. **Interaction & Affichage (Interaction & Display) :** Le tracé ne disparaît pas ; un mini-menu contextuel discret apparaît à l'emplacement exact du relâchement, proposant les formes instanciables (`Rectangle`, `Circle`).
3. **Validation & Persistance (Validation & Persistence) :** Au clic sur une forme (ou touche clavier `R`/`C`) :
   * La nouvelle Shape est injectée dans le code `.nanko` avec son positionnement dans `!LAYOUT`.
   * Le connecteur `source -> nouvelle_shape` est immédiatement ajouté.
   * La micro-popover `ElementPopover` s'ouvre sur le nouveau nœud pour qualifier son label sans rupture de rythme.
   * Si l'utilisateur clique ailleurs ou appuie sur `Escape`, le menu se referme et le tracé est annulé.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Annulation gracieuse) :** Appuyer sur `Escape` ou cliquer en dehors du mini-picker annule le tracé sans modifier le code `.nanko`.
* **INV-2 (Atomicité de l'insertion) :** La création de la forme et l'insertion du connecteur sont appliquées en une seule mutation atomique dans le code source (une seule entrée dans l'historique d'annulation `Cmd+Z`).
* **INV-3 (Positionnement exact) :** La nouvelle forme est centrée sur les coordonnées canvas du point de relâchement de la souris (`screenToFlowPosition`).

---

## 5. Out of Scope

* Création de formes composites ou sous-graphes groupés d'un seul coup.
* Dépôt dans le vide depuis un connecteur préexistant détaché (traité dans la feature 13).

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

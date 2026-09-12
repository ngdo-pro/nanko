# Feature : Handles Contextuels & Tracé Magnétique Libre (04-smart-handles-magnetic-connectors)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-12  

---

## 1. Problem & Trigger

Relier deux composants d'architecture impose actuellement de basculer dans l'éditeur de code Monaco pour saisir manuellement `source -> target`, tandis que la présence permanente de poignées d'ancrage pollue visuellement le schéma au repos. L'utilisateur déclenche l'interaction en cliquant sur une Shape pour révéler ses poignées, puis en glissant le curseur depuis l'une d'elles vers une Shape cible bénéficiant d'un magnétisme automatique.

---

## 2. Wireframe / Visual Behavior

```text
AU REPOS (aucune sélection)          SHAPE SÉLECTIONNÉE            TRACÉ EN COURS (Drag actif)
+--------------------------+        +--------------------------+   +--------------------------+
| RECTANGLE       gateway  |        |[RECTANGLE       gateway ]|   | RECTANGLE       gateway  |
+--------------------------+        +--------------------------+   ○--------------------------○  <- Handles révélés
| API Gateway              |        |○ API Gateway            ○|   | API Gateway              |     partout sur le Board
+--------------------------+        +--------------------------+   +--------------------------+
   (poignées masquées)                 (poignées révélées)              ...fil élastique...
                                                                   +--------------------------+
                                                                   |◉ CIRCLE          auth    |  <- Handle aimanté
                                                                   +--------------------------+     (surbrillance émeraude)
                                                                                                    < connectionRadius

POST-CRÉATION : QUALIFICATION IMMÉDIATE (ElementPopover ancrée sur le nouveau connecteur)
                        +-----------------------------------------+
                        |  Label                                   |
                        |  [ HTTPS                               ] |  <- focus automatique immédiat
                        |                                          |
                        |  Description                             |
                        |  [ Flux chiffré TLS 1.3                ] |
                        +-----------------------------------------+
                                             ^
                          gateway ───────────●───────────> auth
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur clique sur une Shape source sur le canvas pour afficher ses 4 poignées d'ancrage contextuelles, puis clique-glisse depuis l'une d'elles.
2. **Interaction & Affichage (Interaction & Display) :** Le geste de glisser (`onConnectStart`) révèle instantanément l'ensemble des poignées d'ancrage du Board. Dès que le pointeur entre dans le rayon de capture (`connectionRadius`), la poignée cible la plus proche s'aimante et s'illumine.
3. **Validation & Persistance (Validation & Persistence) :** L'utilisateur relâche le bouton de la souris sur la poignée aimantée : la connexion est validée (`isValidConnection`), la ligne `source -> target` est insérée dans le code `.nanko` après le bloc des Shapes, le nouveau connecteur est tracé sur le canvas, et la micro-popover `ElementPopover` s'ouvre automatiquement avec focus sur le champ `Label` pour qualifier le flux sans rupture de rythme.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Masquage strict au repos) :** Les poignées d'ancrage (`.nanko-handle`) restent strictement invisibles sur toutes les Shapes au repos afin de préserver la lisibilité du schéma d'architecture. Elles n'apparaissent que si la Shape est sélectionnée ou lors d'un tracé actif.
* **INV-2 (Révélation universelle et magnétisme) :** Dès qu'un tracé débute depuis une poignée, toutes les poignées d'ancrage du Board sont révélées. La poignée candidate la plus proche dans le rayon de capture est automatiquement magnétisée avec feedback visuel distinctif.
* **INV-3 (Rejet des auto-connexions et doublons) :** Relâcher la connexion sur la Shape source elle-même (`source === target`) ou sur une cible déjà reliée dans le même sens est formellement rejeté. Relâcher dans le vide annule le tracé sans modifier le code source.
* **INV-4 (Isomorphisme et regroupement DSL) :** Tout connecteur validé est immédiatement inséré dans le code `.nanko`, regroupé en dessous des déclarations de Shapes, et active l'état non enregistré (`Cmd+S`).

---

## 5. Out of Scope

* Suppression en cascade des connecteurs lors de la suppression d'une Shape (objet de la feature `023-shape-connector-deletion-cascade`).
* Outil connecteur dédié dans la roue radiale (le tracé démarre exclusivement par glisser depuis un handle).
* Inversion du sens d'un connecteur existant ou modification de ses points d'ancrage.
* Modification du backend Symfony ou du modèle relationnel SQL.

---

## 6. Implementation Spec(s)

*Aucune spec technique dérivée pour le moment (prête pour `/spec studio-modeling`).*

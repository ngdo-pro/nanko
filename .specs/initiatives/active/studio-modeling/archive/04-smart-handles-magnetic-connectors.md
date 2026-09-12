# Feature : Handles Contextuels & Tracé Magnétique Libre (04-smart-handles-magnetic-connectors)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Implemented ✅  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-12  

---

## 1. Problem & Trigger

Relier deux composants d'architecture impose actuellement de basculer dans l'éditeur de code Monaco pour saisir manuellement `source -> target`, tandis que la présence permanente de poignées d'ancrage pollue visuellement le schéma au repos. Inspiré de l'ergonomie Miro/FigJam, l'utilisateur déclenche l'interaction sans friction préalable : le simple survol d'une Shape (ou sa sélection) révèle immédiatement ses poignées d'ancrage, permettant de glisser directement depuis l'une d'elles vers une Shape cible avec magnétisme automatique en un seul geste fluide.

---

## 2. Wireframe / Visual Behavior

```text
AU REPOS (aucune sélection/survol)    SURVOL OU SÉLECTION           APPROCHE DE LA FORME CIBLE
+--------------------------+        +--------------------------+   +--------------------------+
| RECTANGLE       gateway  |        |[RECTANGLE       gateway ]|   | RECTANGLE       gateway  | (source)
+--------------------------+        +--------------------------+   +--------------------------+
| API Gateway              |        |○ API Gateway            ○|                \  
+--------------------------+        +--------------------------+                 \ (fil élastique)
   (poignées masquées)                 (survol : handles révélés)                  \
                                                                   +--------------------------+
                                                                   |◉ CIRCLE          auth    | (cible approchée :
                                                                   +--------------------------+  handle aimanté
                                       [Autres shapes du Board        (shapes distantes :        < 32px)
                                        restent calmes et sans         restent nettes et sans
                                        handles affichés]              handles affichés]

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

1. **Déclenchement (Trigger) :** L'utilisateur survole une Shape source sur le canvas : ses 4 poignées d'ancrage contextuelles apparaissent instantanément (sans nécessiter de clic de sélection préalable). L'utilisateur clique-glisse directement depuis l'une d'elles.
2. **Interaction & Affichage (Interaction & Display) :** Le geste de glisser étire une ligne de connexion depuis la poignée source. Les formes distantes sur le canvas restent nettes et au repos sans aucune pollution visuelle globale. Dès que le pointeur entre dans le rayon de capture (`connectionRadius`) d'une poignée de la forme cible, celle-ci apparaît, s'aimante et s'illumine.
3. **Validation & Persistance (Validation & Persistence) :** L'utilisateur relâche le bouton de la souris sur la poignée aimantée : la connexion est validée (`isValidConnection`), la ligne `source -> target` est insérée dans le code `.nanko` après le bloc des Shapes, le nouveau connecteur est tracé sur le canvas, et la micro-popover `ElementPopover` s'ouvre automatiquement avec focus sur le champ `Label` pour qualifier le flux sans rupture de rythme.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Masquage au repos & révélation locale - style Miro) :** Les poignées d'ancrage (`.nanko-handle`) restent strictement invisibles sur toutes les Shapes au repos afin de préserver la pureté visuelle du schéma. Elles apparaissent instantanément dès qu'une Shape est survolée (`:hover`) ou sélectionnée (`.selected`).
* **INV-2 (Zéro pollution globale & magnétisme ciblé) :** Aucun allumage global de l'ensemble des poignées du Board n'est déclenché pendant le tracé. Seule la poignée candidate de la forme cible approchée dans le rayon de capture (< 32px) s'active en surbrillance distinctive (`.valid`).
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

- [ ] **`021-smart-handles-magnetic-connectors`** : Tracé de Connecteur par Glisser & Magnétisme Automatique  
  ↳ *Spec :* [`../../../specs/active/021-smart-handles-magnetic-connectors.md`](../../../specs/active/021-smart-handles-magnetic-connectors.md)

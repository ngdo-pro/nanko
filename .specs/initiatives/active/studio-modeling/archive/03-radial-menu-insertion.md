# Feature : Roue Radiale d'Insertion au Curseur (03-radial-menu-insertion)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Archived  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-12  

---

## 1. Problem & Trigger

L'édition d'architecture sur le Board Nanko impose des allers-retours constants entre le canvas graphique et l'éditeur de code textuel pour insérer des formes, brisant la fluidité de conception particulièrement sur macOS et trackpad. L'utilisateur déclenche l'apparition de la roue circulaire d'outils instantanément sous le pointeur en maintenant la touche `A` (*Add*) ou `Tab` enfoncée au-dessus du canvas, ou en frappant un raccourci de création directe (`R` pour Rectangle, `C` pour Circle).

---

## 2. Wireframe / Visual Behavior

```text
                        Position écran du curseur (clientX, clientY)
                                             |
                                             v
               +-------------------------------------------------------------+
               |                    Roue Radiale (Overlay)                   |
               |                                                             |
               |                       . - ~ ~ ~ - .                         |
               |                   .-'               `-.                     |
               |                 .'                     `.                   |
               |                /     [ RECTANGLE ]       \                  |
               |               /           [R]             \                 |
               |              :      (180° à 360°)          :                |
               |              :              +              :                |
               |              :         [ Pastille ]        :                |
               |              :       centrale neutre       :                |
               |               \                           /                 |
               |                \      [ CIRCLE ]         /                  |
               |                 `.        [C]          .'                   |
               |                   `.  (0° à 180°)    .'                     |
               |                     `-.           .-'                       |
               |                         ` - . _ . - '                       |
               |                                                             |
               +-------------------------------------------------------------+
               |  Style Blueprint sombre, backdrop-filter blur(12px),        |
               |  lueurs émeraudes/cyan et détection continue du secteur.    |
               +-------------------------------------------------------------+
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur survole le canvas à l'emplacement souhaité et maintient la touche `A` ou `Tab` enfoncée (ou frappe directement la touche `R` ou `C`).
2. **Interaction & Affichage (Interaction & Display) :** La roue radiale apparaît immédiatement centrée sous le curseur avec effet de flou Blueprint (`backdrop-filter: blur(12px)`). Déplacer le pointeur vers un demi-disque illumine le secteur correspondant (`Rectangle [R]` ou `Circle [C]`).
3. **Validation & Persistance (Validation & Persistence) :** Relâcher la touche (`keyup`) ou cliquer sur le secteur actif valide le choix : la roue se ferme instantanément, la position écran est convertie en coordonnées canvas (`screenToFlowPosition`), un identifiant unique incrémental est calculé (`rect_1`, `circle_1`), la forme est injectée dans le code `.nanko` avec son bloc `!LAYOUT` associé, et le document passe en état non sauvegardé (`Cmd+S`).

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Positionnement spatial précis) :** La forme créée est injectée exactement sous la position écran du curseur convertie dans le repère React Flow via `screenToFlowPosition`. Si le pointeur est hors canvas lors d'un raccourci direct (`R`/`C`), la forme est positionnée au centre géométrique du viewport visible.
* **INV-2 (Geste fluide sans clic obligatoire - *Marking Gesture*) :** Le menu supporte le geste continu : maintien de `A`/`Tab` + déplacement vers un secteur + relâchement de la touche (`keyup`) dépose immédiatement la forme. Le clic direct sur un secteur reste également supporté. Un relâchement dans la pastille centrale neutre ou hors de la roue referme le menu sans création.
* **INV-3 (Isolement strict des zones de saisie) :** Les touches d'activation (`A`, `Tab`, `R`, `C`, `Échap`) ne doivent jamais intercepter la frappe si le focus est actif dans l'éditeur Monaco, un champ `<input>` ou un `<textarea>`.
* **INV-4 (Isomorphisme et regroupement DSL) :** L'insertion génère un identifiant unique non utilisé (`rect_N`, `circle_N`), regroupe la déclaration sémantique avec les shapes existantes en amont des connecteurs (`source -> target`), et ajoute ou met à jour la ligne correspondante dans le bloc `!LAYOUT ... !END`.

---

## 5. Out of Scope

* Tracé libre et magnétisme des connecteurs (objet de la feature `04-smart-handles-magnetic-connectors` / Spec 022).
* Édition in-place au double-clic et popover contextuelle (objet de la feature `05-in-place-editing-popover` / Spec 021).
* Secteur additionnel `Text` et gabarits d'architecture (`Database`, `Service`, `Gateway`, `Queue`) dans la roue (objets des Specs 024 et 025).
* Volet latéral escamotable par glisser-déposer (*Drawer D&D*, objet de la Spec 026).
* Modification du backend Symfony ou de la base de données PostgreSQL (persistance textuelle via `sourceCode`).

---

## 6. Implementation Spec(s)

- [x] **`017-canvas-visual-creation-radial-menu`** : Création Visuelle d'Éléments sur le Canvas par Roue Radiale et Raccourcis  
  ↳ *Spec :* [`../../../specs/archive/017-canvas-visual-creation-radial-menu.md`](../../../specs/archive/017-canvas-visual-creation-radial-menu.md) *(Livré & Archivé ✅)*

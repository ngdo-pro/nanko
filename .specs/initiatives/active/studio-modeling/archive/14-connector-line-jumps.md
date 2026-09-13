# Feature : Pontets de Croisement des Connecteurs (14-connector-line-jumps)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Livré & Archivé ✅  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Dans les diagrammes d'architecture logicielle denses, de nombreux flux orthogonaux se croisent sur le canvas sans pour autant être reliés. Cette intersection perpendiculaire en croix (`┼`) produit une ambiguïté visuelle majeure (« croix à 4 voies ») : l'œil humain peut interpréter ce croisement comme un carrefour ou un embranchement de flux.

Inspiré des règles de schémas électriques et électroniques (**IEC 60617 / IEEE 315**) et des outils de CAO professionnels, le Studio Nanko introduit les **Pontets de Croisement (*Line Jumps*)** : lorsqu'un connecteur en croise un autre, le connecteur situé au premier plan dans la hiérarchie de profondeur (**`z-index`**) enjambe la ligne inférieure au moyen d'un arc de cercle semi-circulaire régulier ($r = 6\text{px}$). Le connecteur inférieur reste une ligne droite continue qui passe « sous le pont ».

De surcroît, le survol ou la sélection d'un connecteur élève instantanément son z-index au sommet, lui permettant d'enjamber tous les autres connecteurs traversés et de suivre son parcours avec une clarté absolue.

---

## 2. Wireframe / Visual Behavior

```text
SITUATION AVANT (AMBIGUÏTÉ EN CROIX)             SITUATION AVEC PONTET (LINE JUMP & Z-INDEX)

           │ (Connecteur B)                                 │ (Connecteur B, z-index 1 : dessous)
           │                                                │ (Ligne continue)
     ──────┼────── (Connecteur A)                     ──────╭╮────── (Connecteur A, z-index 2 : dessus)
           │                                                │        (Arc demi-cercle r=6px)
           │                                                │
 (Confusion d'embranchement)                       (Clarté totale : les deux flux sont indépendants)

SURVOL INTERACTIF : ÉLÉVATION DYNAMIQUE AU PREMIER PLAN

      Avant survol : A enjambe B                      Au survol de B : B enjambe A
           │                                                │
     ──────╭╮────── (A z=2)                           ───── ┼ ───── (A z=2)
           │                                               ╭╯╰╮      (B passe à z=1000 au survol
           │ (B z=1)                                        │         et enjambe A)
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Rendu initial :** Deux ou plusieurs connecteurs orthogonaux se croisent sur le canvas.
2. **Calcul géométrique automatique :** Le moteur calcule l'ensemble des points d'intersection entre les segments des arêtes visibles.
3. **Application de la hiérarchie z-index :**
   * Chaque connecteur dispose d'un `z-index` effectif (ordre d'apparition dans l'AST ou spécifié dans `!LAYOUT`).
   * L'arête avec le z-index le plus élevé injecte un arc demi-cercle SVG ($r = 6\text{px}$) à chaque intersection.
   * L'arête avec le z-index inférieur conserve son tracé rectiligne continu.
4. **Interaction dynamique au survol :**
   * L'utilisateur survole le connecteur inférieur.
   * Son z-index monte temporairement à 1000 : le pontet s'inverse instantanément et ce connecteur passe au-dessus de tous les flux croisés.

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Détection orthogonale stricte) :** Seuls les croisements transversaux réels entre segments orthogonaux engendrent un pontet. Les segments colinéaires ou les connexions partageant un handle sont exclus.
* **INV-2 (Règle d'or du z-index) :** C'est exclusivement l'arête ayant le z-index effectif le plus élevé qui porte l'arc de saut.
* **INV-3 (Géométrie d'arc SVG propre) :** Le pontet est un arc de cercle SVG (`A 6 6 0 0 1 ...`) parfaitement centré sur le point d'intersection et orienté dans la direction du flux.
* **INV-4 (Élévation dynamique au survol / sélection) :** Le survol ou la sélection d'un connecteur élève temporairement son z-index, inversant dynamiquement la hiérarchie de saut.
* **INV-5 (Préservation Blueprint & INV-7) :** L'ajout des pontets n'altère ni les angles droits Blueprint (`borderRadius: 0`), ni le déport des labels (36px), ni le contact périmétrique circulaire (`INV-7`).

---

## 5. Out of Scope

* Modification de l'épaisseur du trait au croisement.
* Pontets sur les connecteurs diagonaux libres (hors mode orthogonal SmoothStep).

---

## 6. Implementation Spec(s)

* [Spec 024 - Pontets de Croisement des Connecteurs & Hiérarchie Z-Index](../../../../specs/archive/024-connector-line-jumps.md)

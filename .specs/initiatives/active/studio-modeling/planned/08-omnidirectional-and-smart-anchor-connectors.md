# Feature : Poignées Omnidirectionnelles & Ancrage Dynamique Intelligent (08-omnidirectional-and-smart-anchor-connectors)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Ready for `/spec`)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Actuellement, les connecteurs sur le Board Nanko sont limités par des poignées d'ancrage rigides (gauche et haut strictement récepteurs, bas et droite strictement émetteurs), bloquant les flux ascendants ou arbitraires. L'utilisateur déclenche la connexion en glissant depuis n'importe quel côté d'une Shape ou depuis son centre : le connecteur peut s'ancrer au choix sur une face précise (`top`, `bottom`, `left`, `right`) pour un contrôle total, ou sur le point central `auto` pour adapter dynamiquement ses faces de contact sans croisement.

---

## 2. Wireframe / Visual Behavior

```text
SURVOL OU SÉLECTION D'UNE SHAPE           CONNEXION FIXE VS DYNAMIQUE (AUTO)
               [Top: In/Out]
                     ○                                          [Top]
              +--------------+                                    ○
[Left: In/Out]|              |[Right: In/Out]              +--------------+
      ○       |   ◎ [Auto]   |      ○             (Auto)   |              | (Fixe: Top)
              |              |                ────────────>|   ◎ [Auto]   |──────○
              +--------------+                (flottant    |              |     │
                     ○                         face libre) +--------------+     │
              [Bottom: In/Out]                                    ○             │
                                                               [Bottom]         │
                                                                                v
                                                                        [Côté forcé fixé
                                                                         dans !LAYOUT]
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** Au survol ou à la sélection de la Shape source, ses 4 poignées d'ancrage cardinales et sa zone centrale `auto` sont révélées. L'utilisateur clique-glisse depuis n'importe lequel des 4 côtés (ou depuis le centre).
2. **Interaction & Affichage (Interaction & Display) :** Le glisser étire une ligne de connexion. À l'approche de la Shape cible :
   * Si le curseur s'approche à moins de 32px d'un bord spécifique (`top`, `bottom`, `left`, `right`), la poignée cardinale correspondante s'aimante en surbrillance (`.valid`).
   * Si le curseur survole le corps ou le centre de la Shape cible, l'ensemble du nœud s'active en mode d'ancrage `auto` (sélectionnant en temps réel le flanc le plus direct vers la source).
3. **Validation & Persistance (Validation & Persistence) :** Au relâchement de la souris :
   * Le connecteur `source -> target` est validé et inséré dans le corps textuel `.nanko`.
   * Si un côté cardinal fixe a été sélectionné, l'ancrage spatial est enregistré dans le bloc `!LAYOUT` (`source->target: from=..., to=...`).
   * Si le mode `auto` a été choisi, aucune surcharge n'est ajoutée au bloc `!LAYOUT` (comportement dynamique préservé à l'état pur).

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Omnidirectionnalité totale des poignées) :** Les 4 poignées d'ancrage cardinales (`top`, `bottom`, `left`, `right`) de toute forme (`rectangle`, `circle`, `text`) peuvent indifféremment initier un flux sortant ou accueillir un flux entrant.
* **INV-2 (Double mode d'ancrage Fixe vs Auto) :** 
  * Une connexion reliée à une poignée cardinale reste ancrée de manière déterministe sur cette face.
  * Une connexion reliée à l'ancre centrale `auto` recalcule dynamiquement ses faces de contact optimales lors du déplacement (`onNodeDrag`) ou du réagencement des formes.
* **INV-3 (Persistance sélective dans `!LAYOUT`) :** Le corps déclaratif `.nanko` exprime uniquement la relation d'architecture pure `source -> target`. Seules les arêtes comportant au moins une ancre cardinale fixe sont persistées dans le bloc `!LAYOUT` sous la syntaxe `source->target: from=[side], to=[side]`.
* **INV-4 (Rejet des auto-connexions) :** Relâcher un connecteur sur la même forme (`source === target`), même entre deux poignées différentes de celle-ci, est formellement rejeté.
* **INV-5 (Parité géométrique des formes) :** Les 3 types de Shapes (`RectangleNode`, `CircleNode`, `TextNode`) implémentent identiquement les 4 poignées cardinales et l'ancre centrale `auto`.
* **INV-6 (Positionnement déterministe du label à proximité de la source) :** Le badge de libellé du connecteur (`label`) n'est plus centré au milieu géométrique (`50%`) du chemin ; il est positionné par défaut à une distance fixe déterministe de 36px le long du tracé depuis la poignée source, qualifiant immédiatement le flux sortant de la forme.

---

## 5. Out of Scope

* Distribution spatiale multi-connecteurs espacée le long d'un même bord (déléguée à la Feature `09-multi-anchor-distribution-and-auto-scale`).
* Redimensionnement automatique $\times 2$ des Shapes en cas de saturation de capacité de flux (délégué à la Feature `09-multi-anchor-distribution-and-auto-scale`).
* Repositionnement interactif par glisser du badge de label (délégué à la Feature `10-draggable-connector-labels`).
* Routage de câbles orthogonal avec évitement d'obstacles géométriques (les connecteurs utilisent les courbes de Bézier natives React Flow).

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

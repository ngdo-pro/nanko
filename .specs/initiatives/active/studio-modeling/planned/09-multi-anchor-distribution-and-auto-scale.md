# Feature : Distribution Multi-Ports & Redimensionnement Automatique (09-multi-anchor-distribution-and-auto-scale)

> **Parent Initiative :** `studio-modeling`  
> **Status :** Planned *(Framed ✅ — Backlog Feature)*  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Lorsque plusieurs connecteurs se branchent sur le même côté d'une Shape, la superposition sur un point unique engendre un effet « hérisson » confus, tandis qu'une concentration excessive de flux sature visuellement le composant. L'utilisateur déclenche cette mécanique en reliant de multiples flux sur une même face : le système répartit harmonieusement les points d'attache le long du bord et double automatiquement les dimensions de la Shape ($\times 2$) dès lors que la capacité nominale d'accueil de la face est dépassée.

---

## 2. Wireframe / Visual Behavior

```text
RÉPARTITION HARMONIEUSE MULTI-PORTS            DÉPASSEMENT DE CAPACITÉ (AUTO-SCALE X2)
(3 connecteurs sur flanc droit : 25%, 50%, 75%)   (Ex: > 8 connecteurs -> hauteur x2)

      +-------------------+ ───────>                 +-------------------+ ───────>
      |                   |                          |                   | ───────>
      |   auth-service    | ───────>                 |   api-gateway     | ───────>
      |                   |                          |   (Hauteur x 2)   | ───────>
      +-------------------+ ───────>                 |                   | ───────>
                                                     |  [Espace doublé   | ───────>
                                                     |   pour accueillir | ───────>
                                                     |   jusqu'à 16      | ───────>
                                                     |   flux réguliers] | ───────>
                                                     +-------------------+ ───────>
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur connecte un nouveau flux entrant ou sortant sur une face comptant déjà un ou plusieurs connecteurs.
2. **Interaction & Affichage (Interaction & Display) :**
   * Les poignées d'ancrage de la face se redistribuent automatiquement à intervalles réguliers le long du segment (ex: à $\frac{1}{N+1}, \frac{2}{N+1} \dots$ de la longueur du bord), éliminant toute superposition.
   * Si le nombre total de connecteurs sur un flanc dépasse le seuil de capacité nominale (seuil fixé à 8 connecteurs par flanc standard), la forme s'agrandit automatiquement d'un facteur 2 sur la dimension correspondante.
3. **Validation & Persistance (Validation & Persistence) :** Les nouvelles dimensions sont répercutées dans l'état du nœud. En cas de chevauchement spatial avec les composants voisins consécutif au redimensionnement, l'utilisateur rétablit instantanément l'espacement optimal via le bouton « Réorganiser » (Dagre).

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Espacement régulier sans collision d'ancres) :** Sur une face donnée comptant $N$ connecteurs raccordés, chaque connecteur dispose de son point d'ancrage dédié espacé de manière uniforme le long du bord.
* **INV-2 (Seuil de capacité et facteur d'échelle $\times 2$) :**
  * La capacité nominale d'un flanc standard est fixée à 8 connecteurs.
  * Dès le 9ᵉ connecteur raccordé sur un flanc vertical (`left` ou `right`), la hauteur de la forme est multipliée par 2 (permettant d'accueillir jusqu'à 16 connecteurs).
  * Dès le 9ᵉ connecteur raccordé sur un flanc horizontal (`top` ou `bottom`), la largeur de la forme est multipliée par 2.
* **INV-3 (Universalité des formes) :** La règle d'auto-agrandissement s'applique à l'ensemble des formes (`rectangle`, `circle` par doublement de son diamètre, et `text`).
* **INV-4 (Désengorgement par réorganisation Dagre) :** Le redimensionnement n'active pas de moteur physique de répulsion dynamique en temps réel ; la résolution des chevauchements spatiaux éventuels est déléguée à l'action de réorganisation Dagre de la barre d'outils.

---

## 5. Out of Scope

* Poignées redimensionnables manuellement à la souris par étirement (*Resize handles* aux 4 coins).
* Déplacement physique automatique des boîtes adjacentes par force répulsive temps réel (délégué au bouton « Réorganiser »).
* Attribution manuelle d'un index de slot d'ancrage par l'utilisateur (l'ordonnancement le long du bord est calculé automatiquement pour minimiser les croisements de fils).

---

## 6. Implementation Spec(s)

*No execution specs linked yet.*

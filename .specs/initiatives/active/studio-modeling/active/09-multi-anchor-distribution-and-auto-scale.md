# Feature : Distribution Multi-Ports & Redimensionnement Automatique (09-multi-anchor-distribution-and-auto-scale)

> **Parent Initiative :** `studio-modeling`  
> **Status :** In Progress 🚀  
> **Author(s) :** Nicolas & Nanko Core Team  
> **Last Updated :** 2026-09-13  

---

## 1. Problem & Trigger

Lorsque plusieurs connecteurs se branchent sur le même côté d'une Shape, la superposition sur un point unique engendre un effet « hérisson » confus, tandis qu'une concentration excessive de flux sature visuellement le composant. L'utilisateur déclenche cette mécanique en reliant de multiples flux sur une même face : le système répartit harmonieusement les points d'attache le long du bord et double automatiquement les dimensions de la Shape ($\times 2$) dès lors que la capacité nominale d'accueil de la face est dépassée.

De surcroît, cette mécanique ne doit en aucun cas créer de confusion ergonomique : les poignées interactives servant à tracer un connecteur demeurent strictement limitées aux 5 points canoniques, et l'insertion de formes via la roue radiale (`A` + curseur) doit être unitaire et exempte de création dupliquée.

Enfin, pour garantir un contact visuel parfait sans décollement ni flèche flottante dans le vide, le routage distingue la **boîte de manipulation rectangulaire** (qui distribue les flux) du **contour réel de la forme affichée** (où le connecteur s'arrête net sur le périmètre en visant le centre).

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

ROUTAGE PÉRIMÉTRIQUE BI-COUCHE : BOÎTE DE MANIPULATION VS FORME AFFICHÉE (INV-7)

Cas 1 : Cercle (Traversée de la boîte vers le centre et contact net sur le périmètre)
               BOÎTE DE MANIPULATION (Rectangle Englobant)
           + - - - - - - - - - - - - - - - - - - - - - - - - - - - +
           |                                                       |
           |                     CERCLE AFFICHÉ                    |
           |                      . - ~ ~ - .                      |
Flux 1     |                  . '             ' .                  |
───────────X (Slot 1: 33%)  /                     \                |
(Connecteur| ╲             /                       \               |
 externe)  |  ╲           |                         |              |
           |   ─────────> ● (Arrêt Périmètre 1)     |              |
           |     (visée   |                         |              |
           |      vers C) |            C            |              |
           |              |        (Centre)         |              |
           |   ─────────> ● (Arrêt Périmètre 2)     |              |
Flux 2     |  ╱           |                         |              |
───────────X (Slot 2: 66%) \                       /               |
(Connecteur| ╱              \                     /                |
 externe)  |                  . '             ' .                  |
           |                      ' - . . - '                      |
           |                                                       |
           + - - - - - - - - - - - - - - - - - - - - - - - - - - - +

Cas 2 : Rectangle (Boîte de manipulation = Forme affichée : contact direct)
           +───────────────────────────────────────────────────────+
Flux 1     |                                                       |
───────────● (Slot 1: 33% = Point d'arrêt direct)                  |
           |                           C                           |
Flux 2     |                       (Centre)                        |
───────────● (Slot 2: 66% = Point d'arrêt direct)                  |
           +───────────────────────────────────────────────────────+
```

---

## 3. Nominal User Flow (*Happy Path*)

1. **Déclenchement (Trigger) :** L'utilisateur connecte un nouveau flux entrant ou sortant sur une face comptant déjà un ou plusieurs connecteurs.
2. **Interaction & Affichage (Interaction & Display) :**
   * Les points d'attache de la face se redistribuent automatiquement à intervalles réguliers le long du segment (ex: à $\frac{1}{N+1}, \frac{2}{N+1} \dots$ de la longueur du bord), éliminant toute superposition.
   * Ces points d'attache sont strictement passifs pour les flux déjà raccordés ; l'utilisateur continue d'initier ou d'accueillir de nouveaux tracés exclusivement depuis/vers les 5 poignées canoniques (`top`, `bottom`, `left`, `right`, `auto`).
   * Le tracé du connecteur franchit la boîte de manipulation sur son slot dédié puis s'arrête exactement sur le périmètre réel de la forme affichée (`rectangle` ou `circle`), sans flottement dans le vide.
   * Si le nombre total de connecteurs sur un flanc dépasse le seuil de capacité nominale (seuil fixé à 8 connecteurs par flanc standard), la forme s'agrandit automatiquement d'un facteur 2 sur la dimension correspondante (largeur $\times 2$, hauteur $\times 2$, ou diamètre $\times 2$).
3. **Création unitaire par la Roue Radiale :** L'utilisateur peut à tout moment appuyer sur `A`, survoler un secteur (ex: `rectangle`, `circle`) et relâcher la touche : exactement un unique composant est inséré sans aucun doublon.
4. **Validation & Persistance (Validation & Persistence) :** Les nouvelles dimensions sont répercutées dans l'état du nœud. En cas de chevauchement spatial avec les composants voisins consécutif au redimensionnement, l'utilisateur rétablit instantanément l'espacement optimal via le bouton « Réorganiser » (Dagre).

---

## 4. Functional Invariants (Non-Negotiable Rules)

* **INV-1 (Espacement régulier sans collision d'ancres) :** Sur une face donnée comptant $N$ connecteurs raccordés, chaque connecteur dispose de son point d'ancrage dédié espacé de manière uniforme le long du bord.
* **INV-2 (Seuil de capacité et facteur d'échelle $\times 2$) :**
  * La capacité nominale d'un flanc standard est fixée à 8 connecteurs.
  * Dès le 9ᵉ connecteur raccordé sur un flanc vertical (`left` ou `right`), la hauteur de la forme est multipliée par 2 (permettant d'accueillir jusqu'à 16 connecteurs).
  * Dès le 9ᵉ connecteur raccordé sur un flanc horizontal (`top` ou `bottom`), la largeur de la forme est multipliée par 2.
* **INV-3 (Universalité des formes) :** La règle d'auto-agrandissement s'applique à l'ensemble des formes (`rectangle`, `circle` par doublement de son diamètre à 260px, et `text`).
* **INV-4 (Désengorgement par réorganisation Dagre) :** Le redimensionnement n'active pas de moteur physique de répulsion dynamique en temps réel ; la résolution des chevauchements spatiaux éventuels est déléguée à l'action de réorganisation Dagre de la barre d'outils.
* **INV-5 (Strict isolement des 5 handles de création vs points d'attache passifs) :**
  * Il n'y a que 5 poignées interactives de création sur une Shape (`top`, `bottom`, `left`, `right`, et `auto` centrale).
  * Les points d'attache distribués pour les flux existants sont 100% passifs (`isConnectable = false`), invisibles au survol (`opacity: 0; pointer-events: none`), et ne portent pas la classe de création `.nanko-handle`.
* **INV-6 (Création atomique et unitaire via la roue radiale) :**
  * L'insertion de forme déclenchée par la roue radiale (`A` ou `Tab` maintenu + survol de secteur ou clic) crée strictement une seule forme. Aucun doublon ne doit être produit, y compris sous React `<StrictMode>` ou lors d'interactions combinées clavier/souris.
* **INV-7 (Modèle bi-couche : Boîte de manipulation & Projection d'impact périmétrique) :**
  * Toute Shape est inscrite dans une boîte de manipulation rectangulaire qui distribue les connecteurs aux ratios $\frac{i+1}{N+1}$.
  * Le tracé se prolonge vers le centre de la forme et s'arrête net sur la frontière réelle de la forme affichée (contact direct pour `rectangle`, découpe sur le rayon $R$ pour `circle` sur les 4 flancs `left`, `right`, `top`, `bottom`).

---

## 5. Out of Scope

* Poignées redimensionnables manuellement à la souris par étirement (*Resize handles* aux 4 coins).
* Déplacement physique automatique des boîtes adjacentes par force répulsive temps réel (délégué au bouton « Réorganiser »).
* Attribution manuelle d'un index de slot d'ancrage par l'utilisateur (l'ordonnancement le long du bord est calculé automatiquement pour minimiser les croisements de fils).

---

## 6. Implementation Spec(s)
 
* [023-multi-anchor-distribution-and-auto-scale.md](../../../specs/active/023-multi-anchor-distribution-and-auto-scale.md)

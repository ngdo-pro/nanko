# PDR-003 : Studio bord-à-bord (Edge-to-Edge) et barre d'outils flottante translucide

* **Statut :** Validé (Livré en prod via spec 016)
* **Date :** 2026-09-06
* **Impact UX :** Studio d'architecture, Immersion, Espace de travail

## 1. Contexte & Problème
L'éditeur de document (`DocumentEditorView`) était initialement contraint dans un conteneur centré de 1200px de large (`max-width: 1200px`), ce qui réduisait considérablement la surface exploitable pour les schémas d'architecture et provoquait des doubles barres de défilement.

## 2. Options envisagées
* **Option A : Conserver le gabarit centré standard de 1200px**
  * Inconvénients : Sentiment d'étroitesse, manipulation spatiale restreinte, sentiment de "formulaire web" plutôt que d'un véritable outil de conception.
* **Option B : Studio immersif pleine largeur avec barre d'outils flottante en mode Canvas**
  * Avantages : Utilisation de 100% de la surface du viewport (`.app-main-fullscreen`), élimination de tout défilement parasite de la page hôte.
  * En mode Canvas, la barre supérieure se détache et flotte au centre avec un effet de translucidité et flou technique (`backdrop-filter: blur(12px)`), laissant le graphe circuler en continu en arrière-plan.

## 3. Décision
Option B : Disposition studio pleine largeur sur 100% du viewport, avec barre de commandes ancrée en Split/Code et flottante translucide en mode Canvas plein écran.

## 4. Justifications & Conséquences (The « Why »)
* L'expérience visuelle offre un rendu professionnel et épuré digne des meilleurs outils de design (Figma, Miro).
* Le Dashboard conserve sa largeur centrée de 1200px pour préserver la lisibilité des listes de projets et documents.

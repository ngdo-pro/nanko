# ADR-015 : Moteur de rendu graphique interactif (React Flow) et Auto-Layout Dagre

* **Statut :** Validé (Livré en prod via spec 015)
* **Date :** 2026-09-04
* **Impact :** `frontend`

## 1. Contexte & Problématique
Le format `.nanko` permet de décrire sémantiquement des `Shape` et des `Connector`.  
Comment offrir une représentation visuelle interactive fluide, zoomable et navigable, capable de manipuler spatialement des nœuds et de sérialiser les coordonnées dans le bloc `!LAYOUT` ?

## 2. Options techniques étudiées
* **Option A : Moteur SVG / Canvas custom fait maison**
  * Inconvénients : Coût de développement et de maintenance démesuré pour réimplémenter la gestion du pan, zoom, handles, sélection, arêtes et drag & drop.
* **Option B : Mermaid / Graphviz statique (PNG ou SVG passif)**
  * Inconvénients : Aucune interaction directe possible, pas de déplacement de nœuds au curseur, expérience passive type documentation Markdown.
* **Option C : Bibliothèque React Flow (`@xyflow/react`) avec algorithme hiérarchique Dagre**
  * Avantages : Écosystème éprouvé, haute performance de rendu, extensibilité totale des nœuds via composants React/Tailwind (nœuds personnalisés Rectangle, Circle géométrique, Text), callbacks natifs `onNodeDragStop` pour synchroniser le bloc `!LAYOUT`.

## 3. Décision
Option C : Adoption de React Flow pour le Board interactif avec calcul de placement automatique via Dagre, complété par une synchronisation bidirectionnelle avec le code `.nanko`.

## 4. Justifications & Conséquences
* Permet la cohabitation transparente du mode texte (code `.nanko`) et du mode visuel interactif.
* Tolérance aux erreurs : en cas d'erreur de syntaxe pendant la frappe, le canvas se met en pause sans crasher.

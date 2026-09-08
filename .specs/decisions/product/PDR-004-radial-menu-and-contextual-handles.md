# PDR-004 : Roue radiale d'outils, poignées contextuelles et tracé libre magnétique

* **Statut :** Validé (Cible en cours de réalisation)
* **Date :** 2026-09-08
* **Impact UX :** Expérience utilisateur Board, Ergonomie Mac/trackpad, Vitesse de modélisation

## 1. Contexte & Problème
La base actuelle de Nanko oblige l'utilisateur à taper du texte `.nanko` pour insérer des Shapes ou relier des connecteurs.  
Comment permettre une création visuelle fluide sur le Board tout en s'adaptant particulièrement aux utilisateurs macOS travaillant sur trackpad ?

## 2. Options envisagées
* **Option A : Barre d'outils fixe périphérique + clic droit classique**
  * Inconvénients : Allers-retours permanents de la souris entre le centre du canvas et les bordures de l'écran ; clic droit peu pratique sur trackpad Mac.
* **Option B : Roue d'outils radiale sous le curseur + poignées masquées au repos**
  * **Roue radiale** déclenchée par une touche clavier maintenue (`A` ou `Tab`) à l'emplacement exact du pointeur, avec dépôt immédiat au clic.
  * **Poignées d'ancrage (Handles) masquées au repos** et visibles uniquement lors de la sélection d'une Shape ou à l'approche magnétique d'un tracé.
  * **Tracé libre avec magnétisme automatique** vers les points d'ancrage de la Shape cible la plus proche.
  * **Volet latéral escamotable** en support pour le glisser-déposer (*Drag & Drop*).

## 3. Décision
Option B : Adoption conjointe de la roue radiale d'outils au curseur (déclenchement clavier fluide optimisé Mac), du masquage des poignées au repos, du tracé magnétique libre et du volet latéral escamotable.

## 4. Justifications & Conséquences (The « Why »)
* Supprime la pollution visuelle sur le schéma d'architecture quand aucun élément n'est sélectionné.
* Offre une vitesse de conception maximale (main gauche sur le clavier, main droite sur le trackpad).

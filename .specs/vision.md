# Vision Produit Nanko

> **Produit :** Nanko  
> **Dernière révision :** 2026-09-12  
> **Statut :** Vivant (Amendable uniquement lors d'un pivot stratégique)

---

## 1. Raison d'Être

* **Mission :** Rendre les schémas d'architecture vivants, versionnés et navigables, en combinant la rigueur du *Diagrams-as-Code* et la fluidité d'un outil visuel moderne.
* **Le Problème :** Les schémas d'architecture classiques (PNG, Confluence, Miro) deviennent obsolètes dès le lendemain de leur création et n'ont aucun lien avec le code réel. À l'inverse, les outils code-only (PlantUML, Mermaid) sont rigides, laids et pénibles à manipuler en réunion.
* **La Cible :** Développeurs, Tech Leads et Architectes logiciels concevant des systèmes modulaires et désireux de maintenir une documentation d'architecture synchronisée sans effort.
* **North Star Metric :** Nombre de documents d'architecture `.nanko` maintenus et modifiés activement à travers les versions.

---

## 2. Les 3 Piliers de l'Expérience

1. **Diagrams-as-Code Vivant :** Tout schéma est piloté par un format déclaratif textuel (`.nanko`) versionnable sous Git, tout en offrant une manipulation visuelle bidirectionnelle en temps réel.
2. **Modélisation Visuelle sans Friction :** L'architecte peut concevoir son schéma directement sur le canvas (souris, raccourcis, radial menu) sans jamais être forcé d'ouvrir l'éditeur de texte.
3. **Exploration Multi-Niveaux (Layers) :** Naviguer dans l'architecture par niveaux de zoom et de profondeur (du composant macro à son implémentation micro) avec validation de compatibilité.

---

## 3. Nos Partis-Pris (*Product Tenets*)

*Ces règles d'or tranchent automatiquement les arbitrages en cas d'hésitation :*

* **Le DSL fait foi :** Le canvas ne propose aucune manipulation que le format `.nanko` ne sait pas sérialiser. Le code texte et l'image restent éternellement isomorphes.
* **Architecture rigoureuse + Annotations libres :** Le schéma combine des blocs d'architecture formels et une couche d'annotation vivante (notes libres, post-its, flèches volantes d'attention) pour faciliter les revues techniques et le partage de contexte.
* **Fluidité d'interaction locale :** Déposer une forme ou tracer un flux magnétique doit prendre moins de 2 secondes. L'outil s'adapte à la vitesse de pensée du concepteur.
* **Non-destructivité par défaut :** Toute suppression en cascade est explicite, les états antérieurs sont récupérables, rien n'est perdu par mégarde.

---

## 4. Garde-Fous (*Ce que Nanko refuse d'être*)

* **Ce n'est PAS un tableau blanc jetable (Miro sans structure) :** Les annotations et notes libres sont bienvenues, mais elles restent versionnées, sérialisées et ancrées dans le document `.nanko` plutôt que disséminées dans un canvas infini ingérable.
* **Ce n'est PAS un outil d'ingénierie UML académique (Enterprise Architect) :** Zéro lourdeur bureaucratique, pas de formation de 3 semaines requise pour poser un bloc.
* **Ce n'est PAS un gestionnaire de projet ou de tickets (Jira, Linear) :** Nanko documente l'architecture du système, pas le calendrier des équipes.

---

## 5. Roadmap des Initiatives Stratégiques

### 🚀 En Cours (Actives)
*Chantiers prioritaires en cours de cadrage ou de livraison (WIP limité : 1 à 2 initiatives max) :*

- [ ] **`studio-modeling`** : Modélisation Visuelle Directe & Fluide sur le Canvas (Shapes, Connecteurs, In-place)  
  ↳ *Initiative :* [`.specs/initiatives/active/studio-modeling/README.md`](./initiatives/active/studio-modeling/README.md)
- [ ] **`workspace-management`** : Gestion des Espaces Personnels, Organisations & Collaboration  
  ↳ *Initiative :* [`.specs/initiatives/active/workspace-management/README.md`](./initiatives/active/workspace-management/README.md)

---

### 🎯 Planifiées (Prêtes)
*Prochains chantiers priorisés, prêts à démarrer dès libération de bande passante :*

*(Aucune initiative planifiée en attente — capacité active allouée sur `studio-modeling` et `workspace-management`)*

---

### 💡 Backlog & Opportunités Futures
*Pistes stratégiques à instruire ultérieurement (simples intentions à ce stade) :*

* **`multiplayer-collaboration`** : Édition synchrone à plusieurs et présence de curseurs en temps réel sur le canvas.
* **`git-sync-integrations`** : Synchronisation bidirectionnelle native avec dépôts Git distants (pull/push automatique des `.nanko`).
* **`cli-headless-export`** : Outil CLI headless pour export automatisé SVG/PNG dans les pipelines de documentation CI/CD.

---

### 📦 Livrées (Archivées)
*Socles et jalons stratégiques accomplis :*

- [x] **`core-domain`** : Modèle Métier Fondamental & Langage Ubiquitaire  
  ↳ *Initiative :* [`.specs/initiatives/archive/core-domain/README.md`](./initiatives/archive/core-domain/README.md)

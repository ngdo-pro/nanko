# Initiative : Studio de Modélisation Visuelle & Édition Directe (studio-modeling)

> **Type :** Product / UX  
> **Initiative Slug :** `studio-modeling`  
> **Owner :** Nicolas & Nanko Core Team  
> **Status :** Active 🚀  
> **Started :** 2026-09-09  

---

## 1. Intent & The Gap

* **Aujourd'hui :** L'édition d'architecture impose de jongler entre du code `.nanko` texte et un canvas graphique semi-passif. La manipulation directe de formes et de connecteurs à la souris ou au clavier nécessite des allers-retours constants dans le code brut.
* **Demain :** Le Studio Nanko devient un environnement de modélisation visuelle complet et fluide : insertion instantanée de formes via une roue radiale sous le curseur, tracé libre de connecteurs avec magnétisme intelligent, édition in-place sans perte de focus, et synchronisation bidirectionnelle déterministe avec le code source `.nanko`.

---

## 2. Modèle d'Interface & Architecture Visuelle Cible

```text
+-----------------------------------------------------------------------------------+
|  [Logo Nanko]  Projet Alpha / Architecture Globale    [Split | Canvas | Code] [?]  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|            +-------------------+          (Magnétisme libre)                      |
|            |   api-gateway     | ----------------------------+                    |
|            |   (Rectangle)     |                             |                    |
|            +-------------------+                             v                    |
|                      |                            +-------------------+           |
|                      | (HTTPS)                    |   auth-service    |           |
|                      v                            |   (Circle)        |           |
|            +-------------------+                  +-------------------+           |
|            |   order-service   |                                                  |
|            |   (Rectangle)     |            [ Roue Radiale au curseur : A / Tab ] |
|            +-------------------+                /     |     \                     |
|                                            [Rect]  [Circle] [Text]                |
|                                                                                   |
+-----------------------------------------------------------------------------------+
|  [Drawer Activité & Diff Notion-style]                     [Status: À jour (Cmd+S)]
+-----------------------------------------------------------------------------------+
```

---

## 3. Invariants Stratégiques & Guardrails

* **Isomorphisme Code $\leftrightarrow$ Canvas (`INV-STRAT-01`) :** Tout élément déposé ou relié sur le canvas modifie immédiatement le texte `.nanko`. Le code reste l'unique source de vérité.
* **Fluidité d'Action Sub-Seconde (`INV-STRAT-02`) :** Toute action de dépôt de forme ou de tracé de connecteur doit prendre moins de 2 secondes au clavier/souris sans détour par un formulaire lourd.
* **Traçabilité Granulaire Non-Destructive (`INV-STRAT-03`) :** Chaque manipulation est historisée unitairement dans la pile d'annulation unifiée (`Cmd+Z`) et consultable dans le journal d'activité.

---

## 4. Feuille de Route des Fonctionnalités (Feature Roadmap)

*Séquence ordonnée des features discrètes cadrées ou à cadrer via `/feature studio-modeling [feature-slug]` :*

- [x] **`01-canvas-board-rendering`** : Visualisation nodale React Flow, formes géométriques et auto-layout Dagre  
  ↳ *Livré & Archivé :* Spec 015 & Spec 016
- [x] **`02-semantic-attributes-label-desc`** : Attributs déclaratifs DSL `label` et `desc`, troncature à 2 lignes et infobulles Blueprint  
  ↳ *Livré & Archivé :* Spec 018 & Spec 019
- [x] **`03-radial-menu-insertion`** : Roue d'outils radiale sous le curseur (`A`/`Tab` maintenu) pour dépôt instantané  
  ↳ *Fichier :* [`archive/03-radial-menu-insertion.md`](./archive/03-radial-menu-insertion.md) *(Livré & Archivé ✅ — Spec 017)*
- [x] **`04-smart-handles-magnetic-connectors`** : Handles contextuels visibles au survol/sélection et tracé magnétique libre  
  ↳ *Fichier :* [`archive/04-smart-handles-magnetic-connectors.md`](./archive/04-smart-handles-magnetic-connectors.md) *(Livré & Archivé ✅ — Spec 021)*
- [ ] **`05-in-place-editing-popover`** : Édition in-place au double-clic et micro-popover contextuelle rapide  
  ↳ *Fichier :* `planned/05-in-place-editing-popover.md` *(À cadrer via `/feature`)*
- [ ] **`06-shortcuts-cheatsheet-modal`** : Modale d'aide interactive des raccourcis clavier (`?` / `Cmd+/`)  
  ↳ *Fichier :* `planned/06-shortcuts-cheatsheet-modal.md` *(À cadrer via `/feature`)*
- [ ] **`07-activity-log-notion-style`** : Journal d'activité granulaire action par action avec diff visuel et restauration  
  ↳ *Fichier :* `planned/07-activity-log-notion-style.md` *(Cadré via PDR-005 — À initialiser)*
- [ ] **`08-omnidirectional-and-smart-anchor-connectors`** : Poignées omnidirectionnelles 4 côtés et point central d'ancrage dynamique (`auto`)  
  ↳ *Fichier :* [`planned/08-omnidirectional-and-smart-anchor-connectors.md`](./planned/08-omnidirectional-and-smart-anchor-connectors.md) *(Cadré ✅ — Prêt pour `/spec`)*
- [ ] **`09-multi-anchor-distribution-and-auto-scale`** : Répartition spatiale harmonieuse multi-ports par flanc et redimensionnement automatique $\times 2$  
  ↳ *Fichier :* [`planned/09-multi-anchor-distribution-and-auto-scale.md`](./planned/09-multi-anchor-distribution-and-auto-scale.md) *(Cadré ✅ — Backlog Feature)*
- [ ] **`10-draggable-connector-labels`** : Repositionnement manuel par glisser des labels de connecteurs et persistance `!LAYOUT`  
  ↳ *Fichier :* [`planned/10-draggable-connector-labels.md`](./planned/10-draggable-connector-labels.md) *(Cadré ✅ — Backlog Feature)*
- [ ] **`11-connector-quick-spawn-on-drop`** : Création rapide de shape connectée par glisser-déposer dans le vide (Miro Quick Spawn)  
  ↳ *Fichier :* [`planned/11-connector-quick-spawn-on-drop.md`](./planned/11-connector-quick-spawn-on-drop.md) *(Cadré ✅ — Backlog Feature)*
- [ ] **`12-connector-selection-and-deletion`** : Sélection visuelle, surbrillance et suppression directe au clavier (`Backspace`/`Delete`)  
  ↳ *Fichier :* [`planned/12-connector-selection-and-deletion.md`](./planned/12-connector-selection-and-deletion.md) *(Cadré ✅ — Backlog Feature)*
- [ ] **`13-connector-reconnection`** : Reconnexion interactive et ré-ancrage d'extrémités existantes par glisser  
  ↳ *Fichier :* [`planned/13-connector-reconnection.md`](./planned/13-connector-reconnection.md) *(Cadré ✅ — Backlog Feature)*




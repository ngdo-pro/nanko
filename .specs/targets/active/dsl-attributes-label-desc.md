# Target : Attributs Sémantiques DSL (label, desc) pour Shapes et Connecteurs

> **Statut :** Active  
> **Domaine(s) associé(s) :** `workspace-management`  
> **Auteur(s) :** Nicolas & Antigravity  
> **Date de création :** 2026-09-09  

Cette Target formalise l'enrichissement sémantique du format déclaratif `.nanko` en introduisant une syntaxe stricte d'attributs clé-valeur (`key="valeur"`), inspirée des standards de Skema. Elle dote les Shapes (`rectangle`, `circle`, `text`) et les Connecteurs (`->`) des attributs `label` et `desc`, et définit leur restitution graphique (double affichage hiérarchisé, infobulles, troncature fluide) ainsi que leurs modalités d'édition sur le Board.

---

## 1. État Actuel vs État Cible

| Aspect | Existant (Base actuelle dans .specs/current) | Cible Visée (Cette Target) |
|---|---|---|
| **Syntaxe des Shapes dans le DSL** | Positionnelle simple : `rectangle id "Mon Label"` | Déclarative stricte clé-valeur : `rectangle id label="Mon Label" desc="Description..."` |
| **Syntaxe des Connecteurs dans le DSL** | Positionnelle simple : `src -> tgt "Mon Label"` | Déclarative stricte clé-valeur : `src -> tgt label="Mon Label" desc="Description..."` |
| **Profondeur documentaire** | Un seul champ textuel court (`label`) par élément, relations peu documentées. | Modélisation à deux niveaux : titre opérationnel (`label`) + description technique/fonctionnelle (`desc`). |
| **Rendu sur le Board (Shapes)** | Affichage textuel centré mono-ligne du label uniquement. | Titre en gras + sous-titre discret pour `desc` (tronqué à 2 lignes avec `ellipsis`) + tooltip complet au survol. |
| **Rendu sur le Board (Connecteurs)** | Badge central textuel simple. | Badge affichant le `label` court + infobulle/micro-popover au survol ou à la sélection révélant la `desc`. |
| **Édition depuis le Studio** | Saisie manuelle dans l'éditeur de code uniquement. | Double-clic in-place pour le `label` + Popover contextuelle rapide au-dessus de l'élément pour éditer `label` et `desc`. |
| **Architecture du Parseur** | Regex rigides ad-hoc dans le backend et frontend. | Architecture extensible avec Tokenizer générique clé=valeur préparant de futurs attributs (`tech`, `external`, etc.). |

---

## 2. Parcours Utilisateur & Expérience Cible

### 2.1. Parcours Principal (*Happy Path*) : Saisie et Restitution d'une Shape
1. **Étape 1 (Création)** : L'architecte dépose un composant (via la roue radiale ou le raccourci `R`). Le code `.nanko` génère automatiquement la déclaration minimale :
   ```nanko
   rectangle auth_service label="Auth Service"
   ```
2. **Étape 2 (Édition contextuelle)** :
   * Par double-clic sur la Shape, l'utilisateur édite immédiatement le `label` en ligne.
   * En cliquant sur l'icône de détail ou via la popover contextuelle rapide au-dessus de l'élément, l'utilisateur renseigne une description : *"Gestionnaire des sessions et des jetons JWT"*.
3. **Étape 3 (Mise à jour et rendu)** :
   * Le code `.nanko` est mis à jour en temps réel :
     ```nanko
     rectangle auth_service label="Auth Service" desc="Gestionnaire des sessions et des jetons JWT"
     ```
   * Sur le Board, la Shape affiche son titre en gras suivi du sous-titre grisé/atténué. Le survol avec le pointeur affiche une infobulle Blueprint complète sans troncature.

### 2.2. Parcours Connecteur : Qualification d'un Flux
1. **Étape 1 (Tracé)** : L'utilisateur relie deux shapes (`auth_service` vers `users_db`).
2. **Étape 2 (Qualification)** : Une micro-popover invite à qualifier la relation. L'utilisateur renseigne le label `"SQL"` et la description `"Requêtes préparées via PgBouncer"`.
3. **Étape 3 (Résultat DSL)** :
   * Le connecteur est formalisé :
     ```nanko
     auth_service -> users_db label="SQL" desc="Requêtes préparées via PgBouncer"
     ```
   * Sur le canvas, la flèche arbore le badge compact `"SQL"`, et le survol du badge fait apparaître l'infobulle détaillant la description.

---

## 3. Grammaire DSL, Composants & Interactions

### 3.1. Règles Grammaticales du Format `.nanko`

1. **Directives de métadonnées d'en-tête :**
   * `@id <slug>` : identifiant unique du schéma.
   * `@dsl-version <entier>` : version de la grammaire DSL du document (défaut : `1`). Permet au parseur d'anticiper les ruptures futures et d'assurer une rétrocompatibilité déterministe.
   * `@layer <entier>` : niveau de profondeur architecturale.
2. **Format des attributs :**
   * Syntaxe stricte `clé="valeur"`.
   * Les guillemets doubles `"` sont obligatoires autour de la valeur.
   * L'ordre des attributs est entièrement libre sur la ligne (ex: `desc="..." label="..."` est équivalent à `label="..." desc="..."`).
3. **Déclaration des Shapes :**
   ```text
   <shape_type> <id> label="<valeur>" [desc="<valeur>"]
   ```
   * Types autorisés : `rectangle`, `circle`, `text`.
   * `id` : identifiant alphanumérique (avec `_` et `-`).
   * `label` : obligatoire pour toute Shape valide.
   * `desc` : optionnel.
4. **Déclaration des Connecteurs :**
   ```text
   <source_id> -> <target_id> [label="<valeur>" [desc="<valeur>"]]
   ```
   * Un connecteur sans attribut (`src -> tgt`) est valide.
   * Un connecteur avec label seul (`src -> tgt label="HTTP"`) est valide.
   * **Règle d'intégrité :** `desc` exige obligatoirement la présence d'un `label`. Déclarer une `desc` sans `label` sur un connecteur déclenche une erreur syntaxique à la ligne correspondante.
5. **Architecture du Tokenizer :**
   * Découpage de la ligne en mot-clé initial + arguments positionnels + ensemble de paires `clé="valeur"`.
   * Rejet immédiat de toute valeur d'attribut non entourée de guillemets doubles.

### 3.2. Rendu Graphique sur le Board (React Flow)

1. **Composant Shape (`NankoNode`) :**
   * **Zone Titre :** Typographie semi-bold (`font-weight: 600`), couleur contrastée, taille adaptée.
   * **Zone Description :** Typographie secondaire (`font-size: 0.75rem`), couleur atténuée (`text-slate-400`), interligne serré.
   * **Troncature :** Limitée à 2 lignes maximum avec `display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;`.
   * **Infobulle (Tooltip) :** Apparition au survol prolongé (> 300ms) affichant le label et l'intégralité de la description dans une bulle Blueprint sombre translucide.
2. **Composant Connecteur (`NankoEdge`) :**
   * **Badge d'arête :** Affiche exclusivement le `label`.
   * **Micro-popover / Tooltip :** Déclenchée au survol ou clic sur le badge pour afficher la description sans surcharger le diagramme visuel.

---

## 4. Règles Métier, Invariants & Droits

### 4.1. Invariants du Modèle
- **Invariant 1 (Unicité des IDs)** : Chaque identifiant de Shape demeure strictement unique au sein du document.
- **Invariant 2 (Intégrité référentielle des connecteurs)** : `source` et `target` doivent référencer des identifiants de Shapes existantes.
- **Invariant 3 (Dépendance label/desc sur relation)** : Un connecteur ne peut pas porter un attribut `desc` sans avoir d'attribut `label`.
- **Invariant 4 (Normalisation AST et Version de schéma)** : L'AST expose obligatoirement `dslVersion` (entier, défaut 1) ainsi que les entités `Shape` et `Connector` avec `label` et `desc` (nullable si absent).

### 4.2. Matrice des Capabilities requises

| Action sur le Studio / Document | `viewer` | `editor` |
|---|:---:|:---:|
| Visualiser les labels et sous-titres de description sur le Board | ✅ | ✅ |
| Survoler les formes et connecteurs pour afficher les tooltips complets | ✅ | ✅ |
| Lire le code source `.nanko` avec `label="..."` et `desc="..."` | ✅ | ✅ |
| Consulter les champs `desc` dans l'inspecteur d'AST | ✅ | ✅ |
| Éditer in-place le `label` d'une Shape ou d'un Connecteur | ❌ | ✅ |
| Ouvrir la popover contextuelle et modifier la `desc` | ❌ | ✅ |
| Modifier la syntaxe DSL dans l'éditeur textuel | ❌ | ✅ |
| Enregistrer les modifications du document | ❌ | ✅ |

---

## 5. Cas Limites (*Edge Cases*) & Résilience

| Situation exceptionnelle / Erreur | Comportement attendu du système |
|---|---|
| Attribut sans guillemets doubles (ex: `label=API`) | Erreur syntaxique explicite levée par le parseur : *"L'attribut label doit être délimité par des guillemets doubles"*. |
| Attribut `desc` déclaré sans `label` sur un connecteur | Erreur syntaxique : *"Un connecteur ne peut pas porter de description sans label"*. |
| Caractère guillemet dans la valeur (ex: `desc="Service de \"monitoring\""`) | Support de l'échappement `\"` dans le tokenizer pour ne pas tronquer la chaîne. |
| Description extrêmement longue (> 500 caractères) | La Shape conserve ses dimensions, le texte est tronqué à 2 lignes sur le canvas avec ellipsis, l'infobulle au survol dispose d'une hauteur maximale avec scrollbar discrète. |
| Document local existant avec ancienne syntaxe positionnelle | Mise à niveau directe "à la main" dans les templates et tests locaux lors de l'implémentation. |

---

## 6. Périmètre Exclu (*Out of Scope*)

Pour garantir une livraison rapide et ciblée, les aspects suivants sont exclus de cette Target :
* **Attributs C4 avancés** (`tech="..."`, `external`, `verb="..."`, `rank=...`) : prévus pour une target ultérieure, bien que l'architecture du tokenizer les anticipe.
* **Moteur de migration SQL automatique** : non requis à ce stade de maturité du projet.
* **Stylisation libre par attributs** (ex: `color="..."`, `stroke="..."`).
* **Support Markdown riche dans `desc`** : le texte de description est traité en texte brut multiligne sans rendu HTML/Markdown lourd.

---

## 7. Découpage Prévisionnel en Specs Delta (`/spec`)

Feuille de route indicative pour l'implémentation de cette Target :

- [x] **Delta 1 (`018-dsl-tokenizer-and-ast-attributes`)** :
  - Support de la directive d'en-tête `@dsl-version <int>` (défaut `1`) et exposition du champ `dslVersion: int` dans l'AST normalisé.
  - Création du tokenizer générique clé-valeur dans le Backend Symfony (`NankoParser.php`, `NankoAst.php`, `Shape.php`, `Connector.php`) et dans le Frontend TypeScript (`nankoParser.ts`, `schemas.ts`).
  - Validation des contraintes de guillemets stricts et de la règle `desc` requérant `label` sur les connecteurs.
  - Mise à niveau directe de tous les tests unitaires et fixtures de documents existants.
- [x] **Delta 2 (`019-board-visual-rendering-label-desc`)** :
  - Adaptation des composants de nœuds (`RectangleNode`, `CircleNode`, `TextNode`) pour afficher le sous-titre `desc` tronqué à 2 lignes avec `ellipsis`.
  - Intégration de l'infobulle / tooltip Blueprint accessible (`BlueprintTooltip`) au survol des shapes et des arêtes (`NankoEdge.tsx`).
  - Visualisation fluide et enrichissement des tests E2E.
- [ ] **Delta 3 (`020-studio-inplace-and-popover-editing`)** :
  - Édition in-place au double-clic sur le `label`.
  - Popover contextuelle rapide au-dessus de l'élément pour éditer `label` et `desc` sans passer par le code textuel.
  - Synchronisation bidirectionnelle fluide vers le code `.nanko`.

# Change : 020 - Migration progressive vers CSS Modules & Conventions CSS du projet

## Métadonnées
* **Domaine concerné :** `.specs/current/domains/workspace-management/`
* **Type de changement :** `Refonte` | `Standardisation des Styles Frontend (CSS)`
* **Cible :** `frontend` | Outillage (`.claude/skills/`) | Documentation (`.specs/architecture.md`)

---

## 1. Intention & Contexte (Le « Why » du Delta)

* **Problème résolu / Besoin :**
  `frontend/src/App.css` a atteint ~2100 lignes de CSS global non scopé (navbar, portail, dashboard, éditeur studio, canvas React Flow, menu radial). Le projet va continuer à grossir, et cette approche pose trois risques croissants :
  - **Collisions de classes non détectables statiquement** : rien n'empêche deux composants de se disputer un même nom de classe (`.card`, `.header`, etc.) sans erreur de compilation.
  - **Aucune convention documentée** : rien n'indique à un futur contributeur (humain ou agent) comment structurer du CSS dans ce projet, ce qui a laissé s'accumuler des couleurs hexadécimales dupliquées (`#ef4444`, `#10b981`, `#f59e0b` répétés 3 fois chacun) au lieu d'utiliser les tokens sémantiques déjà en place (`--danger` existe, mais pas d'équivalent `--success` / `--warning`), et 17 occurrences de `!important` jamais auditées.
  - **Écart documentation / réalité** : `.specs/architecture.md` liste "Tailwind CSS" dans la stack frontend, mais aucune trace de Tailwind n'existe dans le repo (pas de dépendance `package.json`, pas de fichier de configuration, pas de classe utilitaire réellement utilisée). Le projet utilise en réalité du CSS global classique avec des design tokens en  - **Décision actée avec l'utilisateur :** initialement démarrée sur un pilote (nœuds et arêtes canvas), la décision a été prise d'étendre la migration à l'intégralité des composants de l'application au sein de cette spec/PR. `App.css` est allégé pour ne conserver que les resets et conteneurs racine globaux, tandis que tous les styles de composants migrent vers des fichiers `*.module.css` colocalisés.

* **Impact utilisateur & développeur :**
  - **Pour l'utilisateur final :** Aucun changement visuel perceptible. Parité stricte du rendu avant/après (aucune valeur de style calculée ne doit changer).
  - **Pour l'équipe d'ingénierie (humaine ou agent) :** Élimination définitive des collisions de classes globales sur toute la base de code, encapsulation stricte par composant, conformité totale avec le skill `nanko-css`.

* **In Scope (Ce qui est ajouté/modifié) :**
  - **Tokens sémantiques manquants** : ajout de `--success` et `--warning` (variantes light + dark) dans `frontend/src/index.css`.
  - **Remplacement des couleurs hex en dur** dans `App.css` par les tokens correspondants (`var(--danger)`, `var(--success)`, `var(--warning)`).
  - **Audit exhaustif des `!important`** dans `App.css` et dans les modules : chaque occurrence résiduelle est annotée et justifiée.
  - **Migration complète de tous les composants vers CSS Modules colocalisés :**
    - Layout & navigation : `Navbar`, `ThemeSwitch`, `UserMenu`
    - Portail d'authentification : `UnauthenticatedView`
    - Dashboard & workspaces : `DashboardView`, `OrganisationSwitcher`, `ProjectSwitcher`, `CreateProjectModal`
    - Documents & Studio : `DocumentCard`, `DocumentList`, `CreateDocumentModal`, `DocumentEditorView`, `SourceCodeEditor`, `AstInspector`
    - Canvas & interactifs : `NankoCanvas`, `LayoutSelector`, `CanvasControls`, `RadialMenu`, `BlueprintTooltip`, `CircleNode`, `RectangleNode`, `TextNode`, `NankoEdge`
  - **Purge correspondante dans `App.css`** pour éliminer les règles dupliquées.
  - **Création du skill de projet** `nanko-css` (partagé via symlink `.claude/skills -> ../.agents/skills`).
  - **Documentation :** Mise à jour de `.specs/architecture.md`, `tech.md` et création de `ADR-020`.

* **Out of Scope (Exclusions strictes) :**
  - Introduction de Tailwind CSS ou de tout autre framework utilitaire.
  - Tout changement visuel, UX ou comportemental perceptible par l'utilisateur.
  - Toute modification backend, base de données ou contrat d'API.ion backend, base de données ou contrat d'API (aucun impact, changement strictement frontend + documentation + outillage).

---

## 2. Flux & Architecture (Diff)

> [!NOTE]
> Cette évolution est une **refonte purement structurelle du CSS frontend** — aucun flux utilisateur, requête réseau ou séquence d'interaction n'est modifié. Le diagramme de séquence standard (§2 du template) est donc remplacé par la topologie de fichiers avant/après.

### 2.1. Topologie des Fichiers CSS Avant / Après (migration intégrale)

```text
AVANT (CSS global unique) :
frontend/src/
├── index.css                              # Tokens (--brand, --border, --danger, ...) + reset global
└── App.css                                 # ~2100 lignes, TOUS les styles de composants, classes globales
    ├── .nanko-node-circle, .nanko-node-rectangle, .nanko-node-text   (nodes canvas)
    ├── .nanko-edge-label, .nanko-edge-label-container                (edges canvas)
    ├── .alert-error, .save-status-pill.*, .ast-syntax-pill.*         (hex en dur #ef4444/#10b981/#f59e0b)
    ├── .navbar*, .theme-switch*, .user-menu*, .portal*               (layout, auth)
    ├── .dashboard*, .modal*, .document-card*, .document-list*        (workspaces, modals)
    ├── .editor*, .source-editor*, .ast-inspector*                    (studio, editeur)
    └── .nanko-handle, .react-flow*                                   (17 !important non audités)

APRÈS (migration complète CSS Modules + tokens étendus) :
frontend/src/
├── index.css                              # + --success, --warning (light & dark)
├── App.css                                 # Réduit à 198 lignes : resets, conteneurs racines, primitives boutons et formulaires
├── components/
│   ├── BrandLogo.module.css
│   ├── ThemeSwitch.module.css
│   └── layout/Navbar.module.css
├── features/
│   ├── auth/components/UserMenu.module.css
│   ├── workspaces/components/
│   │   ├── OrganisationSwitcher.module.css
│   │   ├── ProjectSwitcher.module.css
│   │   └── CreateProjectModal.module.css
│   └── documents/components/
│       ├── DocumentCard.module.css
│       ├── DocumentList.module.css
│       ├── CreateDocumentModal.module.css
│       ├── SourceCodeEditor.module.css
│       ├── AstInspector.module.css
│       └── canvas/
│           ├── NankoCanvas.module.css
│           ├── LayoutSelector.module.css
│           ├── CanvasControls.module.css
│           ├── nodes/{CircleNode,RectangleNode,TextNode}.module.css
│           ├── edges/NankoEdge.module.css
│           ├── radial/RadialMenu.module.css
│           └── tooltip/BlueprintTooltip.module.css
└── views/
    ├── UnauthenticatedView.module.css
    ├── DashboardView.module.css
    └── DocumentEditorView.module.css

.agents/skills/nanko-css/
└── SKILL.md                                # Conventions CSS & inventaire 100% migré

.specs/
├── architecture.md                         # Stack frontend réelle (CSS Modules + Custom Properties)
└── decisions/architecture/
    └── ADR-020-css-modules-and-design-tokens.md
```

---

## 3. Delta Modèle de données & Base de données

> [!NOTE]
> Aucun impact. Cette évolution ne touche ni le schéma PostgreSQL, ni les entités Doctrine, ni aucune migration backend.

### 3.1. Diagramme Entité-Relation
*Aucune modification.*

### 3.2. Modifications de tables
*Aucune modification.*

### 3.3. Règles de migration & Intégrité
*Aucune migration de base de données requise.*

---

## 4. Delta Contrats d'API (Symfony)

> [!NOTE]
> Aucun endpoint backend n'est ajouté, modifié ou supprimé. Ce changement est strictement circonscrit au frontend, à un skill d'outillage et à la documentation `.specs/`.

---

## 5. Configuration Réseau, Prérequis DNS & Sécurisation des Endpoints

### 5.1. Prérequis DNS Externes
*Aucun nouvel enregistrement DNS requis.*

### 5.2. Matrice d'Exposition et Sécurisation des Endpoints
*Aucun endpoint ou service concerné — CSS Modules est résolu et scopé au moment du build Vite, sans impact runtime réseau.*

### 5.3. Variables d'Environnement & Secrets requis
*Aucune nouvelle variable d'environnement. Vite et Vitest supportent nativement les fichiers `*.module.css` sans configuration ni dépendance supplémentaire.*

---

## 6. Delta Maquettes & Layout UI

### 6.1. Référence visuelle
* **Parité stricte :** Aucune valeur de style calculée (couleur, taille, position, ombre) ne doit changer pour les 4 composants pilotes. Cette spec est un refactor de *scoping*, pas de design.

### 6.2. Wireframes conceptuels
*Sans objet — aucun layout n'est modifié.*

### 6.3. Squelette attendu : import CSS Modules dans un composant migré

```tsx
// frontend/src/features/documents/components/canvas/nodes/CircleNode.tsx
import clsx from 'clsx'
import styles from './CircleNode.module.css'

export function CircleNode({ selected, ...props }: CircleNodeProps) {
  return (
    <div className={clsx(styles.nodeCircle, selected && styles.isSelected)}>
      <div className={styles.circleInner}>
        {/* ... contenu inchangé ... */}
      </div>
    </div>
  )
}
```

```css
/* frontend/src/features/documents/components/canvas/nodes/CircleNode.module.css */
.nodeCircle {
  width: 130px;
  height: 130px;
  background-color: var(--surface);
  border: 1.5px solid var(--border-strong);
  border-radius: 50%;
}

.nodeCircle:hover {
  border-color: var(--brand);
}

.isSelected {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 35%, transparent);
}
```

---

## 7. Delta Spécifications UI & Logique Client (React)

> [!NOTE]
> Pas de schéma Zod ni de matrice d'états UI applicable (aucun formulaire, aucune requête API concernée). Cette section documente à la place la convention CSS et le contenu attendu du nouveau skill.

### 7.1. Convention CSS Modules retenue
* **Nommage des classes dans les fichiers `.module.css` :** `camelCase` (ex: `.nodeCircle`, `.isSelected`), consommées via l'objet importé (`styles.nodeCircle`). Pas de préfixe manuel nécessaire : le scoping est garanti automatiquement par l'outil de build.
* **Tokens :** toute couleur, espacement de palette ou typographie référence une custom property définie dans `index.css` (`var(--brand)`, `var(--success)`, ...) — jamais de valeur hexadécimale en dur pour une couleur sémantique.
* **`!important` :** interdit par défaut. Acceptable uniquement pour surcharger des styles inline injectés par une librairie tierce non configurable autrement (ex: `@xyflow/react`) — chaque occurrence doit porter un commentaire expliquant pourquoi elle est nécessaire.
* **Composition :** utiliser `clsx` (déjà présent dans les dépendances du projet) pour combiner classes de base et classes conditionnelles, plutôt que de la concaténation de chaînes.

### 7.2. Contenu attendu du skill `.claude/skills/nanko-css/SKILL.md`
* Frontmatter : `name: nanko-css`, `description` déclenchant sur l'écriture ou la modification de CSS dans `frontend/`.
* Section "Standard" : CSS Modules colocalisés, un fichier `*.module.css` par composant.
* Section "Tokens" : renvoi vers `frontend/src/index.css` comme source unique de vérité des couleurs/fonts, liste des tokens existants.
* Section "`!important`" : règle d'acceptation/interdiction ci-dessus avec l'exemple React Flow.
* Section "État de la migration" : liste des fichiers déjà migrés (les 4 pilotes) vs classes encore dans `App.css`, mise à jour à chaque migration ultérieure.

---

## 8. Invariants & Cas limites (*Edge cases*)

1. **Parité visuelle stricte :** aucune classe renommée ou déplacée ne doit modifier une valeur de style calculée. La suite E2E `tests-e2e/tests/app/canvas-visualization.spec.ts` doit passer sans aucune modification de ses assertions.
2. **Coexistence sans duplication :** pendant la période de transition, `App.css` (global) et les `*.module.css` cohabitent. Une classe migrée est retirée de `App.css` dans le même changement pour éviter toute règle dupliquée ou contradictoire.
3. **`!important` résiduels documentés :** chaque `!important` conservé dans `App.css` porte un commentaire expliquant la contrainte tierce qui l'impose ; aucun nouveau `!important` n'est introduit sans justification équivalente.
4. **Cohérence des tokens dark/light :** `--success` et `--warning` suivent la même logique de contraste que `--danger` déjà présent (couleur vive en dark mode, plus saturée/sombre en light mode).
5. **Non-interférence avec la spec 019 :** aucune classe ou fichier touché par la spec active 019 (`.nanko-blueprint-tooltip*`, `BlueprintTooltip.tsx`) n'est modifié ici, pour éviter les conflits de merge.
6. **Le skill référence, ne duplique pas :** `nanko-css/SKILL.md` renvoie vers `.specs/architecture.md` pour la stack globale plutôt que de la recopier, afin d'éviter une désynchronisation future.

---

## 9. Plan d'exécution séquentiel

- [x] **Phase 1 : Tokens sémantiques & Audit `!important` (`frontend/src/index.css`, `App.css`)**
  - [x] 1. Ajouter `--success` et `--warning` (light + dark) dans `index.css`, à côté de `--danger`.
  - [x] 2. Remplacer `#ef4444` → `var(--danger)`, `#10b981` → `var(--success)`, `#f59e0b` → `var(--warning)` dans `App.css` (`.alert-error`, `.save-status-pill.*`, `.ast-syntax-pill.*`).
  - [x] 3. Documenter en commentaire pourquoi les pastilles `#ff5f56`/`#ffbd2e`/`#27c93f` restent en dur (décoratives, non thématiques).
  - [x] 4. Auditer les 17 `!important` un par un : annoter chacun (conservé + justification, ou retiré + correctif de spécificité appliqué).

- [x] **Phase 2 : Migration pilote CSS Modules (canvas nodes/edges)**
  - [x] 1. Créer `CircleNode.module.css`, `RectangleNode.module.css`, `TextNode.module.css`, `NankoEdge.module.css` colocalisés, en migrant les classes correspondantes depuis `App.css`.
  - [x] 2. Adapter les imports et `className` dans `CircleNode.tsx`, `RectangleNode.tsx`, `TextNode.tsx`, `NankoEdge.tsx` (via `clsx` + `styles.xxx`).
  - [x] 3. Retirer de `App.css` les règles migrées (pas de duplication).
  - [x] **Tests & Types Frontend :** `pnpm --filter frontend typecheck`, `pnpm --filter frontend lint`, `pnpm --filter frontend test` (suites `CircleNode.test.tsx`, `RectangleNode.test.tsx`, `TextNode.test.tsx`, `NankoEdge.test.tsx` inchangées, doivent rester vertes).

- [x] **Phase 3 : Skill de conventions CSS (`.claude/skills/nanko-css/`)**
  - [x] 1. Créer `.claude/skills/nanko-css/SKILL.md` selon le contenu défini en §7.2.
  - [x] 2. Renseigner l'inventaire "déjà migré vs restant" pour guider les migrations futures au fil de l'eau.

- [x] **Phase 4 : Correction documentaire & Synchronisation (`/sync-current`)**
  - [x] 1. Corriger `.specs/architecture.md` (stack frontend : retrait de "Tailwind CSS", ajout de "CSS Modules + Design tokens CSS Custom Properties").
  - [x] 2. Mettre à jour `.specs/current/domains/workspace-management/tech.md` pour mentionner le standard CSS Modules et les tokens sémantiques étendus.
  - [x] 3. Déplacer cette spec dans `.specs/changes/archive/020-css-modules-migration-and-conventions.md`.

- [x] **Phase 5 : Validation des Quality Gates & Non-Régression**
  - [x] 1. `pnpm --filter frontend typecheck`
  - [x] 2. `pnpm --filter frontend lint`
  - [x] 3. `pnpm --filter frontend test`
  - [x] 4. `pnpm --filter frontend build`
  - [x] 5. `pnpm --filter tests-e2e exec playwright test canvas-visualization.spec.ts` (ciblé — aucun autre parcours e2e concerné).

---

## 10. Definition of Done & Stratégie de tests

### 10.1. Scénarios de validation (Format Gherkin avec tags)

```gherkin
# ==============================================================================
# TESTS FRONTEND (frontend/ - Unitaires & Intégration UI)
# ==============================================================================

@web @unit
Fonctionnalité: Scoping CSS Modules des composants canvas migrés

  Scénario: CircleNode, RectangleNode, TextNode et NankoEdge s'appuient sur des classes scopées
    Étant donné les composants "<CircleNode/>", "<RectangleNode/>", "<TextNode/>" et "<NankoEdge/>" rendus en isolation
    Alors chaque composant importe ses classes depuis son fichier ".module.css" colocalisé
    Et aucune classe globale historique ("nanko-node-circle", "nanko-node-rectangle", "nanko-node-text", "nanko-edge-label") ne subsiste dans "App.css"

@web @unit
Fonctionnalité: Tokens sémantiques de couleur

  Scénario: Les indicateurs success/warning/error utilisent des tokens dédiés
    Quand "frontend/src/index.css" est inspecté
    Alors les variables "--success" et "--warning" sont définies pour le thème clair et le thème sombre
    Et aucune couleur hexadécimale "#10b981" ou "#f59e0b" en dur ne subsiste dans "App.css"

@web @unit
Fonctionnalité: Audit des surcharges de cascade

  Scénario: Chaque "!important" restant dans App.css est justifié
    Quand "frontend/src/App.css" est inspecté
    Alors chaque occurrence de "!important" est immédiatement précédée d'un commentaire expliquant la contrainte tierce qui l'impose

# ==============================================================================
# TESTS E2E (tests-e2e/ - Non-régression visuelle ciblée)
# ==============================================================================

@e2e @preprod
Fonctionnalité: Non-régression visuelle du canvas après migration CSS Modules

  Scénario: Les nœuds Rectangle, Circle et Text conservent leur rendu visuel après migration
    Étant donné un document ouvert en mode Canvas contenant un rectangle, un cercle et un nœud texte
    Alors chaque nœud est rendu avec la même géométrie, les mêmes couleurs et les mêmes bordures qu'avant la migration
    Et la suite "tests-e2e/tests/app/canvas-visualization.spec.ts" passe sans aucune modification de ses assertions
```

### 10.2. Commandes de validation automatisée

```bash
# 1. Frontend (frontend/)
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test

# 2. Build de production Vite
pnpm --filter frontend build

# 3. End-to-End ciblé (tests-e2e/)
pnpm --filter tests-e2e exec playwright test canvas-visualization.spec.ts
```

---
name: nanko-css
description: Conventions de styles CSS, gestion des tokens sémantiques et migration progressive vers CSS Modules pour l'application frontend. À utiliser lors de toute écriture, modification ou refactorisation de CSS dans frontend/.
---

# Conventions CSS du Projet Nanko

Ce guide documente les conventions de style, la hiérarchie des tokens et la stratégie de scoping pour le frontend de Nanko (`frontend/`).

## 1. Standard de Scoping : CSS Modules Colocalisés

* **Architecture cible :** Les styles de chaque composant React doivent être isolés dans un fichier `[Composant].module.css` colocalisé dans le même répertoire que le composant.
* **Nommage des classes :** `camelCase` exclusivement (ex: `.nodeCircle`, `.isSelected`, `.nodeHeader`, `.edgeLabelContainer`).
* **Consommation JSX :**
  * Importer l'objet de styles : `import styles from './[Composant].module.css'`
  * Utiliser `clsx` pour combiner classes de base et classes conditionnelles :
    ```tsx
    import clsx from 'clsx'
    import styles from './CircleNode.module.css'

    export function CircleNode({ selected }: CircleNodeProps) {
      return (
        <div className={clsx(styles.nodeCircle, selected && styles.isSelected)}>
          <div className={styles.circleInner}>...</div>
        </div>
      )
    }
    ```
* **Coexistence :** `App.css` (historique global) et les fichiers `*.module.css` cohabitent pendant la transition. Dès qu'un composant est migré en CSS Module, ses règles globales correspondantes sont immédiatement retirées de `App.css`.

## 2. Design Tokens : Source Unique de Vérité (`frontend/src/index.css`)

Toute couleur, espacement, police ou ombre doit impérativement référencer une variable CSS (CSS Custom Property) définie dans `frontend/src/index.css`.

### Tokens Principaux

| Token | Rôle / Utilisation | Light Theme | Dark Theme (`[data-theme="dark"]`) |
| :--- | :--- | :--- | :--- |
| `--bg` | Fond de page global | `#F7F4EF` | `#04141A` |
| `--canvas-bg` | Fond de la grille du Canvas React Flow | `#FFFFFF` | `#011C25` |
| `--surface` | Fond des cartes, modales, nœuds canvas | `#FFFFFF` | `#061A1F` |
| `--border` | Bordure standard | `#E3DED4` | `#123039` |
| `--border-strong` | Bordure marquée (nœuds, boutons) | `#D5CFC2` | `#1C4750` |
| `--border-soft` | Bordure discrète ou tiretée (text nodes) | `#CFC8B9` | `#2A4A52` |
| `--brand` | Couleur principale de marque | `#2C4A3B` | `#5EEAD4` |
| `--accent` | Couleur d'accentuation / sélection | `#C0472B` | `#FFC46B` |
| `--danger` | Erreurs, alertes, syntaxe invalide | `#B3352F` | `#FF6B6B` |
| `--success` | Sauvegardes réussies, syntaxe valide | `#15803D` | `#34D399` |
| `--warning` | Changements non enregistrés | `#B45309` | `#FBBF24` |
| `--heading` | Texte de titre | `#1C2B24` | `#EAFCF8` |
| `--body-text` | Texte courant | `#4F4B42` | `#A8C4BE` |
| `--muted` | Texte secondaire / estompé | `#6E6A5F` | `#6E8A85` |
| `--font-mono` | Typographie technique / AST / Blueprint | `'IBM Plex Mono', monospace` | Idem |

### Règle d'Or des Couleurs
* **Interdiction stricte des valeurs hexadécimales en dur** pour les couleurs sémantiques ou thématiques (`#ef4444`, `#10b981`, `#f59e0b`, etc.). Utiliser toujours `var(--danger)`, `var(--success)`, `var(--warning)`.
* **Exception documentée :** Les pastilles purement décoratives reproduisant des éléments fixes (ex. `.dot-red`, `.dot-yellow`, `.dot-green` pour les contrôles de fenêtre macOS) restent en dur avec un commentaire explicite.

## 3. Règle Stricte pour `!important`

* **Principe :** L'usage de `!important` est **formellement interdit** pour le code applicatif standard.
* **Seule exception acceptée :** La surcharge de styles inline ou de styles internes injectés par des bibliothèques tierces non configurables via leur API (ex: `@xyflow/react` pour les dimensions de `.react-flow`, les handles carrés ou le `pointer-events` d'`EdgeLabelRenderer`).
* **Obligation d'annotation :** Chaque occurrence de `!important` doit obligatoirement être précédée d'un commentaire explicitant la contrainte technique de la librairie tierce qui l'impose.

## 4. État des Lieux de la Migration Progressive

### Composants Migrés (CSS Modules)
* [x] `CircleNode` (`frontend/src/features/documents/components/canvas/nodes/CircleNode.module.css`)
* [x] `RectangleNode` (`frontend/src/features/documents/components/canvas/nodes/RectangleNode.module.css`)
* [x] `TextNode` (`frontend/src/features/documents/components/canvas/nodes/TextNode.module.css`)
* [x] `NankoEdge` (`frontend/src/features/documents/components/canvas/edges/NankoEdge.module.css`)

### Composants / Domaines Restants dans `App.css` (À migrer au fil de l'eau)
* [ ] Barre de navigation globale & portail (`.app-navbar`, `.portal-*`)
* [ ] Modales & Dashboard (`.modal-*`, `.dashboard-*`, `.project-*`)
* [ ] Éditeur Studio & Inspecteur AST (`.editor-*`, `.source-editor-*`, `.ast-inspector-*`)
* [ ] Tooltip Blueprint (`.nanko-blueprint-tooltip*` — issu de la spec 019)
* [ ] Barre de contrôles flottante du canvas (`.canvas-custom-controls`, `.canvas-control-*`)
* [ ] Roue d'outils radiale (`.radial-menu-*`)

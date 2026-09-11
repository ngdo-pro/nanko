# ADR-020 : Standardisation CSS Frontend par CSS Modules Colocalisés & Design Tokens Natifs

* **Statut :** Validé
* **Date :** 2026-09-11
* **Impact :** `frontend`

## 1. Contexte & Problématique
Le fichier `frontend/src/App.css` a atteint plus de 2100 lignes de styles globaux non scopés, créant des risques majeurs de collisions de sélecteurs et de règles non isolées. De plus, la documentation historique (`.specs/architecture.md`) mentionnait à tort "Tailwind CSS", alors qu'aucun framework utilitaire n'était installé ni souhaité.
Il était nécessaire d'adopter un standard clair, robuste et pérenne pour le scoping des composants, tout en conservant une parité visuelle stricte et une gestion centralisée des thèmes clair/sombre.

## 2. Options techniques étudiées
* **Option A : Tailwind CSS (Framework utilitaire)** : Rejeté. Aurait nécessité une refonte intégrale de tous les fichiers JSX, l'ajout d'une chaîne de build spécifique et la perte de flexibilité sur les styles complexes (React Flow, thèmes dynamiques).
* **Option B : Découpage en fichiers CSS globaux simples** : Rejeté. Ne résout pas le problème fondamental des collisions de noms de classes à mesure que le projet grandit.
* **Option C : CSS Modules colocalisés (`*.module.css`) + Design Tokens natifs (`index.css`)** : **Retenu**.

## 3. Décision
1. **Scoping automatique par CSS Modules** : chaque composant React possède son fichier `[Composant].module.css` colocalisé, utilisant des classes en `camelCase` consommées via l'objet importé `styles.xxx` et combinées avec `clsx`.
2. **Migration progressive** : `App.css` global et les `*.module.css` cohabitent pendant la transition. Dès qu'un composant est migré, ses styles globaux sont purgés d'`App.css`.
3. **Design Tokens en CSS Custom Properties** : `frontend/src/index.css` est l'unique source de vérité pour la palette (tokens `--brand`, `--accent`, `--danger`, `--success`, `--warning`, etc.) supportant nativement les thèmes clair et sombre (`[data-theme="dark"]`).
4. **Interdiction de `!important`** sauf surcharge indispensable de styles inline injectés par des bibliothèques tierces (ex. `@xyflow/react`), avec obligation d'annotation en commentaire.

## 4. Justifications & Conséquences
* **Avantages :**
  * Support natif et transparent par Vite et TypeScript (via `vite/client`), sans dépendance complexe supplémentaire.
  * Encapsulation locale stricte des classes évitant toute collision de nommage.
  * Typage et auto-complétion au build sans runtime overhead.
  * Préservation de la palette de tokens natifs sans couche d'abstraction superflue.
* **Conséquences & Dette acceptée :**
  * Migration intégrale réalisée pour l'ensemble des composants applicatifs au cours de la spec 020, réduisant `App.css` aux seuls conteneurs et primitives racines.
  * La règle d'interdiction de `!important` doit être appliquée avec rigueur par l'équipe et les agents via le skill `nanko-css`.

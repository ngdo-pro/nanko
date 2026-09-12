---
name: test-spec
description: Auditer, concevoir et synchroniser les tests unitaires, d'intégration, E2E et leurs scénarios Gherkin dans la spec active.
---

# Skill : test-spec

Utilisez ce skill pour auditer, concevoir et synchroniser les tests (unitaires, intégration, E2E) et garantir que tout comportement ou cas limite dispose de son test automatisé ET de son scénario Gherkin correspondant dans la spécification active (`.specs/specs/active/[id]*.md`).

## Quand l'utiliser ?

1. **Avant ou pendant `/build-spec` :** Pour cadrer la stratégie de test et écrire les tests en TDD / BDD.
2. **Après tout ajout de test ou cas limite :** Pour synchroniser immédiatement les scénarios Gherkin de la section 8.1 de la spec active (zéro dérive spec $\leftrightarrow$ tests).
3. **Sur demande explicite (`/test-spec [id]`) :** Pour auditer la couverture réelle par rapport aux critères d'acceptation et aux invariants de la spec.

---

## Procédure

### 1. Audit croisé Spec $\leftrightarrow$ Code de Test
* Charger la spécification active sous `.specs/specs/active/[id]*.md`.
* Analyser la **Section 5 (Invariants Métier & Traçabilité)** et la **Section 8.1 (Scénarios Gherkin Exhaustifs)**.
* Examiner les suites de tests existantes :
  * Backend : `backend/tests/Unit/`, `backend/tests/Integration/`.
  * Frontend : `frontend/src/**/*.test.ts`, `frontend/src/**/*.test.tsx`.
  * E2E : `tests-e2e/tests/**/*.spec.ts`.
* Identifier les écarts :
  * **Cas limite ou invariant sans test automatisé.**
  * **Test unitaire, composant ou E2E existant sans scénario Gherkin dans la Section 8.1.**
  * **Scénario Gherkin obsolète ou non aligné avec les assertions réelles.**

### 2. Implémentation des Tests Manquants
* **Backend :**
  * Prioriser les tests unitaires sur les règles du Core (`Domain/`, `UseCase/`).
  * Tests d'intégration DBAL pour les adapters de persistance et contrôleurs HTTP.
* **Frontend :**
  * Tests unitaires sur les helpers sémantiques, parsers, calculs géométriques et transformations de données.
  * Tests de composants React Testing Library sur les interactions utilisateur (clavier, souris, raccourcis, états d'affichage).
* **E2E (Playwright) :**
  * Scénarios nominaux complets d'intégration (authentification, création, interaction, persistance, rechargement).

### 3. Synchronisation Systématique de la Spec Active
* **Section 8.1 (Scénarios Gherkin Exhaustifs) :**
  * Enrichir la section avec les scénarios manquants en respectant l'ordre strict par niveau de test :
    1. Tests Unitaires (`@unit`)
    2. Tests d'Intégration & Composants (`@component` / `@integration`)
    3. Tests End-to-End (`@e2e` / `@web`)
  * Respecter la syntaxe BDD standard :
    ```gherkin
    @unit
    Scénario: [INV-X] [Description concise du comportement vérifié]
      Étant donné [contexte initial]
      Quand [action déclenchée]
      Alors [résultat observable et invariant garanti]
    ```
* **Section 5 (Invariants Métier) :**
  * Mettre à jour la ligne `↳ *Couvert par :* [fichiers courts](#annexe-index-des-fichiers)` pour lier chaque invariant au nouveau fichier de test.
* **Annexe (Index des Fichiers) :**
  * Si un nouveau fichier de test a été créé, l'ajouter dans la table de correspondance en bas de document.

### 4. Validation des Quality Gates (Section 8.2)
* Exécuter systématiquement la suite de tests modifiée :
  * Backend : `make test-backend`
  * Frontend : `pnpm --filter frontend test --run`
  * E2E : `npx playwright test [fichier]`
* Vérifier l'absence d'erreurs de linting ou de typage :
  * `pnpm --filter frontend typecheck && pnpm --filter frontend lint && make lint`

### 5. Restitution & Checklist
* Résumer les tests ajoutés/mis à jour (fichiers et nombre de tests).
* Confirmer la synchronisation 1-pour-1 des scénarios Gherkin en 8.1 et des invariants en 5 dans la spec active.

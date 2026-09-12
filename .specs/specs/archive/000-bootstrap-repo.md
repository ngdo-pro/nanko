# Change : 000 - Bootstrap Repo

## Métadonnées
* **Domaine concerné :** `.specs/current/domains/workspace-management/`
* **Type de changement :** `Nouveau module`
* **Cible :** `Fullstack`

---

## 1. Intention & Contexte (Le « Why » du Delta)
* **Problème résolu / Besoin :** Initialisation du monorepo Nanko avec Docker local, Symfony 8 backend avec architecture hexagonale, React 19 frontend, landing page et tests E2E Playwright.
* **Impact utilisateur :** Fondation technique permettant le développement rapide et testable de la plateforme Nanko.
* **In Scope (Ce qui est ajouté/modifié) :**
  * Monorepo pnpm workspaces
  * Backend Symfony 8 avec Deptrac et outillage d'analyse statique
  * Frontend React 19 Vite + Tailwind CSS
  * Landing page
  * Tests E2E Playwright
* **Out of Scope :**
  * Fonctionnalités métier avancées (reportées aux specs ultérieures)

---

## 2. Plan d'exécution séquentiel
- [x] Phase 1 : Monorepo & Environnement Docker
- [x] Phase 2 : Backend Symfony 8 avec Deptrac
- [x] Phase 3 : Frontend React 19 & Landing
- [x] Phase 4 : Tests E2E Playwright
- [x] Phase 5 : Intégration du système Spec-Driven

---

## 3. Statut
* **Statut :** Livré et archivé.

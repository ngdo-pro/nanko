# ADR-002 : Architecture modulaire par Bounded Contexts (Monolithe Modulaire)

* **Statut :** Validé
* **Date :** 2026-09-05
* **Impact :** `backend`

## 1. Contexte & Problématique
Le backend adoptait initialement une architecture hexagonale globale (`src/Core/` et `src/Adapter/`, cf. ADR 0011) où les agrégats de différents domaines métier (ex: `User`, `Organisation`) se trouvaient regroupés au même niveau technique (`src/Core/Domain/User`, `src/Core/Domain/Organisation`).
Avec l'enrichissement des domaines et la formalisation des contextes délimités (Bounded Contexts : `AuthAndIdentity`, `WorkspaceManagement`), ce regroupement horizontal risquait d'induire un couplage fort accidentel entre domaines, des dépendances croisées de persistance et une dilution des frontières DDD.

## 2. Options techniques étudiées
* **Option A : Conserver l'hexagone global unique (`src/Core/` et `src/Adapter/`)**
  * Inconvénients : Tous les domaines partagent les mêmes dossiers techniques ; frontière de responsabilité floue (ex: autorisation vs authentification) ; extraction de service impossible sans refactoring lourd.
* **Option B : Remonter le Bounded Context au premier niveau (`src/<BoundedContext>/Core/` et `src/<BoundedContext>/Adapter/`)**
  * Avantages : Alignement 1:1 parfait avec la cartographie `.specs/current/domains/` ; modularité maximale (Monolithe Modulaire) ; chaque domaine encapsule son propre hexagone indépendant (`Domain`, `Port`, `UseCase`, `Adapter Driven/Driver`) ; dépendance inter-domaines réduite à des ports explicites.

## 3. Décision
Option B : Adoption d'une structure en Monolithe Modulaire où chaque Bounded Context vit à la racine de `backend/src/<BoundedContext>/` :
```text
backend/src/
├── AuthAndIdentity/
│   ├── Core/
│   │   ├── Domain/
│   │   ├── Port/
│   │   └── UseCase/
│   └── Adapter/
│       ├── Driven/
│       └── Driver/
├── WorkspaceManagement/
│   ├── Core/
│   └── Adapter/
└── Shared/
    └── Kernel.php
```

## 4. Justifications & Conséquences
* **Alignement DDD :** Isolation stricte des modèles et des tables par domaine. `AuthAndIdentity` gère l'authentification et fournit un `UserId` ; `WorkspaceManagement` gère l'autorisation et les `Capability` de manière souveraine.
* **Tooling Deptrac :** La configuration `deptrac.php` est adaptée pour vérifier les règles hexagonales au sein de chaque Bounded Context via des motifs jokers (`src/*/Core/...`).

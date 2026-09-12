# Initiative : Modèle Métier Fondamental & Langage Ubiquitaire (core-domain)

> **Type :** Architecture / Tech & Product  
> **Initiative Slug :** `core-domain`  
> **Owner :** Nicolas & Nanko Core Team  
> **Status :** Archived (Livré & Socle Initial Établi ✅)  
> **Started :** 2026-08-20 | **Delivered :** 2026-08-30  

---

## 1. Intent & The Gap

* **Avant :** Les concepts du produit (schémas, projets, versions, organisations) étaient informels, dispersés dans des notes de cadrage (`CONTEXT.md`, `CONCEPT.md`), avec des confusions lexicales récurrentes (tenant vs organisation, snapshot vs version, node vs shape).
* **Après :** Établissement d'un domaine métier rigoureux (DDD) et d'un langage ubiquitaire (*Ubiquitous Language*) strict servant de référence absolue pour l'ensemble des modules, schémas de base de données, contrats d'API et agents d'ingénierie.

---

## 2. Modèle Mental & Hiérarchie du Domaine

```text
ORGANISATION (Owner, Membres, Isolation étanche)
└── PROJECT (Conteneur plat au sein de l'organisation)
    └── DOCUMENT (Entité persistée avec métadonnées et identifiant @id)
        ├── LAYER (Attribut de profondeur d'architecture)
        ├── DRAFT (État de travail en cours, librement éditable)
        │   ├── CONTENU SÉMANTIQUE (.nanko : Shapes & Connectors)
        │   └── LAYOUT (!LAYOUT / !END : Coordonnées spatiales)
        └── VERSION (Instantané immuable layer:semver, @satisfies)
```

---

## 3. Invariants Stratégiques & Guardrails

* **Le Code `.nanko` fait foi (`INV-CORE-01`) :** La base de données PostgreSQL est la source de vérité d'exécution, le format `.nanko` est la sérialisation textuelle déclarative pure.
* **Séparation Sémantique / Spatial (`INV-CORE-02`) :** Les entités de contenu (`Shape`, `Connector`) ne portent aucune position spatiale ; toutes les coordonnées vivent exclusivement dans la section `!LAYOUT ... !END`.
* **Immutabilité des Versions (`INV-CORE-03`) :** Une `Version` publiée est strictement figée dans le temps. Seul le `Draft` est modifiable.

---

## 4. Langage Ubiquitaire (*Ubiquitous Language*)

### Structure & Conteneurs

* **Organisation :** Le regroupement de premier niveau qui possède des `Project` et des membres. Définit les droits d'accès.  
  *À éviter :* Tenant, workspace.
* **Project :** Un conteneur plat de `Document` au sein d'une `Organisation`. Pas de hiérarchie ni de sous-dossiers en v1 — la recherche remplace le rangement.  
  *À éviter :* Espace, dossier.
* **Document :** Un schéma versionné, identifié par un `@id` stable, positionné sur un `Layer`, décrivant des `Shape` et leurs `Connector`. C'est l'entité du domaine ; le fichier `.nanko` n'en est que la sérialisation.  
  *À éviter :* Schéma, diagramme, fichier .nanko.
* **Layer :** L'attribut de profondeur d'un `Document` au sein d'un `Project` (équivalent d'un z-index conceptuel) — pas une entité séparée. Plusieurs `Document` peuvent partager le même `Layer`.  
  *À éviter :* Niveau, z-index.

### Versionnage & Cycle de Vie

* **Version :** Un instantané figé et immuable d'un `Document`, identifié par `@version` au format `layer:semver` (le préfixe layer doit toujours égaler le `Layer` du Document). Contient à la fois le contenu sémantique et son Layout.  
  *À éviter :* Snapshot, révision.
* **Draft :** L'état de travail courant d'un `Document`, librement modifiable, distinct de ses `Version` figées. Ne devient une `Version` qu'au moment où l'utilisateur la publie explicitement.  
  *À éviter :* Working copy, état courant.
* **Current version :** La `Version` d'un Document désignée manuellement comme faisant autorité pour la navigation inter-Layer. N'est jamais déduite automatiquement d'une plage de compatibilité.  
  *À éviter :* Latest version, dernière version (une version plus récente peut exister sans être la version active faisant foi).
* **Satisfies :** La déclaration de compatibilité informative (`@satisfies layer:range`) qu'une `Version` fait envers une plage de `Version` d'un autre Layer. Sert uniquement d'alerte visuelle si la `Current version` sort de cette plage.  
  *À éviter :* Dépendance, requirement.
* **Layout :** La section `!LAYOUT ... !END` d'un Document, contenant les positions spatiales figées par identifiant de Shape. Fait partie intégrante de la `Version`.  
  *À éviter :* Positionnement, placement.

### Contenu Visuel & Relations

* **Shape :** Un élément visuel du mode free (`rectangle`, `circle`, `text`), identifié par un `id` obligatoire et portant `label` et `desc`. Ne porte aucune position spatiale dans la grammaire sémantique.  
  *À éviter :* Forme, élément, node.
* **Connector :** Une relation logique et directionnelle entre deux `Shape` (`source -> target`). Ne porte aucune information de routage spatial.  
  *À éviter :* Lien, edge, arrow.

### Droits & Habilitations

* **Capability :** Un droit accordé explicitement à un membre sur un `Project` précis (`viewer`, `editor`). Une `Organisation` peut définir une Capability par défaut pour simplifier le modèle d'accès.  
  *À éviter :* Rôle, permission, droit.

---

## 5. Feuille de Route Livrée (Features Réalisées)

- [x] **`01-core-domain-entities`** : Définition des agrégats `Organisation`, `Project`, `Document`, `Layer` et value objects UUIDv7.  
  ↳ *Livré :* Spec 000 & Spec 012
- [x] **`02-authentication-and-memberships`** : Authentification et liaison des membres aux organisations (`OrganisationMember`).  
  ↳ *Livré :* Spec 001 & Spec 012
- [x] **`03-document-content-and-ast`** : Modélisation de l'AST dénormalisé et de la sérialisation `.nanko`.  
  ↳ *Livré :* Spec 014 & Spec 018

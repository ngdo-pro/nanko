# Skill Claude Code : /target

Cadre en profondeur une cible fonctionnelle majeure ("What we build") via un interrogatoire poussé et génère/met à jour un document dans `.specs/targets/active/[slug].md`.

## Rôle & Objectif
Contrairement à `/spec` (qui est un format court limité à 2 questions pour découper un delta immédiat), `/target` pilote un **interrogatoire de cadrage produit méthodique et exhaustif**. Il challenge l'utilisateur sur tous les aspects fonctionnels, ergonomiques et techniques jusqu'à ce que tout le périmètre voulu soit parfaitement limpide et partagé.

## Arguments attendus
`$ARGUMENTS` : `[domaine] [sujet...]`
* Le premier argument est le domaine métier concerné (ex. `workspace-management`, `auth-and-identity`).
* Les arguments suivants décrivent la cible fonctionnelle ou le module à concevoir.

## Procédure d'exécution

### Étape 1 : Immersion contextuelle
1. Lire `.specs/vision.md` (invariants et principes directeurs globaux).
2. Parcourir les cibles déjà atteintes dans `.specs/targets/achieved/` (ex. `000-core-domain.md`).
3. Si le domaine existe dans `.specs/current/domains/[domaine]/`, lire ses fichiers (`behavior.md`, `tech.md`, `contracts.md`, `models.md`) pour identifier le point de départ actuel.
4. Vérifier si un document cible existe déjà dans `.specs/targets/active/` pour l'enrichir ou préparer la création d'un nouveau document.

### Étape 2 : L'Interrogatoire Poussé (Multi-vagues)
Poser des questions structurées par salves thématiques avec options concrètes et recommandées, en explorant systématiquement :
* **Vague 1 : Outils & Déclencheurs** (Quels outils, palettes, roues radiales, raccourcis, comportement de dépôt immédiat vs outil actif ?).
* **Vague 2 : Ergonomie & Interactions** (Interactions entre objets, drag & drop, snapping/magnétisme, édition in-place, spécificités Mac/trackpad vs Windows/clavier, visibilité des poignées ?).
* **Vague 3 : Modèle de Droits & Capabilities** (Niveaux de capability, adaptation de l'UI en lecture seule vs édition ?).
* **Vague 4 : Traçabilité, Historique & Cas Limites** (Journal d'activité granulaire par action style Notion, diff visuel/textuel, undo/redo unifié, restauration non destructive, edge cases ?).
* **Vague 5 : Frontières & Out-of-Scope** (Qu'est-ce qui est volontairement exclu de cette cible pour éviter l'effet tunnel ?).

> **Important :** Ne jamais arrêter le questionnement prématurément. Continuer à creuser tant qu'il subsiste des choix implicites ou des divergences d'interprétation.

### Étape 3 : Génération / Mise à jour de la Target
1. Charger `.specs/TARGET_TEMPLATE.md`.
2. Générer ou mettre à jour `.specs/targets/active/[slug].md`.
3. Renseigner minutieusement chaque section :
   - Tableau comparatif « État Actuel vs État Cible ».
   - Parcours utilisateurs (Happy Path et secondaires).
   - Outils, composants et interactions dynamiques.
   - Règles métier, invariants et matrice des Capabilities.
   - Cas limites et gestion d'erreurs.
   - Périmètre exclu (*Out of Scope*).
   - Découpage prévisionnel en jalons de specs delta (`/spec`).

### Étape 4 : Identification des PDRs & Restitution
1. Identifier les arbitrages produit structurants tranchés lors de l'échange (ex. choix d'ergonomie, de traçabilité, de visibilité conditionnelle).
2. Proposer à l'utilisateur de formaliser ces décisions via `/new-pdr [sujet]`.
3. Inviter l'utilisateur à relire le document cible dans son éditeur.

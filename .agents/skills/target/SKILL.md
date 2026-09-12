---
name: target
description: Cadrer en profondeur une cible fonctionnelle ("What we build") via un interrogatoire poussé et générer/mettre à jour un document dans .specs/targets/active/.
---

# Skill : target

Utilisez ce skill lorsque l'utilisateur souhaite définir, concevoir ou clarifier une vision fonctionnelle cible ("What we build") pour un module ou un domaine (`/target [domaine] [sujet]`).

Contrairement au skill `/spec` (qui produit rapidement un delta d'implémentation court terme avec au maximum 2 questions), le skill `/target` a pour mission de **pousser le cadrage jusqu'à ce que tout le périmètre voulu soit parfaitement aligné, sans aucune zone d'ombre**.

---

## Procédure

### 1. Immersion & État des Lieux
1. Lire `.specs/vision.md` (invariants et principes directeurs globaux).
2. Lire les targets déjà atteintes dans `.specs/targets/achieved/` (ex: `000-core-domain.md`).
3. Si le domaine existe déjà, lire `.specs/baseline/domains/[domaine]/` (`behavior.md`, `tech.md`, `contracts.md`, `models.md`) pour connaître exactement le point de départ actuel.
4. Vérifier si un document cible existe déjà dans `.specs/targets/active/` pour l'enrichir ou en créer un nouveau (`.specs/targets/active/[slug].md`).

### 2. L'Interrogatoire de Cadrage Poussé
Mener un interrogatoire méthodique par salves successives de questions à choix multiples argumentées (via l'outil `ask_question`), en explorant systématiquement :

* **Vague 1 : Outils & Déclencheurs**
  - Quels sont les outils mis à disposition ?
  - Comment sont-ils déclenchés (palette flottante, roue radiale, volet latéral, raccourcis) ?
  - Quel comportement à la sélection (dépôt immédiat, mode outil actif, tampon continu) ?
* **Vague 2 : Interactions Spatiales & Ergonomie**
  - Comment les éléments interagissent entre eux (connexion, magnétisme/snap, regroupement/conteneurs) ?
  - Comment édite-t-on les propriétés (in-place, popover rapide, inspecteur latéral) ?
  - Quelles sont les spécificités de saisie (utilisateurs Mac/trackpad vs souris, raccourcis clavier) ?
  - Quel est le comportement de visibilité des éléments d'aide (poignées/handles, guides d'alignement) ?
* **Vague 3 : Modèle de Droits & Capabilities**
  - Quels niveaux de Capability s'appliquent sur cette interface ?
  - Comment l'UI s'adapte-t-elle pour chaque niveau (lecture seule stricte, édition de draft, etc.) ?
* **Vague 4 : Traçabilité, Historique & Résilience**
  - Quel suivi de l'activité (journal d'activité action par action style Notion, ou snapshots) ?
  - Comment fonctionne l'annulation (Undo/Redo unifié ou séparé) et la restauration d'états antérieurs ?
  - Comment le système réagit-il aux cas limites et erreurs de saisie ?
* **Vague 5 : Frontières & Périmètre Exclu (*Out-of-Scope*)**
  - Qu'est-ce qui est volontairement écarté pour cette phase et reporté à plus tard (ex: gestion des versions formelles, multi-utilisateurs temps réel) ?

> **Règle d'or :** Ne jamais clore l'interrogatoire prématurément. Continuer à questionner tant que subsistent des choix d'interaction implicites ou des ambiguïtés. Demander explicitement à l'utilisateur s'il souhaite approfondir un aspect avant de conclure.

### 3. Génération / Mise à Jour du Document Cible
1. Utiliser le template `.specs/TARGET_TEMPLATE.md`.
2. Écrire le document dans `.specs/targets/active/[slug].md`.
3. Remplir exhaustivement :
   - Tableau comparatif « État Actuel vs État Cible ».
   - Description détaillée de chaque outil et comportement interactif.
   - Matrice des capabilities.
   - Référentiel des raccourcis clavier associés.
   - Cas limites et périmètre exclu.
   - Découpage prévisionnel en jalons / specs delta (`/spec`).

### 4. Capitalisation des Décisions (PDRs)
Identifier les arbitrages structurants tranchés pendant l'interrogatoire (ex: roue radiale au curseur, handles visibles à la sélection uniquement, traçabilité par action) et proposer à l'utilisateur de formaliser les PDRs correspondants via `/new-pdr [sujet]`.

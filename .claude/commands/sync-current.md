# Skill Claude Code : /sync-current

Répercute les ajouts d'une spécification delta livrée dans l'état courant du domaine et archive la spécification.

## Rôle & Objectif
Garantit que la documentation vivante du système dans `.specs/current/` reste la source de vérité exacte après livraison du code. Extrait les deltas validés de la spec active pour enrichir `behavior.md`, `contracts.md`, `models.md` et `tech.md`, puis déplace la spec active vers `changes/archive/`.

## Arguments attendus
`$ARGUMENTS` : `[id]`
* L'identifiant de la spec active à archiver (ex. `001` ou `001-nom-evolution`).

## Procédure d'exécution

### Étape 1 : Localisation de la spec active
1. Rechercher le fichier `.specs/changes/active/[id]*.md`.
   * Si le fichier n'existe pas, vérifier dans `.specs/changes/archive/` pour signaler si la spec est déjà archivée.
2. Lire les métadonnées de la spec pour identifier le domaine cible :
   * Dossier : `.specs/current/domains/[nom-du-domaine]/`

### Étape 2 : Extraction et synchronisation des deltas

#### 1. Comportement Produit (`behavior.md`)
* Insérer les nouveaux parcours utilisateurs validés dans la section `2. Parcours Utilisateurs Actifs`.
* Mettre à jour ou ajouter les nouvelles règles de gestion métier dans `3. Règles de Gestion Métier`.
* Ajouter les nouveaux cas limites dans la matrice des échecs.

#### 2. Contrats d'API & Schémas Client (`contracts.md`)
* Ajouter les nouveaux endpoints REST dans la section `1. Endpoints REST Actifs` (méthode, URL, authentification requise, DTO d'entrée et exemples de réponses).
* Ajouter les schémas Zod validés dans `2. Schémas de Validation Frontend (Zod)`.

#### 3. Modèles & Base de données (`models.md`)
* Ajouter ou mettre à jour la définition des agrégats et entités du Core Domain.
* Mettre à jour le schéma des tables SQL (colonnes, types, index, contraintes) et indiquer le nom de la migration Doctrine.

#### 4. Architecture Technique (`tech.md`)
* Si de nouveaux packages, services ou patterns ont été introduits, mettre à jour la description de la stack et des composants du domaine.

### Étape 3 : Archivage de la spécification
1. S'assurer que le dossier `.specs/changes/archive/` existe.
2. Déplacer le fichier de spec :
   * De : `.specs/changes/active/[nom_fichier].md`
   * Vers : `.specs/changes/archive/[nom_fichier].md`
3. Vérifier que `.specs/changes/active/` ne contient plus ce fichier.

### Étape 4 : Confirmation
Afficher un récapitulatif clair des fichiers synchronisés :
* `behavior.md` mis à jour
* `contracts.md` mis à jour
* `models.md` mis à jour
* `tech.md` (si applicable)
* Spec archivée sous `.specs/changes/archive/[nom_fichier].md`.

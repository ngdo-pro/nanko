# Skill Claude Code : /new-adr

Formalise un choix technique d'architecture, de protocole ou de stockage sous la forme d'un Architecture Decision Record (ADR).

## Rôle & Objectif
Enregistre les arbitrages techniques structurants (sélection d'une librairie, protocole d'authentification, conventions DBAL, modèle de persistance) dans un document normé documentant le problème, les options étudiées, la solution retenue et les contreparties assumées.

## Arguments attendus
`$ARGUMENTS` : `[sujet...]`
* Description courte ou intitulé de la décision d'architecture à consigner.

## Procédure d'exécution

### Étape 1 : Résolution de l'identifiant ADR
1. Lister les fichiers dans `.specs/decisions/architecture/` et `docs/adr/`.
2. Identifier le numéro le plus élevé (format `ADR-XXX` ou `XXXX`).
3. Incrémenter pour obtenir le nouvel identifiant (ex. `ADR-002`).
4. Dériver un slug kebab-case à partir du sujet (ex. `ADR-002-tanstack-query.md`).

### Étape 2 : Recueil du contexte technique
1. Lire le template `.specs/templates/ADR_TEMPLATE.md`.
2. Identifier :
   * Le problème de performance, d'architecture, de découplage ou de sécurité.
   * La cible d'impact (`backend`, `frontend`, `tests-e2e`, `infra`).
   * Les 2 options techniques comparées.
   * La justification de la solution retenue et la dette ou contrainte acceptée.
3. Si le contexte dans l'échange suffit, formaliser directement l'ADR.

### Étape 3 : Création du document ADR
Rédiger le fichier `.specs/decisions/architecture/ADR-XXX-[slug].md` avec la structure suivante :
```markdown
# ADR-[XXX] : [Titre de la décision technique]

* **Statut :** Validé
* **Date :** YYYY-MM-DD
* **Impact :** `backend` | `frontend` | `tests-e2e` | `infra`

## 1. Contexte & Problématique
[Quel problème d'architecture, de performance ou de sécurité doit être résolu ?]

## 2. Options techniques étudiées
* **Option A :** [Librairie / pattern + contraintes]
* **Option B :** [Librairie / pattern + contraintes]

## 3. Décision
[Solution retenue]

## 4. Justifications & Conséquences
* [Pourquoi cette stack / librairie est choisie]
* [Conséquences sur la sécurité, le typage ou la maintenance]
* [Dette technique ou contrainte acceptée]
```

### Étape 4 : Confirmation
Informer le développeur de la création de l'ADR et résumer la décision enregistrée.

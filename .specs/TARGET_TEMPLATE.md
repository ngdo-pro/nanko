# Target : [Nom du Sujet / Module]

> **Statut :** Active | Achieved  
> **Domaine(s) associé(s) :** `[domaine, ex: workspace-management]`  
> **Auteur(s) :** [Nom]  
> **Date de création :** [YYYY-MM-DD]  

[Résumé exécutif en 2-3 phrases décrivant l'intention fonctionnelle majeure et l'expérience cible recherchée.]

---

## 1. État Actuel vs État Cible

| Aspect | Existant (Base actuelle dans .specs/current) | Cible Visée (Cette Target) |
|---|---|---|
| **Périmètre fonctionnel** | Ce qui fonctionne aujourd'hui | La nouvelle capacité offerte |
| **Ergonomie & Interface** | L'état actuel des écrans / composants | L'expérience cible (outils, palette, disposition) |
| **Interactions & Gestes** | Saisie actuelle, clics nécessaires | Nouveaux gestes fluides, raccourcis, D&D |
| **Modèle de droits / Rôles** | Droits actuels | Capabilities cibles requises |

---

## 2. Parcours Utilisateur & Expérience Cible

### 2.1. Parcours Principal (*Happy Path*)
1. **Étape 1 (Déclenchement)** : Comment l'utilisateur initie l'action.
2. **Étape 2 (Interaction)** : Ce que l'utilisateur voit et manipule.
3. **Étape 3 (Résultat & Feedback)** : L'état final visible et persistant.

### 2.2. Parcours Secondaires / Alternatifs
- [Parcours secondaire 1]
- [Parcours secondaire 2]

---

## 3. Outils, Composants & Interactions

### 3.1. Catalogue d'Outils & Éléments
- **Outil 1** : Rôle, déclencheur, comportement.
- **Outil 2** : Rôle, déclencheur, comportement.

### 3.2. Interactions Spatiales & Comportements Dynamiques
- **Manipulation directe** : Drag & drop, snap magnétique, alignements.
- **Édition in-place & contextuelle** : Double-clic, popover rapide, inspecteur.

---

## 4. Règles Métier & Invariants du Domaine

- **Invariant 1** : Règle non négociable garantissant l'intégrité.
- **Invariant 2** : Comportement en cascade ou contrainte de modélisation.
- **Matrice des Capabilities requises** :

| Action cible | `viewer` | `editor` |
|---|:---:|:---:|
| [Action 1] | ✅ | ✅ |
| [Action 2] | ❌ | ✅ |

---

## 5. Cas Limites (*Edge Cases*) & Résilience

| Situation exceptionnelle / Erreur | Comportement attendu du système |
|---|---|
| Conflit de saisie ou données invalides | Message explicite, préservation de la saisie sans blocage |
| Suppression d'un élément parent | Gestion de l'intégrité (cascade ou orphelins) |
| Droits insuffisants (lecture seule) | Masquage des outils d'édition, badges explicites |

---

## 6. Périmètre Exclu (*Out of Scope*)

Pour garantir la faisabilité et éviter l'effet tunnel, les éléments suivants sont **explicitement exclus** de cette target et reportés à des targets ultérieures :
- [Élément exclu 1]
- [Élément exclu 2]

---

## 7. Découpage Prévisionnel en Specs Delta (`/spec`)

Feuille de route indicative des évolutions unitaires à implémenter pour atteindre cette target :

- [ ] **Delta 1 (`XXX-[slug]`)** : [Description du premier jalon]
- [ ] **Delta 2 (`YYY-[slug]`)** : [Description du deuxième jalon]
- [ ] **Delta 3 (`ZZZ-[slug]`)** : [Description du troisième jalon]

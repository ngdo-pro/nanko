# Skill Claude Code : /new-pdr

Formalise un arbitrage produit ou d'ergonomie structurant sous la forme d'un Product Decision Record (PDR).

## Rôle & Objectif
Capture les arbitrages fonctionnels majeurs (onboarding, conversion, ergonomie, règles de suppression/gestion) dans un document normé consignant le contexte, les alternatives étudiées, la décision prise et les justifications (« Le Why »).

## Arguments attendus
`$ARGUMENTS` : `[sujet...]`
* Description courte ou intitulé de la décision produit à formaliser.

## Procédure d'exécution

### Étape 1 : Résolution de l'identifiant PDR
1. Lister les fichiers existants dans `.specs/decisions/product/`.
2. Identifier le numéro `XXX` le plus élevé parmi les fichiers `PDR-XXX-*.md`.
3. Incrémenter pour obtenir le nouvel identifiant (ex. `PDR-002`).
4. Dériver un slug kebab-case à partir de l'argument (ex. `PDR-002-auto-save.md`).

### Étape 2 : Recueil du contexte & Formulation
1. Lire le template `.specs/templates/PDR_TEMPLATE.md`.
2. Si le sujet nécessite des précisions, questionner le développeur sur :
   * L'irritant ou le dilemme UX rencontré.
   * Les 2 options majeures envisagées (avec forces et faiblesses).
   * L'option retenue et la concession UX acceptée.
3. Si le contexte fourni dans la discussion est déjà suffisant, rédiger directement sans question superflue.

### Étape 3 : Création du document PDR
Rédiger le fichier `.specs/decisions/product/PDR-XXX-[slug].md` avec la structure suivante :
```markdown
# PDR-[XXX] : [Titre de la décision produit]

* **Statut :** Validé
* **Date :** YYYY-MM-DD
* **Impact UX :** [Ex. Onboarding, Rétention, Navigation]

## 1. Contexte & Problème
[Description du problème et du besoin utilisateur]

## 2. Options envisagées
* **Option A :** [Description + avantages/inconvénients]
* **Option B :** [Description + avantages/inconvénients]

## 3. Décision
[Option retenue]

## 4. Justifications & Conséquences (The « Why »)
* [Raison 1 : pourquoi les alternatives ont été écartées]
* [Raison 2 : impact sur les métriques clés]
* [Contrepartie acceptée / concession UX]
```

### Étape 4 : Confirmation
Informer le développeur de la création du PDR et fournir un résumé des points clés enregistrés.

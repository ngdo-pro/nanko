# PDR-002 : Organisation personnelle implicite et absence de libre-service en v1

* **Statut :** Validé (Livré en prod via spec 012)
* **Date :** 2026-09-02
* **Impact UX :** Onboarding, Structure des espaces de travail, Simplicité d'usage

## 1. Contexte & Problème
Nanko structure les projets et documents au sein d'une entité racine `Organisation`.  
Comment accueillir un nouvel utilisateur sans lui imposer la lourdeur managériale de créer et configurer une organisation dès son premier accès ?

## 2. Options envisagées
* **Option A : Formulaire obligatoire de création d'organisation à l'onboarding**
  * Inconvénients : Friction cognitive élevée pour les développeurs solos, étapes administratives inutiles pour débuter.
* **Option B : Auto-provisioning transparent d'un Espace personnel (`is_personal = true`)**
  * Avantages : Accès instantané à « Mon premier projet », zéro friction managériale en mode Solo (l'organisation est masquée dans l'interface tant que l'utilisateur n'appartient pas à plusieurs organisations).
  * Conséquence : La création d'organisations d'équipe (*team / company*) est administrée sur demande en v1, évitant la prolifération de tenants vides.

## 3. Décision
Option B : Auto-provisioning d'un Espace personnel lors du premier accès et interface adaptative masquant le concept d'organisation pour les utilisateurs solos.

## 4. Justifications & Conséquences (The « Why »)
* Conforme à l'invariant « Moins de 3 clics pour accomplir l'action principale ».
* Évite d'obliger les utilisateurs solos à comprendre la hiérarchie Organisation/Projet dès le premier jour.

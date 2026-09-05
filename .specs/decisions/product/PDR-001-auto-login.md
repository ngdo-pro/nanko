# PDR-001 : Connexion automatique post-inscription (Auto-login)

* **Statut :** Validé
* **Date :** 2026-08-30
* **Impact UX :** Onboarding, Taux d'activation des nouveaux utilisateurs

## 1. Contexte & Problème
Lorsqu'un utilisateur s'inscrit sur Nanko, doit-il être connecté directement dans l'interface ou forcé de repasser par la page de connexion ?

## 2. Options envisagées
* **Option A : Redirection vers la page de login**
  * Avantages : Simplicité d'implémentation, confirmation explicite des identifiants par l'utilisateur.
  * Inconvénients : Rupture dans le tunnel d'inscription, friction cognitive et baisse du taux d'activation immédiat.
* **Option B : Émission immédiate du token d'accès dès la validation de l'inscription (Auto-login)**
  * Avantages : L'utilisateur atterrit directement sur son espace de travail, onboarding fluide en 1 clic.
  * Inconvénients : Gestion du flux de confirmation d'email en arrière-plan sans bloquer la découverte initiale.

## 3. Décision
Option B : Auto-login dès l'inscription avec jetons JWT Bearer émis immédiatement dans la réponse d'inscription.

## 4. Justifications & Conséquences (The « Why »)
* L'invariant produit Nanko « Simplicité & Zéro friction » priorise la prise en main immédiate.
* Un bandeau discret invite à valider l'adresse email sans bloquer l'édition de base.

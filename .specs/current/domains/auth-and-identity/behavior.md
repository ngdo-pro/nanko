# Domaine : Identité & Accès (auth-and-identity) - Comportement Produit

## 1. Mission du Domaine (Le « Why »)
Fournir une gestion sécurisée, sans friction et transparente de l'identité des utilisateurs, de l'authentification et du cycle de vie des sessions sur Nanko.

## 2. Parcours Utilisateurs Actifs
* **Parcours 1 : Inscription & Connexion**
  * L'utilisateur soumet son email et son mot de passe ou utilise un lien magique.
  * Validation stricte des identifiants et émission d'un token de session.
* **Parcours 2 : Renouvellement de session**
  * Renouvellement silencieux via refresh token à rotation unique avant expiration du jeton court (60 min).
* **Parcours 3 : Déconnexion**
  * Révocation du refresh token et suppression sécurisée des jetons en mémoire/stockage client.

## 3. Règles de Gestion Métier
* **Règle 1 (Zero Trust) :** Tout accès aux endpoints applicatifs privés exige un jeton JWT Bearer valide et non expiré.
* **Règle 2 (Politique de mot de passe) :** Minimum 12 caractères, vérification contre les listes de mots de passe compromis.
* **Règle 3 (Usage unique) :** Tout refresh token utilisé est immédiatement révoqué ; toute réutilisation suspecte invalide la chaîne de jetons.

## 4. Matrice des Échecs & Cas Limites
| Situation | Comportement visible pour l'utilisateur |
|---|---|
| Identifiants erronés | Message d'erreur générique : « Identifiant ou mot de passe incorrect » |
| Session expirée | Redirection fluide vers la page de connexion avec reprise de contexte |
| Compte verrouillé | Notification d'alerte et procédure de réinitialisation sécurisée par email |

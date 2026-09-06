# Domaine : Espaces de Travail (workspace-management) - Comportement Produit

## 1. Mission du Domaine (Le « Why »)
Permettre aux utilisateurs et aux équipes de structurer leurs architectures dans Nanko au sein d'Organisations (`Organisation`) et de Projets (`Project`), servant de conteneurs obligatoires pour les futurs schémas versionnés (`Document`).

## 2. Décision Produit & Modèle d'Accès
* **Organisation personnelle implicite (`is_personal = true`) :**
  Tout utilisateur authentifié dispose automatiquement d'un Espace personnel créé de manière transparente et idempotente lors de sa première visite, avec un projet initial nommé « Mon premier projet ».
* **Pas de création d'organisation en libre-service :**
  La création d'organisations d'équipe (*team* / *company*) est administrée sur demande directe. Aucun formulaire libre-service de création d'organisation n'est exposé en v1.
* **Interface adaptative Solo vs Multi-organisation :**
  * **Mode Solo (cas par défaut) :** L'organisation est masquée pour l'utilisateur. L'interface affiche directement ses projets (« Mes Projets », création de projet, sélecteur de projet actif) avec zéro friction managériale.
  * **Mode Multi-organisation :** Si l'utilisateur est membre d'au moins une organisation d'équipe en plus de son Espace personnel, un sélecteur d'organisation apparaît dans la barre de navigation pour basculer de contexte.

## 3. Parcours Utilisateurs Actifs
* **Parcours 1 : Premier accès & auto-provisioning transparent**
  * À la première visite sur le Dashboard, l'API détecte l'absence d'organisation personnelle pour l'utilisateur.
  * Elle provisionne instantanément l'Organisation personnelle (`is_personal = true`, nom: « Espace personnel », slug: `personal-<uid>`), rattache l'utilisateur comme `owner`, et crée « Mon premier projet » (`mon-premier-projet`).
  * L'utilisateur accède immédiatement à ses projets sans étape de configuration bloquante.
* **Parcours 2 : Création d'un Projet au sein de l'Organisation active**
  * L'utilisateur clique sur « + Nouveau Projet » sur le Dashboard.
  * Une modale s'ouvre, lui permettant de saisir le nom du projet (le slug est auto-généré et éditable).
  * À la validation, le projet est créé dans l'organisation active et automatiquement sélectionné comme projet actif.
* **Parcours 3 : Sélection et persistance du Projet actif**
  * L'utilisateur bascule entre ses projets via les cartes du Dashboard ou le `ProjectSwitcher` dans la barre de navigation.
  * L'identifiant du projet actif est persisté localement (`localStorage`) pour conserver le contexte après rafraîchissement de page.

## 4. Règles de Gestion Métier (Lexique Invariant cf. CONTEXT.md)
* **Organisation :** Regroupement racine possédant des Projets et des membres. Ne jamais employer les termes « Tenant » ou « Workspace ».
* **Organisation personnelle :** Organisation avec l'attribut `is_personal: true`. Un utilisateur ne peut posséder qu'une seule organisation personnelle.
* **OrganisationMember :** Relation d'appartenance entre un utilisateur (`app_user`) et une organisation, qualifiée par un rôle (`owner`, `member`).
* **Project :** Conteneur plat de documents au sein d'une organisation. Unicité stricte du slug de projet par organisation (`uniq_project_org_slug`).
* **Persistance du contexte :** Le projet actif est conservé côté client (`localStorage`) et réinitialisé intelligemment si l'organisation active change.

## 5. Matrice des Échecs & Cas Limites
| Situation | Comportement visible pour l'utilisateur |
|---|---|
| Accès à une organisation dont l'utilisateur n'est pas membre | Code 403 `ACCESS_DENIED` avec message explicite. |
| Organisation inexistante | Code 404 `ORGANISATION_NOT_FOUND`. |
| Tentative de création d'un projet avec un slug déjà utilisé dans l'organisation | Code 409 `PROJECT_SLUG_EXISTS` affiché directement dans la modale sans rechargement. |
| Nom de projet invalide (< 2 caractères ou > 100 caractères) | Code 422 `UNPROCESSABLE_ENTITY` avec message de validation sous le champ concerné. |

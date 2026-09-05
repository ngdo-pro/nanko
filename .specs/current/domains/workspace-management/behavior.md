# Domaine : Espaces de Travail (workspace-management) - Comportement Produit

## 1. Mission du Domaine (Le « Why »)
Permettre aux équipes de structurer leurs architectures dans Nanko à travers des Organisations (`Organisation`), des Projets (`Project`) et des schémas versionnés (`Document`), tout en attribuant des droits granulaires (`Capability`).

## 2. Parcours Utilisateurs Actifs
* **Parcours 1 : Création d'Organisation & Invitation**
  * Un utilisateur crée une `Organisation`, définit une `Capability` par défaut et invite des collaborateurs.
* **Parcours 2 : Création de Projet**
  * Création d'un conteneur plat de `Document` au sein de l'organisation.
* **Parcours 3 : Gestion des Droits (Capabilities)**
  * Attribution de droits explicites à un membre sur un projet ciblé.

## 3. Règles de Gestion Métier (Lexique Invariant cf. CONTEXT.md)
* **Organisation :** Regroupement racine possédant des Project et des membres. Ne jamais appeler « Tenant » ou « Workspace ».
* **Project :** Conteneur plat de Document au sein d'une Organisation. Pas de sous-dossiers en v1.
* **Capability :** Droit accordé explicitement à un membre sur un Project précis (pas un « Rôle » global).
* **Document :** Schéma versionné sur un Layer décrivant Shape et Connector.

## 4. Matrice des Échecs & Cas Limites
| Situation | Comportement visible pour l'utilisateur |
|---|---|
| Droits insuffisants sur un Project | Code 403 renvoyé avec message explicite et invitation à contacter l'administrateur de l'Organisation |
| Suppression d'une Organisation non vide | Confirmation bloquante exigeant la saisie du nom de l'Organisation |

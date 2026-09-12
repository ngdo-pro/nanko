# Langage Ubiquitaire (Ubiquitous Language & Glossaire DDD)

> **Référence :** Issu de l'initiative socle [`core-domain`](../initiatives/archive/core-domain/README.md).  
> Ce glossaire fixe les termes officiels non négociables utilisés dans le code, les spécifications, les contrats d'API et les interfaces.

---

## 1. Structure & Conteneurs

* **Organisation :**
  Le regroupement de premier niveau qui possède des `Project` et des membres. Définit les droits d'accès.  
  *À proscrire :* Tenant, workspace.
* **Project :**
  Un conteneur plat de `Document` au sein d'une `Organisation`. Pas de hiérarchie ni de sous-dossiers en v1 — la recherche remplace le rangement.  
  *À proscrire :* Espace, dossier.
* **Document :**
  Un schéma versionné, identifié par un `@id` stable, positionné sur un `Layer`, décrivant des `Shape` et leurs `Connector`. C'est l'entité du domaine ; le fichier `.nanko` n'en est que la sérialisation.  
  *À proscrire :* Schéma, diagramme, fichier .nanko.
* **Layer :**
  L'attribut de profondeur d'un `Document` au sein d'un `Project` (équivalent d'un z-index conceptuel) — pas une entité séparée. Plusieurs `Document` peuvent partager le même `Layer`.  
  *À proscrire :* Niveau, z-index.

---

## 2. Versionnage & Cycle de Vie

* **Version :**
  Un instantané figé et immuable d'un `Document`, identifié par `@version` au format `layer:semver` (le préfixe layer doit toujours égaler le `Layer` du Document). Contient à la fois le contenu sémantique et son Layout.  
  *À proscrire :* Snapshot, révision.
* **Draft :**
  L'état de travail courant d'un `Document`, librement modifiable, distinct de ses `Version` figées. Ne devient une `Version` qu'au moment où l'utilisateur la publie explicitement.  
  *À proscrire :* Working copy, état courant.
* **Current version :**
  La `Version` d'un Document désignée manuellement comme faisant autorité pour la navigation inter-Layer. N'est jamais déduite automatiquement d'une plage de compatibilité.  
  *À proscrire :* Latest version, dernière version (une version plus récente peut exister sans être la version active faisant foi).
* **Satisfies :**
  La déclaration de compatibilité informative (`@satisfies layer:range`) qu'une `Version` fait envers une plage de `Version` d'un autre Layer. Sert uniquement d'alerte visuelle si la `Current version` sort de cette plage.  
  *À proscrire :* Dépendance, requirement.
* **Layout :**
  La section `!LAYOUT ... !END` d'un Document, contenant les positions spatiales figées par identifiant de Shape. Fait partie intégrante de la `Version`.  
  *À proscrire :* Positionnement, placement.

---

## 3. Contenu Visuel & Relations

* **Shape :**
  Un élément visuel du mode free (`rectangle`, `circle`, `text`), identifié par un `id` obligatoire et portant `label` et `desc`. Ne porte aucune position spatiale dans la grammaire sémantique.  
  *À proscrire :* Forme, élément, node.
* **Connector :**
  Une relation logique et directionnelle entre deux `Shape` (`source -> target`). Ne porte aucune information de routage spatial.  
  *À proscrire :* Lien, edge, arrow.

---

## 4. Droits & Habilitations

* **Capability :**
  Un droit accordé explicitement à un membre sur un `Project` précis (`viewer`, `editor`). Une `Organisation` peut définir une Capability par défaut pour simplifier le modèle d'accès.  
  *À proscrire :* Rôle, permission, droit.

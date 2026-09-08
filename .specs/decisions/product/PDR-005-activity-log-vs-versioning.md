# PDR-005 : Journal d'activité granulaire par action (Style Notion) et report du versioning formel

* **Statut :** Validé (Cible en cours de réalisation)
* **Date :** 2026-09-08
* **Impact UX :** Collaboration, Traçabilité, Historique des modifications

## 1. Contexte & Problème
Les utilisateurs ont besoin de savoir qui a modifié quoi sur un Document et de pouvoir revenir en arrière en cas d'erreur.  
Doit-on implémenter immédiatement le système complexe de versioning formel (`Draft`, `layer:semver`, `Current version`, `@satisfies`), ou privilégier un suivi granulaire des micro-actions collaboratives ?

## 2. Options envisagées
* **Option A : Implémenter le Versioning formel complet (SemVer + publication de snapshots immuables)**
  * Inconvénients : Charge cognitive élevée pour l'utilisateur qui doit penser à publier des versions manuellement, ne trace pas ce qui s'est passé entre deux publications de versions.
* **Option B : Journal d'activité unitaire au fil de l'eau (Style Notion) et découplage du versioning**
  * Avantages : Traçabilité automatique et continue de chaque action (avatar, date relative, modification, suppression, création).
  * Diff visuel sur le Board (surbrillance vert/jaune/rouge) et textuel dans le code `.nanko`.
  * Restauration non destructive en 1 clic (*Point-in-time restore*) sans perte d'historique.
  * Le versioning formel est reporté à plus tard pour éviter de surcharger la v1.

## 3. Décision
Option B : Adoption d'un journal d'activité unitaire granulaire style Notion avec diff visuel et restauration non destructive, et report délibéré du versioning formel.

## 4. Justifications & Conséquences (The « Why »)
* Répond immédiatement au besoin de traçabilité et de sécurité des utilisateurs sans introduire la complexité conceptuelle des releases.

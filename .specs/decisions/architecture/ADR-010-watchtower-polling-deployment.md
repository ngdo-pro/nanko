# ADR-010 : Déploiement continu par scrutation d'images (Watchtower) sans exposition de secrets SSH

* **Statut :** Validé
* **Date :** 2026-08-30
* **Impact :** `infra`

## 1. Contexte & Problématique
Comment automatiser le déploiement continu des conteneurs applicatifs (Backend Symfony, Frontend React, Landing) sur les environnements VPS de préproduction et de production depuis GitHub Actions, sans introduire de vulnérabilité de sécurité liée au stockage de clés d'accès serveur sur des runners de CI mutualisés ?

## 2. Options techniques étudiées
* **Option A : Déploiement en Push déclenché depuis la CI via SSH**
  * *Inconvénients :* Nécessite de stocker une clé SSH privée dans les secrets GitHub (`SSH_PRIVATE_KEY`) ; élargit la surface d'attaque en cas de compromission d'un workflow tiers ; exige l'ouverture du port SSH aux plages d'adresses IP dynamiques des runners GitHub Actions.
* **Option B : Déploiement en Pull autonome via scrutation d'images (Watchtower)**
  * *Avantages :* Aucun secret de connexion serveur (clé SSH, mot de passe root, hôte) ne quitte le VPS ; la CI GitHub Actions se limite à construire et pousser les images Docker sur GitHub Container Registry (GHCR) ; Watchtower s'exécute localement sur le VPS, scrute les digests d'images toutes les 5 minutes (`com.centurylinklabs.watchtower.enable: "true"`) et orchestre le remplacement à chaud des conteneurs.

## 3. Décision
Retenir l'**Option B** : Déploiement passif en mode Pull orchestré par Watchtower sur le VPS :
1. La CI publie l'image sur GHCR sous un tag d'environnement stable (`:preprod` ou `:prod`).
2. Watchtower détecte la mise à jour du digest, télécharge la nouvelle image et redémarre le conteneur.
3. Les migrations de base de données Doctrine sont exécutées automatiquement dans `backend/docker-entrypoint.sh` avant le lancement de FrankenPHP.
4. Si une migration échoue, l'entrypoint interrompt le processus avec code d'erreur non nul : avec la politique `restart: unless-stopped`, le conteneur entre en crash-loop visible (`docker ps`) plutôt que de servir du trafic sur un schéma obsolète.

## 4. Justifications & Conséquences
* **Sécurité & Moindre Privilège :** Clôture complète de la surface d'attaque SSH depuis l'extérieur.
* **Résilience des Migrations :** Pas d'orchestration externe fragile des migrations ; l'image embarque et garantit l'alignement de son schéma SQL à l'instanciation.
* **Contrepartie acceptée :** Un délai de latence de propagation pouvant atteindre 5 minutes (intervalle de polling Watchtower). Cette latence est absorbée en CI grâce à une boucle d'attente active interrogeant `GET /api/v1/version` jusqu'à validation de la version SemVer ciblée.

# Initiative : Gestion des Espaces de Travail & Collaboration (workspace-management)

> **Type :** Product / UX & Architecture  
> **Initiative Slug :** `workspace-management`  
> **Owner :** Nicolas & Nanko Core Team  
> **Status :** Active 🚀  
> **Started :** 2026-09-01  

---

## 1. Intent & The Gap

* **Aujourd'hui :** L'utilisateur dispose d'un espace personnel implicite transparent et de projets simples pour héberger ses documents (socle v1). Cependant, la gestion multi-utilisateurs reste restreinte : pas d'invitation directe de collaborateurs, pas de création d'organisation d'équipe en libre-service et modèle de droits binaire (`owner` / `member`).
* **Demain :** Nanko offre une plateforme collaborative complète où les équipes peuvent co-construire leurs architectures : invitation fluide de collègues par email, bascule instantanée entre espace personnel et organisations partagées (`OrganisationSwitcher`), et attribution de droits granulaires par projet (`viewer` vs `editor`).

---

## 2. Modèle d'Interface & Architecture Visuelle Cible

```text
+-----------------------------------------------------------------------------------+
|  [Logo Nanko]  [Organisation : Acme Corp v]   [Projet : Paiements v]   [Profil]   |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  ORGANISATION : Acme Corp                                [ + Inviter un membre ]  |
|  Membres actifs : 4 (Alice [Owner], Bob [Editor], Charlie [Viewer])               |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | MES PROJETS                                                [ + Nouveau ]   |  |
|  +-----------------------------------------------------------------------------+  |
|  |  +---------------------------+       +---------------------------+          |  |
|  |  |  Système de Paiement      |       |  Plateforme Ingestion     |          |  |
|  |  |  3 documents • Layer 0    |       |  1 document • Layer 1     |          |  |
|  |  |  Accès : Éditeur (Vous)   |       |  Accès : Lecteur (Vous)   |          |  |
|  |  +---------------------------+       +---------------------------+          |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 3. Invariants Stratégiques & Guardrails

* **Espace Personnel Implicite (`INV-WS-01` / `PDR-002`) :** Tout utilisateur authentifié dispose d'un espace personnel transparent créé sans friction. Tant qu'il n'est membre d'aucune équipe, toute complexité managériale est masquée (Mode Solo).
* **Étanchéité Multi-Tenant Absolue (`INV-WS-02`) :** Les projets et documents d'une organisation sont strictement inaccessibles aux membres d'une autre organisation.
* **Contrôle d'Accès à la Source (`INV-WS-03`) :** Tout UseCase applicatif et endpoint REST vérifie l'appartenance active de l'utilisateur avant d'autoriser la lecture ou la mutation.

---

## 4. Feuille de Route des Fonctionnalités (Feature Roadmap)

*Séquence ordonnée des features cadrées ou à cadrer via `/feature workspace-management [feature-slug]` :*

- [x] **`01-personal-organisation-and-projects`** : Espace personnel transparent, auto-provisioning et gestion des projets v1  
  ↳ *Livré & Archivé :* Spec 012 & PDR-002
- [x] **`02-document-containers-dashboard`** : Conteneurs de documents avec attribution de layer et grille Dashboard  
  ↳ *Livré & Archivé :* Spec 014
- [ ] **`03-team-invitations-and-onboarding`** : Envoi d'invitations par email, acceptation avec jeton temporaire sécurisé  
  ↳ *Fichier :* `planned/03-team-invitations-and-onboarding.md` *(À cadrer via `/feature`)*
- [ ] **`04-project-capabilities-rbac`** : Gestion granulaire des droits d'accès par projet (`viewer` lecture seule vs `editor`)  
  ↳ *Fichier :* `planned/04-project-capabilities-rbac.md` *(À cadrer via `/feature`)*
- [ ] **`05-organisation-settings-and-transfer`** : Page de configuration d'organisation, renommage et transfert de propriété  
  ↳ *Fichier :* `planned/05-organisation-settings-and-transfer.md` *(À cadrer via `/feature`)*

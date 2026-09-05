# Vision Produit & Invariants Globaux

## 1. Raison d'être & Cible
* **Mission :** Nanko aide à concevoir des schémas d'architecture selon une approche "diagrams-as-code" : le contenu est piloté par un format texte versionné (`.nanko`), la base de données étant la source de vérité runtime.
* **Cible prioritaire :** Développeurs, architectes logiciels et équipes d'ingénierie concevant et maintenant des architectures logicielles modulaires.
* **Proposition de valeur :** Schémas d'architecture vivants, versionnés et navigables inter-couches (Layers), sans dérive entre la documentation et la réalité du code.
* **North Star Metric :** Nombre de documents d'architecture `.nanko` créés et maintenus activement à travers les versions.

---

## 2. Principes directeurs de l'expérience (UX & Product Tenets)
Ces principes guident les arbitrages fonctionnels et d'interface en cas d'ambiguïté :
* **Accès « Zéro Confiance » (*Zero Trust*) :** Toute surface applicative est verrouillée par défaut ; aucune donnée privée n'est accessible sans session authentifiée active.
* **Feedback immédiat & Transparence :** Aucune action silencieuse. Chaque mutation déclenche un état de chargement visible, un retour de succès ou un message d'erreur actionnable.
* **Simplicité & Zéro friction :** Moins de 3 clics pour accomplir l'action principale. L'interface guide l'utilisateur vers l'étape suivante sans surcharge cognitive.
* **Non-destructivité par défaut :** Toute suppression d'élément structurant exige une confirmation explicite ; privilégier l'archivage réversible (*soft delete*).

---

## 3. Cartographie des Domaines Métier (*Bounded Contexts*)

| Domaine | Répertoire | Responsabilité & Périmètre |
|---|---|---|
| **Identité & Accès** | `domains/auth-and-identity/` | Inscription, sessions OAuth 2.0, sécurité des comptes et profils. |
| **Espaces de travail** | `domains/workspace-management/` | Organisation des équipes (Organisation, Project, Document), invitations, contextes collaboratifs et droits (Capabilities). |
| **Facturation & Quotas** | `domains/billing/` | Abonnements, intégration PSP (Stripe), gestion des plans et limites d'usage. |

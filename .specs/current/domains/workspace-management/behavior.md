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
* **Parcours 4 : Création d'un Document au sein du Projet actif**
  * L'utilisateur clique sur « + Nouveau Document » depuis le Dashboard de son projet sélectionné.
  * Une modale s'ouvre permettant de saisir le nom, le slug (auto-généré) et la profondeur (`Layer`, défaut 0).
  * À la validation, le document est créé avec un template source initial `.nanko` et l'utilisateur est immédiatement redirigé vers l'éditeur.
* **Parcours 5 : Édition, analyse syntaxique et persistance du code source .nanko**
  * Sur la route `/projects/:projectId/documents/:documentId`, l'utilisateur dispose d'un éditeur dark theme pour le code source `.nanko` et d'un inspecteur d'AST en temps réel (Shapes, Connectors).
  * Il enregistre ses modifications via le bouton « Enregistrer » ou le raccourci clavier `Cmd+S` / `Ctrl+S`.
  * Le backend valide la syntaxe `.nanko` (`NankoParser`) et met à jour l'AST dénormalisé. En cas d'erreur de syntaxe, l'utilisateur est averti avec la ligne précise sans aucune perte de son code saisi.
  * Si l'utilisateur tente de quitter la page avec des modifications non sauvegardées, un avertissement `beforeunload` est déclenché.
* **Parcours 6 : Consultation des Documents sur le Dashboard**
  * L'état vide du Dashboard est remplacé par la grille des documents du projet actif (`DocumentList`), affichant pour chaque document son nom, layer, nombre de shapes/connectors et date de modification.
  * Un clic sur une carte de document ouvre directement la vue d'édition.
* **Parcours 7 : Visualisation Graphique en Canvas Interactif (React Flow)**
  * Dans la vue d'édition (`DocumentEditorView`), l'utilisateur dispose d'un sélecteur d'affichage dans la barre d'outils supérieure :
    * **Mode Split (par défaut)** : Éditeur de code à gauche et canvas graphique interactif à droite (50/50).
    * **Mode Canvas** : Canvas graphique en plein écran pour la manipulation spatiale et l'exploration d'architecture.
    * **Mode Code** : Éditeur de code et inspecteur AST textuel en plein écran.
  * Le canvas matérialise automatiquement les entités `.nanko` sous forme de nœuds typés conformes au design system Blueprint :
    * `RectangleNode` : Panneau rectangulaire structuré pour services et composants.
    * `CircleNode` : Véritable géométrie circulaire (`border-radius: 50%`) avec badge et identifiant centrés au-dessus du libellé, et 4 ports de connexion tangents aux points cardinaux.
    * `TextNode` : Boîte de texte annotée avec bordure pointillée discrète.
    * `NankoEdge` : Arêtes directionnelles avec flèches SVG et étiquettes intégrées.
  * **Manipulation spatiale (Drag & Drop)** : L'utilisateur peut déplacer librement les nœuds sur le canvas. Au relâchement (`onNodeDragStop`), les nouvelles coordonnées `(x, y)` sont automatiquement injectées ou mises à jour dans le bloc `!LAYOUT ... !END` du code `.nanko`, déclenchant l'état « Non enregistré » prêt à être sauvegardé via `Cmd+S` / `Ctrl+S`.
  * **Réorganisation automatique (Auto-Layout)** : Un clic sur « Réorganiser » calcule instantanément un placement hiérarchique sans chevauchement via l'algorithme Dagre (prenant en compte les dimensions circulaires réelles) et synchronise l'ensemble des coordonnées dans le code source.
  * **Résilience aux erreurs de syntaxe** : En cas de code syntaxiquement invalide pendant la frappe, le canvas se met en pause avec un badge discret `Syntaxe en cours d'édition - Canvas en pause` tout en conservant le dernier graphe valide affiché.
* **Parcours 8 : Espace de Travail Pleine Largeur (*Edge-to-Edge*) & Barre de Commandes Flottante**
  * **Disposition studio pleine largeur** : L'éditeur de document (`/projects/:projectId/documents/:documentId`) s'affranchit de la contrainte standard `max-width: 1200px` pour s'étendre sur 100% de la largeur du viewport (`.app-main-fullscreen`), éliminant tout défilement externe sur la page hôte tout en préservant la visibilité de la Navbar et du Footer. Le Dashboard conserve sa largeur centrée de 1200px.
  * **Barre d'outils flottante en mode Canvas** : Lorsque l'utilisateur bascule en mode `Canvas`, la barre de commandes supérieure devient un îlot flottant au centre supérieur (`.editor-topbar.is-floating`) avec effet de flou technique (`backdrop-filter: blur(12px)`), fond translucide et bordure technique Blueprint. Le graphe React Flow s'étend en continu en arrière-plan sous la barre.
  * **Barre ancrée en modes Split et Code** : Dans les modes `Split` et `Code`, la barre d'outils reste ancrée de façon statique (`.editor-topbar.is-static`) au sommet des panneaux de code et de canvas.

## 4. Règles de Gestion Métier (Lexique Invariant cf. CONTEXT.md)
* **Organisation :** Regroupement racine possédant des Projets et des membres. Ne jamais employer les termes « Tenant » ou « Workspace ».
* **Organisation personnelle :** Organisation avec l'attribut `is_personal: true`. Un utilisateur ne peut posséder qu'une seule organisation personnelle.
* **OrganisationMember :** Relation d'appartenance entre un utilisateur (`app_user`) et une organisation, qualifiée par un rôle (`owner`, `member`).
* **Project :** Conteneur plat de documents au sein d'une organisation. Unicité stricte du slug de projet par organisation (`uniq_project_org_slug`).
* **Document :** Schéma d'architecture positionné sur un `Layer` (profondeur / z-index entier >= 0), rattaché à un `Project`. Porte directement son identité (`name`, `slug`, `layer`) et son contenu (`source_code` textuel au format `.nanko`, `ast` JSONB dénormalisé). Unicité stricte du slug par projet (`uniq_document_project_slug`).
* **Format .nanko & Parseur :** Format textuel déclaratif versionnable modélisant des entités graphiques (`Shape` : `rectangle`, `circle`, `text`), logiques (`Connector` : `source -> target "label"`) et spatiales (bloc `!LAYOUT\nnodeId: x=..., y=...\n!END`). Intégrité référentielle stricte : les connecteurs et coordonnées ne peuvent référencer que des shapes déclarées dans le document.
* **Persistance du contexte :** Le projet actif est conservé côté client (`localStorage`) et réinitialisé intelligemment si l'organisation active change.

## 5. Matrice des Échecs & Cas Limites
| Situation | Comportement visible pour l'utilisateur |
|---|---|
| Accès à une organisation ou un document hors organisation membre | Code 403 `ACCESS_DENIED` avec message explicite. |
| Organisation inexistante | Code 404 `ORGANISATION_NOT_FOUND`. |
| Projet ou Document inexistant | Code 404 `PROJECT_NOT_FOUND` ou `DOCUMENT_NOT_FOUND`. |
| Tentative de création d'un projet avec un slug déjà utilisé dans l'organisation | Code 409 `PROJECT_SLUG_EXISTS` affiché directement dans la modale sans rechargement. |
| Tentative de création d'un document avec un slug déjà utilisé dans le projet | Code 409 `DOCUMENT_SLUG_EXISTS` affiché dans la modale sans rechargement. |
| Nom de projet ou document invalide | Code 422 `UNPROCESSABLE_ENTITY` avec message de validation sous le champ concerné. |
| Erreur de syntaxe dans le code source `.nanko` à l'enregistrement | Code 422 `INVALID_NANKO_SYNTAX` affichant un panneau d'erreur rouge avec le numéro de ligne et le motif, préservant le code dans l'éditeur. |
| Erreur de syntaxe locale en cours de frappe dans l'éditeur | Le canvas affiche le badge « Canvas en pause » et maintient le dernier AST valide sans crasher ni effacer le graphe. |


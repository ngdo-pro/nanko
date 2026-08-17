# Référence technique — Nanko

> Ce document est une spec de référence (scope, modèle de données, logique métier, API), consultée en codant — pas un doc de pilotage. Pour "où on en est", les décisions en attente et les prochaines étapes, voir `PRODUCT_STATUS.md`. Pour le journal détaillé d'implémentation (pièges, bugs, revirements), voir `ENGINEERING_LOG.md`.

> **Note (2026-08-09)** : le stack d'implémentation a pivoté de Next.js vers un monorepo Symfony (+ Mercure) / React SPA (voir `apps/`, `AGENTS.md`). La section "Plan technique" ci-dessous (stack, Route Handlers, roadmap d'implémentation — env. lignes en dessous de "Architecture générale") décrit encore l'ancien stack Next.js et n'a pas été mise à jour ; à retraiter avant de s'y fier. Le reste (produit, scope, modèle de données conceptuel) reste valide indépendamment du stack.

## Résumé

Nanko est un outil de modélisation d'architecture C4 (Context/Container/Component), pensé dès le départ comme un produit potentiellement commercialisable même si son usage V1 est interne à Evaneos (2-3 utilisateurs, sans authentification, en self-host de confiance). Il se distingue de Structurizr, IcePanel, Miro ou PlantUML par deux choix structurants en V1 : une navigation drill-down/up fluide et animée entre niveaux C4, et une timeline de milestones historique-et-future avec diff visuel entre deux points dans le temps. Le DSL maison façon Mermaid (import/export versionnable en git) bascule en V2. La V1 (Next.js + TypeScript + Postgres + React Flow) couvre C1/C2/C3, les milestones avec diff, et les annotations simples ; le modèle de données est conçu — arbre d'éléments récursif, mutations adressées par id, historique par attribut plutôt que par snapshot — pour ne pas fermer la porte aux évolutions V2/V3 (DSL, collaboration CRDT temps réel, animations de flux, niveau Code, vue split DSL live, exports visuels).

## Contexte

**Pourquoi ce projet.** Nicolas et son équipe (2 personnes, bientôt 3) ont besoin de documenter et faire évoluer dans le temps l'architecture des systèmes Evaneos selon le modèle C4. Les outils existants (Structurizr, IcePanel, Miro, PlantUML) sont jugés datés dans leur expérience utilisateur, et aucun ne combine nativement une navigation drill-down soignée, une planification par milestones avec diff, et un DSL texte versionnable en git.

**Ambition court terme.** Outil interne, auto-hébergé, sans authentification, pour modéliser et faire évoluer l'architecture des systèmes Evaneos suivis par l'équipe.

**Ambition long terme.** Devenir un outil commercialisable. Cette ambition ne se traduit pas par des fonctionnalités supplémentaires en V1, mais par des contraintes d'architecture explicites à respecter dès maintenant :
- Pas de mutation par remplacement de document entier (pas de `PUT` du schéma complet) : toute mutation est adressée par id d'élément ou de relation, pour ne pas bloquer un futur passage à une édition collaborative temps réel (CRDT/Yjs).
- Modèle de données multi-projets dès la V1.
- Un modèle d'éléments extensible (arbre récursif à un seul type `element`) plutôt que des tables figées par niveau C4, pour absorber plus tard System Landscape et C4 Code sans migration lourde.

**Différenciateurs V1.**
1. Navigation drill-down/up fluide (double-clic pour descendre, breadcrumb pour remonter), avec une exigence explicite de qualité visuelle et d'ergonomie — traitée comme exigence non-fonctionnelle de premier rang, pas comme un détail cosmétique (voir section dédiée).
2. Timeline de milestones incrémentale, passée et future, avec diff visuel entre deux milestones.

**Vision V2/V3** (reportée, mais à garder à l'esprit dans les choix d'architecture V1) : DSL maison façon Mermaid pour import/export et versioning git, vue split DSL texte+canvas en édition live bidirectionnelle (**intention originale explicite de l'utilisateur, à ne pas perdre** — voir Scope), animations de flux, collaboration temps réel CRDT, niveau C4 Code (y compris extraction automatique depuis le code source).

## Scope

### Inclus en V1
- C4 Context (C1), Container (C2), Component (C3), avec drill-down (double-clic) et remontée (breadcrumb).
- Multi-projets (plusieurs architectures indépendantes gérées par l'outil), avec écran de liste de projets.
- Milestones en timeline incrémentale historique + future, avec marqueur "aujourd'hui".
- Diff visuel entre deux milestones, en deux modes togglables : overlay coloré sur un seul canvas, et side-by-side avant/après.
- Relations C2 saisies manuellement ; relations C1 dérivées automatiquement des relations C2, avec possibilité de déclarer une relation C1 à la main (statut `derived` vs `declared`, avertissement visuel si une relation `declared` n'est jamais "réalisée").
- Positions de noeuds sauvegardées, avec possibilité de surcharge par milestone.
- Annotations simples : notes textuelles épinglées sur le canvas, avec auteur en texte libre et horodatage. Une note peut être liée à plusieurs éléments, relations, et/ou autres notes simultanément (liens multiples, pas seulement un ancrage unique) ; les liens sont rendus par des flèches courbées. Pas de threads de discussion.
- Aucune authentification (instance locale/self-host de confiance).

### Hors scope V1 (reporté V2/V3)
- **DSL maison** (import/export, grammaire, parser/serializer) — bascule intégralement en V2. Voir "Vision V2 — DSL" dans le Plan technique pour la grammaire déjà esquissée et le stress-test à mener quand cette fonctionnalité sera reprise.
- Vue split DSL texte + canvas en édition live bidirectionnelle. **Note de préservation d'intention** : c'était l'idée originale de Nicolas (synchro bidirectionnelle temps réel DSL ↔ schéma) ; elle est explicitement reportée mais doit rester documentée comme vision V2/V3 cible.
- Collaboration temps réel type Figma (CRDT/Yjs, multi-curseurs). *Le modèle de données V1 est conçu pour ne pas bloquer cette évolution.*
- Animations de flux : animation continue sur relation marquée "flux actif" ET scénarios nommés avec étapes ordonnées + lecture play/pause/step.
- Niveau C4 Code (C4-4), y compris génération automatique depuis du code source réel. *Le modèle de données prévoit la valeur `code` dans l'énumération `kind` sans l'exposer en UI.*
- Export visuel (PNG/SVG/PDF).

## Exigences produit

### "Beau et ergonomique" comme exigence non-fonctionnelle explicite

Ce n'est pas un vernis appliqué à la fin. Engagements concrets, vérifiables, à tenir dès les premières itérations du canvas :
- Composants de noeuds et d'arêtes React Flow entièrement custom (pas de rendu par défaut de la librairie) : cartes avec typographie soignée, icônes par `kind` (personne/système/container/composant), coins arrondis, ombres légères, code couleur cohérent par type.
- Système de design tokens (Tailwind CSS configuré avec une palette et une échelle typographique dédiées), partagé entre canvas et chrome applicatif.
- Transition animée (via Framer Motion ou équivalent) lors du drill-down/up : zoom/crossfade centré sur l'élément double-cliqué plutôt qu'un rechargement brut de vue.
- Breadcrumb interactif, avec l'historique de navigation (C1 › Système X › Container Y).
- Palette de commandes (Cmd/Ctrl+K) pour rechercher un élément ou un projet, raccourcis clavier de base (suppression, déplacement au clavier des noeuds sélectionnés, échap pour désélectionner).
- États vides et de chargement soignés (illustrations légères, skeletons), pas d'écrans blancs.
- Accessibilité du diff overlay : ne pas reposer uniquement sur rouge/vert (ajout d'icônes +/-/~ et de style de trait, pour rester lisible en cas de daltonisme).
- Mode sombre : recommandé mais non bloquant pour la V1 (à trancher en phase de polish — voir `PRODUCT_STATUS.md` § Décisions en attente).

### Parcours utilisateur et écrans principaux

1. **Liste des projets** — écran d'accueil, création/suppression de projet, accès direct à la vue C1 du projet sélectionné.
2. **Canvas C1 (Contexte)** — systèmes et personnes, relations dérivées et déclarées. Double-clic sur un système → descend en C2. Sélecteur/timeline de milestone visible en permanence, marqueur "aujourd'hui".
3. **Canvas C2 (Containers)** — containers du système sélectionné, relations saisies manuellement. Breadcrumb "C1 › Système X" cliquable. Double-clic sur un container → descend en C3.
4. **Canvas C3 (Components)** — composants du container sélectionné. Breadcrumb complet "C1 › Système X › Container Y".
5. **Mode diff** — sélection de deux milestones (A, B), toggle overlay/side-by-side, légende des couleurs/symboles.
6. **Panneau d'annotations** — liste des annotations visibles sur la vue courante, ajout via clic droit sur un élément/une relation/une zone vide, formulaire minimal (auteur, texte).
7. **Import/Export DSL** — modale ou page dédiée : édition/collage de DSL pour import, bouton de génération/téléchargement du DSL courant (structure + fichier de layout séparé) pour export.
8. **États transverses** : sauvegarde automatique silencieuse à chaque édition (pas de bouton "Enregistrer"), indicateur discret de statut de synchronisation (saved/saving/error), gestion d'erreur réseau non bloquante (retry, file d'attente locale des mutations en cas de perte de connexion transitoire).

## Plan technique

### Architecture générale

- **Framework** : Next.js (App Router) + TypeScript, déployé en self-host V1 (Docker Compose : conteneur Next.js + conteneur Postgres).
- **Base de données** : Postgres (proposition : version 15+, pour bénéficier de `UNIQUE NULLS NOT DISTINCT` — voir contrainte de position ci-dessous ; à défaut, index partiels compatibles avec des versions plus anciennes).
- **Accès aux données** : proposition **Drizzle ORM** plutôt que Prisma. Justification : `resolveGraph()` (voir plus bas) nécessite des requêtes de résolution "dernière version ≤ milestone donné" proches du SQL (fenêtrage, jointures conditionnelles) ; Drizzle expose un query-builder proche du SQL et permet de descendre en SQL brut ponctuellement sans changer d'écosystème. À documenter comme choix réversible.
- **Rendu du canvas** : React Flow, avec noeuds/arêtes custom (voir exigence ergonomique).
- **État client** : TanStack Query pour l'état serveur (fetch, mutations optimistes, cache par projet/milestone), Zustand pour l'état d'UI local (sélection courante, viewport React Flow, milestone actif, mode diff).
- **API** : Route Handlers Next.js (`app/api/...`), **choix exclusif** face aux Server Actions — cohérence avec l'objectif commercial à terme (surface HTTP stable, réutilisable par un futur client externe ou par des clients temps réel), et pour éviter de mélanger deux mécanismes de mutation.
- **Autosave** : chaque mutation (création/édition/suppression d'élément, de relation, de position, d'annotation) déclenche un appel `PATCH`/`POST`/`DELETE` immédiat ou débouncé (position : ~300-500ms de debounce ; champs texte : sur `blur` ou debounce court ; changements structurels : immédiats), avec mise à jour optimiste côté client.

> Note : cette section décrit encore le stack Next.js abandonné — se référer à `AGENTS.md` pour le stack réel (Symfony + Mercure / React SPA).

### Modèle de données

Principe directeur : un **arbre d'éléments récursif** unique, un historique **par attribut et par milestone** (pas de snapshots dupliqués), des **mutations adressées par id**. Deux tables de "version" (`element_version`, `relation_version`) traitent le cas non couvert explicitement par l'énoncé — un élément peut être *modifié* à plusieurs milestones différents, ce qui exclut une simple colonne `modified_at_milestone_id` unique. Elles reprennent exactement le pattern déjà validé pour les positions (une ligne par milestone où l'attribut change, résolution par "dernière version à milestone ≤ M").

```sql
-- Proposition de schéma SQL (Postgres 15+)

CREATE TABLE project (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE milestone (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  label        text NOT NULL,           -- ex: "2026-Q1", libre
  occurs_on    date,                    -- optionnel, sert au marqueur "aujourd'hui" et à un tri par défaut
  sort_order   integer NOT NULL,        -- ordre explicite et faisant autorité sur la timeline (indépendant de occurs_on)
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, sort_order)
);

-- Enumération volontairement plus large que le besoin V1 immédiat :
-- 'system_landscape' et 'code' réservés pour V2/V3, 'person' ajouté (voir note ci-dessous).
CREATE TYPE element_kind AS ENUM (
  'system_landscape', 'person', 'system', 'container', 'component', 'code'
);

CREATE TABLE element (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  parent_id             uuid REFERENCES element(id) ON DELETE CASCADE,
  kind                  element_kind NOT NULL,
  is_external           boolean NOT NULL DEFAULT false,  -- système/personne hors périmètre (convention C4 standard)
  seq                   bigserial,                        -- clé de tri STABLE pour sérialisation DSL (pas l'id, un UUID trie de façon non déterministe/non lisible)
  created_at_milestone_id  uuid NOT NULL REFERENCES milestone(id),
  deleted_at_milestone_id  uuid REFERENCES milestone(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Attributs versionnés par milestone (nom, description, technologie...)
CREATE TABLE element_version (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id   uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestone(id),
  name         text NOT NULL,
  description  text,
  technology   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (element_id, milestone_id)   -- une seule version par élément et par milestone (upsert si édité 2x au même milestone)
);

CREATE TYPE relation_status AS ENUM ('derived', 'declared');

CREATE TABLE relation (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id             uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  source_element_id      uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
  target_element_id      uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
  status                 relation_status NOT NULL DEFAULT 'declared',
  -- pertinent seulement pour les relations C1 'declared' :
  -- renseigné quand une relation C2 correspondante (même paire de systèmes parents) existe
  realized_at_milestone_id uuid REFERENCES milestone(id),
  seq                    bigserial,
  created_at_milestone_id  uuid NOT NULL REFERENCES milestone(id),
  deleted_at_milestone_id  uuid REFERENCES milestone(id),
  created_at             timestamptz NOT NULL DEFAULT now()
);
-- Note : les relations C1 purement 'derived' (calculées à partir de C2) ne sont PAS persistées ici,
-- elles sont recalculées à la volée par resolveGraph() (voir plus bas). Seules les relations
-- saisies manuellement (C2, ou C1 'declared') sont des lignes réelles.

CREATE TABLE relation_version (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relation_id  uuid NOT NULL REFERENCES relation(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES milestone(id),
  label        text,
  technology   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (relation_id, milestone_id)
);

-- Positions : une position par défaut (milestone_id NULL) surchargeable par milestone.
-- ATTENTION Postgres : NULL n'est pas égal à NULL dans un index unique classique,
-- donc UNIQUE(element_id, milestone_id) ne bloquerait PAS deux lignes "par défaut".
-- Deux options équivalentes ci-dessous ; retenir l'une des deux selon la version de Postgres cible.
CREATE TABLE position (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_id   uuid NOT NULL REFERENCES element(id) ON DELETE CASCADE,
  milestone_id uuid REFERENCES milestone(id),   -- NULL = position par défaut/héritée
  x            double precision NOT NULL,
  y            double precision NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);
-- Option A (Postgres 15+) :
-- ALTER TABLE position ADD CONSTRAINT position_unique UNIQUE NULLS NOT DISTINCT (element_id, milestone_id);
-- Option B (portable, toutes versions) :
CREATE UNIQUE INDEX position_default_uidx ON position (element_id) WHERE milestone_id IS NULL;
CREATE UNIQUE INDEX position_milestone_uidx ON position (element_id, milestone_id) WHERE milestone_id IS NOT NULL;

CREATE TYPE annotation_anchor AS ENUM ('element', 'relation', 'canvas_zone');

CREATE TABLE annotation (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES project(id) ON DELETE CASCADE,
  anchor_type       annotation_anchor NOT NULL,
  element_id        uuid REFERENCES element(id) ON DELETE CASCADE,   -- si anchor_type = 'element'
  relation_id       uuid REFERENCES relation(id) ON DELETE CASCADE,  -- si anchor_type = 'relation'
  scope_element_id  uuid REFERENCES element(id),  -- diagramme (système/container) sur lequel la note est épinglée ; NULL = racine C1. Utilisé pour 'canvas_zone' et pour désambiguïser l'affichage
  x                 double precision,  -- si anchor_type = 'canvas_zone'
  y                 double precision,
  author_name       text NOT NULL,     -- texte libre, pas de compte
  body              text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (anchor_type = 'element'  AND element_id  IS NOT NULL AND relation_id IS NULL) OR
    (anchor_type = 'relation' AND relation_id IS NOT NULL AND element_id  IS NULL) OR
    (anchor_type = 'canvas_zone' AND x IS NOT NULL AND y IS NOT NULL)
  )
);
```

> **Note (2026-08-14)** : ce schéma conceptuel (`annotation_anchor` enum, ancrage unique par note) a divergé du modèle réellement implémenté dès la première migration (`element_id`/`relation_id` nullables + `CHECK` d'exclusion mutuelle, sans enum ni cas `canvas_zone` — une note a toujours `x`/`y`), puis à nouveau avec le passage aux liens multiples : une note peut désormais pointer vers plusieurs éléments, relations, et/ou autres notes. Le modèle réel est une table de jointure `annotation_link(annotation_id, element_id?, relation_id?, target_annotation_id?, source_handle?, target_handle?)` avec une contrainte d'exclusion à trois voies par ligne (exactement une des trois cibles) plutôt qu'un ancrage unique porté par `annotation` elle-même — voir `apps/api/migrations/Version20260814180000.php`.

**Notes de choix documentées (propositions, pas des décisions déjà validées) :**
- Ajout de `person` et `is_external` dans `kind` : le C4 Context standard inclut des acteurs humains et des systèmes externes ; l'énoncé ne les mentionne pas explicitement mais la logique "ne pas fermer la porte" appliquée à `code`/`system_landscape` s'applique symétriquement ici, à un coût quasi nul aujourd'hui. **À confirmer avec Nicolas** — voir `PRODUCT_STATUS.md` § Décisions en attente.
- Colonne `seq` (bigserial) sur `element` et `relation` : n'a pas d'usage direct en V1 (aucun tri UI n'en dépend) ; elle est posée dès maintenant en prévision de la sérialisation DSL déterministe en V2 (trier par `id` UUID serait non lisible et non stable dans le temps perçu, trier par `created_at` est fragile en cas d'import en masse au même instant). Coût nul à ajouter maintenant, migration en moins plus tard.
- `realized_at_milestone_id` sur `relation` : matérialise qu'une relation C1 `declared` a été "réalisée" par une relation C2 correspondante à un milestone donné, sans supprimer la ligne `declared` (traçabilité + réapparition de l'avertissement si la relation C2 est supprimée ensuite).

### Logique de résolution du graphe — `resolveGraph()`

Fonction serveur unique, point de passage obligé pour le canvas, le diff et l'ancrage des annotations en V1 (et pour l'export DSL le jour où il sera repris en V2), afin d'éviter plusieurs implémentations parallèles de la résolution temporelle :

```
resolveGraph(projectId, milestoneId) → {
  elements: ResolvedElement[],   // visibles à ce milestone, attributs résolus
  relations: ResolvedRelation[], // C2 manuelles + C1 déclarées + C1 dérivées calculées
  positions: Map<elementId, {x, y}>,  // résolution position par milestone sinon position par défaut
  warnings: Warning[]            // ex: relations 'declared' jamais 'realized'
}
```

Règles de résolution :
- **Visibilité d'un élément** à milestone M : `created_at_milestone.sort_order <= M.sort_order` ET (`deleted_at_milestone` est NULL OU `deleted_at_milestone.sort_order > M.sort_order`). Convention retenue : la suppression enregistrée à un milestone rend l'élément absent *à partir de* ce milestone (le diff entre le milestone précédent et celui-ci montre donc la suppression).
- **Attributs résolus** : pour chaque élément visible, prendre la ligne de `element_version` dont le `milestone.sort_order` est le plus grand parmi ceux `<= M.sort_order` (idem pour `relation_version`).
- **Position résolue** : ligne de `position` à `milestone_id = M` si elle existe, sinon la ligne `milestone_id IS NULL` (par défaut).
- **Projection C1 dérivée** (uniquement quand `resolveGraph` est appelé pour un niveau C1) : pour chaque relation C2 visible à M, si les deux containers ont des systèmes parents différents, produire une relation dérivée `système_source → système_cible` (dédupliquée si plusieurs containers produisent la même paire). **Règle des boucles internes** : si les deux containers appartiennent au même système parent, la relation n'est **pas** projetée (elle est interne au système, invisible en C1).
- **Fusion `declared`/`derived`** : une relation `declared` au niveau C1 est comparée aux relations dérivées sur la clé `(source_system_id, target_system_id)` uniquement (le label et la techno ne participent pas au matching, une relation dérivée pouvant agréger plusieurs relations C2 hétérogènes). En cas de correspondance, la relation dérivée "absorbe" l'affichage (un seul trait visible, pas de doublon), et `relation.realized_at_milestone_id` est renseigné sur la ligne déclarée. Sans correspondance, la relation déclarée s'affiche seule, avec un avertissement visuel ("relation déclarée non réalisée").
- **Re-ciblage d'une relation** : pas d'opération dédiée en base — c'est une clôture (`deleted_at_milestone_id = milestone actif`) de l'ancienne relation + création d'une nouvelle ligne (`created_at_milestone_id = milestone actif`) avec le nouveau `source_element_id`/`target_element_id`. Exposé côté API comme une action atomique unique (`POST /api/relations/:id/retarget`) pour garantir la transaction et la lisibilité de l'intention, mais le résultat en base reste deux lignes distinctes — ce qui fait que le diff les traite naturellement comme suppression + création, conformément à la règle validée.

### Règle d'édition sur la timeline

Toute mutation créée via l'UI porte le `milestone_id` **actuellement affiché/actif**, y compris dans le passé. Concrètement : chaque endpoint de mutation reçoit un `activeMilestoneId` (dérivé de l'état de navigation côté client, envoyé explicitement dans le corps de la requête plutôt que déduit côté serveur) et l'utilise comme `created_at_milestone_id` / `deleted_at_milestone_id` / clé de `element_version`/`relation_version` selon l'opération. Pas de verrouillage de milestone en V1.

### Moteur de diff

```
diff(projectId, fromMilestoneId, toMilestoneId) →
  const A = resolveGraph(projectId, fromMilestoneId)
  const B = resolveGraph(projectId, toMilestoneId)
  // comparaison sur le sous-ensemble de champs "diffable" uniquement
```

- **Éléments** : présent dans B seulement → `added` ; présent dans A seulement → `removed` ; présent dans les deux avec `name`/`description`/`technology` différents → `modified` (diff champ par champ pour l'affichage du détail).
- **Relations** : même logique par id de relation ; le re-ciblage apparaît nativement comme un `removed` + un `added` distincts (jamais comme `modified`), car retarget mint toujours un nouvel id de relation.
- **Champs explicitement ignorés du diff** : `position.x/y`, toute dimension/couleur/état replié-déplié — `diff()` ne lit jamais la carte `positions` de `resolveGraph()`.
- **Rendu** : un composant de diff unique alimente les deux modes d'affichage (overlay coloré sur un seul canvas React Flow avec classes CSS conditionnelles par statut ; side-by-side = deux instances de canvas en lecture seule, positions figées à celles du milestone respectif, sans code couleur).

### Structure des routes API V1 (Route Handlers, Next.js App Router)

```
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id/graph?milestoneId=...
GET    /api/projects/:id/diff?from=...&to=...
GET    /api/projects/:id/milestones
POST   /api/projects/:id/milestones
POST   /api/projects/:id/elements
PATCH  /api/elements/:id
DELETE /api/elements/:id            -- soft: pose deleted_at_milestone_id au milestone actif
POST   /api/projects/:id/relations
PATCH  /api/relations/:id
POST   /api/relations/:id/retarget  -- action explicite : clôt + recrée en transaction
DELETE /api/relations/:id
POST   /api/elements/:id/positions  -- upsert position (défaut ou par milestone)
POST   /api/projects/:id/annotations
PATCH  /api/annotations/:id
DELETE /api/annotations/:id
```

Toutes les mutations structurelles reçoivent l'`activeMilestoneId` explicitement dans le corps de la requête — jamais de `PUT` remplaçant un document entier. `/api/projects/:id/export` et `/api/projects/:id/import` (DSL) sont différés en V2, voir ci-dessous.

### Vision V2 — DSL — grammaire et sérialisation

> Cette section est **hors périmètre V1**. Elle est conservée telle quelle car elle documente une esquisse de conception déjà discutée, à reprendre et valider (stress-test grammaire) quand le DSL sera repris en V2. Aucune tâche V1 n'en dépend, et aucune route V1 n'expose l'import/export.

**Esquisse de grammaire** (à valider par le stress-test le jour où le DSL est repris) :

```
C4Context
  person Client "Client final"
  sys Booking "Gère les réservations"
  sys Payment "Gère les paiements" [external]

C4Container Booking
  container API [Node.js]
  container DB [Postgres]
  API --> DB : "lit/écrit"

C4Component Booking.API
  component Router [Express]
  component PaymentService [TypeScript]
  Router --> PaymentService

milestone 2026-Q1 "Lancement":
  + sys Booking
  + container Booking.API [Node.js]
  + container Booking.DB [Postgres]
  + rel Booking.API --> Booking.DB : "lit/écrit"
  note on Booking.API "Vérifier la charge" by "Nicolas"

milestone 2026-Q2 "Ajout paiement":
  + component Booking.API.PaymentService [TypeScript]
  ~ container Booking.API "API principale" [Node.js 20]
  - rel Booking.API --> Booking.DB
  + rel Booking.API.PaymentService --> Booking.DB : "écrit paiements"

layout:
  Booking.API (100, 200)
  Booking.API @2026-Q2 (100, 340)
```

Opérateurs proposés dans les blocs `milestone` : `+` (création), `-` (suppression, référence par chemin, pas de re-déclaration complète), `~` (modification d'attribut, chemin + nouveaux attributs). Un re-ciblage s'exprime comme un `-` puis un `+` dans le même bloc milestone — pas de syntaxe dédiée, cohérent avec la modélisation en base.

**Références croisées entre niveaux** : chemin pointé qualifié depuis la racine du système (`Booking.API.PaymentService`), résolu contre l'arbre `element` par nom à chaque niveau (nécessite l'unicité des noms d'enfants directs d'un même parent — à faire respecter à la création, contrainte à ajouter si le stress-test confirme la viabilité de cette syntaxe).

**Sérialisation canonique déterministe** :
- Tri des éléments et relations par `seq` (ordre de création), pas par id ni par ordre d'itération de map/objet.
- Formatage stable : indentation fixe, une déclaration par ligne, guillemets systématiques sur les chaînes libres, pas de champs optionnels omis de façon incohérente (toujours émettre `[]` vide plutôt que rien si la techno est absente, ou omettre systématiquement — choix unique à fixer et tester).
- **Séparation structure/layout** : le bloc `layout:` (ou un fichier sidecar `*.layout.dsl` séparé — à trancher pendant le stress-test selon la lisibilité) ne contient que des coordonnées, réparties par chemin d'élément et milestone optionnel, pour qu'un déplacement de noeud ne modifie jamais le fichier structurel suivi en diff git.

**Tâche de stress-test de la grammaire (à faire quand le DSL est repris, avant d'écrire le parser)** — exercice papier sans dépendance code, consistant à rédiger un exemple DSL complet couvrant :
- (a) 2 systèmes, 4 containers, 3 composants sur 3 niveaux de nesting ;
- (b) références croisées type `API.PaymentService` ;
- (c) cycle de vie de relation sur plusieurs milestones avec au moins un ajout et un re-ciblage (source ou cible modifiée) ;
- (d) au moins une annotation ;
- (e) le bloc positions/layout séparé de la structure.

Si l'exemple obtenu est illisible, ambigu, ou nécessite des règles de désambiguïsation non triviales (ex: collision de noms, chemins profonds peu lisibles), **revenir vers Nicolas avec l'exemple concret plutôt que trancher seul** — ne pas figer le parser sur une grammaire non validée.

## TODOs (roadmap détaillée par phase)

> Statut d'ensemble et prochaine priorité : voir `PRODUCT_STATUS.md` § Objectifs actuels / Next steps. Cette liste reste le détail canonique des 20 items par phase.

**Phase 0 — Setup**
1. ✅ Initialiser le repo (stack réel : Symfony + Mercure / React SPA, pas Next.js — voir note en tête de fichier), configuration Postgres local (Docker Compose), CI minimale (lint, typecheck, tests).

**Phase 1 — Modèle de données**
2. ✅ Écrire le schéma et les migrations (`element`, `element_version`, `relation`, `relation_version`, `milestone`, `position`, `annotation`/`annotation_link`, `project`), avec les contraintes d'unicité (index partiels position).
3. ✅ Implémenter `resolveGraph(projectId, milestoneId)` avec tests unitaires couvrant : visibilité (création/suppression), résolution d'attributs multi-milestones, projection C1 dérivée, dédoublonnage de boucle interne, fusion declared/derived.
4. ✅ Implémenter `diff(projectId, from, to)` au-dessus de `resolveGraph`, avec tests sur les cas validés (ajout, suppression, modification, re-ciblage traité comme suppression+ajout, position ignorée).

**Phase 2 — API**
5. ✅ Implémenter les endpoints CRUD pour projets, éléments, relations (dont `retarget`), positions, milestones.
6. ✅ Implémenter les endpoints `graph` et `diff`.

**Phase 3 — Canvas et navigation**
7. ✅ Composants React Flow custom (noeuds par `kind`, arêtes stylées, styles `derived`/`declared`/`realized`/avertissement).
8. ✅ Vue C1 statique branchée sur `GET /graph`, sélecteur de milestone avec marqueur "aujourd'hui".
9. ✅ Drill-down (double-clic) / breadcrumb (remontée) — transition animée (Framer Motion) : à vérifier, voir `PRODUCT_STATUS.md`.
10. ✅ Édition inline (créer/renommer/supprimer élément et relation) avec autosave optimiste, positions draggables persistées.

**Phase 4 — Milestones et diff**
11. ✅ UI de gestion des milestones (créer, réordonner, positionner dans le passé/futur).
12. ✅ Application de la règle "édition = milestone actif" dans toute l'UI d'édition.
13. ✅ UI de diff : sélecteur de paire de milestones, toggle overlay/side-by-side, légende.

**Phase 5 — Annotations**
14. ✅ Ajout/édition/suppression d'annotation sur le canvas (post-it libre, liens multiples vers éléments/relations/autres notes).

**Phase 6 — Multi-projets et polish** *(phase active — voir `PRODUCT_STATUS.md`)*
15. Écran liste de projets (fait), garde-fous de suppression (à vérifier).
16. Passe de polish visuel (design tokens, transitions, accessibilité du diff, empty states, palette de commandes).
17. Documentation de déploiement self-host (Docker Compose, variables d'environnement, sauvegarde Postgres).

**V2 (hors séquence V1, pour mémoire)**
18. Stress-test de la grammaire DSL (exercice papier), puis parser/serializer avec tests de round-trip, puis UI d'import/export et endpoints `export`/`import`.
19. Vue split DSL texte + canvas en édition live bidirectionnelle.
20. Collaboration temps réel (CRDT/Yjs), animations de flux, niveau C4 Code.

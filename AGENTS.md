<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Architecture Nanko

Décidé et discuté le 2026-08-09. PLAN.md reste la source de vérité produit/modèle de données/API ; cette section fixe comment le code s'organise pour l'implémenter. Ne pas relitiger sans raison nouvelle et concrète (voir déclencheurs ci-dessous).

## Arborescence

```
src/
  app/
    api/...                  # Route Handlers — parse (zod) → appel server/ → sérialise, rien d'autre
    (canvas)/projects/...    # écrans
  domain/                    # PUR — zéro import @/db, @/server, jamais "server-only"
    graph/
      types.ts                # ResolvedElement, ResolvedRelation, ResolvedGraph, RawGraphData, Warning
      resolve.ts               # resolveGraphPure(raw, milestoneId) -> ResolvedGraph
      resolve.test.ts          # les 5 cas Phase 1 (visibilité, multi-milestone, projection C1,
                                # dédup boucle interne, fusion declared/derived) — in-memory, rapides
      diff.ts                  # diff(graphA, graphB) -> DiffResult, pur aussi
    schema/                   # zod : forme métier des payloads, partagée route handler <-> hook client
      element.ts, relation.ts, milestone.ts, annotation.ts, position.ts
  server/                    # SQL + orchestration — peut importer @/domain et @/db, "server-only"
    graph/
      load.ts                  # loadProjectGraphData(db, projectId) -> RawGraphData (tout le graphe,
                                # scopé projet ; aucun filtre sort_order ici, c'est domain/ qui filtre)
      resolve-graph.ts          # resolveGraph(db, projectId, milestoneId) = load + domain/resolve
      diff.ts                   # diff(db, projectId, from, to) = 2x resolveGraph + domain/diff
    projects/commands.ts, elements/commands.ts, relations/commands.ts,
    milestones/commands.ts, positions/commands.ts, annotations/commands.ts
    http/
      errors.ts                 # erreurs typées domaine -> mapping HTTP centralisé
  db/                        # existant, inchangé : schema.ts, client.ts, migrate.ts, test/
  components/
    ui/                       # primitives génériques (bouton, dialog, command palette, skeleton,
                                # empty-state) — zéro connaissance de kind/ResolvedElement/statut relation
    canvas/                   # nodes/edges React Flow par kind, breadcrumb, timeline, diff overlay/side-by-side
    annotations/              # panneau + formulaire d'annotation
  hooks/                     # TanStack Query, un fichier par ressource API, via lib/api-client.ts
  stores/                    # Zustand — état UI local uniquement (milestone actif, sélection, viewport, mode diff)
  lib/
    logger.ts                 # existant
    api-client.ts              # wrapper fetch typé, seul endroit où une URL d'API est écrite en dur
  styles/theme.css           # tokens Tailwind v4 (@theme, CSS-first — pas de tailwind.config.js)
```

## Règle de dépendance (pas de hexagonal)

Discuté et écarté explicitement : pas de ports/adapters formels, pas d'injection de dépendances. Un seul backend (Postgres/Drizzle), un seul vrai consommateur par abstraction candidate — le coût (interface `TransactionalRepos` qui grossit à chaque commande transactionnelle, couche `application/` en plus) n'achète rien que le split pur/loader ci-dessous n'a pas déjà.

À la place, la direction de dépendance `domain/` → jamais `server/`/`db/` est garantie par deux conventions mécaniques, pas par des interfaces :

1. Tout fichier dans `server/**` et `db/**` commence par `import "server-only"`.
2. Règle ESLint `no-restricted-imports` sur `src/domain/**` (voir `eslint.config.mjs`) : interdit d'importer `@/db/*`, `@/server/*`, ou `server-only`.

**Déclencheur pour revisiter** : un second besoin de lecture réellement non-SQL (ex. état Yjs en mémoire pour la collaboration CRDT V2), ou un second backend de stockage effectif — pas hypothétique. Le DSL V2 ne compte pas : son importeur consommerait la même forme `RawGraphData` déjà utilisée par `resolveGraphPure`.

## Design system

Tailwind v4 CSS-first (déjà en place dans `globals.css` via `@theme` — pas de config JS). Règle de tri entre `components/ui/` et `components/canvas/` : un composant qui a besoin de connaître `kind`, `ResolvedElement`, ou un statut de relation (`derived`/`declared`/`realized`) va dans `canvas/` ; sinon `ui/`. Test simple : `ui/Button.tsx` doit pouvoir être copié tel quel dans un autre projet Next sans rien savoir de C4.

## Seam front/back

- **Route Handler** : parse (zod) → appel `server/` → sérialise. Jamais de requête Drizzle directe dans `route.ts`. `ctx.params` est une `Promise` en Next 16 (`await ctx.params`), typée automatiquement par `next typegen` (déjà dans le script `typecheck`). GET non caché par défaut (`route-handlers.md`) — aucune directive de cache nécessaire pour les endpoints branchés sur `resolveGraph`.
- **Hook TanStack Query** : passe par `lib/api-client.ts` (fonctions fines typées avec les mêmes schémas zod que les Route Handlers importent de `domain/*/schema.ts`), jamais de `fetch` brut dispersé dans les hooks — centralise gestion d'erreur HTTP et URLs.
- **snake_case ↔ camelCase** : le mapping est fait colonne par colonne dans `db/schema.ts` (`text("project_id")` → `projectId`). Rien au-dessus (loader, résolveur, routes, client) n'a de traduction de casse à faire.
- **Types partagés** : `domain/graph/types.ts` et `domain/*/schema.ts` (via `z.infer<>`) sont la source de vérité unique front/back. Ils n'importent jamais `@/db/schema` — sinon un composant client tirerait Drizzle dans le bundle (c'était le risque dans l'ancien `resolve-elements.ts`, revert `7cc89cb`).

## Comment implémenter une feature — recette

Exemple de référence : schéma `element`/`milestone` + `resolveGraph` + `GET /api/projects/:id/graph` (PLAN.md Phase 1-2).

1. **Schéma Drizzle** (`db/schema.ts`) — étendre les tables, `pnpm db:generate`, committer `schema.ts` + `drizzle/*.sql` + `drizzle/meta/*` ensemble (le check CI `git diff --exit-code drizzle/` bloque sinon).
2. **Fixtures + setup de test** (`db/test/fixtures.ts`, `db/test/setup.ts`) — factories + `TRUNCATE` par table, avant tout test contre une vraie DB.
3. **Loader SQL** (`server/<domaine>/load.ts`) — requêtes Drizzle scopées par `projectId`, charge les données brutes sans filtrer par milestone (le filtrage temporel est en TS, étape suivante). `import "server-only"`.
4. **Résolveur/logique pure** (`domain/<domaine>/resolve.ts` ou équivalent) — zéro import DB, prend les données brutes en paramètre. C'est ici que vivent les règles métier et leurs tests unitaires rapides (in-memory, pas de DB).
5. **Composition** (`server/<domaine>/resolve-graph.ts` ou équivalent) — appelle le loader puis passe le résultat au résolveur pur. C'est LE point de passage obligé pour tout consommateur (canvas, diff, annotations) — jamais d'appel direct au loader ou au résolveur depuis ailleurs.
6. **Tests** — cas métier en mémoire sur le résolveur pur (rapides) ; couverture plus fine sur le loader seul contre une vraie DB de test (juste le bon scoping/les bonnes lignes, pas la logique temporelle).
7. **Route Handler** (`app/api/.../route.ts`) — parse → appelle la fonction de composition de l'étape 5 → sérialise, mappe les erreurs domaine typées en codes HTTP via `server/http/errors.ts`.
8. **Client** (si UI) — fonction dans `lib/api-client.ts`, hook TanStack Query dans `hooks/`, composant dans `components/canvas/` ou `components/ui/` selon la règle de tri ci-dessus.

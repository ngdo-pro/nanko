# TODO

Prochaines étapes concrètes. Le détail produit/modèle de données reste dans `PLAN.md` ; ce fichier suit juste l'avancement à court terme.

## En cours / prochain

- [x] **`GraphController`** — `GET /api/projects/{projectId}/graph` (params `milestone_id`, `scope_element_id` optionnel). Câble `ElementRepositoryInterface`, `RelationRepositoryInterface`, `PositionRepositoryInterface`, `MilestoneRepositoryInterface` vers `GraphResolver::resolve()` et sérialise le `ResolvedGraph`. Tests fonctionnels dans `apps/api/tests/Functional/GraphControllerTest.php`.
- [ ] **Endpoint de mise à jour de position** — expose `PositionRepositoryInterface::upsert()` en HTTP (ex. `PATCH /api/elements/{id}/position`). Le repo existe déjà (Doctrine + fake + tests), pas de route.
- [ ] Tests fonctionnels pour l'endpoint ci-dessus (`apps/api/tests/Functional/`).

## Frontend — premier canvas

- [ ] Canvas C1 (React Flow) qui consomme `GET /graph` — premier écran produit réel après la liste de projets.
- [ ] Noeuds/arêtes custom minimal (pas de rendu par défaut React Flow), cf. exigence ergonomique de `PLAN.md`.
- [ ] Autosave position (debounce ~300-500ms) vers l'endpoint PATCH ci-dessus.
- [ ] Sélecteur de milestone (au moins un select simple, la timeline soignée viendra plus tard).

## Backlog (scope V1, cf. `PLAN.md`)

- [ ] Drill-down/up C1 → C2 → C3 (double-clic, breadcrumb).
- [ ] Timeline de milestones (passé/futur, marqueur "aujourd'hui").
- [ ] Mode diff entre deux milestones (overlay + side-by-side).
- [ ] Annotations (notes pinnées sur élément/relation/zone).
- [ ] Import/Export DSL — hors scope V1, reporté V2.

## Notes

- La section "Plan technique" de `PLAN.md` décrit encore le stack Next.js abandonné — ne pas s'y fier pour l'implémentation, se référer à `AGENTS.md` (Symfony + Mercure / React SPA).

# TODO

Prochaines étapes concrètes. Le détail produit/modèle de données reste dans `PLAN.md` ; ce fichier suit juste l'avancement à court terme.

## En cours / prochain

- [x] **`GraphController`** — `GET /api/projects/{projectId}/graph` (params `milestone_id`, `scope_element_id` optionnel). Câble `ElementRepositoryInterface`, `RelationRepositoryInterface`, `PositionRepositoryInterface`, `MilestoneRepositoryInterface` vers `GraphResolver::resolve()` et sérialise le `ResolvedGraph`. Tests fonctionnels dans `apps/api/tests/Functional/GraphControllerTest.php`.
- [x] **Endpoint de mise à jour de position** — `PositionController::upsert()`, route `PATCH /api/elements/{elementId}/position` (`api_elements_position_upsert`). Câble `PositionRepositoryInterface::upsert()` via un `PositionPayload` (`milestone_id` optionnel, `x`/`y` requis). Tests fonctionnels dans `apps/api/tests/Functional/PositionControllerTest.php`.
- [x] Tests fonctionnels pour l'endpoint ci-dessus (`apps/api/tests/Functional/PositionControllerTest.php`).

## Frontend — canvas (suite)

Ordre aligné sur `PLAN.md` (Plan technique, phases 3 à 5) : navigation avant édition, milestones avant diff, annotations en dernier.

- [x] Canvas C1 (React Flow) qui consomme `GET /graph` — premier écran produit réel après la liste de projets. Routing `react-router-dom` (`/` liste, `/projects/:projectId` canvas), sélection du dernier milestone (`sort_order` max), fallback grille pour les positions manquantes. Rendu React Flow par défaut (noeuds/arêtes custom = todo suivant).
- [ ] Noeuds/arêtes custom minimal (pas de rendu par défaut React Flow), cf. exigence ergonomique de `PLAN.md`.
- [ ] Drill-down/up C1 → C2 → C3 (double-clic, breadcrumb).
- [ ] Édition inline (créer/renommer/supprimer élément et relation) + positions draggables persistées (autosave, debounce ~300-500ms, vers `PATCH /api/elements/{elementId}/position` ci-dessus) — cf. `PLAN.md` phase 3, étape 10 ; suppression = soft delete (`deleted_at_milestone_id`), pas de `DELETE` physique.
- [ ] Sélecteur de milestone (actuellement le dernier milestone est choisi automatiquement côté client ; au moins un select simple, la timeline soignée viendra plus tard).

## Backlog (scope V1, cf. `PLAN.md`)

- [ ] Timeline de milestones (créer/réordonner un milestone, passé/futur, marqueur "aujourd'hui").
- [ ] Mode diff entre deux milestones (overlay + side-by-side).
- [ ] Annotations (notes pinnées sur élément/relation/zone).
- [ ] Import/Export DSL — hors scope V1, reporté V2.

## Notes

- La section "Plan technique" de `PLAN.md` décrit encore le stack Next.js abandonné — ne pas s'y fier pour l'implémentation, se référer à `AGENTS.md` (Symfony + Mercure / React SPA).

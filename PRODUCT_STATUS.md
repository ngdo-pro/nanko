# Product Status — Nanko

> Point d'entrée produit — lecture rapide. Pour le modèle de données/logique métier/API, voir `TECHNICAL_REFERENCE.md`. Pour le journal détaillé d'implémentation (pièges, bugs), voir `ENGINEERING_LOG.md`.

## Objectifs actuels

- **Phase 6 — Multi-projets et polish** (TECHNICAL_REFERENCE.md § TODOs #15-17). L'écran liste de projets existe déjà (`apps/web/src/screens/ProjectListScreen.tsx`) ; reste à vérifier/faire : garde-fous de confirmation avant suppression de projet, passe de polish visuel, doc de déploiement self-host.

## Décisions en attente

*(migré depuis PLAN.md § Questions ouvertes, 2026-08-16 ; complété le même jour avec les tensions de fond identifiées lors de la comparaison UX Miro/Klaxoon)*

1. **Ajout de `person`/`is_external`** dans le modèle d'éléments — proposé pour rester fidèle au C4 standard, jamais explicitement demandé. À confirmer avant exposition UI.
2. **Concurrence d'édition sans CRDT** — 2-3 personnes peuvent éditer le même projet sans lock ; risque de "dernier écrivain gagne" silencieux. Piste : `updated_at`/version de contrôle optimiste (409 en cas de conflit) — à valider, non bloquant à cette échelle d'équipe si jugé superflu.
3. **Mode sombre** — cohérent avec l'exigence "beau et ergonomique", non demandé explicitement. À prioriser ou repousser.
4. **Hébergement self-host exact** — Docker Compose local supposé par défaut, aucune précision sur l'infra cible. Sans impact sur le modèle de données, à clarifier avant Phase 6 tâche 17.
5. **Glisser-reconnecter une relation existante** — techniquement trivial (`onReconnect` xyflow), mais masque la sémantique de retarget (clôture + recréation tracée à un milestone) derrière un geste qui a l'air anodin. Piste : rendre le retarget visuellement explicite au moment du drop plutôt que l'éviter.
6. **Formes/texte libres sur le canvas** (au-delà des éléments C4 typés) — donnerait la sensation "Miro" la plus forte, mais va frontalement contre la proposition de valeur (rigueur du modèle C4). Nanko doit-il absorber du brainstorming libre, ou rester strictement un outil de documentation structurée ?
7. **Collaboration temps réel (CRDT, multi-curseurs)** — la friction la plus citée par un utilisateur Miro/Klaxoon, mais changement d'architecture de fond (résolution de conflits), pas un ticket UI. Projet à part à scoper séparément si priorisé.

## Propositions d'évolution

*(idées non triées — une proposition graduate vers Next steps si acceptée, vers Décisions en attente si elle a besoin d'un arbitrage avant d'être actionnable, ou disparaît si rejetée ; source : comparaison UX Miro/Klaxoon, 2026-08-16)*

- Édition inline du nom sur la carte d'un élément (parité avec les annotations, qui l'ont déjà).
- Placement au clic pour créer un nouvel élément, à l'endroit du curseur.
- Ancrages de connexion quasi continus sur le pourtour de la carte (au-delà des 5 points fixes actuels).
- Points de passage manuels sur une relation (router autour d'un chevauchement).
- Palette de commandes (Cmd/K) — déjà listée dans les exigences produit (`TECHNICAL_REFERENCE.md`), jamais implémentée.
- Raccourcis clavier (suppression, déplacement au clavier, échap pour désélectionner) — idem.

## Next steps

- **Phase 6 — Multi-projets et polish** (TECHNICAL_REFERENCE.md § TODOs #15-17) : garde-fous de suppression, polish visuel (design tokens, transitions drill-down, accessibilité du diff, empty states, palette de commandes Cmd/K), doc de déploiement self-host.
- **Import/Export DSL** — explicitement hors scope V1, reporté V2 (TECHNICAL_REFERENCE.md § Vision V2, TODOs #18-20).

## Journal de décisions

*(vide pour l'instant — première entrée au prochain arbitrage acté)*

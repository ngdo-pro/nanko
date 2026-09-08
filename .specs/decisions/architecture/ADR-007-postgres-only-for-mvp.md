# Postgres seul pour le MVP — pas de Redis, pas de moteur de recherche dédié

Le v1 s'appuie uniquement sur Postgres, y compris pour la recherche (full-text intégré). Redis (cache) et un moteur de recherche dédié, envisagés dans le brain-dump initial, sont volontairement écartés tant qu'aucun besoin de performance concret n'a été mesuré — les ajouter maintenant serait de l'optimisation prématurée sans volumétrie ni patterns d'accès réels pour la justifier.

Amendement (2026-08) : SigNoz auto-hébergé (traces/logs/métriques, adossé à ClickHouse) est ajouté sur l'infra partagée comme exception délibérée et documentée. Il ne s'agit pas d'un datastore applicatif dans le chemin de requête métier mais d'un outil d'observabilité opérationnel, hors périmètre du principe "Postgres seul" ci-dessus — ce dernier reste inchangé pour les données de l'application elle-même.

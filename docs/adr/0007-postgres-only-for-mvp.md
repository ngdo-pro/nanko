# Postgres seul pour le MVP — pas de Redis, pas de moteur de recherche dédié

Le v1 s'appuie uniquement sur Postgres, y compris pour la recherche (full-text intégré). Redis (cache) et un moteur de recherche dédié, envisagés dans le brain-dump initial, sont volontairement écartés tant qu'aucun besoin de performance concret n'a été mesuré — les ajouter maintenant serait de l'optimisation prématurée sans volumétrie ni patterns d'accès réels pour la justifier.

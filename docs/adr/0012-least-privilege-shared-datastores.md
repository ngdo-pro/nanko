# Cloisonnement et principe de moindre privilège sur les datastores mutualisés

Sur l'infrastructure mutualisée VPS où cohabitent l'application Nanko, Keycloak, Plausible et SigNoz (ADR-0007), l'accès aux datastores (PostgreSQL et ClickHouse) est strictement cloisonné par le principe de moindre privilège :

1. **Un rôle PostgreSQL par composant :** Le rôle superuser `nanko` n'est plus utilisé par aucun conteneur applicatif. Trois rôles dédiés et sans privilèges superadmin sont créés :
   * `nanko_app` : propriétaire exclusif du schéma `public` de la base `nanko` (migrations Doctrine et requêtes métier). Aucun accès au schéma `keycloak` ni à la base `plausible`.
   * `keycloak` : propriétaire exclusif du schéma `keycloak` de la base `nanko`. Aucun accès au schéma `public` ni à la base `plausible`.
   * `plausible` : propriétaire exclusif de la base `plausible`. Aucun accès à la base métier `nanko`.
   * `backup` : rôle de lecture seule (`pg_read_all_data`) dédié au conteneur sidecar de sauvegarde.

2. **Cloisonnement ClickHouse :** L'utilisateur `default` sans mot de passe ouvert à `::/0` est restreint à `localhost` (`127.0.0.1`, `::1`) avec mot de passe fort. Des utilisateurs nominatifs (`signoz`, `plausible`) accèdent uniquement à leurs bases respectives (`allow_databases`) et s'authentifient par mot de passe via l'environnement (`from_env`).

3. **Isolement réseau interne :** Les serveurs PostgreSQL et ClickHouse sont retirés du réseau partagé `edge` (réservé au reverse proxy Caddy et aux conteneurs frontaux exposés). Ils ne communiquent plus qu'au travers de réseaux internes dédiés (`nanko-prod_default`, `signoz_default`), interdisant tout mouvement latéral depuis un conteneur périphérique compromis.

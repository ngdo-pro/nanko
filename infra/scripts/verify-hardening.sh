#!/bin/bash
# ==============================================================================
# Script de vérification opérateur du durcissement d'infrastructure (Spec 013)
# Exécution :
#   ssh nanko-vps 'bash -s' < infra/scripts/verify-hardening.sh
# ==============================================================================
set -u

echo "=================================================================="
echo "Vérification 1 : Cloisonnement PostgreSQL (Moindre Privilège)"
echo "=================================================================="
echo "-> Tentative de lecture de la base 'nanko' par l'utilisateur 'plausible' (attendu : permission denied) :"
docker exec plausible sh -c 'psql "postgresql://plausible:$PLAUSIBLE_DB_PASSWORD@nanko-prod-postgres:5432/nanko" -c "select 1"' 2>&1 || true

echo ""
echo "-> Tentative de lecture du schéma 'keycloak' par 'nanko_app' (attendu : permission denied) :"
docker exec nanko-prod-postgres psql "postgresql://nanko_app:$APP_DB_PASSWORD@localhost:5432/nanko" -c "select count(*) from keycloak.user_entity" 2>&1 || true

echo ""
echo "=================================================================="
echo "Vérification 2 : Cloisonnement Réseau (Retrait de 'edge')"
echo "=================================================================="
echo "-> Test d'injoignabilité depuis un conteneur éphémère sur 'edge' :"
docker run --rm --network edge alpine:3.22 sh -c '
  nc -zvw2 nanko-prod-postgres 5432 2>&1 || echo "OK: Postgres nanko-prod-postgres:5432 injoignable depuis edge"
  nc -zvw2 signoz-clickhouse 9000 2>&1 || echo "OK: ClickHouse signoz-clickhouse:9000 injoignable depuis edge"
'

echo ""
echo "=================================================================="
echo "Vérification 3 : Cloisonnement & Authentification ClickHouse"
echo "=================================================================="
echo "-> Requête anonyme sur l'API HTTP ClickHouse (attendu : 516 Authentication failed) :"
docker exec plausible sh -c 'wget -qO- "http://signoz-clickhouse:8123/?query=SELECT%201"' 2>&1 || true

echo ""
echo "-> Tentative de lecture de 'signoz_logs' par l'utilisateur 'plausible' (attendu : 497 ACCESS_DENIED) :"
docker exec plausible sh -c 'wget -qO- "http://plausible:$PLAUSIBLE_CH_PASSWORD@signoz-clickhouse:8123/?query=SELECT%20count()%20FROM%20signoz_logs.logs_v2"' 2>&1 || true

echo ""
echo "=================================================================="
echo "Vérification 4 : Sécurité des Conteneurs (non-root & read-only)"
echo "=================================================================="
echo "-> UID d'exécution du backend Symfony (attendu : 33 pour www-data) :"
docker exec nanko-prod-backend id -u

echo ""
echo "-> Statut read_only, cap_drop et security_opt du frontend (attendu : true [ALL] [no-new-privileges:true]) :"
docker inspect nanko-prod-frontend --format '{{.HostConfig.ReadonlyRootfs}} {{.HostConfig.CapDrop}} {{.HostConfig.SecurityOpt}}'

echo ""
echo "=================================================================="
echo "Vérification 5 : Sauvegardes PostgreSQL (Sidecar pg_dump)"
echo "=================================================================="
docker exec nanko-prod-postgres-backup ls -la /backups/daily/ 2>&1 || true

echo ""
echo "Vérifications terminées."

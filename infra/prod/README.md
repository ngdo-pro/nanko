# prod

Docker Compose stack for the prod environment: `postgres` + `postgres-backup` + `backend` + `keycloak` + `frontend` + `landing`, joined to the VPS's external `edge` network (for public HTTP ingress) and routed by `caddy-docker-proxy` via Docker labels (`api.nanko.dev`, `auth.nanko.dev`, `app.nanko.dev`, `www.nanko.dev`). Datastore containers (`postgres`) remain strictly isolated on `nanko-prod_default`.

## Environment Variables (`~/.config/nanko/prod.env`)

Requires an environment file on the host at `~/.config/nanko/prod.env` (chmod 600, outside git) with:
- `POSTGRES_PASSWORD`: Superuser `nanko` password (used only for DB maintenance).
- `APP_SECRET`: Symfony app secret.
- `APP_DB_PASSWORD`: Dedicated password for role `nanko_app`.
- `KEYCLOAK_DB_PASSWORD`: Dedicated password for role `keycloak`.
- `BACKUP_DB_PASSWORD`: Dedicated password for role `backup`.
- `KC_ADMIN_ALLOWED_IPS`: Space-separated list of allowed IPs/CIDRs for Keycloak admin access (e.g. `203.0.113.4/32`).

Keycloak admin account is not stored in env: it is bootstrapped once via `kc.sh bootstrap-admin` and stored in a password manager.

## Database Migration Procedure (`harden-roles.sql`)

Before deploying the new compose configuration, execute the role hardening script once:
```bash
docker exec -i nanko-prod-postgres psql -U nanko -d nanko \
  -v app_pwd="$APP_DB_PASSWORD" \
  -v kc_pwd="$KEYCLOAK_DB_PASSWORD" \
  -v pl_pwd="$PLAUSIBLE_DB_PASSWORD" \
  -v bk_pwd="$BACKUP_DB_PASSWORD" < infra/postgres/harden-roles.sql
```

## Keycloak Realm Hardening (`kcadm.sh`)

Because Keycloak ignores `--import-realm` if the realm already exists in the database, apply the security policies manually:
```bash
docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user <admin>
docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh update realms/nanko \
  -s bruteForceProtected=true -s failureFactor=5 -s waitIncrementSeconds=60 -s maxFailureWaitSeconds=900 \
  -s 'passwordPolicy=length(12) and notUsername and notEmail and passwordHistory(3)'
docker exec -it nanko-prod-keycloak /opt/keycloak/bin/kcadm.sh update clients/<id-nanko-web> -r nanko \
  -s 'redirectUris=["https://app.nanko.dev/*"]'
```

If the operator IP is not in `KC_ADMIN_ALLOWED_IPS`, access the Keycloak administration console via SSH port-forwarding:
```bash
ssh -L 8080:localhost:8080 nanko-vps
```

## PostgreSQL Backup & Restoration Procedure

Daily automated backups are performed by `postgres-backup` into the named volume `nanko-prod-postgres-backups`.

To inspect backups:
```bash
docker exec nanko-prod-postgres-backup ls -la /backups/daily/
```

To test or execute a restoration:
```bash
# 1. Copier le dump du jour
docker exec nanko-prod-postgres-backup cp /backups/daily/nanko_<date>.sql.gz /tmp/nanko_restore.sql.gz
# 2. Restaurer dans une base temporaire
docker exec -i nanko-prod-postgres createdb -U nanko nanko_restore_test
docker exec -i nanko-prod-postgres sh -c 'gunzip -c /tmp/nanko_restore.sql.gz | psql -U nanko -d nanko_restore_test'
# 3. Vérifier les données
docker exec -i nanko-prod-postgres psql -U nanko -d nanko_restore_test -c "SELECT count(*) FROM organisation;"
# 4. Nettoyer
docker exec -i nanko-prod-postgres dropdb -U nanko nanko_restore_test
```

## Deployment

Deployment is image-based: Watchtower on the VPS polls GHCR every 5 minutes and auto-redeploys `backend`/`frontend`/`landing` on a new image digest. Run `make deploy-prod` from the repo root only when this compose file's structure changes (new service, changed labels/ports).

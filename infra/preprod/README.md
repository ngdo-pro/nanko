# preprod

Docker Compose stack for the preprod environment: `postgres` + `backend` + `keycloak` + `frontend` + `landing`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`api.preprod.nanko.dev`, `auth.preprod.nanko.dev`, `app.preprod.nanko.dev`, `www.preprod.nanko.dev`). Datastores remain strictly isolated on the internal network.

## Environment Variables (`~/.config/nanko/preprod.env`)

Requires an environment file on the host at `~/.config/nanko/preprod.env` (chmod 600, outside git) with:
- `POSTGRES_PASSWORD`: Superuser `nanko` password.
- `APP_SECRET`: Symfony app secret.
- `APP_DB_PASSWORD`: Dedicated password for role `nanko_app`.
- `KEYCLOAK_DB_PASSWORD`: Dedicated password for role `keycloak`.
- `PREPROD_HTTP_USER`: User for Caddy Basic Auth (defaults to `nanko`).
- `PREPROD_HTTP_HASH`: Bcrypt hash for Caddy Basic Auth (see below).
- `KC_ADMIN_ALLOWED_IPS`: Space-separated list of allowed IPs/CIDRs for Keycloak admin access.

Keycloak admin account is not stored in env: it is bootstrapped once via `kc.sh bootstrap-admin` and stored in a password manager.

### Generating the Caddy HTTP Basic Auth Hash

Caddy requires bcrypt-hashed passwords for `basic_auth`. To generate a hash:
```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'YOUR_PASSWORD'
```
Copy the resulting hash into `~/.config/nanko/preprod.env` as `PREPROD_HTTP_HASH`.

## Database Migration Procedure (`harden-roles.sql`)

Before deploying the new compose configuration, execute the role hardening script once:
```bash
docker exec -i nanko-preprod-postgres psql -U nanko -d nanko \
  -v app_pwd="$APP_DB_PASSWORD" \
  -v kc_pwd="$KEYCLOAK_DB_PASSWORD" \
  -v pl_pwd="not_used_in_preprod" \
  -v bk_pwd="not_used_in_preprod" < infra/postgres/harden-roles.sql
```

## Keycloak Realm Hardening (`kcadm.sh`)

Apply security attributes to the preproduction realm:
```bash
docker exec -it nanko-preprod-keycloak /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user <admin>
docker exec -it nanko-preprod-keycloak /opt/keycloak/bin/kcadm.sh update realms/nanko \
  -s bruteForceProtected=true -s failureFactor=5 -s waitIncrementSeconds=60 -s maxFailureWaitSeconds=900 \
  -s 'passwordPolicy=length(12) and notUsername and notEmail and passwordHistory(3)'
docker exec -it nanko-preprod-keycloak /opt/keycloak/bin/kcadm.sh update clients/<id-nanko-web> -r nanko \
  -s 'redirectUris=["https://app.preprod.nanko.dev/*"]'
```

## Deployment

Deployment is image-based: Watchtower on the VPS polls GHCR every 5 minutes and auto-redeploys `backend`/`frontend`/`landing` on a new image digest. Run `make deploy-preprod` from the repo root only when this compose file's structure changes (new service, changed labels/ports).

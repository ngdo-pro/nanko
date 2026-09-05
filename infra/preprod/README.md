# preprod

Docker Compose stack for the preprod environment: `postgres` + `backend` + `frontend` + `landing`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`api.preprod.nanko.dev`, `app.preprod.nanko.dev`, `www.preprod.nanko.dev`).

Requires an environment file on the host at `~/.config/nanko/preprod.env` (chmod 600, outside git) with:
- `POSTGRES_PASSWORD`
- `APP_SECRET`
- `PREPROD_HTTP_USER` (defaults to `nanko` if unset)
- `PREPROD_HTTP_HASH` (bcrypt hash generated with `caddy hash-password`, see below)

Keycloak admin account is not stored in env: it is bootstrapped once via `kc.sh bootstrap-admin` and stored in a password manager.

### Generating the Caddy HTTP Basic Auth Hash

Caddy requires bcrypt-hashed passwords for `basic_auth`. To generate a hash:
```bash
docker run --rm caddy:2-alpine caddy hash-password --plaintext 'YOUR_PASSWORD'
```
Copy the resulting hash into `~/.config/nanko/preprod.env` as `PREPROD_HTTP_HASH`.

Deployment is image-based: Watchtower on the VPS polls GHCR every 5 minutes and auto-redeploys `backend`/`frontend`/`landing` on a new image digest -- CI never touches the VPS. Run `make deploy-preprod` from the repo root only when this compose file's structure changes (new service, changed labels/ports).

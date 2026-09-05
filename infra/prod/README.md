# prod

Docker Compose stack for the prod environment: `postgres` + `backend` + `frontend` + `landing`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`api.nanko.dev`, `app.nanko.dev`, `www.nanko.dev`).

Requires an environment file on the host at `~/.config/nanko/prod.env` (chmod 600, outside git) with `POSTGRES_PASSWORD` and `APP_SECRET`. Keycloak admin account is not stored in env: it is bootstrapped once via `kc.sh bootstrap-admin` and stored in a password manager.

Deployment is image-based: Watchtower on the VPS polls GHCR every 5 minutes and auto-redeploys `backend`/`frontend`/`landing` on a new image digest -- CI never touches the VPS. Run `make deploy-prod` from the repo root only when this compose file's structure changes (new service, changed labels/ports).

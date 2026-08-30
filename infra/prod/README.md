# prod

Docker Compose stack for the prod environment: `postgres` + `backend` + `frontend`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`api.nanko.dev`, `app.nanko.dev`).

Requires an `.env` file (not committed -- no `.env.example` exists yet) with `POSTGRES_PASSWORD` and `APP_SECRET`.

Deployment is image-based: Watchtower on the VPS polls GHCR every 5 minutes and auto-redeploys `backend`/`frontend` on a new image digest -- CI never touches the VPS. Run `make deploy-prod` from the repo root only when this compose file's structure changes (new service, changed labels/ports).

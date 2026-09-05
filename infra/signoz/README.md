# signoz

Docker Compose observability stack: `clickhouse` + `signoz-query-service` + `signoz-frontend` + `signoz-alertmanager` + `signoz-otel-collector` + `signoz-provisioner`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`signoz.nanko.dev`, `otlp.nanko.dev`).

Requires an environment file on the host at `~/.config/nanko/signoz.env` (chmod 600, outside git) with:
- `SIGNOZ_BASICAUTH_HASH`: Bcrypt hash for Caddy HTTP Basic Auth (generated via `docker run --rm caddy:2-alpine caddy hash-password --plaintext 'your-password'`).
- `SIGNOZ_ADMIN_EMAIL`: Email of the initial superadmin account.
- `SIGNOZ_ADMIN_PASSWORD`: Strong password for the superadmin account.

To deploy or update on the VPS:
```bash
make deploy-signoz
```

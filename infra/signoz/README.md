# signoz

Docker Compose observability stack: `clickhouse` + `signoz-query-service` + `signoz-frontend` + `signoz-alertmanager` + `signoz-otel-collector` + `signoz-provisioner`, joined to the VPS's external `edge` network and routed by `caddy-docker-proxy` via Docker labels (`signoz.nanko.dev`, `otlp.nanko.dev`). ClickHouse itself is strictly isolated from `edge`.

## Environment Variables (`~/.config/nanko/signoz.env`)

Requires an environment file on the host at `~/.config/nanko/signoz.env` (chmod 600, outside git) with:
- `SIGNOZ_ADMIN_EMAIL`: Email of the initial superadmin account.
- `SIGNOZ_ADMIN_PASSWORD`: Strong password for the superadmin account.
- `CLICKHOUSE_DEFAULT_PASSWORD_SHA256`: SHA256 hex hash of the default ClickHouse admin password (`echo -n "..." | sha256sum`).
- `CLICKHOUSE_SIGNOZ_PASSWORD`: Clear text password used by query-service and otel-collector.
- `CLICKHOUSE_SIGNOZ_PASSWORD_SHA256`: SHA256 hex hash of the signoz ClickHouse password.
- `CLICKHOUSE_PLAUSIBLE_PASSWORD_SHA256`: SHA256 hex hash of the plausible ClickHouse password.
- `SIGNOZ_BASICAUTH_HASH`: Bcrypt hash for Caddy Basic Auth protecting `signoz.nanko.dev` (`caddy hash-password`).

## Deployment

To deploy or update on the VPS:
```bash
make deploy-signoz
```

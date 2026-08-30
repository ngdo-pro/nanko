# syntax=docker/dockerfile:1
#
# No build step (see README.md) -- this image just serves the static files
# with Caddy. In infra/local/compose.yaml the landing/ directory is
# bind-mounted over /srv, so edits are picked up live without a rebuild.

FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY favicon.svg index.html styles.css theme.js /srv/
EXPOSE 8080

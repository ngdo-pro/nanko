# landing

Public landing page for www.nanko.dev.

Static HTML/CSS/JS, no build step: `index.html`, `styles.css`, `theme.js`, `favicon.svg`. Served as-is by Caddy via `Dockerfile`/`Caddyfile` -- see `infra/` for local/preprod/prod wiring.

Theme switch (light/dark/system) is handled by `theme.js`, persisted to `localStorage`.

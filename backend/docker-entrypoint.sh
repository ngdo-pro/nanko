#!/bin/sh
# Runs pending Doctrine migrations before the app starts serving traffic.
# Fails loudly on purpose: with `restart: unless-stopped` on the backend
# service, a failed migration becomes a visible crash-loop (see
# `docker ps` / `docker logs`) instead of a silently broken app serving
# traffic against a stale schema. See docs/adr/0010-*.md.
set -e

php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

exec docker-php-entrypoint "$@"

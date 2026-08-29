#!/usr/bin/env bash
set -euo pipefail
ENV="$1"   # preprod | prod
COMPOSE_FILE="infra/${ENV}/docker-compose.yml"
PROJECT="nanko-${ENV}"

docker network inspect nanko-edge >/dev/null 2>&1 || docker network create nanko-edge

docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "infra/${ENV}/.env" pull
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "infra/${ENV}/.env" up -d

docker compose -p "$PROJECT" -f "$COMPOSE_FILE" exec -T backend \
    php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration

if ! docker compose -p "$PROJECT" -f "$COMPOSE_FILE" exec -T backend curl -sf http://localhost/health; then
    echo "Health check failed for ${ENV}" >&2
    exit 1
fi

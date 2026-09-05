# syntax=docker/dockerfile:1
#
# Multi-stage build for the nanko Symfony backend, running on FrankenPHP in
# classic (non-worker) mode. FrankenPHP sits behind the VPS's shared
# caddy-docker-proxy, routed by Docker labels (see
# infra/preprod|prod/compose.yaml) rather than a static Caddyfile, and
# does not terminate TLS itself -- see SERVER_NAME below.

FROM dunglas/frankenphp:1.12-php8.4-bookworm AS builder

# `zip` is builder-only: Composer needs it (or unzip/7z) to unpack dist
# packages. The base image ships with none of the three, so package
# downloads fail without it. It is intentionally not installed in the
# runtime stage below.
RUN install-php-extensions \
    pdo_pgsql \
    intl \
    opcache \
    zip

COPY --from=composer/composer:2-bin /composer /usr/bin/composer

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --no-interaction

COPY . .

# Autoloader is dumped after the full source is present, not as part of the
# `composer install` above: the classmap entry for config/reference.php (see
# composer.json) needs that file on disk, which it isn't until this COPY.
RUN composer dump-autoload --no-dev --optimize

# Build-time-only placeholders so the container compiler/cache warmup can
# resolve env(...) parameters at image-build time. They are never used to
# serve traffic: the runtime stage below does not inherit them, and the real
# values are injected by docker-compose (infra/preprod|prod) at container
# start.
ARG APP_VERSION=v0.0.0-dev
ARG APP_COMMIT=dev
ENV APP_ENV=prod \
    APP_SECRET=build-time-placeholder \
    DATABASE_URL="postgresql://app:placeholder@127.0.0.1:5432/app?serverVersion=16&charset=utf8" \
    APP_VERSION=${APP_VERSION} \
    APP_COMMIT=${APP_COMMIT}

RUN APP_ENV=prod php bin/console cache:warmup --env=prod

# Dev-only stage for `infra/local/compose.yaml`. Source is bind-mounted
# at /app at container start (not copied here), so edits are picked up
# without a rebuild; only the PHP runtime + Composer are baked into the
# image. `composer install`/migrations run at container start rather than
# build time, since the mounted /app is empty until then.
FROM dunglas/frankenphp:1.12-php8.4-bookworm AS dev

RUN install-php-extensions \
    pdo_pgsql \
    intl \
    opcache \
    zip

COPY --from=composer/composer:2-bin /composer /usr/bin/composer

WORKDIR /app

CMD ["sh", "-c", "composer install --no-interaction && php bin/console doctrine:migrations:migrate --no-interaction --allow-no-migration && php -S 0.0.0.0:8000 -t public public/index.php"]

FROM dunglas/frankenphp:1.12-php8.4-bookworm AS runtime

RUN install-php-extensions \
    pdo_pgsql \
    intl \
    opcache

COPY --from=builder /app /app

WORKDIR /app

# Prevents FrankenPHP's built-in auto-HTTPS from conflicting with the
# external Caddy reverse proxy -- this container only ever speaks plain
# HTTP on the Docker network.
ENV SERVER_NAME=:80
ENV APP_ENV=prod
ARG APP_VERSION=v0.0.0-dev
ARG APP_COMMIT=dev
ENV APP_VERSION=${APP_VERSION}
ENV APP_COMMIT=${APP_COMMIT}

# Copied directly from the build context (not from the builder stage, and
# not under /app) so it survives independently of the app-code copy above.
# Runs pending Doctrine migrations before chaining into the base image's
# own entrypoint -- see docker-entrypoint.sh and docs/adr/0010-*.md.
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
# Re-declared explicitly: setting ENTRYPOINT above resets any CMD inherited
# from the base image to empty. This must match the base image's own CMD
# (verified via `docker image inspect dunglas/frankenphp:1.12-php8.4-bookworm
# --format '{{.Config.Entrypoint}} {{.Config.Cmd}}'`) so that
# `docker-php-entrypoint "$@"` in docker-entrypoint.sh still receives it.
CMD ["--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/health || exit 1

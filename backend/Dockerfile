# syntax=docker/dockerfile:1
#
# Multi-stage build for the nanko Symfony backend, running on FrankenPHP in
# classic (non-worker) mode. FrankenPHP sits behind Caddy on a shared Docker
# network (infra/preprod|prod/docker-compose.yml + infra/proxy) rather than
# terminating TLS itself -- see SERVER_NAME below.

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
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction

COPY . .

# Build-time-only placeholders so the container compiler/cache warmup can
# resolve env(...) parameters at image-build time. They are never used to
# serve traffic: the runtime stage below does not inherit them, and the real
# values are injected by docker-compose (infra/preprod|prod) at container
# start.
ENV APP_ENV=prod \
    APP_SECRET=build-time-placeholder \
    DATABASE_URL="postgresql://app:placeholder@127.0.0.1:5432/app?serverVersion=16&charset=utf8"

RUN APP_ENV=prod php bin/console cache:warmup --env=prod

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

EXPOSE 80

HEALTHCHECK CMD curl -f http://localhost/health || exit 1

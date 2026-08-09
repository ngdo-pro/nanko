#!/bin/sh
# Runs once, on first container init, alongside the main POSTGRES_DB.
# Creates a second database dedicated to the test suite so tests never
# touch dev data, without needing a second Postgres instance.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE nanko_test OWNER $POSTGRES_USER;
EOSQL

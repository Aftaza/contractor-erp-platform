#!/bin/sh
# Dipasang di /docker-entrypoint-initdb.d (jalan sekali di volume kosong). Volume yang
# sudah ada / password dirotasi: `docker compose exec db sh /docker-entrypoint-initdb.d/init-roles.sh`.
# Tabel yang sudah dibuat superuser (db dev lama) harus di-ALTER OWNER ke acme_migrate manual.
set -eu
psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -v app_pw="$APP_DB_PASSWORD" -v migrate_pw="$MIGRATE_DB_PASSWORD" -v dbname="$POSTGRES_DB" \
  -f /db/roles.sql

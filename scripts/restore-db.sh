#!/usr/bin/env sh
set -eu

if [ $# -ne 1 ]; then
  echo "Usage: sh scripts/restore-db.sh backups/growvibe-YYYYMMDD-HHMMSS.sql.gz"
  exit 1
fi

gzip -dc "$1" | docker compose exec -T postgres sh -lc 'psql -U "$POSTGRES_USER" "$POSTGRES_DB"'

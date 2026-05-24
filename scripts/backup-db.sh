#!/usr/bin/env sh
set -eu

mkdir -p backups

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="backups/growvibe-${STAMP}.sql.gz"

docker compose exec -T postgres sh -lc 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' | gzip > "$OUT"

echo "Backup written: $OUT"

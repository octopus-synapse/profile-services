#!/bin/sh
# Daily Postgres dump, installed on the VPS by `install-backup-cron.sh`.
#
# There was exactly one dump on this box when this landed — from 17/06,
# taken by hand before a pgvector migration. The pre-deploy dump the deploy
# workflow takes covers migrations; this covers everything else (accidental
# deletion, corruption, a bad manual query).
#
# The whole database is ~21 MB and a compressed dump ~1 MB, so retention is
# cheap: 7 daily plus 4 weekly is ~11 MB against ~59 GB free.
set -eu

DEST="${BACKUP_DIR:-/opt/backups}"
COMPOSE_DIR="${COMPOSE_DIR:-/opt/profile-services}"
CONTAINER="${PG_CONTAINER:-profile-postgres}"

# Values live in the deploy .env; read them rather than duplicating.
if [ -f "$COMPOSE_DIR/.env" ]; then
  PG_USER="$(grep -m1 '^POSTGRES_USER=' "$COMPOSE_DIR/.env" | cut -d= -f2- | tr -d '"')"
  PG_DB="$(grep -m1 '^POSTGRES_DB=' "$COMPOSE_DIR/.env" | cut -d= -f2- | tr -d '"')"
fi
PG_USER="${PG_USER:-postgres}"
PG_DB="${PG_DB:-profile}"

mkdir -p "$DEST"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DOW="$(date -u +%u)"
# Sunday's dump is the weekly one and ages out on a slower clock.
case "$DOW" in
  7) OUT="$DEST/profile_weekly_${STAMP}.dump" ;;
  *) OUT="$DEST/profile_daily_${STAMP}.dump" ;;
esac

docker exec -i "$CONTAINER" pg_dump -U "$PG_USER" -d "$PG_DB" -Fc > "$OUT"
# A pg_dump that dies mid-stream still leaves a file, so size is the check
# that something restorable actually landed.
[ -s "$OUT" ] || { echo "[backup] FAILED: $OUT is empty" >&2; rm -f "$OUT"; exit 1; }
echo "[backup] $OUT ($(du -h "$OUT" | cut -f1))"

ls -1t "$DEST"/profile_daily_*.dump  2>/dev/null | tail -n +8 | xargs -r rm --
ls -1t "$DEST"/profile_weekly_*.dump 2>/dev/null | tail -n +5 | xargs -r rm --

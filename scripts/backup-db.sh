#!/usr/bin/env bash
# PostgreSQL backup for Shopiva.
#
# Dumps the database (via the `postgres` service in docker compose) to a gzipped,
# timestamped file under ./backups, then prunes copies older than N days.
#
# Run by hand:
#   ./scripts/backup-db.sh
#
# Or nightly via cron (02:30 UTC):
#   30 2 * * *  cd /path/to/shopiva && ./scripts/backup-db.sh >> backups/backup.log 2>&1
#
# Restore a backup:
#   gunzip -c backups/shopiva_<stamp>.sql.gz | docker compose -f docker-compose.prod.yml exec -T postgres psql -U shopiva -d shopiva
set -euo pipefail

# Load .env if present (for POSTGRES_USER / POSTGRES_DB / retention).
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
if [ -f "$REPO_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$REPO_DIR/.env"
  set +a
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
POSTGRES_USER="${POSTGRES_USER:-shopiva}"
POSTGRES_DB="${POSTGRES_DB:-shopiva}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

BACKUP_DIR="$REPO_DIR/backups"
mkdir -p "$BACKUP_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/${POSTGRES_DB}_${STAMP}.sql.gz"

echo "[backup] dumping database '$POSTGRES_DB' -> $FILE"
docker compose -f "$REPO_DIR/$COMPOSE_FILE" exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --clean --if-exists \
  | gzip > "$FILE"

echo "[backup] pruning backups older than ${RETENTION_DAYS} day(s)"
find "$BACKUP_DIR" -name '*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] done ($(du -h "$FILE" | cut -f1))"

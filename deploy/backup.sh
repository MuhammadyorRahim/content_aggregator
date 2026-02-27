#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/app}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_KEEP_COUNT="${BACKUP_KEEP_COUNT:-30}"
DB_PATH="${DB_PATH:-$APP_DIR/prisma/data.db}"

DATE_TAG="$(date +%F-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/data-$DATE_TAG.db"

mkdir -p "$BACKUP_DIR"

if [[ ! -f "$DB_PATH" ]]; then
  echo "Database not found at $DB_PATH"
  exit 1
fi

sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

ls -1t "$BACKUP_DIR"/data-*.db 2>/dev/null | tail -n +"$((BACKUP_KEEP_COUNT + 1))" | xargs -r rm --

echo "Backup completed: $BACKUP_FILE"

#!/bin/sh
set -eu

FILE="${1:-}"
if [ -z "$FILE" ]; then
  echo "Usage: restore.sh <backup-file.sql.gz>"
  exit 1
fi
if [ ! -f "$FILE" ]; then
  echo "Backup file not found: $FILE"
  exit 1
fi

echo "Restoring $FILE into ${PGDATABASE} on ${PGHOST}. This overwrites current data."
gunzip -c "$FILE" | psql -h "${PGHOST:?}" -U "${PGUSER:?}" -d "${PGDATABASE:?}"
echo "Restore finished."

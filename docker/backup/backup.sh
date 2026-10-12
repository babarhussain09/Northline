#!/bin/sh
set -eu

DIR="${BACKUP_DIR:-/backups}"
RETENTION="${BACKUP_RETENTION_DAYS:-30}"
mkdir -p "$DIR"
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="$DIR/subscription_portal_${STAMP}.sql.gz"

pg_dump -h "${PGHOST:?}" -U "${PGUSER:?}" -d "${PGDATABASE:?}" | gzip > "$OUT"
find "$DIR" -name 'subscription_portal_*.sql.gz' -type f -mtime +"$RETENTION" -delete

if [ -n "${S3_BUCKET:-}" ]; then
  if command -v aws >/dev/null 2>&1; then
    aws s3 cp "$OUT" "s3://${S3_BUCKET}/$(basename "$OUT")"
  else
    echo "S3_BUCKET is set, but the aws cli is not installed. The dump remains at $OUT for a later upload."
  fi
fi

echo "Backup written to $OUT"

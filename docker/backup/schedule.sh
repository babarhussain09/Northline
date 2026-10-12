#!/bin/sh
set -eu

DIR="${BACKUP_DIR:-/backups}"
mkdir -p "$DIR"

while true; do
  DOW=$(date +%u)
  HOUR=$(date +%H)
  TODAY=$(date +%Y-%m-%d)
  MARK="$DIR/.last_scheduled"
  LAST=""
  if [ -f "$MARK" ]; then
    LAST=$(cat "$MARK")
  fi
  if [ "$DOW" = "7" ] && [ "$HOUR" -ge 2 ] && [ "$LAST" != "$TODAY" ]; then
    /scripts/backup.sh
    echo "$TODAY" > "$MARK"
  fi
  sleep 60
done

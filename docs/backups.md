# Backups

The production Compose file runs a `backup` container next to Postgres. It is not the database container. Dumps are written to the `backup_data` volume, mounted at `/backups`.

`docker/backup/schedule.sh` wakes every minute. On Sunday, once the hour is 02:00 or later, it runs `backup.sh` if that calendar day does not already have a dump. The dump uses `pg_dump` and is gzip-compressed.

`BACKUP_RETENTION_DAYS` defaults to 30. Older `subscription_portal_*.sql.gz` files are deleted.

Run one immediately:

```bash
make backup
```

Restore a file that is already in the volume:

```bash
make restore FILE=subscription_portal_20261005_020000.sql.gz
```

That replaces the data in the current database. Stop the API first if you need a quiet restore.

## S3 later

If `S3_BUCKET` is set and the `aws` CLI is installed in the backup image, `backup.sh` uploads the new file with `aws s3 cp`. The image does not install the CLI today. Add it to a small backup image, or copy the volume to object storage with rclone, when you are ready. The local volume remains the first copy either way.

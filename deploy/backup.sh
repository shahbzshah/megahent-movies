#!/bin/bash
# CineGlass database backup — Phase 0 backup story.
#
# The live database is TiDB Cloud (Render env vars point at it); the
# in-container MariaDB is ephemeral and must never be the store of record.
# This script dumps the LIVE database (whatever DB_HOST points at) to a
# timestamped file. Run it from any machine with a MySQL client and the
# database credentials, e.g.:
#
#   DB_HOST=... DB_PORT=4000 DB_NAME=cineglass DB_USER=... \
#   DB_PASS=... DB_SSL_CA=/etc/ssl/certs/ca-certificates.crt \
#   ./backup.sh
#
# Keep the dumps somewhere safe (not in the repo — they contain the
# admin password hash, announcements and the saved TMDB key).
# Restore: mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < dump.sql
set -eu

: "${DB_HOST:?DB_HOST is required}"
: "${DB_NAME:=cineglass}"
: "${DB_USER:?DB_USER is required}"
: "${DB_PASS:?DB_PASS is required}"
DB_PORT="${DB_PORT:-3306}"

OUT="cineglass-backup-$(date +%Y%m%d-%H%M%S).sql"
ARGS=(-h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers)
if [ -n "${DB_SSL_CA:-}" ]; then
  ARGS+=(--ssl-ca="$DB_SSL_CA")
fi
mysqldump "${ARGS[@]}" "$DB_NAME" > "$OUT"
echo "backup: wrote $OUT ($(wc -c < "$OUT") bytes)"

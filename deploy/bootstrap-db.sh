#!/bin/bash
# One-shot supervisor program: wait for MariaDB, create the database and
# the app user, import schema.sql once, and seed default settings.
# Idempotent: safe to run on every container start (Render free tier
# filesystem is ephemeral across deploys, so re-seeding is expected).
# No admin user is seeded here — install.php is deliberately not deployed,
# because it creates a known default admin password. The admin account is
# set up separately by Megah when he wants the admin panel.
set -u

for i in $(seq 1 45); do
  if mysqladmin -u root ping --silent 2>/dev/null; then
    break
  fi
  sleep 2
done
mysqladmin -u root ping --silent || { echo "bootstrap: MariaDB not reachable"; exit 1; }

DB_NAME="${DB_NAME:-cineglass}"
DB_USER="${DB_USER:-cineglass}"
DB_PASS="${DB_PASS:-}"

mysql -u root -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

HAS=$(mysql -u root -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$DB_NAME' AND table_name='settings';")
if [ "$HAS" = "0" ]; then
  mysql -u root "$DB_NAME" < /var/www/html/cineglass-server/schema.sql
  echo "bootstrap: schema imported"
fi

mysql -u root -e "CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASS'; CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS'; GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'localhost'; GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1'; FLUSH PRIVILEGES;"

mysql -u root "$DB_NAME" -e "INSERT IGNORE INTO settings (skey, svalue) VALUES ('site_status','online'),('offline_message','MegahEnt is temporarily unavailable. Please check back soon.'),('shell_config','{\"url\":null,\"force_offline\":false}'),('livetv_enabled','1');"

echo "bootstrap: done"

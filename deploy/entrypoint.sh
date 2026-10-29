#!/bin/bash
# Container start: bind Apache to Render's $PORT, prepare MariaDB dirs,
# expose Render env vars to PHP via Apache, then run supervisord.
set -e

PORT="${PORT:-80}"
sed -i "s/^Listen 80$/Listen $PORT/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:$PORT>/" /etc/apache2/sites-available/000-default.conf

mkdir -p /run/mysqld /var/log/supervisor /var/lib/mysql
chown -R mysql:mysql /run/mysqld /var/lib/mysql

# First boot: initialise the MariaDB data directory if it is empty.
if [ ! -d /var/lib/mysql/mysql ]; then
  mariadb-install-db --user=mysql --datadir=/var/lib/mysql --skip-test-db \
    --auth-root-authentication-method=normal
fi

# Pass container env vars through to PHP (getenv() / $_SERVER). Written at
# container start only — never committed anywhere.
{
  echo "# Render-injected env for PHP (written at container start)"
  for k in DB_HOST DB_NAME DB_USER DB_PASS TMDB_API_KEY; do
    v="${!k:-}"
    esc="${v//\\/\\\\}"
    esc="${esc//\"/\\\"}"
    echo "SetEnv $k \"$esc\""
  done
} > /etc/apache2/conf-available/render-env.conf
a2enconf render-env >/dev/null 2>&1 || true

exec /usr/bin/supervisord -n -c /etc/supervisor/supervisord.conf

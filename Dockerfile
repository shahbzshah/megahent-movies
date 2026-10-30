# CineGlass on Render (free tier): one container serving the React build
# plus the PHP API (admin, Live TV scraper, TMDB/Xtream proxies) with an
# in-container MariaDB. No secrets in this file: TMDB_API_KEY and DB_PASS
# arrive as Render environment variables (see render.yaml).
#
# Build stage: React app (Vite). The admin API lives on the same origin,
# so VITE_ADMIN_API_URL is a relative path baked in at build time.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY cineglass/package.json cineglass/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY cineglass/ ./
ENV VITE_ADMIN_API_URL=/cineglass-server/api
RUN npm run build

# Runtime stage: PHP 8.3 + Apache + MariaDB, supervised together.
FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends \
      mariadb-server supervisor curl libcurl4-openssl-dev libmariadb-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql curl \
    && a2enmod rewrite headers deflate expires \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist /var/www/html/
COPY tmdb-proxy.php xtream-proxy.php /var/www/html/
COPY cineglass-server /var/www/html/cineglass-server
COPY deploy/supervisord.conf /etc/supervisor/supervisord.conf
COPY deploy/mariadb.cnf /etc/mysql/conf.d/cineglass.cnf
COPY deploy/entrypoint.sh deploy/bootstrap-db.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/bootstrap-db.sh \
    && rm -f /var/www/html/cineglass-server/install.php \
              /var/www/html/cineglass-server/php-err.log \
              /var/www/html/cineglass-server/php-out.log \
    && rm -rf /var/www/html/cineglass-server/tools \
    && printf 'expose_php=Off\ndisplay_errors=Off\nlog_errors=On\n' > /usr/local/etc/php/conf.d/cineglass.ini \
    && sed -i '1s/^\xEF\xBB\xBF//' /var/www/html/cineglass-server/schema.sql \
    && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf \
    && chown -R www-data:www-data /var/www/html \
    && mkdir -p /run/mysqld /var/log/supervisor \
    && chown -R mysql:mysql /run/mysqld /var/lib/mysql

EXPOSE 80
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]

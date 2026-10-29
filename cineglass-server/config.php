<?php
/**
 * MegahEnt server configuration.
 * Values come from the environment when set (Render/Docker deploy sets
 * DB_HOST, DB_NAME, DB_USER and DB_PASS; DB_PASS is a generated value
 * there, never committed). The fallbacks below are for a local/shared
 * host where the file itself is edited instead — on a shared host the
 * provider gives you the DB name/user/password.
 */
// Fallback stays 'localhost' (Unix socket), which is what cPanel/shared
// MySQL accounts expect. Render overrides it with DB_HOST=127.0.0.1
// (TCP), because the PHP build's socket path does not match MariaDB's
// there — that override lives in the Render service env, not here.
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'cineglass');
define('DB_USER', getenv('DB_USER') ?: 'cineglass');
define('DB_PASS', getenv('DB_PASS') ?: '');
// DB_SSL_CA: path to a CA certificate file, only for hosts that require
// TLS (e.g. TiDB Cloud). Unset = plain connection, exactly as today.
define('DB_SSL_CA', getenv('DB_SSL_CA') ?: '');

/** PDO connection (singleton). */
function db(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $options = [
      PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ];
    if (DB_SSL_CA !== '') {
      $options[PDO::MYSQL_ATTR_SSL_CA] = DB_SSL_CA;
    }
    $pdo = new PDO(
      'mysql:host=' . DB_HOST . ';port=' . DB_PORT . ';dbname=' . DB_NAME . ';charset=utf8mb4',
      DB_USER,
      DB_PASS,
      $options
    );
  }
  return $pdo;
}

/** Send JSON and stop. CORS is open so the Vercel webapp can read it. */
function json_out($data, int $code = 200): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');
  header('Access-Control-Allow-Origin: *');
  // Dynamic state (kill-switch, announcements) — never let caches serve it stale.
  header('Cache-Control: no-store, must-revalidate');
  header('Pragma: no-cache');
  echo json_encode($data);
  exit;
}

function ensure_session(): void {
  if (session_status() !== PHP_SESSION_ACTIVE) session_start();
}

/** Redirect to login unless an admin session exists. */
function require_admin(): void {
  ensure_session();
  if (empty($_SESSION['cg_admin'])) {
    header('Location: login.php');
    exit;
  }
}

/** Get (or create) the CSRF token for forms. */
function csrf_token(): string {
  ensure_session();
  if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
  }
  return $_SESSION['csrf'];
}

/** Validate the CSRF token on POST; hard-stop on mismatch. */
function csrf_check(): void {
  ensure_session();
  $sent = $_POST['csrf'] ?? '';
  if (!$sent || !hash_equals($_SESSION['csrf'] ?? '', $sent)) {
    http_response_code(403);
    exit('Invalid CSRF token — go back and try again.');
  }
}

/** Escape for HTML output. */
function e(?string $s): string {
  return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}
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
  if (session_status() === PHP_SESSION_ACTIVE) return;
  // Cookie flags: HttpOnly always; Secure on HTTPS (Render terminates
  // TLS at the edge, so honour the forwarded proto too); SameSite=Lax
  // so top-level navigation still works but cross-site POSTs do not
  // carry the session. Strict mode rejects uninitialised session ids.
  $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
  session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'secure'   => $isHttps,
    'samesite' => 'Lax',
  ]);
  ini_set('session.use_strict_mode', '1');
  session_start();
}

/** Idle timeout for admin sessions (30 min) + activity tracking. */
function admin_session_check(): void {
  ensure_session();
  $now = time();
  if (isset($_SESSION['last_activity']) && $now - (int)$_SESSION['last_activity'] > 1800) {
    $_SESSION = [];
    session_destroy();
    header('Location: login.php');
    exit;
  }
  $_SESSION['last_activity'] = $now;
}

/** Lazily ensure the login-attempts table exists (fail soft). */
function login_attempts_table(): void {
  try {
    db()->exec("CREATE TABLE IF NOT EXISTS admin_login_attempts (
      ip VARCHAR(45) NOT NULL PRIMARY KEY,
      fails INT NOT NULL DEFAULT 0,
      last_fail TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  } catch (Throwable $e) { /* DB down: throttling degrades to no-op */ }
}

/** True when this IP may attempt a login (5 fails / 15 min lockout). */
function login_allowed(string $ip): bool {
  login_attempts_table();
  try {
    $st = db()->prepare('SELECT fails, UNIX_TIMESTAMP(last_fail) AS t FROM admin_login_attempts WHERE ip = ?');
    $st->execute([$ip]);
    $row = $st->fetch();
    if (!$row) return true;
    if ((int)$row['fails'] >= 5 && time() - (int)$row['t'] < 900) return false;
    return true;
  } catch (Throwable $e) {
    return true;
  }
}

/** Record a failed login (window resets 15 min after the last failure). */
function login_failed(string $ip): void {
  login_attempts_table();
  try {
    $st = db()->prepare('SELECT fails, UNIX_TIMESTAMP(last_fail) AS t FROM admin_login_attempts WHERE ip = ?');
    $st->execute([$ip]);
    $row = $st->fetch();
    $fails = 1;
    if ($row && time() - (int)$row['t'] < 900) $fails = (int)$row['fails'] + 1;
    $up = db()->prepare('INSERT INTO admin_login_attempts (ip, fails, last_fail) VALUES (?, ?, NOW())
                         ON DUPLICATE KEY UPDATE fails = VALUES(fails), last_fail = NOW()');
    $up->execute([$ip, $fails]);
  } catch (Throwable $e) { }
}

/** Clear the failure counter after a successful login. */
function login_cleared(string $ip): void {
  try {
    db()->prepare('DELETE FROM admin_login_attempts WHERE ip = ?')->execute([$ip]);
  } catch (Throwable $e) { }
}

/**
 * Session version for "log out everywhere on password change": the
 * version is bumped in admin_users on every password change, and
 * require_admin() drops sessions carrying an older version.
 */
function admin_session_version(PDO $pdo, string $username): int {
  try {
    $st = $pdo->prepare('SELECT session_version FROM admin_users WHERE username = ?');
    $st->execute([$username]);
    $row = $st->fetch();
    if ($row && isset($row['session_version'])) return (int)$row['session_version'];
  } catch (Throwable $e) {
    // Column missing (old schema): add it once, fail soft.
    try {
      $pdo->exec('ALTER TABLE admin_users ADD COLUMN session_version INT NOT NULL DEFAULT 0');
    } catch (Throwable $e2) { }
  }
  return 0;
}

/** Redirect to login unless an admin session exists. */
function require_admin(): void {
  admin_session_check();
  if (empty($_SESSION['cg_admin'])) {
    header('Location: login.php');
    exit;
  }
  // Password changed elsewhere? This session's version is stale: drop it.
  try {
    $ver = admin_session_version(db(), (string)$_SESSION['cg_admin']);
    if (($_SESSION['sess_ver'] ?? -1) !== $ver) {
      $_SESSION = [];
      session_destroy();
      header('Location: login.php');
      exit;
    }
  } catch (Throwable $e) { /* fail open: session itself is valid */ }
}

/** Get (or create) the CSRF token for forms. */
function csrf_token(): string {
  ensure_session();
  if (empty($_SESSION['csrf'])) {
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
  }
  return $_SESSION['csrf'];
}

/** Validate the CSRF token on POST. Returns false on mismatch instead of
 * dying: a stale token (old tab, expired session, redeploy) must send the
 * user back to a fresh form with a usable message, not a dead white page.
 * Callers must skip the action when this returns false. */
function csrf_check(): bool {
  ensure_session();
  $sent = $_POST['csrf'] ?? '';
  if (!$sent || !hash_equals($_SESSION['csrf'] ?? '', $sent)) return false;
  return true;
}

/** Escape for HTML output. */
function e(?string $s): string {
  return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8');
}
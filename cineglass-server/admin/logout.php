<?php
// Sign-out: POST + CSRF only, then destroy the session AND delete the
// session cookie (the old GET logout left the cookie usable until expiry).
require_once __DIR__ . '/../config.php';
ensure_session();

if ($_SERVER['REQUEST_METHOD'] === 'POST' && csrf_check()) {
  $_SESSION = [];
  $params = session_get_cookie_params();
  setcookie(session_name(), '', time() - 42000, [
    'path'     => $params['path'] ?? '/',
    'httponly' => true,
    'secure'   => $params['secure'] ?? false,
    'samesite' => 'Lax',
  ]);
  session_destroy();
}
header('Location: login.php');
exit;

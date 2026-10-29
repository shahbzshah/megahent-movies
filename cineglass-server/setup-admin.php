<?php
/**
 * ONE-TIME admin setup. DELETE after first successful run (it is removed
 * by a follow-up deploy; do not leave it on the server).
 *
 * Creates the first admin account ONLY if admin_users is empty, using a
 * password supplied solely through the ADMIN_SETUP_PASS environment
 * variable. The password is never in code, git, chat, or output.
 * Username is fixed to 'admin'. Also seeds the default settings rows
 * (INSERT IGNORE) so app-config returns the same defaults as install.php.
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

$pass = getenv('ADMIN_SETUP_PASS') ?: '';
if ($pass === '') {
  http_response_code(500);
  echo "[ERROR] setup password not configured\n";
  exit;
}

try {
  $pdo = db();

  $defaults = [
    'site_status'     => 'online',
    'offline_message' => 'MegahEnt is temporarily unavailable. Please check back soon.',
    'shell_config'    => json_encode(['url' => null, 'force_offline' => false]),
  ];
  $ins = $pdo->prepare('INSERT IGNORE INTO settings (skey, svalue) VALUES (?, ?)');
  foreach ($defaults as $k => $v) {
    $ins->execute([$k, $v]);
  }

  $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM admin_users')->fetch()['c'];
  if ($count === 0) {
    $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
        ->execute(['admin', password_hash($pass, PASSWORD_DEFAULT)]);
    echo "[ok] admin account created\n";
  } else {
    echo "[ok] admin account already exists\n";
  }
} catch (Throwable $ex) {
  http_response_code(500);
  echo "[ERROR] setup failed\n";
}

<?php
/**
 * One-time installer: creates the tables, seeds default settings,
 * and creates the default admin account.
 *
 * Run once in the browser:  http://your-host/MegahEnt-server/install.php
 * DELETE THIS FILE after a successful install on your shared host.
 */
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

const DEFAULT_ADMIN_USER = 'admin';
const DEFAULT_ADMIN_PASS = 'MegahEnt-admin'; // CHANGE IT after first login!

try {
  // 0. Create the database itself if it doesn't exist yet
  $root = new PDO('mysql:host=' . DB_HOST . ';charset=utf8mb4', DB_USER, DB_PASS, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  ]);
  $root->exec('CREATE DATABASE IF NOT EXISTS `' . DB_NAME . '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  echo "[ok] database '" . DB_NAME . "' ready\n";

  $pdo = db();

  // 1. Tables
  $sql = file_get_contents(__DIR__ . '/schema.sql');
  // strip comments and split statements
  $statements = array_filter(
    array_map('trim', preg_split('/;\s*[\r
]+/', preg_replace('/^--.*$/m', '', $sql))),
    fn($s) => $s !== ''
  );
  foreach ($statements as $stmt) {
    $pdo->exec($stmt);
  }
  echo "[ok] tables created
";

  // 2. Default settings
  $defaults = [
    'site_status'     => 'online',
    'offline_message' => 'MegahEnt is temporarily unavailable. Please check back soon.',
    'shell_config'    => json_encode([
      'url'           => null,   // e.g. 'https://MegahEnt.vercel.app' — overrides installed shells when set
      'force_offline' => false,  // true = every desktop app shows "temporarily unavailable"
    ]),
  ];
  $ins = $pdo->prepare('INSERT IGNORE INTO settings (skey, svalue) VALUES (?, ?)');
  foreach ($defaults as $k => $v) {
    $ins->execute([$k, $v]);
  }
  echo "[ok] default settings seeded
";

  // 3. Default admin (only if no admin exists)
  $count = (int)$pdo->query('SELECT COUNT(*) AS c FROM admin_users')->fetch()['c'];
  if ($count === 0) {
    $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)')
        ->execute([DEFAULT_ADMIN_USER, password_hash(DEFAULT_ADMIN_PASS, PASSWORD_DEFAULT)]);
    echo "[ok] admin created — username: " . DEFAULT_ADMIN_USER . ", password: " . DEFAULT_ADMIN_PASS . "
";
    echo "     >>> LOG IN AND CHANGE THE PASSWORD IMMEDIATELY <<<
";
  } else {
    echo "[ok] admin user already exists (skipped)
";
  }

  echo "
DONE. You can now open admin/ and log in.
";
  echo "IMPORTANT: delete install.php from the server now.
";
} catch (Throwable $ex) {
  http_response_code(500);
  echo '[ERROR] ' . $ex->getMessage() . "
";
  echo "Check DB credentials in config.php and that MySQL is running.
";
}
<?php
/**
 * One-time admin password reset.
 *
 * Armed by a SHA-256 hash stored in settings under skey
 * 'admin_reset_token' (the plain code word is never stored anywhere).
 * The user types the code word plus a new password into this form.
 * On success the password is updated, the token row is deleted, and
 * this file deletes itself. Remove from git right after use.
 */
require_once __DIR__ . '/../config.php';
// Start the session BEFORE any output (same reason as login.php:
// csrf_token() is rendered mid-page).
ensure_session();

function reset_code_valid(string $code): bool {
  if ($code === '') return false;
  $stmt = db()->prepare('SELECT svalue FROM settings WHERE skey = ?');
  $stmt->execute(['admin_reset_token']);
  $row = $stmt->fetch();
  return $row && hash_equals($row['svalue'], hash('sha256', $code));
}

$error = '';
$done = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  csrf_check();
  $code = $_POST['code'] ?? '';
  $p1 = $_POST['new_password'] ?? '';
  $p2 = $_POST['confirm_password'] ?? '';

  if (!reset_code_valid($code)) {
    // Guessing burns the code: 5 wrong codes close the reset.
    $_SESSION['reset_attempts'] = ($_SESSION['reset_attempts'] ?? 0) + 1;
    if ($_SESSION['reset_attempts'] >= 5) {
      db()->prepare('DELETE FROM settings WHERE skey = ?')->execute(['admin_reset_token']);
      $error = 'Too many wrong codes. This reset link is now closed — ask for a new one.';
    } else {
      $error = 'That code is not correct.';
    }
  } elseif (strlen($p1) < 8) {
    $error = 'New password must be at least 8 characters.';
  } elseif ($p1 !== $p2) {
    $error = 'Passwords do not match.';
  } else {
    $pdo = db();
    $pdo->prepare('UPDATE admin_users SET password_hash = ? WHERE username = ?')
        ->execute([password_hash($p1, PASSWORD_DEFAULT), 'admin']);
    $pdo->prepare('DELETE FROM settings WHERE skey = ?')->execute(['admin_reset_token']);
    unset($_SESSION['reset_attempts']);
    $done = true;
    // The token row is gone, so this page is dead regardless; remove the
    // file itself too so nothing reset-capable remains on disk.
    @unlink(__FILE__);
  }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MegahEnt Admin — Reset password</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  body {
    min-height:100vh; display:flex; align-items:center; justify-content:center;
    background:#050505;
    background-image:radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,87,26,.12), transparent);
    color:#e5e2e1;
    font-family:'Segoe UI', system-ui, sans-serif;
  }
  .card {
    width:min(400px, 92vw); background:#131313; border:1px solid rgba(255,255,255,.08);
    border-radius:18px; padding:38px 34px;
    box-shadow:0 24px 70px rgba(0,0,0,.55), 0 0 0 1px rgba(255,87,26,.06);
  }
  .logo {
    font-size:30px; font-weight:800; letter-spacing:-.5px; text-align:center; margin-bottom:6px;
    color:#fff; font-family:Sora,'Segoe UI',sans-serif;
  }
  .logo span {
    background:linear-gradient(90deg,#ffb59e,#ff571a);
    -webkit-background-clip:text; background-clip:text; color:transparent;
  }
  .sub { text-align:center; color:#9ca3af; font-size:12.5px; margin-bottom:28px; text-transform:uppercase; letter-spacing:2px }
  label { display:block; font-size:11px; color:#9ca3af; margin:14px 0 6px; letter-spacing:1px; text-transform:uppercase }
  input {
    width:100%; padding:12px 14px; border-radius:10px; font-size:14px;
    background:#1c1c1c; border:1px solid rgba(255,255,255,.09); color:#fff; outline:none;
    transition:border-color .2s, box-shadow .2s;
  }
  input:focus { border-color:#ff571a; box-shadow:0 0 0 3px rgba(255,87,26,.15) }
  button {
    width:100%; margin-top:24px; padding:13px; border:0; border-radius:10px;
    background:linear-gradient(135deg,#ff571a,#ffb59e); color:#180400;
    font-weight:800; font-size:14px; cursor:pointer; letter-spacing:.3px;
    transition:transform .15s, opacity .2s;
  }
  button:hover { transform:translateY(-1px); opacity:.95 }
  button:active { transform:translateY(0) }
  .err {
    margin-top:16px; padding:10px 14px; border-radius:8px; font-size:13px;
    background:#3b1113; border:1px solid #7f1d1d; color:#fca5a5;
  }
  .ok {
    margin-top:16px; padding:10px 14px; border-radius:8px; font-size:13px;
    background:#0f2b16; border:1px solid #166534; color:#bbf7d0;
  }
  .ok a { color:#fff; font-weight:700 }
</style>
</head>
<body>
  <div class="card">
    <div class="logo">MEGAH<span>ENT</span></div>
    <p class="sub">Reset admin password</p>
    <?php if ($done): ?>
      <div class="ok">Password changed. This reset page no longer works. <a href="login.php">Sign in with the new password.</a></div>
    <?php else: ?>
      <form method="post" autocomplete="off">
        <label for="code">One-time code</label>
        <input id="code" name="code" required autofocus>
        <label for="p1">New password (min 8 chars)</label>
        <input id="p1" name="new_password" type="password" required minlength="8">
        <label for="p2">New password again</label>
        <input id="p2" name="confirm_password" type="password" required minlength="8">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <?php if ($error): ?><div class="err"><?= e($error) ?></div><?php endif; ?>
        <button type="submit">Set new password</button>
      </form>
    <?php endif; ?>
  </div>
</body>
</html>

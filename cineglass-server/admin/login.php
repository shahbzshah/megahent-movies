<?php
require_once __DIR__ . '/../config.php';
// Start the session BEFORE any output: csrf_token() is rendered mid-page,
// and session_start() after output has begun cannot set the session cookie,
// which made every login fail CSRF validation. (index.php/logout.php
// already start it up top via require_admin()/ensure_session().)
ensure_session();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!csrf_check()) {
    // Stale token (old tab, expired session, redeploy wiped the session):
    // show the form again with a fresh token instead of a dead page.
    $error = 'Your session expired — please sign in again.';
  } else {
  $username = trim($_POST['username'] ?? '');
  $password = $_POST['password'] ?? '';
  $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

  if (!login_allowed($ip)) {
    http_response_code(429);
    $error = 'Too many failed attempts — try again in 15 minutes.';
  } else {
    $stmt = db()->prepare('SELECT * FROM admin_users WHERE username = ?');
    $stmt->execute([$username]);
    $user = $stmt->fetch();

    // Always run a verify (dummy hash when the user does not exist) so
    // a missing username is not measurably faster than a wrong password.
    $hash = $user ? $user['password_hash'] : password_hash('dummy', PASSWORD_DEFAULT);
    if ($user && password_verify($password, $hash)) {
      login_cleared($ip);
      session_regenerate_id(true);
      $_SESSION['cg_admin'] = $user['username'];
      $_SESSION['sess_ver'] = admin_session_version(db(), $user['username']);
      $_SESSION['last_activity'] = time();
      header('Location: index.php');
      exit;
    }
    login_failed($ip);
    error_log('admin login failed: ' . $ip . ' user=' . $username);
    $error = 'Invalid username or password.';
  }
  }
}
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MegahEnt Admin — Sign in</title>
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
</style>
</head>
<body>
  <form class="card" method="post" autocomplete="off">
    <div class="logo">MEGAH<span>ENT</span></div>
    <p class="sub">Admin control panel</p>
    <label for="username">Username</label>
    <input id="username" name="username" required autofocus>
    <label for="password">Password</label>
    <input id="password" name="password" type="password" required>
    <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
    <?php if ($error): ?><div class="err"><?= e($error) ?></div><?php endif; ?>
    <button type="submit">Sign in</button>
  </form>
</body>
</html>
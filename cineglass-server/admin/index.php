<?php
/**
 * MegahEnt Admin — control panel.
 * Sidebar views: dashboard, site status, announcements, collections,
 * desktop shell remote config, settings, security.
 */
require_once __DIR__ . '/../config.php';
require_admin();

$pdo = db();
$flash = '';
$VIEWS = ['dashboard', 'status', 'announcements', 'collections', 'shell', 'livetv', 'settings', 'security'];

/* ----------------------------- POST handlers ----------------------------- */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (!csrf_check()) {
    // Stale token (old tab, expired session, redeploy): back to a fresh
    // panel with a usable message instead of a dead page.
    header('Location: index.php?view=dashboard&saved=' . urlencode('Your session expired — please try again.'));
    exit;
  }
  $action = $_POST['action'] ?? '';
  $back   = in_array($_POST['view'] ?? '', $VIEWS, true) ? $_POST['view'] : 'dashboard';

  switch ($action) {

    case 'save_status':
      $status = ($_POST['site_status'] ?? 'online') === 'offline' ? 'offline' : 'online';
      $msg    = trim($_POST['offline_message'] ?? '');
      if ($msg === '') $msg = 'MegahEnt is temporarily unavailable. Please check back soon.';
      $st = $pdo->prepare('INSERT INTO settings (skey, svalue) VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)');
      $st->execute(['site_status', $status]);
      $st->execute(['offline_message', $msg]);
      $flash = 'Site status saved — changes reach every app within seconds.';
      break;

    case 'save_tmdb_key':
      // TMDB v3 API keys are 32 hex characters. The key is stored in the
      // database and never shown back anywhere in the panel.
      $key = trim($_POST['tmdb_api_key'] ?? '');
      if ($key === '') {
        $flash = 'Paste a TMDB API key first.';
      } elseif (!preg_match('/^[a-f0-9]{32}$/i', $key)) {
        $flash = 'That does not look like a TMDB API key (v3) — it should be 32 letters and numbers. Nothing was saved.';
      } else {
        $st = $pdo->prepare('INSERT INTO settings (skey, svalue) VALUES (?, ?)
                             ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)');
        $st->execute(['tmdb_api_key', $key]);
        $flash = 'TMDB key saved — titles load within seconds.';
      }
      break;

    case 'clear_tmdb_key':
      $pdo->prepare('DELETE FROM settings WHERE skey = ?')->execute(['tmdb_api_key']);
      $flash = 'Saved TMDB key removed. The app now uses the server environment key if one is set.';
      break;

    case 'announcement_add':
      $message = trim($_POST['message'] ?? '');
      $icon    = trim($_POST['icon'] ?: 'campaign');
      if ($message !== '') {
        // only one active announcement at a time
        $pdo->exec('UPDATE announcements SET enabled = 0');
        $pdo->prepare('INSERT INTO announcements (message, icon, enabled) VALUES (?, ?, 1)')
            ->execute([$message, preg_replace('/[^a-z_]/', '', strtolower($icon)) ?: 'campaign']);
        $flash = 'Announcement published.';
      }
      break;

    case 'announcement_toggle':
      $id = (int)($_POST['id'] ?? 0);
      $pdo->prepare('UPDATE announcements SET enabled = 1 - enabled WHERE id = ?')->execute([$id]);
      $flash = 'Announcement updated.';
      break;

    case 'announcement_delete':
      $pdo->prepare('DELETE FROM announcements WHERE id = ?')->execute([(int)($_POST['id'] ?? 0)]);
      $flash = 'Announcement deleted.';
      break;

    case 'collection_add':
      $title = trim($_POST['title'] ?? '');
      $order = (int)($_POST['sort_order'] ?? 0);
      if ($title !== '') {
        $pdo->prepare('INSERT INTO collections (title, sort_order) VALUES (?, ?)')
            ->execute([$title, $order]);
        $flash = 'Collection "' . $title . '" created.';
      }
      break;

    case 'collection_delete':
      $pdo->prepare('DELETE FROM collections WHERE id = ?')->execute([(int)($_POST['id'] ?? 0)]);
      $flash = 'Collection deleted.';
      break;

    case 'item_add':
      $cid     = (int)($_POST['collection_id'] ?? 0);
      $tmdbId  = (int)($_POST['tmdb_id'] ?? 0);
      $type    = ($_POST['media_type'] ?? 'movie') === 'tv' ? 'tv' : 'movie';
      if ($cid > 0 && $tmdbId > 0) {
        $pdo->prepare('INSERT INTO collection_items (collection_id, tmdb_id, media_type) VALUES (?, ?, ?)')
            ->execute([$cid, $tmdbId, $type]);
        $flash = "TMDB #$tmdbId added.";
      }
      break;

    case 'item_delete':
      $pdo->prepare('DELETE FROM collection_items WHERE id = ?')->execute([(int)($_POST['id'] ?? 0)]);
      $flash = 'Item removed.';
      break;

    case 'save_shell_config':
      // Shell URLs are fetched by installed apps without any signature
      // check (signing lands with the shell rebuilds in Phase 4), so the
      // minimum server-side bar is: https only, no credentials, and a
      // host that resolves to a public address.
      require_once __DIR__ . '/../proxy-guard.php';
      $cfg = [
        'url'           => trim($_POST['app_url'] ?? '') ?: null,
        'filter_url'    => trim($_POST['filter_url'] ?? '') ?: null,
        'force_offline' => isset($_POST['force_offline']),
      ];
      $bad = null;
      foreach (['url' => 'App URL', 'filter_url' => 'Filter list URL'] as $k => $label) {
        if ($cfg[$k] !== null && $cfg[$k] !== '') {
          $err = guard_public_url($cfg[$k], [443]);
          if ($err !== null) { $bad = $label . ': ' . $err; break; }
          if (strpos($cfg[$k], 'https://') !== 0) { $bad = $label . ': must use https'; break; }
        }
      }
      if ($bad !== null) {
        $flash = 'App config NOT saved — ' . $bad . '.';
        break;
      }
      $st = $pdo->prepare('INSERT INTO settings (skey, svalue) VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)');
      $st->execute(['shell_config', json_encode($cfg)]);
      $flash = 'App config saved — installed shells pick it up within a minute.';
      break;

    case 'save_live_tv':
      $enabled = isset($_POST['livetv_enabled']) ? '1' : '0';
      $st = $pdo->prepare('INSERT INTO settings (skey, svalue) VALUES (?, ?)
                           ON DUPLICATE KEY UPDATE svalue = VALUES(svalue)');
      $st->execute(['livetv_enabled', $enabled]);
      $flash = $enabled === '1' ? 'Live TV enabled.' : 'Live TV disabled — every app hides it within seconds.';
      break;

    case 'change_password':
      $current = $_POST['current_password'] ?? '';
      $new     = $_POST['new_password'] ?? '';
      $stmt = $pdo->prepare('SELECT * FROM admin_users WHERE username = ?');
      $stmt->execute([$_SESSION['cg_admin']]);
      $user = $stmt->fetch();
      if (!$user || !password_verify($current, $user['password_hash'])) {
        $flash = 'Current password is incorrect.';
      } elseif (strlen($new) < 8) {
        $flash = 'New password must be at least 8 characters.';
      } else {
        $pdo->prepare('UPDATE admin_users SET password_hash = ?, session_version = session_version + 1 WHERE id = ?')
            ->execute([password_hash($new, PASSWORD_DEFAULT), $user['id']]);
        // This session stays valid (it just changed the password); every
        // other session is dropped by require_admin()'s version check.
        session_regenerate_id(true);
        $_SESSION['sess_ver'] = admin_session_version($pdo, $user['username']);
        $flash = 'Password changed. Other sessions were signed out.';
      }
      break;
  }

  header('Location: index.php?view=' . urlencode($back) . '&saved=' . urlencode($flash));
  exit;
}

/* ------------------------------ Load data -------------------------------- */
$view = in_array($_GET['view'] ?? '', $VIEWS, true) ? ($_GET['view'] ?? 'dashboard') : 'dashboard';

$settings = [];
foreach ($pdo->query('SELECT skey, svalue FROM settings') as $row) {
  $settings[$row['skey']] = $row['svalue'];
}
$status         = ($settings['site_status'] ?? 'online') === 'offline' ? 'offline' : 'online';
$offlineMessage = $settings['offline_message'] ?? '';
$shellConfig    = json_decode($settings['shell_config'] ?? '{}', true) ?: [];

$announcements = $pdo->query('SELECT * FROM announcements ORDER BY id DESC')->fetchAll();
$collections   = $pdo->query('SELECT * FROM collections ORDER BY sort_order ASC, id ASC')->fetchAll();
$itemsStmt     = $pdo->prepare('SELECT * FROM collection_items WHERE collection_id = ? ORDER BY sort_order ASC, id ASC');

$liveTvEnabled = ($settings['livetv_enabled'] ?? '1') === '1';

// TMDB key: the server environment key (Render) wins when set; otherwise
// the key saved in Settings is used. The value itself is never rendered.
$tmdbEnvSet = getenv('TMDB_API_KEY') !== false && getenv('TMDB_API_KEY') !== '';
$tmdbDbSet  = !empty($settings['tmdb_api_key']);

// Dashboard stats (fail soft if scanner tables are missing)
$stats = ['pending_jobs' => 0, 'dead_titles' => 0, 'scanned' => 0];
try {
  $stats['pending_jobs'] = (int) $pdo->query('SELECT COUNT(*) FROM availability_jobs')->fetchColumn();
  $stats['dead_titles']  = (int) $pdo->query('SELECT COUNT(*) FROM availability WHERE available = 0 AND deep_done = 1')->fetchColumn();
  $stats['scanned']      = (int) $pdo->query('SELECT COUNT(*) FROM availability')->fetchColumn();
} catch (Exception $e) { }
$activeAnnouncement = null;
foreach ($announcements as $a) { if ($a['enabled']) { $activeAnnouncement = $a; break; } }

$csrf = csrf_token();

$NAV = [
  'dashboard'     => ['space_dashboard', 'Dashboard'],
  'status'        => ['power_settings_new', 'Site Status'],
  'livetv'        => ['live_tv', 'Live TV'],
  'announcements' => ['campaign', 'Announcements'],
  'collections'   => ['video_library', 'Collections'],
  'shell'         => ['devices', 'App Config'],
  'settings'      => ['tune', 'Settings'],
  'security'      => ['lock', 'Security'],
];
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MegahEnt Admin</title>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box }
  :root {
    --grad: linear-gradient(135deg,#ff571a,#ffb59e);
    --line: rgba(255,255,255,.08);
    --surface: #131313;
  }
  body {
    background:#050505; color:#e5e2e1;
    font-family:'Segoe UI', system-ui, sans-serif; font-size:14px;
    background-image:radial-gradient(ellipse 60% 40% at 80% -10%, rgba(255,87,26,.08), transparent);
  }

  /* ---------- Sidebar ---------- */
  aside {
    position:fixed; inset:0 auto 0 0; width:236px; z-index:40;
    background:#0d0d0d; border-right:1px solid var(--line);
    display:flex; flex-direction:column; padding:22px 14px;
  }
  .brand { padding:4px 12px 24px; font-family:Sora,sans-serif; font-weight:800; font-size:19px; letter-spacing:-.3px }
  .brand span { background:var(--grad); -webkit-background-clip:text; background-clip:text; color:transparent }
  .brand small { display:block; font-size:10px; font-weight:600; color:#9ca3af; letter-spacing:2.5px; margin-top:3px }
  nav { flex:1; display:flex; flex-direction:column; gap:3px }
  nav a {
    display:flex; align-items:center; gap:11px; padding:11px 13px; border-radius:10px;
    color:#9ca3af; text-decoration:none; font-size:13.5px; font-weight:600;
    border-left:3px solid transparent; transition:all .18s;
  }
  nav a:hover { color:#fff; background:rgba(255,255,255,.04) }
  nav a.active { color:#ffb59e; background:rgba(255,87,26,.09); border-left-color:#ff571a }
  nav a.active .material-symbols-outlined { color:#ff571a }
  nav a .material-symbols-outlined { font-size:20px; color:#8b8b8b }
  .side-foot { border-top:1px solid var(--line); padding-top:14px; margin-top:14px }
  .side-foot .mono { display:block; padding:0 13px 10px; font-size:12px }

  /* ---------- Layout ---------- */
  .shell-main { margin-left:236px; min-height:100vh; display:flex; flex-direction:column }
  topbar, .topbar {
    display:none; align-items:center; justify-content:space-between;
    padding:12px 18px; background:rgba(19,19,19,.9); position:sticky; top:0; z-index:30;
    border-bottom:1px solid var(--line);
  }
  main.content { flex:1; width:100%; max-width:900px; margin:0 auto; padding:34px 26px 80px }

  /* ---------- Cards / forms / tables ---------- */
  section {
    background:var(--surface); border:1px solid var(--line); border-radius:16px;
    padding:26px; margin-bottom:22px; transition:border-color .2s;
  }
  section:hover { border-color:rgba(255,87,26,.22) }
  h1 { font-family:Sora,sans-serif; font-size:24px; font-weight:800; margin-bottom:6px }
  h2 { font-size:17px; margin-bottom:4px; font-weight:700 }
  .hint { color:#8b8b8b; font-size:12.5px; margin-bottom:16px; line-height:1.55 }
  label { display:block; font-size:11px; color:#9ca3af; margin:12px 0 5px; text-transform:uppercase; letter-spacing:.8px }
  input[type=text], input[type=password], input[type=number], textarea, select {
    width:100%; padding:11px 13px; border-radius:10px; font-size:14px;
    background:#1c1c1c; border:1px solid var(--line); color:#fff; outline:none;
    transition:border-color .2s, box-shadow .2s;
  }
  input:focus, textarea:focus, select:focus { border-color:#ff571a; box-shadow:0 0 0 3px rgba(255,87,26,.14) }
  textarea { min-height:70px; resize:vertical }
  input[type=checkbox] { accent-color:#ff571a; width:16px; height:16px }
  button {
    padding:10px 20px; border:0; border-radius:9px; cursor:pointer;
    background:var(--grad); color:#180400; font-weight:800; font-size:13px; letter-spacing:.2px;
    transition:transform .15s, opacity .2s;
  }
  button:hover { transform:translateY(-1px); opacity:.94 }
  button.danger { background:rgba(220,38,38,.12); color:#fca5a5; border:1px solid rgba(220,38,38,.45) }
  button.small { padding:6px 14px; font-size:12px }
  .row { display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap }
  .row > div { flex:1; min-width:140px }
  table { width:100%; border-collapse:collapse; margin-top:12px }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid rgba(255,255,255,.05); font-size:13px }
  th { color:#8b8b8b; font-weight:600; font-size:11px; text-transform:uppercase; letter-spacing:.8px }
  tr:hover td { background:rgba(255,255,255,.02) }
  .pill { display:inline-block; padding:3px 11px; border-radius:99px; font-size:11px; font-weight:800; letter-spacing:.5px }
  .pill.on  { background:rgba(22,163,74,.12); color:#86efac; border:1px solid rgba(22,163,74,.4) }
  .pill.off { background:rgba(220,38,38,.12); color:#fca5a5; border:1px solid rgba(220,38,38,.4) }
  .pill.brand { background:rgba(255,87,26,.12); color:#ffb59e; border:1px solid rgba(255,87,26,.4) }
  .flash {
    background:rgba(22,163,74,.1); border:1px solid rgba(22,163,74,.4); color:#86efac;
    padding:12px 18px; border-radius:11px; margin-bottom:22px; font-size:13.5px;
  }
  .mono { font-family:Consolas, monospace; font-size:12.5px; color:#9ca3af }
  hr { border:0; border-top:1px solid var(--line); margin:18px 0 }

  /* ---------- Dashboard stats ---------- */
  .stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:14px; margin-bottom:26px }
  .stat {
    background:var(--surface); border:1px solid var(--line); border-radius:14px; padding:18px;
  }
  .stat .material-symbols-outlined { font-size:26px; color:#ff571a }
  .stat b { display:block; font-family:Sora,sans-serif; font-size:26px; margin:6px 0 2px }
  .stat span.lbl { font-size:11.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:.8px }
  .quick { display:flex; flex-wrap:wrap; gap:10px }
  .quick a {
    display:inline-flex; align-items:center; gap:8px; padding:10px 16px; border-radius:10px;
    background:var(--surface); border:1px solid var(--line); color:#e5e2e1;
    text-decoration:none; font-size:13px; font-weight:600; transition:border-color .2s;
  }
  .quick a:hover { border-color:rgba(255,87,26,.4); color:#ffb59e }
  .quick a .material-symbols-outlined { font-size:18px; color:#ff571a }

  @media (max-width: 900px) {
    aside { display:none }
    .topbar { display:flex }
    /* The base `nav` rule is a vertical column for the sidebar; the mobile
       topbar must override that or the links stack down the whole screen. */
    .topbar nav { display:flex; flex-direction:row; flex:1; min-width:0; align-items:center; gap:6px; overflow-x:auto; scrollbar-width:none }
    .topbar nav::-webkit-scrollbar { display:none }
    .topbar a {
      display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:9px;
      color:#9ca3af; text-decoration:none; font-size:12.5px; font-weight:600; white-space:nowrap;
    }
    .topbar a.active { color:#ffb59e; background:rgba(255,87,26,.1) }
    .shell-main { margin-left:0 }
    main.content { padding:24px 16px 80px }
  }
</style>
</head>
<body>

<aside>
  <div class="brand">MEGAH<span>ENT</span><small>ADMIN PANEL</small></div>
  <nav>
    <?php foreach ($NAV as $key => [$icon, $label]): ?>
    <a href="index.php?view=<?= $key ?>" class="<?= $view === $key ? 'active' : '' ?>">
      <span class="material-symbols-outlined"><?= $icon ?></span><?= $label ?>
    </a>
    <?php endforeach; ?>
  </nav>
  <div class="side-foot">
    <span class="mono"><?= e($_SESSION['cg_admin']) ?></span>
    <form method="post" action="logout.php">
      <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
      <nav>
        <button type="submit" style="background:none;border:0;color:#9ca3af;display:flex;align-items:center;gap:11px;padding:11px 13px;border-radius:10px;font-size:13.5px;font-weight:600;cursor:pointer;width:100%;text-align:left"><span class="material-symbols-outlined">logout</span>Sign out</button>
      </nav>
    </form>
  </div>
</aside>

<div class="shell-main">
  <!-- Mobile top nav -->
  <div class="topbar">
    <div class="logo" style="font-family:Sora;font-weight:800">MEGAH<span style="background:var(--grad);-webkit-background-clip:text;background-clip:text;color:transparent">ENT</span></div>
    <nav>
      <?php foreach ($NAV as $key => [$icon, $label]): ?>
      <a href="index.php?view=<?= $key ?>" class="<?= $view === $key ? 'active' : '' ?>"><span class="material-symbols-outlined" style="font-size:17px"><?= $icon ?></span><?= $label ?></a>
      <?php endforeach; ?>
      <form method="post" action="logout.php" style="display:inline">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <button type="submit" style="background:none;border:0;color:#fca5a5;font-size:12.5px;font-weight:600;cursor:pointer;padding:8px 12px">Exit</button>
      </form>
    </nav>
  </div>

  <main class="content">
  <?php if (!empty($_GET['saved'])): ?>
    <div class="flash"><?= e($_GET['saved']) ?></div>
  <?php endif; ?>

  <?php if ($view === 'dashboard'): ?>

    <h1>Dashboard</h1>
    <p class="hint">Everything you control here reaches every MegahEnt app automatically.</p>

    <div class="stat-grid">
      <div class="stat">
        <span class="material-symbols-outlined"><?= $status === 'online' ? 'cloud_done' : 'cloud_off' ?></span>
        <b><?= strtoupper($status) ?></b><span class="lbl">Site status</span>
      </div>
      <div class="stat">
        <span class="material-symbols-outlined">movie_filter</span>
        <b><?= count($collections) ?></b><span class="lbl">Curated rows</span>
      </div>
      <div class="stat">
        <span class="material-symbols-outlined">fact_check</span>
        <b><?= number_format($stats['scanned']) ?></b><span class="lbl">Titles scanned</span>
      </div>
      <div class="stat">
        <span class="material-symbols-outlined"><?= $stats['pending_jobs'] > 0 ? 'pending' : 'task_alt' ?></span>
        <b><?= number_format($stats['pending_jobs']) ?></b><span class="lbl">Deep scans queued</span>
      </div>
    </div>

    <section>
      <h2>Active announcement <?= $activeAnnouncement ? '<span class="pill brand">LIVE</span>' : '<span class="pill off">NONE</span>' ?></h2>
      <p class="hint" style="margin-bottom:8px"><?= $activeAnnouncement ? e($activeAnnouncement['message']) : 'No banner is being shown right now.' ?></p>
    </section>

    <section>
      <h2>Quick actions</h2>
      <div class="quick">
        <a href="index.php?view=status"><span class="material-symbols-outlined">power_settings_new</span>Kill switch</a>
        <a href="index.php?view=announcements"><span class="material-symbols-outlined">campaign</span>Publish announcement</a>
        <a href="index.php?view=collections"><span class="material-symbols-outlined">video_library</span>Curated rows</a>
        <a href="index.php?view=shell"><span class="material-symbols-outlined">devices</span>Repoint apps</a>
        <a href="index.php?view=settings"><span class="material-symbols-outlined">tune</span>Settings</a>
      </div>
    </section>

  <?php elseif ($view === 'status'): ?>

    <h1>Site Status</h1>
    <section>
      <h2>Kill switch <?= $status === 'online' ? '<span class="pill on">ONLINE</span>' : '<span class="pill off">OFFLINE</span>' ?></h2>
      <p class="hint">
        Switching to OFFLINE makes the entire app — web and installed apps — show a branded
        &ldquo;temporarily unavailable&rdquo; screen within seconds, without redeploying anything.
      </p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="save_status">
        <input type="hidden" name="view" value="status">
        <label>Status</label>
        <select name="site_status">
          <option value="online"  <?= $status === 'online'  ? 'selected' : '' ?>>Online — app works normally</option>
          <option value="offline" <?= $status === 'offline' ? 'selected' : '' ?>>Offline — show &ldquo;temporarily unavailable&rdquo;</option>
        </select>
        <label>Message shown while offline</label>
        <textarea name="offline_message" placeholder="MegahEnt is temporarily unavailable..."><?= e($offlineMessage) ?></textarea>
        <p style="margin-top:16px"><button type="submit">Save status</button></p>
      </form>
    </section>

  <?php elseif ($view === 'announcements'): ?>

    <h1>Announcements</h1>
    <section>
      <h2>Publish banner</h2>
      <p class="hint">One banner at a time shows at the top of the app. Publishing replaces the current active banner.</p>
      <form method="post" class="row">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="announcement_add">
        <input type="hidden" name="view" value="announcements">
        <div style="flex:3"><label>Message</label><input type="text" name="message" required placeholder="New titles added this week!"></div>
        <div style="flex:1"><label>Icon (Material Symbols)</label><input type="text" name="icon" value="campaign"></div>
        <div style="flex:0"><button type="submit">Publish</button></div>
      </form>
    </section>

    <section>
      <h2>History</h2>
      <?php if ($announcements): ?>
      <table>
        <tr><th>Message</th><th>State</th><th style="width:180px"></th></tr>
        <?php foreach ($announcements as $a): ?>
        <tr>
          <td><?= e($a['message']) ?> <span class="mono">(<?= e($a['icon']) ?>)</span></td>
          <td><?= $a['enabled'] ? '<span class="pill on">ACTIVE</span>' : '<span class="pill off">HIDDEN</span>' ?></td>
          <td>
            <form method="post" style="display:inline">
              <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
              <input type="hidden" name="action" value="announcement_toggle">
              <input type="hidden" name="view" value="announcements">
              <input type="hidden" name="id" value="<?= (int)$a['id'] ?>">
              <button class="small" type="submit"><?= $a['enabled'] ? 'Hide' : 'Show' ?></button>
            </form>
            <form method="post" style="display:inline">
              <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
              <input type="hidden" name="action" value="announcement_delete">
              <input type="hidden" name="view" value="announcements">
              <input type="hidden" name="id" value="<?= (int)$a['id'] ?>">
              <button class="small danger" type="submit">Delete</button>
            </form>
          </td>
        </tr>
        <?php endforeach; ?>
      </table>
      <?php else: ?>
      <p class="hint">Nothing published yet.</p>
      <?php endif; ?>
    </section>

  <?php elseif ($view === 'collections'): ?>

    <h1>Collections</h1>
    <section>
      <h2>New curated row</h2>
      <p class="hint">
        Rows appear on the home screen above Trending. Add items by TMDB id
        (<span class="mono">themoviedb.org/movie/693134</span> → <span class="mono">693134</span>).
      </p>
      <form method="post" class="row">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="collection_add">
        <input type="hidden" name="view" value="collections">
        <div style="flex:3"><label>Row title</label><input type="text" name="title" required placeholder="Editor's Picks"></div>
        <div style="flex:1"><label>Sort order</label><input type="number" name="sort_order" value="0"></div>
        <div style="flex:0"><button type="submit">Add row</button></div>
      </form>
    </section>

    <?php foreach ($collections as $col):
      $itemsStmt->execute([$col['id']]);
      $items = $itemsStmt->fetchAll();
    ?>
    <section>
      <div class="row" style="align-items:center">
        <h2 style="flex:1"><?= e($col['title']) ?> <span class="mono">(<?= count($items) ?> items)</span></h2>
        <form method="post">
          <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
          <input type="hidden" name="action" value="collection_delete">
          <input type="hidden" name="view" value="collections">
          <input type="hidden" name="id" value="<?= (int)$col['id'] ?>">
          <button class="small danger" type="submit">Delete row</button>
        </form>
      </div>
      <?php if ($items): ?>
      <table>
        <tr><th>TMDB id</th><th>Type</th><th style="width:110px"></th></tr>
        <?php foreach ($items as $it): ?>
        <tr>
          <td class="mono"><?= (int)$it['tmdb_id'] ?></td>
          <td><?= e($it['media_type']) ?></td>
          <td>
            <form method="post">
              <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
              <input type="hidden" name="action" value="item_delete">
              <input type="hidden" name="view" value="collections">
              <input type="hidden" name="id" value="<?= (int)$it['id'] ?>">
              <button class="small danger" type="submit">Remove</button>
            </form>
          </td>
        </tr>
        <?php endforeach; ?>
      </table>
      <?php else: ?>
      <p class="hint">This row has no items yet.</p>
      <?php endif; ?>
      <form method="post" class="row" style="margin-top:12px">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="item_add">
        <input type="hidden" name="view" value="collections">
        <input type="hidden" name="collection_id" value="<?= (int)$col['id'] ?>">
        <div style="flex:1"><label>TMDB id</label><input type="number" name="tmdb_id" required min="1"></div>
        <div style="flex:1">
          <label>Type</label>
          <select name="media_type"><option value="movie">Movie</option><option value="tv">TV Show</option></select>
        </div>
        <div style="flex:0"><button class="small" type="submit">Add item</button></div>
      </form>
    </section>
    <?php endforeach; ?>

  <?php elseif ($view === 'shell'): ?>

    <h1>App Config</h1>
    <section>
      <h2>Installed shells remote config</h2>
      <p class="hint">
        Installed Android/desktop apps check this at startup and every minute while running.
        Setting an App URL repoints them instantly. Filter URL overrides where ad-blocking lists load from.
        Force-offline takes every installed app down even before the website loads.
      </p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="save_shell_config">
        <input type="hidden" name="view" value="shell">
        <label>App URL override (empty = URL baked into each install)</label>
        <input type="text" name="app_url" placeholder="https://movies.archimnet.com" value="<?= e($shellConfig['url'] ?? '') ?>">
        <label>Filter list URL override (empty = built-in list)</label>
        <input type="text" name="filter_url" placeholder="https://movies.archimnet.com/cineglass-filters.txt" value="<?= e($shellConfig['filter_url'] ?? '') ?>">
        <label class="switch" style="margin-top:14px">
          <input type="checkbox" name="force_offline" <?= !empty($shellConfig['force_offline']) ? 'checked' : '' ?>>
          Force all installed apps offline
        </label>
        <p style="margin-top:16px"><button type="submit">Save app config</button></p>
      </form>
    </section>

  <?php elseif ($view === 'livetv'): ?>

    <h1>Live TV</h1>
    <section>
      <h2>Live TV <?= $liveTvEnabled ? '<span class="pill on">ON</span>' : '<span class="pill off">OFF</span>' ?></h2>
      <p class="hint">
        Channels come from the iptv-org public playlists (free-to-air
        streams that broadcasters publish themselves) — Kenya plus news,
        sports, movies, kids and more. Disabling hides the Live TV section
        from every app within seconds — no app update needed.
      </p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="save_live_tv">
        <input type="hidden" name="view" value="livetv">
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;text-transform:none;letter-spacing:0;font-size:13.5px;color:#e5e2e1">
          <input type="checkbox" name="livetv_enabled" value="1" <?= $liveTvEnabled ? 'checked' : '' ?>>
          Show Live TV in the app
        </label>
        <p style="margin-top:16px"><button type="submit">Save Live TV setting</button></p>
      </form>
    </section>

  <?php elseif ($view === 'settings'): ?>

    <h1>Settings</h1>
    <section>
      <h2>TMDB <?= $tmdbEnvSet ? '<span class="pill brand">ENVIRONMENT KEY</span>' : ($tmdbDbSet ? '<span class="pill on">CONFIGURED</span>' : '<span class="pill off">NOT CONFIGURED</span>') ?></h2>
      <p class="hint">
        The key that loads movie and TV titles, posters and details. Paste your
        <b>rotated</b> TMDB API key (v3) here — the old key is in the public
        git history and must not be reused. The key is stored in the database
        and is never shown back. A key set in the server environment takes
        precedence over the one saved here.
      </p>
      <p class="hint">
        Status: <?= $tmdbEnvSet ? 'configured from the server environment — a key saved here is ignored while that is set.' : ($tmdbDbSet ? 'configured from the key saved here.' : 'not configured — titles, posters and details cannot load.') ?>
      </p>
      <form method="post">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="save_tmdb_key">
        <input type="hidden" name="view" value="settings">
        <label>TMDB API key (v3, 32 characters)</label>
        <input type="password" name="tmdb_api_key" placeholder="Paste the rotated key here" autocomplete="off">
        <p style="margin-top:16px"><button type="submit">Save TMDB key</button></p>
      </form>
      <?php if ($tmdbDbSet): ?>
      <form method="post" style="margin-top:10px">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="clear_tmdb_key">
        <input type="hidden" name="view" value="settings">
        <button class="small danger" type="submit">Remove saved key</button>
      </form>
      <?php endif; ?>
    </section>

  <?php elseif ($view === 'security'): ?>

    <h1>Security</h1>
    <section>
      <h2>Change password</h2>
      <p class="hint">Applies to this admin account only.</p>
      <form method="post" class="row">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="change_password">
        <input type="hidden" name="view" value="security">
        <div><label>Current password</label><input type="password" name="current_password" required></div>
        <div><label>New password (min 8 chars)</label><input type="password" name="new_password" required minlength="8"></div>
        <div style="flex:0"><button type="submit">Update</button></div>
      </form>
    </section>

  <?php endif; ?>
  </main>
</div>

</body>
</html>

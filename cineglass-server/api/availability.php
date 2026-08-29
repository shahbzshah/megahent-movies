<?php
/**
 * Availability scanner — two tiers.
 *
 * Tier 1 (fast, inline): VidLink static fingerprint. Real titles render a
 * large page (~90KB); missing ones a tiny 404 shell (~20KB).
 *
 * Tier 2 (async): titles VidLink lacks are HIDDEN immediately and queued for
 * the deep scanner (tools/scan-worker.js + headless Chromium) which checks
 * VidSrc and MultiEmbed in a real browser. If any of them plays the title,
 * the worker flips it back to available and clients resurrect it on their
 * next verification pass.
 *
 * GET availability.php?type=movie&ids=1391021,27205[&maxAgeDays=7]
 *   -> {"results":{"1391021":false,"27205":true}}
 */

require_once __DIR__ . '/../config.php';

const AVAIL_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const AVAIL_MIN_BYTES = 50000;
const MAX_STATIC_SCANS_PER_REQUEST = 20;

function ensureAvailabilityTables(PDO $pdo): void {
  $pdo->exec("CREATE TABLE IF NOT EXISTS availability (
    tmdb_id INT NOT NULL,
    type VARCHAR(8) NOT NULL,
    available TINYINT(1) NOT NULL DEFAULT 1,
    checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tmdb_id, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  try {
    $pdo->exec('ALTER TABLE availability ADD COLUMN deep_done TINYINT(1) NOT NULL DEFAULT 0');
  } catch (Exception $e) { /* column exists */ }
  $pdo->exec("CREATE TABLE IF NOT EXISTS availability_jobs (
    tmdb_id INT NOT NULL,
    type VARCHAR(8) NOT NULL,
    season INT NOT NULL DEFAULT 1,
    episode INT NOT NULL DEFAULT 1,
    queued_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (tmdb_id, type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
}

/** Static VidLink fingerprint. true/false verdict, null = provider down. */
function scanVidLink(string $type, int $tmdbId): ?bool {
  $url = $type === 'tv'
    ? "https://vidlink.pro/tv/{$tmdbId}"
    : "https://vidlink.pro/movie/{$tmdbId}";
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_TIMEOUT        => 15,
    CURLOPT_USERAGENT      => AVAIL_UA,
  ]);
  $body   = curl_exec($ch);
  $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  curl_close($ch);
  if ($status !== 200 || !is_string($body)) return null;
  return strlen($body) >= AVAIL_MIN_BYTES;
}

function spawnWorker(): void {
  // One detached worker at a time; marker file throttles to 1 spawn / 60s.
  $lock = sys_get_temp_dir() . '/cg_scan_worker.lock';
  if (file_exists($lock) && time() - filemtime($lock) < 60) return;
  @touch($lock);
  $script = realpath(__DIR__ . '/../tools/scan-worker.js');
  if (!$script) return;
  // Apache's PATH often lacks node — prefer the well-known install path.
  $nodeAbs = 'C:\\Program Files\\nodejs\\node.exe';
  $node = file_exists($nodeAbs) ? '"' . $nodeAbs . '"' : 'node';
  if (PHP_OS_FAMILY === 'Windows') {
    pclose(popen('start /B "" ' . $node . ' "' . $script . '" > NUL 2>&1', 'r'));
  } else {
    exec("nohup node " . escapeshellarg($script) . " > /dev/null 2>&1 &");
  }
}

$type = ($_GET['type'] ?? '') === 'tv' ? 'tv' : 'movie';
$idsRaw = trim($_GET['ids'] ?? '');
$maxAgeDays = isset($_GET['maxAgeDays']) ? max(0, (int)$_GET['maxAgeDays']) : 7;

if ($idsRaw === '') json_out(['error' => 'ids required'], 400);

$idList = [];
foreach (explode(',', $idsRaw) as $piece) {
  if (ctype_digit(trim($piece))) $idList[] = (int) trim($piece);
}
$idList = array_slice(array_unique($idList), 0, 60);

$pdo = db();
ensureAvailabilityTables($pdo);

$results = [];
$staticBudget = MAX_STATIC_SCANS_PER_REQUEST;
foreach ($idList as $id) {
  $st = $pdo->prepare('SELECT available, deep_done, TIMESTAMPDIFF(HOUR, checked_at, NOW()) AS ageH FROM availability WHERE tmdb_id = ? AND type = ?');
  $st->execute([$id, $type]);
  $row = $st->fetch();

  if ($row && $row['ageH'] <= $maxAgeDays * 24) {
    // Fresh row: final answer if deep-verified or positively available.
    if ((int)$row['deep_done'] === 1 || (int)$row['available'] === 1) {
      $results[(string) $id] = (bool) $row['available'];
      continue;
    }
    // Stale negative awaiting deep scan — make sure it's actually queued.
    // Policy: hide immediately (false); the deep scanner restores it if
    // Vidsrc/MultiEmbed disagree.
    $job = $pdo->prepare('INSERT IGNORE INTO availability_jobs (tmdb_id, type, season, episode) VALUES (?, ?, 1, 1)');
    $job->execute([$id, $type]);
    $results[(string) $id] = false;
    continue;
  }

  if ($staticBudget <= 0) { $results[(string) $id] = true; continue; }
  $staticBudget--;

  $verdict = scanVidLink($type, $id);
  if ($verdict === true || $verdict === null) {
    // Available (or VidLink unreachable -> fail open). Final.
    $up = $pdo->prepare('INSERT INTO availability (tmdb_id, type, available, deep_done, checked_at) VALUES (?, ?, ?, 1, NOW()) ON DUPLICATE KEY UPDATE available = VALUES(available), deep_done = 1, checked_at = NOW()');
    $up->execute([$id, $type, $verdict === null ? 1 : 1]);
    $results[(string) $id] = true;
    continue;
  }

  // VidLink says missing: hide immediately, queue deep verification.
  // The worker flips it back to available if Vidsrc/MultiEmbed have it.
  $up = $pdo->prepare('INSERT INTO availability (tmdb_id, type, available, deep_done, checked_at) VALUES (?, ?, 0, 0, NOW()) ON DUPLICATE KEY UPDATE available = 0, checked_at = NOW()');
  $up->execute([$id, $type]);
  $job = $pdo->prepare('INSERT IGNORE INTO availability_jobs (tmdb_id, type, season, episode) VALUES (?, ?, 1, 1)');
  $job->execute([$id, $type]);
  $results[(string) $id] = false;
}

// Kick the background worker if there is work waiting.
$jobs = (int) $pdo->query('SELECT COUNT(*) FROM availability_jobs')->fetchColumn();
if ($jobs > 0) spawnWorker();

json_out([
  'type'    => $type,
  'jobs'    => $jobs,
  'results' => $results,
]);

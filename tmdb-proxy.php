<?php
// ============================================================
// CineGlass - TMDB CORS Proxy (hardened, Phase 0)
// ------------------------------------------------------------
// The browser cannot call api.themoviedb.org directly because
// TMDB does not send Access-Control-Allow-Origin headers (CORS).
// This proxy forwards read-only /3/... requests to TMDB from the
// server and returns the JSON with CORS headers enabled.
//
// Hardening vs the original:
//  - Path allowlist: only public TMDB read endpoints. Anything else
//    (account, auth, list writes, ...) is rejected.
//  - Caller-supplied api_key / session_id are stripped, never
//    forwarded: the server key is the only credential in play.
//  - No redirect following, TLS verification on, response-size cap.
//  - The key still comes from TMDB_API_KEY env first, then the
//    Admin → Settings database row (never shown back anywhere).
//
// Usage:  tmdb-proxy.php?path=/trending/movie/week&page=2
// ============================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json;charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if (file_exists(__DIR__ . '/cineglass-server/config.php')) {
    require_once __DIR__ . '/cineglass-server/config.php';
}
require_once __DIR__ . '/cineglass-server/proxy-guard.php';

$apiKey = getenv('TMDB_API_KEY') ?: '';
if ($apiKey === '' && function_exists('db')) {
    try {
        $st = db()->prepare('SELECT svalue FROM settings WHERE skey = ?');
        $st->execute(['tmdb_api_key']);
        $row = $st->fetch();
        $apiKey = $row['svalue'] ?? '';
    } catch (Throwable $e) {
        $apiKey = '';
    }
}
if ($apiKey === '') {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'TMDB_API_KEY not configured']);
    exit;
}

$path = isset($_GET['path']) ? trim($_GET['path']) : '';
// Public read endpoints only. Sub-paths (/movie/{id}/credits, /tv/{id}/
// season/{n}, /search/multi, /discover/...) are covered by the prefix.
$allowed = '#^/(trending|movie|tv|search|discover|genre|configuration|person|collection|company|keyword|network|review|episode)/#';
if ($path === '' || $path[0] !== '/' || strpos($path, '/..') !== false || !preg_match($allowed, $path . '/')) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}

$params = ['api_key' => $apiKey, 'language' => 'en-US'];
foreach ($_GET as $k => $v) {
    if ($k === 'path' || $k === 'api_key' || $k === 'session_id') continue;
    if (!preg_match('/^[A-Za-z0-9_]+$/', $k)) continue;
    $params[$k] = (string) $v;
}
$url = 'https://api.themoviedb.org/3' . $path . '?' . http_build_query($params);

[$json, $code, $err] = guard_fetch($url, 20);
if ($json === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => $err]);
    exit;
}
http_response_code($code);
echo $json;

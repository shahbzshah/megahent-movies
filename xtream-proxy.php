<?php
// ============================================================
// CineGlass - Xtream Portal Proxy (hardened, Phase 0)
// ------------------------------------------------------------
// Xtream Codes panels send no CORS headers, so the browser
// cannot call them directly. This proxy forwards player_api.php
// calls to the portal — but only after the portal URL passes
// the SSRF guard: public DNS only, no credentials in the URL,
// an allowlisted port, and NO redirect following (a redirect
// target is a new URL that has not been validated).
//
// NOTE: the portal username/password still travel as query
// params (the panel API requires it). Phase 1 moves portal
// credentials out of URLs entirely; this phase stops the
// proxy being usable as an open relay into private networks.
//
// Usage: xtream-proxy.php?portal=http://host:8080&username=u&password=p&action=...
// ============================================================

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json;charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

require_once __DIR__ . '/cineglass-server/proxy-guard.php';

$portal = isset($_GET['portal']) ? trim($_GET['portal']) : '';
$guardErr = $portal === '' ? 'Missing portal URL'
  : guard_public_url($portal, [80, 443, 8080, 25461]);
if ($guardErr !== null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $guardErr]);
    exit;
}

// player_api.php actions only — nothing else on the panel is proxied.
$action = $_GET['action'] ?? '';
$allowedActions = [
  '', 'get_live_categories', 'get_live_streams', 'get_vod_categories',
  'get_vod_streams', 'get_series_categories', 'get_series',
  'get_series_info', 'get_vod_info', 'get_live_info', 'get_short_epg',
  'get_simple_data_table', 'get_live_streams_by_category',
];
if (!in_array($action, $allowedActions, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Action not allowed']);
    exit;
}

$params = $_GET;
unset($params['portal']);
$url = rtrim($portal, '/') . '/player_api.php?' . http_build_query($params);

[$json, $code, $err] = guard_fetch($url, 30);
if ($json === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => $err]);
    exit;
}
http_response_code($code);
echo $json;

<?php
// ============================================================
// CineGlass - Xtream Portal Proxy
// ------------------------------------------------------------
// Xtream Codes panels send no CORS headers, so the browser
// cannot call them directly. This proxy forwards
// player_api.php calls to the portal configured via the
// mandatory "portal" query parameter.
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

$portal = isset($_GET['portal']) ? trim($_GET['portal']) : '';
if ($portal === '' || !preg_match('#^https?://[a-z0-9.\-]+(:\d+)?(/.*)?$#i', $portal)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid portal URL']);
    exit;
}

$params = $_GET;
unset($params['portal']);

$url = rtrim($portal, '/') . '/player_api.php?' . http_build_query($params);

$json = null;
$code = 502;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 45,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 (CineGlass)',
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $json = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
} else {
    $ctx = stream_context_create(['http' => [
        'timeout' => 45,
        'header'  => "User-Agent: Mozilla/5.0 (CineGlass)\r\nAccept: application/json\r\n",
    ]]);
    $json = @file_get_contents($url, false, $ctx);
    if ($json !== false) $code = 200;
}

if ($json === false || $json === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Portal unreachable']);
    exit;
}

http_response_code($code);
echo $json;

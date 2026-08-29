<?php
// ============================================================
// CineGlass - TMDB CORS Proxy
// ------------------------------------------------------------
// The browser cannot call api.themoviedb.org directly because
// TMDB does not send Access-Control-Allow-Origin headers (CORS).
// This tiny proxy forwards /3/... requests to TMDB from the
// server and returns the JSON with CORS headers enabled.
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

$apiKey = '6d63e69e0427d5ee4820042375e2b762';
$base   = 'https://api.themoviedb.org/3';

$path = isset($_GET['path']) ? trim($_GET['path']) : '';
if ($path === '' || $path[0] !== '/' || strpos($path, '/..') !== false) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid path']);
    exit;
}

$url = $base . $path . '?api_key=' . urlencode($apiKey) . '&language=en-US';

foreach ($_GET as $k => $v) {
    if ($k === 'path') continue;
    $url .= '&' . urlencode($k) . '=' . urlencode((string) $v);
}

$json = null;
$code = 502;

if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
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
        'timeout' => 20,
        'header'  => "User-Agent: Mozilla/5.0 (CineGlass)\r\nAccept: application/json\r\n",
    ]]);
    $json = @file_get_contents($url, false, $ctx);
    if ($json !== false) $code = 200;
}

if ($json === false || $json === null) {
    http_response_code(502);
    echo json_encode(['success' => false, 'error' => 'Upstream request failed']);
    exit;
}

http_response_code($code);
echo $json;

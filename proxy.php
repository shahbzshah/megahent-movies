<?php
/**
 * Local CORS Proxy for StreamDeck IPTV Player
 *
 * Fetches remote content server-side, bypassing browser CORS restrictions.
 * Usage: proxy.php?url=<encoded_url>
 *
 * Security: Only allow http/https URLs. Do not allow localhost/private ranges.
 */

// ---- Config ----
$MAX_SIZE   = 50;      // max response size in MB
$TIMEOUT    = 30;      // max fetch time in seconds
$ALLOW_ORIGIN = '*';   // CORS header (keep * so TV browsers work)

// ---- Read & validate target ----
$target = isset($_GET['url']) ? trim($_GET['url']) : '';
if ($target === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing "url" parameter. Usage: proxy.php?url=<encoded_url>']);
    exit;
}

$parts = @parse_url($target);
if (!$parts || !isset($parts['scheme'], $parts['host'])) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid URL']);
    exit;
}

$scheme = strtolower($parts['scheme']);
if (!in_array($scheme, ['http', 'https'], true)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Only http/https URLs are allowed']);
    exit;
}

// Block obvious SSRF targets (localhost, private ranges)
$host = strtolower($parts['host']);
$blockedHosts = [
    'localhost', '127.0.0.1', '::1', '0.0.0.0',
    '10.', '192.168.', '169.254.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.',
    '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'
];
foreach ($blockedHosts as $b) {
    if ($host === $b || strpos($host, $b) === 0) {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'URL blocked for security']);
        exit;
    }
}

// ---- Fetch remote ----
$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS      => 5,
    CURLOPT_CONNECTTIMEOUT => $TIMEOUT,
    CURLOPT_TIMEOUT        => $TIMEOUT,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => 0,
    CURLOPT_USERAGENT      => 'VLC/3.0.20 LibVLC/3.0.20',
    CURLOPT_HTTPHEADER     => [
        'Accept: */*',
        'Accept-Language: en-US,en;q=0.9',
        'Referer: ' . $parts['scheme'] . '://' . $parts['host'],
        'X-Forwarded-For: 1.1.1.1',
    ],
    CURLOPT_NOPROGRESS     => true,
]);

$response  = curl_exec($ch);
$errno     = curl_errno($ch);
$error     = curl_error($ch);
$info      = curl_getinfo($ch);
$httpCode  = (int)($info['http_code'] ?? 0);
curl_close($ch);

if ($errno !== 0) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Proxy fetch failed: ' . $error]);
    exit;
}

if ($httpCode === 0 || $httpCode >= 400) {
    header('HTTP/1.1 ' . ($httpCode ?: 502) . ' Upstream Error', true, $httpCode ?: 502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Upstream returned HTTP ' . ($httpCode ?: 'unknown')]);
    exit;
}

// Cap response size
if (strlen($response) > $MAX_SIZE * 1024 * 1024) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Response too large (max ' . $MAX_SIZE . ' MB)']);
    exit;
}

// ---- Forward response ----
if (!headers_sent()) {
    header('Access-Control-Allow-Origin: ' . $ALLOW_ORIGIN);
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: *');
    header('Content-Type: ' . ($info['content_type'] ?? 'application/octet-stream'));
}

// Handle OPTIONS preflight
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

echo $response;
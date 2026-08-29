<?php
/**
 * Live TV channel list — scraped from nontongo.win/livetv (the source
 * DaddyLive itself mirrors). Cached 10 minutes; honours the Live TV
 * kill switch (settings.livetv_enabled).
 *
 * Output: [ { id, name, category, logo } ]
 */
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

$settings = [];
foreach (db()->query('SELECT skey, svalue FROM settings') as $row) {
  $settings[$row['skey']] = $row['svalue'];
}
if (($settings['livetv_enabled'] ?? '1') !== '1') {
  http_response_code(503);
  exit(json_encode(['live_disabled' => true, 'error' => 'Live TV is currently disabled']));
}

$cacheFile = sys_get_temp_dir() . '/megahent_nontongo_channels.json';
$TTL = 600;

$channels = null;
if (file_exists($cacheFile) && time() - filemtime($cacheFile) < $TTL) {
  $channels = json_decode((string) file_get_contents($cacheFile), true);
}

if (!is_array($channels)) {
  $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
  $ch = curl_init('https://www.nontongo.win/livetv/');
  curl_setopt_array($ch, array(
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 25,
    CURLOPT_USERAGENT      => $ua,
    CURLOPT_FOLLOWLOCATION => true,
  ));
  $html = curl_exec($ch);
  curl_close($ch);

  if (!is_string($html) || strlen($html) < 10000) {
    http_response_code(502);
    exit(json_encode(['error' => 'Source unreachable']));
  }

  $channels = array();
  $seen = array();
  $chunks = preg_split('/data-stream=/', $html);
  for ($i = 1; $i < count($chunks); $i++) {
    $chunk = $chunks[$i];
    if (!preg_match('#https?://[^"\']*/livetv/(\d+)#', $chunk, $mId)) continue;
    $id = $mId[1];
    if (isset($seen[$id])) continue;
    $logo = '';
    if (preg_match('/src="([^"]+)"/', $chunk, $mLogo)) $logo = html_entity_decode($mLogo[1], ENT_QUOTES);
    $name = '';
    if (preg_match('/event-title">([^<]*)</', $chunk, $mName)) $name = trim(html_entity_decode($mName[1], ENT_QUOTES));
    if ($name === '') continue;
    $cat = 'TV';
    if (preg_match('/event-meta">\s*<span>([^<]*)</', $chunk, $mCat)) $cat = trim(html_entity_decode($mCat[1], ENT_QUOTES));
    if ($cat === '') $cat = 'TV';
    $seen[$id] = true;
    $channels[] = array(
      'id'       => $id,
      'name'     => $name,
      'category' => $cat,
      'logo'     => $logo,
    );
  }

  if (count($channels) > 0) {
    @file_put_contents($cacheFile, json_encode($channels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
  }
}

echo json_encode($channels ?: [], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

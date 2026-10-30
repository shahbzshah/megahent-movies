<?php
/**
 * Live TV channels from iptv-org — public playlists of free-to-air
 * streams that broadcasters publish themselves. Replaces the old
 * nontongo.win scraper (dead from datacenter IPs, unlicensed embeds).
 *
 * The browser never touches iptv-org directly: this endpoint fetches
 * ONE allowlisted playlist server-side, parses the M3U into JSON, and
 * caches it for 30 minutes. Stream URLs are handed to the player as
 * direct HLS links (the app proxies no video — proxying would burn
 * Render bandwidth and change the legal shape of the whole feature).
 *
 * GET iptv-channels.php?list=ke|news|sports|movies|kids|music|documentary|general
 *   -> [{ id, name, category, logo, url }]
 * Honours the Live TV kill switch (settings.livetv_enabled).
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../proxy-guard.php';

$LISTS = [
  'ke'          => 'countries/ke.m3u',
  'news'        => 'categories/news.m3u',
  'sports'      => 'categories/sports.m3u',
  'movies'      => 'categories/movies.m3u',
  'kids'        => 'categories/kids.m3u',
  'music'       => 'categories/music.m3u',
  'documentary' => 'categories/documentary.m3u',
  'general'     => 'categories/general.m3u',
];

$list = $_GET['list'] ?? 'ke';
if (!isset($LISTS[$list])) json_out(['error' => 'Unknown list'], 400);

$settings = [];
foreach (db()->query('SELECT skey, svalue FROM settings') as $row) {
  $settings[$row['skey']] = $row['svalue'];
}
if (($settings['livetv_enabled'] ?? '1') !== '1') {
  json_out(['live_disabled' => true, 'error' => 'Live TV is currently disabled'], 503);
}

$cacheFile = sys_get_temp_dir() . '/megahent_iptv_' . $list . '.json';
$TTL = 1800;
if (file_exists($cacheFile) && time() - filemtime($cacheFile) < $TTL) {
  $cached = json_decode((string) file_get_contents($cacheFile), true);
  if (is_array($cached)) json_out($cached);
}

$url = 'https://iptv-org.github.io/iptv/' . $LISTS[$list];
$guardErr = guard_public_url($url, [443], ['iptv-org.github.io']);
if ($guardErr !== null) json_out(['error' => $guardErr], 502);

[$m3u, $code, $err] = guard_fetch($url, 25, 8388608);
if ($m3u === null || $code !== 200) {
  json_out(['error' => $err ?? ('Upstream HTTP ' . $code)], 502);
}

$channels = [];
$seen = [];
$pending = null;
foreach (preg_split('/\r\n|\n|\r/', $m3u) as $line) {
  $line = trim($line);
  if ($line === '') continue;
  if (strpos($line, '#EXTINF:') === 0) {
    $logo = '';
    $cat = 'General';
    if (preg_match('/tvg-logo="([^"]*)"/', $line, $m)) $logo = $m[1];
    if (preg_match('/group-title="([^"]*)"/', $line, $m) && $m[1] !== '') $cat = $m[1];
    $name = '';
    $comma = strrpos($line, ',');
    if ($comma !== false) $name = trim(substr($line, $comma + 1));
    $pending = ['name' => $name, 'category' => $cat, 'logo' => $logo];
    continue;
  }
  if ($line[0] === '#') continue;
  // Stream URL line: only HLS, only https, no credentials. Plain http
  // streams can never play: the site is https, so the browser blocks
  // them as mixed content (and hls.js needs CORS on top of that).
  if ($pending !== null && $pending['name'] !== '') {
    if (preg_match('~^https://[^\\s\'"<>]+\\.m3u8($|[?#])~i', $line) && !isset($seen[$line])) {
      $seen[$line] = true;
      $channels[] = [
        'id'       => md5($line),
        'name'     => $pending['name'],
        'category' => $pending['category'],
        'logo'     => $pending['logo'],
        'url'      => $line,
      ];
      if (count($channels) >= 1000) break;
    }
  }
  $pending = null;
}

@file_put_contents($cacheFile, json_encode($channels, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
json_out($channels);

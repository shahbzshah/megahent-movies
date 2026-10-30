<?php
/**
 * Shared fetch guards for the server-side proxies (TMDB, Xtream, iptv-org).
 *
 * The old proxies forwarded any caller-supplied host, followed redirects,
 * and trusted DNS at face value — a textbook SSRF relay into the internal
 * network. Every outbound fetch in this app must go through these helpers:
 *
 *  - guard_public_url(): scheme, userinfo, port and DNS checks. The host
 *    must resolve to public IPs only (private, loopback, link-local and
 *    reserved ranges are rejected). NOTE: this is a pre-flight check;
 *    DNS can change between check and connect (TOCTOU). It closes the
 *    trivial cases (localhost, 169.254.x, 10/172.16/192.168, ::1); it is
 *    not a substitute for egress filtering at the network layer.
 *  - guard_fetch(): curl with redirects OFF, TLS verification ON, a
 *    timeout and a response-size cap.
 */

function guard_is_public_ip(string $ip): bool {
  if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
  }
  if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
    return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
  }
  return false;
}

/**
 * Validate a caller-influenced URL. Returns null when OK, else an error
 * string. $allowedPorts: explicit port allowlist (empty = 80/443 only).
 * $allowedHosts: when non-empty, the host must match one exactly.
 */
function guard_public_url(string $url, array $allowedPorts = [], ?array $allowedHosts = null): ?string {
  $parts = parse_url($url);
  if ($parts === false || !isset($parts['scheme'], $parts['host'])) return 'Malformed URL';
  $scheme = strtolower($parts['scheme']);
  if ($scheme !== 'http' && $scheme !== 'https') return 'Only http(s) URLs are allowed';
  if (isset($parts['user']) || isset($parts['pass'])) return 'URLs with credentials are not allowed';
  $host = strtolower($parts['host']);
  if ($allowedHosts !== null && !in_array($host, $allowedHosts, true)) return 'Host not allowed';
  $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
  $allowed = $allowedPorts !== [] ? $allowedPorts : [80, 443];
  if (!in_array($port, $allowed, true)) return 'Port not allowed';

  // Literal IP hosts: must be public.
  if (filter_var($host, FILTER_VALIDATE_IP)) {
    return guard_is_public_ip($host) ? null : 'Host resolves to a non-public address';
  }
  // DNS hostnames: every resolved address must be public.
  $ips = gethostbynamel($host);
  if ($ips === false || count($ips) === 0) return 'Host does not resolve';
  foreach ($ips as $ip) {
    if (!guard_is_public_ip($ip)) return 'Host resolves to a non-public address';
  }
  return null;
}

/**
 * Fetch a pre-validated URL. Returns [body|null, httpCode, error|null].
 * Redirects are NOT followed: a redirect target is a new URL that has not
 * passed the guard, so the caller must re-validate it instead.
 */
function guard_fetch(string $url, int $timeout = 20, int $maxBytes = 5242880): array {
  $ch = curl_init($url);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => $timeout,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 (CineGlass)',
  ]);
  $body = curl_exec($ch);
  $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $err  = curl_error($ch);
  curl_close($ch);
  if ($body === false) return [null, 502, $err !== '' ? $err : 'Upstream request failed'];
  if (strlen($body) > $maxBytes) return [null, 502, 'Upstream response too large'];
  return [$body, $code, null];
}

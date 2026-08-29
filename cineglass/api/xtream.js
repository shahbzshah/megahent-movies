// Vercel serverless proxy for the user's Xtream IPTV portal.
// Mirrors xtream-proxy.php / the vite dev middleware: the portal sends no
// CORS headers, so player_api.php calls are forwarded server-side. The portal
// URL travels as the mandatory "portal" query parameter.
export const maxDuration = 30;

export default async function handler(req, res) {
  const portal = String(req.query.portal || '').replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(portal)) {
    return res.status(400).json({ success: false, error: 'Invalid portal URL' });
  }

  const target = new URL(portal + '/player_api.php');
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'portal') continue;
    target.searchParams.set(k, Array.isArray(v) ? v[0] : v);
  }

  try {
    const upstream = await fetch(target, {
      signal: AbortSignal.timeout(25000),
      headers: { Accept: 'application/json' },
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json;charset=utf-8');
    // Portal rate-limits aggressive polling — cache briefly at the edge.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    res.end(body);
  } catch {
    res.status(502).json({ success: false, error: 'Portal unreachable' });
  }
}

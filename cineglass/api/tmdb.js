export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return
  }

  const key = process.env.TMDB_API_KEY
  if (!key) {
    res.status(500).json({ success: false, error: 'TMDB_API_KEY not configured' })
    return
  }

  const { path: rawPath } = req.query
  const qIndex = typeof rawPath === 'string' ? rawPath.indexOf('?') : -1
  const path = qIndex === -1 ? rawPath : rawPath.slice(0, qIndex)
  if (!path || !path.startsWith('/') || path.includes('/..')) {
    res.status(400).json({ success: false, error: 'Invalid path' })
    return
  }

  const params = new URLSearchParams({ api_key: key, language: 'en-US' })
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue
    params.set(k, Array.isArray(v) ? v.join(',') : String(v))
  }
  if (qIndex !== -1) {
    for (const [k, v] of new URLSearchParams(rawPath.slice(qIndex + 1))) {
      params.set(k, v)
    }
  }

  try {
    const r = await fetch(`https://api.themoviedb.org/3${path}?${params}`, {
      headers: { Accept: 'application/json' },
    })
    const body = await r.text()
    res.setHeader('Content-Type', 'application/json;charset=utf-8')
    res.status(r.status).send(body)
  } catch {
    res.status(502).json({ success: false, error: 'Upstream request failed' })
  }
}

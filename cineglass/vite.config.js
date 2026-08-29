import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function tmdbDevProxy(key) {
  return {
    name: 'tmdb-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/tmdb', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const raw = url.searchParams.get('path') || ''
        const qIndex = raw.indexOf('?')
        const path = qIndex === -1 ? raw : raw.slice(0, qIndex)
        if (!path.startsWith('/') || path.includes('/..')) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Invalid path' }))
          return
        }
        const params = new URLSearchParams({ api_key: key, language: 'en-US' })
        for (const [k, v] of url.searchParams) {
          if (k !== 'path') params.set(k, v)
        }
        if (qIndex !== -1) {
          for (const [k, v] of new URLSearchParams(raw.slice(qIndex + 1))) {
            params.set(k, v)
          }
        }
        fetch(`https://api.themoviedb.org/3${path}?${params}`, {
          headers: { Accept: 'application/json' },
        })
          .then(async (r) => {
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json;charset=utf-8')
            res.end(await r.text())
          })
          .catch(() => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: 'Upstream request failed' }))
          })
      })
    },
  }
}

// Forwards /xtream/player_api.php calls to the user's IPTV portal. Xtream
// panels send no CORS headers, so the portal URL travels as a query param and
// everything else is forwarded untouched.
function xtreamDevProxy() {
  return {
    name: 'xtream-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/xtream/player_api.php', (req, res) => {
        const url = new URL(req.url, 'http://localhost')
        const portal = (url.searchParams.get('portal') || '').replace(/\/+$/, '')
        if (!/^https?:\/\//i.test(portal)) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ success: false, error: 'Invalid portal URL' }))
          return
        }
        const target = new URL(portal + '/player_api.php')
        for (const [k, v] of url.searchParams) {
          if (k !== 'portal') target.searchParams.set(k, v)
        }
        fetch(target, { signal: AbortSignal.timeout(45000), headers: { Accept: 'application/json' } })
          .then(async (r) => {
            res.statusCode = r.status
            res.setHeader('Content-Type', 'application/json;charset=utf-8')
            res.end(await r.text())
          })
          .catch(() => {
            res.statusCode = 502
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: false, error: 'Portal unreachable' }))
          })
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const plugins = [react(), xtreamDevProxy()]
  if (env.TMDB_API_KEY) plugins.push(tmdbDevProxy(env.TMDB_API_KEY))
  return {
    plugins,
    server: {
      // Dev proxy so devices on the LAN (the APK) reach the admin API
      // through the vite origin instead of hitting Apache :8090 directly.
      // Path is forwarded as-is: the :8090 vhost docroot is the project root,
      // so /cineglass-server/api/*.php resolves there directly.
      proxy: {
        '/cineglass-server': {
          target: 'http://localhost:8090',
          changeOrigin: false,
        },
      },
    },
  }
})

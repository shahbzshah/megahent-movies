const { app, BrowserWindow, session, shell } = require('electron')
const path = require('path')
const fs = require('fs')

const RETRY_INTERVAL_MS = 3000
const REMOTE_CHECK_INTERVAL_MS = 60_000

function offlineHtml(
  message = "MegahEnt can't reach its servers right now.<br>Check your connection &mdash; we'll keep trying automatically.",
) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>MegahEnt — Offline</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box }
  html, body { height: 100% }
  body {
    display: flex; align-items: center; justify-content: center;
    background: #050505;
    color: #e8e8e8;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    text-align: center;
    user-select: none;
    cursor: default;
  }
  .wrap { max-width: 440px; padding: 32px }
  .logo {
    font-size: 46px; font-weight: 800; letter-spacing: -1px;
    background: linear-gradient(90deg, #ffb59e, #ff571a);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    text-shadow: 0 0 40px rgba(255, 181, 158, .25);
    margin-bottom: 20px;
  }
  h1 { font-size: 22px; font-weight: 600; margin-bottom: 10px }
  p.sub { color: #9ca3af; font-size: 14px; line-height: 1.55; margin-bottom: 28px }
  .spinner {
    width: 34px; height: 34px; margin: 0 auto 16px;
    border: 3px solid rgba(255,255,255,.12);
    border-top-color: #ff571a;
    border-radius: 50%;
    animation: spin .9s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg) } }
  .status { color: #ffb59e; font-size: 13px; letter-spacing: .4px }
  .dots::after { content: ''; animation: dots 1.2s steps(4, end) infinite }
  @keyframes dots { 0% { content: '' } 25% { content: '.' } 50% { content: '..' } 75% { content: '...' } }
</style>
</head>
<body>
  <div class="wrap">
    <div class="logo">MegahEnt</div>
    <h1>You're offline</h1>
    <p class="sub">${message}</p>
    <div class="spinner"></div>
    <p class="status">Reconnecting<span class="dots"></span></p>
  </div>
</body>
</html>`
}

// Escape admin-supplied text before it is interpolated into the offline
// page: the offline message comes from the database (admin-editable), so
// raw interpolation is stored HTML injection in the shell. The local
// default message keeps its intentional markup; only the REMOTE message
// (remote.offlineMessage) goes through this helper at the call site.
function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const DEFAULT_CONFIG = {
  url: 'https://movies.archimnet.com',
  remoteConfigUrl: '',
  adblock: true,
  blockPopups: true,
  filterListUrls: [],
  width: 1440,
  height: 900,
}

function loadConfig() {
  const candidates = []
  try {
    if (app.isPackaged) {
      candidates.push(path.join(path.dirname(app.getPath('exe')), 'config.json'))
    }
  } catch {}
  candidates.push(path.join(__dirname, 'config.json'))
  for (const p of candidates) {
    try {
      const merged = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(p, 'utf8')) }
      if (process.env.CINEGLASS_URL) merged.url = process.env.CINEGLASS_URL
      return merged
    } catch {}
  }
  if (process.env.CINEGLASS_URL) {
    return { ...DEFAULT_CONFIG, url: process.env.CINEGLASS_URL }
  }
  return DEFAULT_CONFIG
}

function siteOrigin(urlString) {
  try {
    return new URL(urlString).origin
  } catch {
    return null
  }
}

async function enableAdBlock(config) {
  // uBlock Origin Lite (unpacked in extensions/ublock-lite) — adds cosmetic
  // element-hiding the Ghostery blocker can't do (overlay ads, popup cards).
  const uBlockPath = path.join(__dirname, 'extensions', 'ublock-lite')
  if (fs.existsSync(path.join(uBlockPath, 'manifest.json'))) {
    try {
      const ext = await session.defaultSession.loadExtension(uBlockPath)
      console.log('[MegahEnt] uBlock Origin Lite ENABLED (' + ext.version + ')')
    } catch (err) {
      console.warn('[MegahEnt] uBlock Origin Lite failed to load:', err.message)
    }
  } else {
    console.warn('[MegahEnt] uBlock Origin Lite not present (extensions/ublock-lite missing)')
  }

  const { ElectronBlocker, fullLists } = require('@ghostery/adblocker-electron')

  const urls = [...fullLists]

  let centralOk = 0
  for (const u of config.filterListUrls || []) {
    try {
      const r = await fetch(u)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      centralOk++
      urls.push(u)
    } catch (err) {
      console.warn('[MegahEnt] central list unreachable, skipping:', u, '(' + err.message + ')')
    }
  }

  let fetchImpl = fetch
  const customPath = path.join(__dirname, 'filters', 'custom.txt')
  if (fs.existsSync(customPath)) {
    const text = fs.readFileSync(customPath, 'utf8')
    const ruleCount = text.split('\n').filter((l) => l.trim() && !l.trim().startsWith('!')).length
    urls.push('custom://MegahEnt-filters')
    fetchImpl = (url, opts) =>
      String(url).startsWith('custom://')
        ? Promise.resolve(new Response(text))
        : fetch(url, opts)
    console.log('[MegahEnt] custom streaming-ad filters loaded (', ruleCount, 'rules )')
  }

  const blocker = await ElectronBlocker.fromLists(fetchImpl, urls)
  await blocker.enableBlockingInSession(session.defaultSession)
  console.log('[MegahEnt] ad blocking ENABLED — lists:', urls.length, '(base:', fullLists.length, '| central:', centralOk, '| custom: 1)')
}

function hardenWindow(win, allowedOrigins) {
  win.webContents.setWindowOpenHandler(({ url }) => {
    const origin = siteOrigin(url)
    if (origin && allowedOrigins.includes(origin)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    if (origin && origin.startsWith('http')) {
      console.log('[MegahEnt] POPUP BLOCKED →', url.slice(0, 120))
    }
    return { action: 'deny' }
  })

  win.webContents.on('will-navigate', (event, url) => {
    const origin = siteOrigin(url)
    if (!origin || !allowedOrigins.includes(origin)) {
      event.preventDefault()
      if (origin && origin.startsWith('http')) {
        console.log('[MegahEnt] REDIRECT BLOCKED →', url.slice(0, 120))
      }
    }
  })
}

function createWindow(config) {
  let targetUrl = config.url
  let adminOffline = false
  const allowedOrigins = [siteOrigin(config.url)].filter(Boolean)

  const win = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: '#050505',
    autoHideMenuBar: true,
    title: 'MegahEnt',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  hardenWindow(win, allowedOrigins)
  try {
    win.webContents.setUserAgent(session.defaultSession.getUserAgent())
  } catch {}

  // --- Offline screen + auto-retry -----------------------------------------
  let offlineMode = false
  let retryTimer = null
  let lastLoadFailed = false

  const showOfflineScreen = () => {
    win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(offlineHtml())).catch(() => {})
  }

  const startRetrying = () => {
    if (retryTimer) return
    console.log('[MegahEnt] OFFLINE — probing', targetUrl, 'every', RETRY_INTERVAL_MS / 1000 + 's')
    retryTimer = setInterval(async () => {
      try {
        // Lightweight reachability probe — does NOT navigate, so the offline
        // page stays on screen untouched until the server really responds.
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), RETRY_INTERVAL_MS)
        const res = await fetch(targetUrl, { signal: controller.signal })
        clearTimeout(timeout)
        if (!res.ok) throw new Error('HTTP ' + res.status)
        clearInterval(retryTimer)
        retryTimer = null
        console.log('[MegahEnt] back online ✓')
        win.loadURL(targetUrl).catch(() => {}) // if this fails, did-fail-load re-enters offline mode
      } catch {} // still down — keep probing
    }, RETRY_INTERVAL_MS)
  }

  const stopRetrying = () => {
    if (retryTimer) {
      clearInterval(retryTimer)
      retryTimer = null
      console.log('[MegahEnt] back online ✓')
    }
  }

  win.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      // -3 = ERR_ABORTED (navigation superseded) — not a real failure
      if (!isMainFrame || errorCode === -3) return
      lastLoadFailed = true
      if (!offlineMode) {
        offlineMode = true
        console.warn(
          '[MegahEnt] load failed (' + errorCode + ' ' + errorDescription + ') — showing offline screen',
        )
      }
      // Re-show only if the offline page isn't already displayed (e.g. first
      // failure, or a post-probe loadURL that raced a server shutdown).
      if (!win.webContents.getURL().startsWith('data:')) showOfflineScreen()
      startRetrying()
    },
  )

  win.loadURL(targetUrl)

  win.webContents.on('did-finish-load', () => {
    const currentUrl = win.webContents.getURL()
    if (lastLoadFailed) {
      // Electron emits did-finish-load AFTER did-fail-load for failed navigations,
      // with getURL() pointing at the failed URL — this is NOT a successful load.
      lastLoadFailed = false
      return
    }
    if (offlineMode) {
      if (currentUrl.startsWith('data:')) return // our own offline page finished loading
      offlineMode = false
      stopRetrying()
    }
    console.log('[MegahEnt] loaded →', currentUrl)
    if (config.debugNet) {
      console.log('[MegahEnt] UA ends with:', JSON.stringify(win.webContents.getUserAgent().slice(-40)))
    }
  })

  if (config.debugNet) {
    const seen = new Set()
    win.webContents.session.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        try {
          if (details.frame && !details.frame.top && !seen.has(details.url)) {
            seen.add(details.url)
            console.log('[net]', details.resourceType, new URL(details.url).host.padEnd(30), details.url.slice(0, 110))
          }
        } catch {}
        callback({ cancel: false })
      },
    )
    console.log('[MegahEnt] network debug tap ON — iframe request domains will be logged')
  }

  // --- Admin remote control: kill-switch + URL override ----------------------
  // Checked at startup and every minute while running. Lets the admin take
  // every installed app offline, or repoint them at a new URL, centrally.
  if (config.remoteConfigUrl) {
    const applyRemoteConfig = async () => {
      let remote = null
      try {
        const res = await fetch(config.remoteConfigUrl, { signal: AbortSignal.timeout(5000) })
        if (res.ok) remote = await res.json()
      } catch {}
      if (!remote) return

      const shellCfg = remote.shellConfig || {}
      if (shellCfg.url && siteOrigin(shellCfg.url)) {
        const origin = siteOrigin(shellCfg.url)
        if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin)
        targetUrl = shellCfg.url
      }

      const wantOffline = remote.status === 'offline' || shellCfg.force_offline === true
      if (wantOffline && !adminOffline && !offlineMode) {
        adminOffline = true
        console.log('[MegahEnt] admin kill-switch ON — showing unavailable screen')
        win
          .loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(offlineHtml(escapeHtml(remote.offlineMessage))))
          .catch(() => {})
      } else if (!wantOffline && adminOffline) {
        adminOffline = false
        console.log('[MegahEnt] admin kill-switch OFF — loading', targetUrl)
        win.loadURL(targetUrl).catch(() => {})
      }
    }
    applyRemoteConfig()
    setInterval(() => {
      if (!offlineMode) applyRemoteConfig() // connectivity-offline mode manages itself
    }, REMOTE_CHECK_INTERVAL_MS)
  }

  // TEMP DEBUG: CG_SHOT=<path> captures a screenshot after 8s then quits
  if (process.env.CG_SHOT) {
    setTimeout(async () => {
      try {
        const img = await win.webContents.capturePage()
        fs.writeFileSync(process.env.CG_SHOT, img.toPNG())
        console.log('[MegahEnt] screenshot saved →', process.env.CG_SHOT)
      } catch (err) {
        console.error('[MegahEnt] screenshot failed:', err.message)
      }
      app.quit()
    }, 8000)
  }

  // Surface renderer console errors/warnings in the main-process log
  win.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    if (level >= 2) console.log('[renderer]', message, '(' + sourceId + ':' + line + ')')
  })

  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[MegahEnt] renderer gone:', details.reason)
  })
}

app.whenReady().then(async () => {
  const config = loadConfig()
  console.log('[MegahEnt] target URL:', config.url)

  const ua = session.defaultSession.getUserAgent() + ' MegahEntDesktop/1.0'
  session.defaultSession.setUserAgent(ua)
  app.on('browser-window-created', (_e, win) => {
    win.webContents.once('did-attach-webview', () => {})
    try {
      win.webContents.setUserAgent(ua)
    } catch {}
  })

  try {
    if (config.adblock) {
      await enableAdBlock(config)
    } else {
      console.log('[MegahEnt] ad blocking disabled in config')
    }
  } catch (err) {
    console.warn('[MegahEnt] ad blocking failed to start (continuing without it):', err.message)
  }

  createWindow(config)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(config)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Xtream Codes portal client.
// Portal credentials: none are bundled. The owner enters them in
// Settings (stored in localStorage). Every request tries the portal DIRECTLY
// first (it sends Access-Control-Allow-Origin: *) and falls back to the
// same-origin proxy for panels without CORS or hosts blocking outbound :8080.
const PROXY_PATH = '/xtream/player_api.php'
const API_TIMEOUT_MS = 30000

export const DEFAULT_PORTAL = {
  // No credentials ship in the code. Enter the portal URL, username and
  // password in Settings; they are stored only in this device's localStorage.
  url: '',
  user: '',
  pass: '',
}

function getCreds(settings) {
  return {
    url: (settings?.portalUrl || DEFAULT_PORTAL.url).replace(/\/+$/, ''),
    user: settings?.portalUser || DEFAULT_PORTAL.user,
    pass: settings?.portalPass || DEFAULT_PORTAL.pass,
  }
}

export function portalConfigured(settings) {
  const { url, user, pass } = getCreds(settings)
  return Boolean(url && user && pass)
}

async function api(settings, params) {
  const { url, user, pass } = getCreds(settings)
  if (!url || !user || !pass) {
    throw new Error('Portal not configured: enter the portal URL, username and password in Settings')
  }
  const qs = new URLSearchParams({ username: user, password: pass, ...params })
  const attempts = [
    `${url}/player_api.php?${qs}`,
    `${PROXY_PATH}?portal=${encodeURIComponent(url)}&${qs}`,
  ]
  let lastError = new Error('Portal unreachable')
  for (const attemptUrl of attempts) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), API_TIMEOUT_MS)
    try {
      const res = await fetch(attemptUrl, { signal: ctrl.signal })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } catch (e) {
      lastError = e
    } finally {
      clearTimeout(timer)
    }
  }
  throw lastError
}

/** Auth probe. Returns { ok, expiry, active, connections, max, message } */
export async function fetchPortalInfo(settings) {
  const res = await api(settings, {})
  const info = res?.user_info
  if (!info || Number(info.auth) !== 1) {
    return { ok: false, message: info?.message || 'Portal rejected the credentials' }
  }
  return {
    ok: true,
    active: info.status === 'Active',
    expiry: info.exp_date ? new Date(Number(info.exp_date) * 1000) : null,
    connections: Number(info.active_cons || 0),
    max: Number(info.max_connections || 0),
    message: info.message || '',
  }
}

export async function fetchLiveCategories(settings) {
  const list = await api(settings, { action: 'get_live_categories' })
  return Array.isArray(list) ? list : []
}

export async function fetchLiveStreams(settings, categoryId) {
  const params = { action: 'get_live_streams' }
  if (categoryId) params.category_id = categoryId
  const list = await api(settings, params)
  return Array.isArray(list) ? list : []
}

export async function fetchVodCategories(settings) {
  const list = await api(settings, { action: 'get_vod_categories' })
  return Array.isArray(list) ? list : []
}

export async function fetchVodStreams(settings, categoryId) {
  const params = { action: 'get_vod_streams' }
  if (categoryId) params.category_id = categoryId
  const list = await api(settings, params)
  return Array.isArray(list) ? list : []
}

export async function fetchSeriesCategories(settings) {
  const list = await api(settings, { action: 'get_series_categories' })
  return Array.isArray(list) ? list : []
}

export async function fetchSeriesList(settings, categoryId) {
  const params = { action: 'get_series' }
  if (categoryId) params.category_id = categoryId
  const list = await api(settings, params)
  return Array.isArray(list) ? list : []
}

export async function fetchSeriesInfo(settings, seriesId) {
  return api(settings, { action: 'get_series_info', series_id: String(seriesId) })
}

// --- Playback URLs ----------------------------------------------------------

export function liveUrl(settings, streamId) {
  const { url, user, pass } = getCreds(settings)
  return `${url}/live/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${streamId}.m3u8`
}

export function movieUrl(settings, streamId, ext = 'mp4') {
  const { url, user, pass } = getCreds(settings)
  return `${url}/movie/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${streamId}.${ext}`
}

export function episodeUrl(settings, episodeId, ext = 'mkv') {
  const { url, user, pass } = getCreds(settings)
  return `${url}/series/${encodeURIComponent(user)}/${encodeURIComponent(pass)}/${episodeId}.${ext}`
}

// --- English-only filtering --------------------------------------------------
// This portal tags everything: categories carry country prefixes (UK/US/CA,
// DE, EU MULTI, DE/S...) and item titles carry trailing language tags
// ("Movie Name (2023) DE"). Adult categories are filtered out regardless.
const ADULT_WORD =
  /\b(xxx|adult|adults|porn|pornbox|pornstar|brazzers|blacked|dorcel|onlyfans|milf|lesbian|gay|teen|anal|amatour|amateur)\b/i

// Language tags appended to item titles. Matched only at the end of the name
// so movie titles like "It (2017)" never trip single-letter codes.
const TRAILING_FOREIGN_TAG =
  /[\s\-_.|(]((?:de|ger|german|fr|fra|french|es|esp|spanish|it|ita|italian|pt|por|ru|rus|russian|tr|tur|turkish|ar|arb|arabic|nl|dutch|pl|polish|gr|greek|he|heb|hebrew|fa|per|farsi|hi|hin|hindi|ur|urdu|dub|dubbed|vost|vostfr))\)?\s*$/i

export function isAdultName(name) {
  return ADULT_WORD.test(String(name || ''))
}

export function isEnglishCategoryName(name, kind) {
  const n = String(name || '')
  if (isAdultName(n)) return false
  if (kind === 'live') return /^(uk|us|ca)\b/i.test(n)
  if (kind === 'vod') return /^uk\s*\/?\s*us\b/i.test(n)
  if (kind === 'series') return /^(eu|en|uk|us)\b/i.test(n)
  return true
}

export function isEnglishItemName(name) {
  const n = String(name || '')
  return !isAdultName(n) && !TRAILING_FOREIGN_TAG.test(n)
}

export function filterEnglish(list, nameKey, kind, enabled) {
  if (!enabled) return list.filter((x) => !isAdultName(x[nameKey] ?? x.name ?? x.title ?? ''))
  return list.filter(
    (x) =>
      isEnglishCategoryName(x[nameKey] ?? x.name ?? x.title ?? '', kind) &&
      isEnglishItemName(x[nameKey] ?? x.name ?? x.title ?? ''),
  )
}

// --- Mapping helpers ----------------------------------------------------------
// Portal titles carry noise like "Movie Name (2023) DE" or "Show (2021) MULTI".

export function cleanPortalTitle(raw) {
  return String(raw || '')
    .replace(/\s*\((19|20)\d{2}\).*$/, '')
    .replace(/\s+-\s+S\d{1,2}E\d{1,2}.*$/i, '')
    .trim()
}

export function portalYear(raw) {
  const m = String(raw || '').match(/\((19|20)\d{2}\)/)
  return m ? m[0].slice(1, 5) : ''
}

export function mapPortalChannel(v) {
  return {
    id: `plive-${v.stream_id}`,
    title: cleanPortalTitle(v.name),
    logo: v.stream_icon || '',
    portalStreamId: v.stream_id,
    epgChannelId: v.epg_channel_id || '',
  }
}

export function mapPortalMovie(v) {
  return {
    id: `pvod-${v.stream_id}`,
    tmdb: null,
    type: 'movie',
    title: cleanPortalTitle(v.name),
    year: portalYear(v.name) || portalYear(v.title),
    rating: Number(v.rating) || 0,
    poster: v.stream_icon || v.cover || v.movie_image || 'https://picsum.photos/500/750',
    banner: v.stream_icon || v.cover || v.movie_image || 'https://picsum.photos/1280/720',
    desc: v.description || v.plot || 'Streamed from your IPTV portal.',
    genre: v.category_name || 'Portal',
    source: 'portal',
    portalStreamId: v.stream_id,
    ext: v.container_extension || 'mp4',
  }
}

export function mapPortalSeries(s) {
  return {
    id: `pser-${s.series_id}`,
    tmdb: null,
    type: 'show',
    title: cleanPortalTitle(s.name),
    year: portalYear(s.name) || portalYear(s.title),
    rating: Number(s.rating) || 0,
    poster: s.cover || 'https://picsum.photos/500/750',
    banner: s.cover || 'https://picsum.photos/1280/720',
    desc: s.plot || 'Streamed from your IPTV portal.',
    genre: s.category_name || 'Portal',
    source: 'portal',
    portalSeriesId: s.series_id,
  }
}

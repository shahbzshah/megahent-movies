/**
 * Client for the MegahEnt admin server (shared host, PHP + MySQL).
 * Point VITE_ADMIN_API_URL at e.g. https://yourhost.com/MegahEnt-server/api
 * Falls back to no-op behaviour when unreachable (app keeps working).
 */
const BASE = import.meta.env.VITE_ADMIN_API_URL || ''
const ADMIN_TIMEOUT_MS = 10000

export const ADMIN_API_ENABLED = Boolean(BASE)

async function getJson(path) {
  if (!BASE) return null
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), ADMIN_TIMEOUT_MS)
    try {
      // no-store + cache-buster: kill-switch flips must never be read from cache
      const bust = path.includes('?') ? '&' : '?'
      const res = await fetch(`${BASE}/${path}${bust}_=${Date.now()}`, {
        signal: ctrl.signal,
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('HTTP ' + res.status)
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null // admin server down → degrade gracefully, never block the app
  }
}

/** Kill-switch status, offline message, active announcement, shell config. */
export function fetchAppConfig() {
  return getJson('app-config.php')
}

/** Curated rows: [{ id, title, items: [{ tmdbId, type }] }] */
export function fetchCollections() {
  return getJson('collections.php')
}

/**
 * Availability scanner (server-side verdicts, cached in MySQL).
 * ids: array of TMDB ints; type: 'movie' | 'tv'.
 * Returns { results: { "<tmdbId>": boolean } } or null when unreachable.
 */
export function fetchAvailability(type, ids) {
  if (!ids?.length) return Promise.resolve(null)
  return getJson(`availability.php?type=${type}&ids=${ids.join(',')}&maxAgeDays=7`)
}
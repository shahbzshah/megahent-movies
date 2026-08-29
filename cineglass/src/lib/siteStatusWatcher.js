/**
 * Background watcher that keeps every client in sync with the admin
 * kill-switch — the "site offline" screen appears about a second after the
 * admin flips the switch, with no reload needed.
 *
 * Stays cheap despite the 1s cadence:
 *  - app-config.php is one tiny SELECT and is served with `no-store`
 *  - overlapping requests are skipped (one in flight at a time)
 *  - pace relaxes when the tab is hidden, snaps back on focus/reconnect
 */
import { useStore } from '../store/useStore'

export const STATUS_POLL_MS = 1_000 // visible-tab cadence: check every second
export const HIDDEN_POLL_MS = 30_000 // background-tab cadence

let timer = null
let inFlight = false

async function checkNow() {
  if (inFlight) return
  inFlight = true
  try {
    await useStore.getState().refreshAdminStatus()
  } catch {
    /* admin server hiccup — keep last known state, retry next tick */
  } finally {
    inFlight = false
  }
}

function pace() {
  return document.visibilityState === 'visible' ? STATUS_POLL_MS : HIDDEN_POLL_MS
}

function restartTimer() {
  if (timer) clearInterval(timer)
  timer = setInterval(checkNow, pace())
}

function onVisibilityChange() {
  restartTimer()
  if (document.visibilityState === 'visible') checkNow()
}

export function startSiteStatusWatcher() {
  if (timer) return // idempotent: safe under StrictMode double-mounts
  checkNow()
  restartTimer()
  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('focus', checkNow)
  window.addEventListener('online', checkNow)
}

export function stopSiteStatusWatcher() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  document.removeEventListener('visibilitychange', onVisibilityChange)
  window.removeEventListener('focus', checkNow)
  window.removeEventListener('online', checkNow)
}
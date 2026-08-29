import { create } from 'zustand'
import {
  loadMyList,
  saveMyList,
  loadProgress,
  saveProgress,
  loadUser,
  saveUser,
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from '../lib/storage'
import { loadLibrary, mapLimit, fetchTMDB, fetchDiscoverPage, mapTmdbItem } from '../lib/tmdb'
import { fetchAppConfig, fetchCollections, fetchAvailability } from '../lib/admin'

let toastSeq = 0
let availabilityRetries = 0

// Periodically re-ask the server about optimistically-hidden titles; any
// that the deep scanner proved playable come back to life.
function scheduleResurrectionCheck() {
  if (availabilityRetries >= 10) return
  availabilityRetries++
  setTimeout(async () => {
    try {
      const store = useStore.getState()
      const hidden = store.hiddenResurrectable
      const keys = Object.keys(hidden)
      if (!keys.length) return
      const groups = { movie: [], tv: [] }
      for (const key of keys) {
        const [type, id] = key.split('-')
        if (groups[type]) groups[type].push(id)
      }
      const revived = []
      await Promise.all(
        Object.entries(groups).map(async ([type, ids]) => {
          for (let i = 0; i < ids.length; i += 10) {
            const res = await fetchAvailability(type, ids.slice(i, i + 10))
            if (!res?.results) return
            for (const [id, ok] of Object.entries(res.results)) {
              if (ok) revived.push(`${type}-${id}`)
            }
          }
        }),
      )
      if (revived.length) {
        const stillHidden = { ...store.hiddenResurrectable }
        const items = []
        let restoredList = store.myList
        for (const key of revived) {
          const entry = stillHidden[key]
          if (!entry) continue
          items.push(entry.item)
          if (entry.inMyList && !restoredList.some((m) => m.id === entry.item.id)) {
            restoredList = [...restoredList, { id: entry.item.id, title: entry.item.title, type: entry.item.type, addedAt: new Date().toISOString() }]
          }
          delete stillHidden[key]
        }
        useStore.setState({
          hiddenResurrectable: stillHidden,
          myList: restoredList,
        })
        store.mergeContent(items)
        saveMyList(useStore.getState().myList)
        if (store.scannerToasts) {
          if (items.length === 1) store.showToast(`"${items[0].title}" is available again`, 'visibility')
          else if (items.length > 1) store.showToast(`${items.length} titles are available again`, 'visibility')
        }
      }
    } catch {
      // best effort only
    }
    // keep checking while anything remains hidden
    scheduleResurrectionCheck()
  }, 90000)
}

export const useStore = create((set, get) => ({
  CONTENT: [],
  // opts.scan=false skips the availability probe — used by typeahead search,
  // where merging must stay cheap (the scanner's verdicts can take minutes
  // and would otherwise clog the network behind every keystroke).
  mergeContent(items, opts = {}) {
    if (!items?.length) return
    const map = new Map(get().CONTENT.map((c) => [c.id, c]))
    let added = false
    for (const it of items) {
      if (!it?.id) continue
      if (!map.has(it.id)) added = true
      map.set(it.id, { ...map.get(it.id), ...it })
    }
    set({ CONTENT: [...map.values()] })
    // New titles just arrived — queue them for an availability scan.
    if (added && opts.scan !== false) get().scanAvailability()
  },

  // --- Admin server state (kill-switch, announcements, curated rows) --------
  siteStatus: 'online',
  offlineMessage: '',
  announcement: null,
  scannerToasts: false,
  liveTvEnabled: true,
  curatedRows: [],
  adminLoadedOnce: false,

  async refreshAdminStatus() {
    const cfg = await fetchAppConfig()
    if (cfg) {
      set({
        siteStatus: cfg.status === 'offline' ? 'offline' : 'online',
        offlineMessage: cfg.offlineMessage || '',
        announcement: cfg.announcement || null,
        scannerToasts: Boolean(cfg.scannerToasts),
        liveTvEnabled: cfg.liveTv !== false,
      })
      // A new admin announcement also lands in the notification bell.
      // The last-notified id is persisted per device, so an announcement
      // published while the app was closed still notifies exactly once.
      const ann = cfg.announcement
      if (ann) {
        let notifiedId = null
        try { notifiedId = localStorage.getItem('cineglass_notified_announcement') } catch { /* private mode */ }
        if (String(ann.id) !== notifiedId) {
          try { localStorage.setItem('cineglass_notified_announcement', String(ann.id)) } catch { /* ignore */ }
          get().pushNotification({
            title: 'Announcement',
            body: ann.message,
            icon: ann.icon || 'campaign',
          })
        }
      }
    }
    return cfg
  },

  async loadCuratedRows() {
    const data = await fetchCollections()
    if (!data?.collections?.length) {
      set({ curatedRows: [] })
      return
    }
    const rows = await Promise.all(
      data.collections.map(async (row) => ({
        id: row.id,
        title: row.title,
        items: (
          await mapLimit(row.items || [], 4, async (it) => {
            const detail = await fetchTMDB(`/${it.type}/${it.tmdbId}`)
            return detail ? mapTmdbItem(detail, it.type === 'tv') : null
          })
        ).filter(Boolean),
      })),
    )
    set({ curatedRows: rows.filter((r) => r.items.length > 0) })
  },

  async loadAdminData() {
    await Promise.all([get().refreshAdminStatus(), get().loadCuratedRows()])
    set({ adminLoadedOnce: true })
  },

  loadState: 'idle',
  async load() {
    if (get().loadState === 'loading') return
    set({ loadState: 'loading' })
      const items = await loadLibrary()
      if (items.length) {
        get().mergeContent(items)
        set({ loadState: 'ready' })
        if (get().scannerToasts) get().showToast(`Loaded ${items.length} titles from TMDB`, 'movie')
        get().scanAvailability() // hide dead titles in the background
      } else {
      set({ loadState: 'error' })
      get().showToast('Could not load titles from TMDB', 'error')
    }
  },
  retryLoad() {
    set({ loadState: 'idle' })
    get().load()
  },

  // --- Catalogue expansion --------------------------------------------------
  // The seed library only covers a few curated TMDB lists. These actions pull
  // further /discover pages on demand so browsing (and the Load More buttons)
  // can keep going through the full TMDB catalogue.
  catalogPages: { movie: 5, show: 5 }, // seeds already cover ~5 popular pages
  catalogHasMore: { movie: true, show: true },
  catalogLoading: false,
  async loadMoreCatalog(type) {
    const { catalogLoading, catalogPages, catalogHasMore } = get()
    if (catalogLoading || !catalogHasMore[type]) return
    set({ catalogLoading: true })
    // Skip ahead until at least one unseen title arrives; discover's most-
    // popular pages overlap the seeded trending/popular rows heavily.
    let page = catalogPages[type]
    let hasMore = catalogHasMore[type]
    try {
      for (let attempt = 0; attempt < 4 && hasMore; attempt++) {
        page++
        const res = await fetchDiscoverPage(type === 'show' ? 'tv' : 'movie', page)
        if (!res || !res.items.length) {
          hasMore = false
          break
        }
        const before = get().CONTENT.length
        get().mergeContent(res.items)
        hasMore = page < res.totalPages
        if (get().CONTENT.length > before) break // new titles landed — done
      }
      set({
        catalogPages: { ...catalogPages, [type]: page },
        catalogHasMore: { ...catalogHasMore, [type]: hasMore },
      })
    } finally {
      set({ catalogLoading: false })
    }
  },

  // --- Availability scanner ------------------------------------------------
  // Policy: a title VidLink can't play is hidden IMMEDIATELY, then re-checked
  // by the server's deep scanner (VidSrc/MultiEmbed in headless Chrome).
  // Hidden titles are remembered here; if the deep scan proves one plays
  // elsewhere it is silently resurrected on the next pass.
  scannedIds: {},
  hiddenResurrectable: {},
  async scanAvailability() {
    const content = get().CONTENT
    if (!content.length) return
    try {
      const scanned = get().scannedIds
      const pending = { movie: [], tv: [] }
      for (const c of content) {
        if (!c.tmdb || !pending[c.type] || scanned[`${c.type}-${c.tmdb}`]) continue
        pending[c.type].push(c.tmdb)
      }
      if (!pending.movie.length && !pending.tv.length) return

      for (const id of [...pending.movie, ...pending.tv]) {
        const type = pending.movie.includes(id) ? 'movie' : 'tv'
        scanned[`${type}-${id}`] = true
      }
      set({ scannedIds: { ...scanned } })

      const dead = new Set()
      await Promise.all(
        Object.entries(pending).map(async ([type, ids]) => {
          for (let i = 0; i < ids.length; i += 10) {
            const res = await fetchAvailability(type, ids.slice(i, i + 10))
            if (!res?.results) return // server down -> keep everything visible
            for (const [id, ok] of Object.entries(res.results)) {
              if (!ok) dead.add(`${type}-${id}`)
            }
          }
        }),
      )
      if (dead.size) {
        const contentNow = get().CONTENT
        const myListNow = get().myList
        const resurrectable = { ...get().hiddenResurrectable }
        for (const c of contentNow) {
          if (dead.has(c.id)) {
            resurrectable[c.id] = { item: c, inMyList: myListNow.some((m) => m.id === c.id) }
          }
        }
        const keptList = myListNow.filter((i) => !dead.has(i.id))
        set({
          CONTENT: contentNow.filter((c) => !dead.has(c.id)),
          myList: keptList,
          hiddenResurrectable: resurrectable,
        })
        saveMyList(keptList)
        if (get().scannerToasts) {
          get().showToast(`Removed ${dead.size} unavailable title${dead.size === 1 ? '' : 's'}`, 'hide_source')
        }
      }
      scheduleResurrectionCheck()
    } catch {
      // scanner is best-effort; never break the app over it
    }
  },

  myList: loadMyList(),
  toggleMyList(id) {
    const { CONTENT, myList } = get()
    const item = CONTENT.find((c) => c.id === id)
    if (!item) return
    const exists = myList.some((i) => i.id === id)
    const next = exists
      ? myList.filter((i) => i.id !== id)
      : [...myList, { id: item.id, title: item.title, type: item.type, addedAt: new Date().toISOString() }]
    saveMyList(next)
    set({ myList: next })
    get().showToast(
      exists ? `Removed "${item.title}" from My List` : `Added "${item.title}" to My List ✓`,
      exists ? 'remove_circle' : 'check_circle',
    )
  },

  progress: loadProgress(),
  markStarted(id) {
    const p = get().progress
    if (p[id]) return
    const next = { ...p, [id]: { percent: 10, updatedAt: new Date().toISOString() } }
    saveProgress(next)
    set({ progress: next })
  },
  clearHistory() {
    saveProgress({})
    set({ progress: {} })
    get().showToast('Continue Watching history cleared', 'history_toggle_off')
  },

  user: loadUser(),
  authModalOpen: false,
  setAuthModalOpen(open) {
    set({ authModalOpen: open })
  },
  signIn(name, email) {
    const returning = Boolean(get().user)
    const user = { name, email, plan: get().user?.plan || 'free' }
    saveUser(user)
    set({ user, authModalOpen: false })
    get().showToast(`Welcome${returning ? ' back' : ''}, ${name.split(' ')[0]}!`, 'waving_hand')
  },
  signOut() {
    const name = get().user?.name
    saveUser(null)
    set({ user: null, authModalOpen: false })
    get().showToast(`Signed out${name ? ` — see you soon, ${name.split(' ')[0]}` : ''}`, 'logout')
  },
  upgradeToPro(planLabel) {
    const user = get().user
    if (!user) return
    const next = { ...user, plan: planLabel.toLowerCase() }
    saveUser(next)
    set({ user: next, upgradeModalOpen: false })
    get().showToast(`You're now a ${planLabel} member 🎉`, 'workspace_premium')
  },

  settings: loadSettings(),
  updateSetting(key, value) {
    const settings = { ...get().settings, [key]: value }
    saveSettings(settings)
    set({ settings })
  },
  resetAllData() {
    saveMyList([])
    saveProgress({})
    saveUser(null)
    localStorage.removeItem('cineglass_settings')
    set({
      myList: [],
      progress: {},
      user: null,
      settings: { ...DEFAULT_SETTINGS },
    })
    get().showToast('All local data has been reset', 'restart_alt')
  },

  notifications: [],

  // Generic notification feed. Any source (admin announcements, future
  // pushes, local events) can inject here; bell + badge update live.
  pushNotification({ title, body, icon = 'campaign', time = 'Just now' }) {
    const cleanTitle = String(title || '').trim()
    const cleanBody = String(body || '').trim()
    if (!cleanTitle && !cleanBody) return
    const notifications = get().notifications
    // de-dupe: never stack the same message twice in a row
    if (notifications[0]?.title === cleanTitle && notifications[0]?.body === cleanBody) return
    const id = 'n' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)
    set({ notifications: [{ id, title: cleanTitle, body: cleanBody, icon, time, read: false }, ...notifications] })
    get().showToast(cleanTitle, icon)
  },

  markAllNotificationsRead() {
    set({ notifications: get().notifications.map((n) => ({ ...n, read: true })) })
  },
  selectNotification(id) {
    set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })
  },

  upgradeModalOpen: false,
  setUpgradeModalOpen(open) {
    set({ upgradeModalOpen: open })
  },

  toasts: [],
  showToast(message, icon = 'check_circle') {
    const id = ++toastSeq
    set((s) => ({ toasts: [...s.toasts, { id, message, icon }] }))
  },
  dismissToast(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
  },
}))

export const selectInList = (state, id) => state.myList.some((i) => i.id === id)

export const selectItem = (state, id) => state.CONTENT.find((c) => c.id === id)

export const selectUnreadCount = (state) => state.notifications.filter((n) => !n.read).length

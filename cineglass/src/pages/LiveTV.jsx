import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import Skeleton from '../components/ui/Skeleton'

// Channel list is scraped server-side from nontongo.win/livetv (cached 10
// min). Each channel plays by iframing its nontongo player page, which keeps
// the portal's own referer chain intact for the inner stream requests.
const CHANNELS_API = '/cineglass-server/api/livetv-channels.php'

export default function LiveTV() {
  const navigate = useNavigate()
  const liveTvEnabled = useStore((s) => s.liveTvEnabled)

  const [channels, setChannels] = useState(null)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(CHANNELS_API)
        if (!res.ok) {
          const j = await res.json().catch(() => null)
          if (j?.live_disabled) {
            if (!cancelled) setError('Live TV is currently disabled by the admin.')
            return
          }
          throw new Error('HTTP ' + res.status)
        }
        const data = await res.json()
        if (!cancelled) setChannels(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setError('Could not load the channel list. Please try again.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    if (!channels) return []
    const counts = new Map()
    for (const c of channels) {
      const k = c.category || 'Other'
      counts.set(k, (counts.get(k) || 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }))
  }, [channels])

  const filtered = useMemo(() => {
    if (!channels) return []
    const q = filter.trim().toLowerCase()
    return channels.filter((c) => {
      if (category !== 'All' && (c.category || 'Other') !== category) return false
      if (q && !String(c.name || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [channels, filter, category])

  const openChannel = (ch) => {
    navigate(`/player/live?dl=${encodeURIComponent(`https://www.nontongo.win/livetv/${ch.id}`)}&name=${encodeURIComponent(ch.name || 'Live Channel')}`)
  }

  return (
    <main className="relative min-h-screen pt-24 md:pt-32 px-container-padding-mobile md:px-container-padding-desktop pb-32">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">Live TV</h1>
          <p className="font-body-lg text-body-lg text-tertiary flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/40 font-label-sm text-label-sm text-primary uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> Live
            </span>
            {channels ? `${channels.length} channels` : 'Loading channels…'}
          </p>
        </div>
        <label className="relative inline-flex items-center w-full md:w-72">
          <span className="sr-only">Filter channels</span>
          <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">search</span>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter channels…"
            disabled={!channels}
            className="w-full bg-surface-container/60 border border-white/10 rounded-full py-2.5 pl-10 pr-4 font-label-md text-label-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-white/25 transition-colors disabled:opacity-40"
          />
        </label>
      </div>

      {channels && (
        <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar pb-2 mb-8" id="live-category-chips">
          <button
            onClick={() => setCategory('All')}
            className={
              'px-4 py-1.5 rounded-full border font-label-md text-label-md whitespace-nowrap transition-colors ' +
              (category === 'All'
                ? 'border-primary/60 bg-primary/10 text-primary'
                : 'border-white/10 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:border-white/25')
            }
          >
            All <span className="opacity-60">{channels.length}</span>
          </button>
          {categories.map(({ name, count }) => (
            <button
              key={name}
              onClick={() => setCategory(name)}
              className={
                'px-4 py-1.5 rounded-full border font-label-md text-label-md whitespace-nowrap transition-colors ' +
                (category === name
                  ? 'border-primary/60 bg-primary/10 text-primary'
                  : 'border-white/10 bg-surface-container-high/50 text-on-surface-variant hover:text-on-surface hover:border-white/25')
              }
            >
              {name} <span className="opacity-60">{count}</span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center max-w-xl mx-auto mt-16">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">wifi_off</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Live TV unavailable</h3>
          <p className="font-body-md text-body-md text-on-surface-variant mb-6">{error}</p>
        </div>
      )}

      {!channels && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-gutter">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="aspect-video" />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div id="live-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-gutter">
          {filtered.map((ch) => (
            <button
              key={ch.id}
              onClick={() => openChannel(ch)}
              className="group relative aspect-video rounded-lg overflow-hidden bg-surface-container-low ring-1 ring-white/5 cursor-pointer transition-all duration-300 hover:ring-white/20 hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] text-left"
            >
              {ch.logo ? (
                <img
                  src={ch.logo}
                  alt={`${ch.name} logo`}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity"></div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="font-label-md text-label-md text-on-surface truncate">{ch.name}</p>
              </div>
              <span className="absolute top-2 right-2 w-9 h-9 rounded-full btn-primary text-white flex items-center justify-center opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {channels && filtered.length === 0 && (
        <p className="text-center text-on-surface-variant py-16">No channels match "{filter}"{category !== 'All' ? ` in ${category}` : ''}.</p>
      )}
    </main>
  )
}

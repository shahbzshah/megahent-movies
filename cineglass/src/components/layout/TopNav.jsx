import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { searchTMDB } from '../../lib/tmdb'
import Notifications from './Notifications'
import UserMenu from './UserMenu'
import { IS_SHELL } from '../../lib/platform'

export default function TopNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const mergeContent = useStore((s) => s.mergeContent)

  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)

  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const q = debounced.trim()
    if (q.length < 2) {
      setResults([])
      setSearching(false)
      return
    }
    let alive = true
    setSearching(true)
    searchTMDB(q).then((remote) => {
      if (!alive) return
      if (remote?.length) {
        // Register hits in the store so /details/:id and the player can
        // resolve titles that were never part of the loaded trending rows.
        // Scanning is skipped — typeahead must never wait on the scanner.
        mergeContent(remote, { scan: false })
        setResults(remote)
      } else if (remote === null) {
        // TMDB unreachable — fall back to filtering what's already loaded.
        const lq = q.toLowerCase()
        setResults(
          useStore
            .getState()
            .CONTENT.filter(
              (c) =>
                c.title.toLowerCase().includes(lq) ||
                c.genre.toLowerCase().includes(lq) ||
                c.type.includes(lq),
            )
            .slice(0, 6),
        )
      } else {
        setResults([])
      }
      setSearching(false)
    })
    return () => {
      alive = false
    }
  }, [debounced, mergeContent])

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (location.pathname.startsWith('/player')) {
      setHidden(false)
      return
    }
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 50)
      const goingDown = y > lastY
      if (goingDown && y > 120) setHidden(true)
      else if (!goingDown) setHidden(false)
      lastY = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [location.pathname])

  const selectResult = (id) => {
    setOpen(false)
    setQuery('')
    setResults([])
    navigate(`/details/${id}`)
  }

  return (
    <header
      className={
        'fixed top-0 right-0 left-0 md:left-64 h-20 backdrop-blur-md flex justify-between items-center px-container-padding-mobile md:px-container-padding-desktop w-full z-40 transition-all duration-300 will-change-transform ' +
        (scrolled ? 'bg-surface/80 shadow-lg ' : 'bg-transparent ') +
        (hidden ? '-translate-y-full' : '')
      }
    >
      <div ref={boxRef} className="flex items-center relative group w-full max-w-md">
        <span className="material-symbols-outlined absolute left-4 text-on-surface-variant group-hover:text-primary transition-colors pointer-events-none">search</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false)
            if (e.key === 'Enter' && results.length) selectResult(results[0].id)
          }}
          className="w-full bg-surface-container-high/70 border border-white/10 rounded-full py-3 pl-12 pr-4 text-on-surface font-body-md text-body-md placeholder:text-on-surface-variant/60 focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/20 transition-all"
          placeholder="Search movies and shows..."
          type="text"
        />
        {open && debounced.trim() && (
          <div className="bg-surface-container-low/95 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl absolute top-16 left-0 right-0 z-[60]">
            {searching ? (
              <div className="p-6 flex items-center justify-center gap-3 text-on-surface-variant">
                <span className="spinner !w-6 !h-6"></span>
                <span className="font-body-md text-body-md">Searching…</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant">
                No results for "<b>{debounced}</b>"
              </div>
            ) : (
              results.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectResult(c.id)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0"
                >
                  <img
                    src={c.poster}
                    alt={`${c.title} poster`}
                    className="w-10 h-14 rounded object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://picsum.photos/80/112'
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{c.title}</p>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">
                      {c.type === 'movie' ? 'Movie' : 'TV Show'} • {c.genre} • {c.year}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary text-[18px]">play_circle</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 pl-4 shrink-0">
        <Notifications />
        {!IS_SHELL && (
          <button
            onClick={() => navigate('/download')}
            aria-label="Get the MegahEnt app"
            className="text-on-surface-variant hover:text-primary transition-colors rounded-full"
          >
            <span className="material-symbols-outlined text-[24px]">download</span>
          </button>
        )}
        <div className="md:hidden">
          <UserMenu compact />
        </div>
      </div>
    </header>
  )
}

import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom'
import { buildStreamUrl, fallbackStreamUrl } from '../lib/stream'
import { movieUrl, episodeUrl, liveUrl } from '../lib/xtream'
import { useStore } from '../store/useStore'
import SeasonsEpisodes from '../components/ui/SeasonsEpisodes'
import SimilarRow from '../components/ui/SimilarRow'
import Footer from '../components/layout/Footer'

const fmtTime = (t) => {
  if (!Number.isFinite(t) || t < 0) return '0:00'
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = Math.floor(t % 60)
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`
}

const SPEEDS = [1, 1.25, 1.5, 2]

export default function Player() {
  const location = useLocation()
  const params = useParams()
  const [search] = useSearchParams()

  const liveMode = location.pathname === '/player/live'
  // iptv-org channels: /player/live?hls=<stream url>&name=<title>
  // The URL is validated here (http(s), no credentials, HLS only). It
  // only ever arrives from our own allowlisted playlist endpoint — a
  // hand-typed ?hls= value pointing elsewhere is rejected below. The
  // old ?dl= iframe mode (unvalidated third-party page in an iframe)
  // is deleted, not carried over.
  const rawHls = liveMode ? search.get('hls') || '' : ''
  const hlsUrl = (() => {
    if (!rawHls || rawHls.length > 2048) return ''
    try {
      const u = new URL(rawHls)
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return ''
      if (u.username || u.password) return ''
      if (!/\.m3u8($|[?#])/i.test(u.pathname + u.search)) return ''
      return u.href
    } catch {
      return ''
    }
  })()
  const hlsName = search.get('name') || 'Live Channel'
  // Xtream portal channels: /player/live?xtream=<stream id>&name=<title>
  const xtreamId = liveMode ? Number(search.get('xtream')) || null : null
  const xtreamName = search.get('name') || 'Live Channel'
  // Portal VOD movies (pvod-<streamId>) and series episodes (pser-<seriesId>?episode=<id>)
  const portalMovie = (params.id || '').match(/^pvod-(\d+)$/)
  const portalSeries = (params.id || '').match(/^pser-(\d+)$/)
  const portalEpisode = search.get('episode')
  const portalExt = search.get('ext') || (portalSeries ? 'mkv' : 'mp4')
  const portalName = search.get('name') || 'Portal title'
  const portalMode = Boolean(portalMovie || portalSeries)

  const match = liveMode ? null : (params.id || '').match(/^(movie-\d+|show-\d+)(?:-s(\d+)e(\d+))?$/)
  const baseId = match ? match[1] : null
  const season = match ? Number(match[2] || 1) : null
  const episode = match ? Number(match[3] || 1) : null
  const isEpisode = Boolean(match && match[2])

  const item = useStore((s) => (!liveMode && baseId ? s.CONTENT.find((c) => c.id === baseId) : null))
  const progressKey = liveMode || portalMode ? null : isEpisode ? `${baseId}-s${season}e${episode}` : baseId
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)
  const markStarted = useStore((s) => s.markStarted)
  const showToast = useStore((s) => s.showToast)

  const [source, setSource] = useState({ status: 'probing', url: '' })
  // TMDB titles: VidAPI/VAPlayer primary, NontonGo fallback.
  const providerRef = useRef('vidapi')
  const [tmdbProvider, setTmdbProvider] = useState('vidapi')
  // Top chrome (back / title / LIVE) hides once playback starts and
  // reappears while the mouse is over the player — standard cinema UX.
  const [chromeHover, setChromeHover] = useState(false)
  const chromeVisible = chromeHover || source.status !== 'ready'

  // --- Custom controls (video element only: portal titles + live HLS) ---
  const videoMode = portalMode || Boolean(xtreamId) || Boolean(hlsUrl)
  const isLive = Boolean(xtreamId) || Boolean(hlsUrl)
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const uiTimer = useRef(null)
  const seekingRef = useRef(false)
  const [uiVisible, setUiVisible] = useState(true)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const chromeVisibleFinal = source.status !== 'ready' || (videoMode ? uiVisible : chromeHover)

  const showUi = () => {
    setUiVisible(true)
    clearTimeout(uiTimer.current)
    uiTimer.current = setTimeout(() => {
      const v = videoRef.current
      if (v && !v.paused && !seekingRef.current) setUiVisible(false)
    }, 3000)
  }

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => {})
    else v.pause()
  }

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  const onVolumeChange = (val) => {
    const v = videoRef.current
    if (!v) return
    v.volume = val
    v.muted = val === 0
    setVolume(val)
    setMuted(val === 0)
  }

  const seekTo = (t) => {
    const v = videoRef.current
    if (!v || !Number.isFinite(t)) return
    v.currentTime = Math.min(Math.max(t, 0), v.duration || t)
    setCurrentTime(v.currentTime)
  }

  const toggleFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else el.requestFullscreen().catch(() => {})
  }

  const cycleSpeed = () => {
    const v = videoRef.current
    if (!v) return
    const next = SPEEDS[(SPEEDS.indexOf(v.playbackRate) + 1) % SPEEDS.length]
    v.playbackRate = next
    setSpeed(next)
  }

  const togglePip = () => {
    const v = videoRef.current
    if (!v) return
    if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})
    else v.requestPictureInPicture?.().catch(() => {})
  }

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  useEffect(() => () => clearTimeout(uiTimer.current), [])

  const stageKeyDown = (e) => {
    if (!videoRef.current) return
    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault()
      togglePlay()
      showUi()
    } else if (e.key === 'f') {
      e.preventDefault()
      toggleFullscreen()
    } else if (e.key === 'm') {
      e.preventDefault()
      toggleMute()
    } else if (e.key === 'ArrowRight' && !isLive) {
      e.preventDefault()
      seekTo((videoRef.current?.currentTime || 0) + 10)
      showUi()
    } else if (e.key === 'ArrowLeft' && !isLive) {
      e.preventDefault()
      seekTo((videoRef.current?.currentTime || 0) - 10)
      showUi()
    }
  }

  const onStageMouseMove = () => {
    if (videoMode) showUi()
    else setChromeHover(true)
  }

  const onStageMouseLeave = () => {
    if (videoMode) {
      clearTimeout(uiTimer.current)
      const v = videoRef.current
      if (!v || v.paused) setUiVisible(true)
      else setUiVisible(false)
    } else setChromeHover(false)
  }

  const seekFromPointer = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * duration)
  }

  const activeItem = portalMode
    ? { id: params.id, title: portalName, type: 'movie' }
    : liveMode
      ? (xtreamId ? { id: `xtream-${xtreamId}`, title: xtreamName, type: 'live' } : { id: 'iptv-live', title: hlsName, type: 'live' })
      : item

  const resolveSource = () => {
    if (!activeItem) return
    // Xtream portal channels play directly over HLS via hls.js — no probing.
    if (xtreamId) {
      setSource({ status: 'ready', url: liveUrl(useStore.getState().settings, xtreamId) })
      return
    }
    // iptv-org live channels play their HLS stream directly (video mode).
    if (liveMode) {
      if (hlsUrl) setSource({ status: 'ready', url: hlsUrl })
      else setSource({ status: 'failed', url: '' })
      return
    }
    // Portal VOD/episodes are direct files on the portal — no probing.
    if (portalMovie) {
      setSource({ status: 'ready', url: movieUrl(useStore.getState().settings, Number(portalMovie[1]), portalExt) })
      return
    }
    if (portalSeries && portalEpisode) {
      setSource({ status: 'ready', url: episodeUrl(useStore.getState().settings, Number(portalEpisode), portalExt) })
      return
    }
    // TMDB titles — VidAPI/VAPlayer primary, NontonGo fallback.
    const isShow = activeItem.type === 'show'
    const s = isShow ? season : null
    const e = isShow ? episode : null
    const url = providerRef.current === 'nontongo'
      ? fallbackStreamUrl(activeItem, s, e)
      : buildStreamUrl(activeItem, s, e)
    setSource(url ? { status: 'ready', url } : { status: 'failed', url: '' })
  }

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  useEffect(() => {
    providerRef.current = 'vidapi'
    setTmdbProvider('vidapi')
    resolveSource()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem?.id, season, episode])

  // Hard iframe failures (DNS/dead host) fire onError — drop to the fallback
  // automatically. Soft failures get the manual switch in the chrome.
  const handleIframeError = () => {
    if (!baseId) return
    if (providerRef.current === 'vidapi') {
      providerRef.current = 'nontongo'
      setTmdbProvider('nontongo')
      showToast('Primary source unavailable — switched to fallback', 'swap_horiz')
      resolveSource()
    } else {
      setSource({ status: 'failed', url: '' })
    }
  }

  const switchSource = () => {
    providerRef.current = providerRef.current === 'vidapi' ? 'nontongo' : 'vidapi'
    setTmdbProvider(providerRef.current)
    setSource({ status: 'probing', url: '' })
    resolveSource()
  }

  useEffect(() => {
    if (!progressKey) return
    markStarted(progressKey)
  }, [progressKey])

  useEffect(() => {
    if (source.status !== 'ready' || !activeItem) return
    if (liveMode) {
      showToast(`Now playing: ${xtreamId ? xtreamName : hlsName}`, 'live_tv')
    } else if (isEpisode) {
      showToast(`Playing: ${activeItem.title} S${season}E${episode}`, 'play_circle')
    } else {
      showToast(`Playing: ${activeItem.title}`, 'play_circle')
    }
  }, [source.url])

  // Live HLS (Xtream + iptv-org) — Chromium plays them through hls.js, Safari natively.
  useEffect(() => {
    if (!isLive || source.status !== 'ready' || !source.url) return
    let cancelled = false
    let hls = null
    import('hls.js').then(({ default: Hls }) => {
      if (cancelled || !videoRef.current) return
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: true, lowLatencyMode: true })
        hls.loadSource(source.url)
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (data.fatal) showToast('Live stream interrupted', 'wifi_off')
        })
        videoRef.current.play().catch(() => {})
      } else {
        videoRef.current.src = source.url
      }
    })
    return () => {
      cancelled = true
      if (hls) hls.destroy()
    }
  }, [isLive, source.url, source.status])

  // Portal VOD/episodes are progressive files — plain video src.
  useEffect(() => {
    if (!portalMode || source.status !== 'ready' || !source.url) return
    const v = videoRef.current
    if (!v) return
    v.src = source.url
    v.play().catch(() => {})
  }, [portalMode, source.url, source.status])

  if (!activeItem) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center bg-black">
        {loadState !== 'ready' ? (
          <>
            <div className="spinner mb-6"></div>
            <p className="text-on-surface-variant font-body-md text-body-md">Loading player…</p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">videocam_off</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Source unavailable</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">This title could not be resolved.</p>
            <Link to="/" className="px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity">
              Back to Home
            </Link>
          </>
        )}
      </main>
    )
  }

  const title = portalMode
    ? portalName
    : liveMode
      ? (xtreamId ? xtreamName : hlsName)
      : isEpisode ? `${activeItem.title} — S${season}:E${episode}` : activeItem.title
  const progressText = portalMode
    ? portalName
    : liveMode
      ? `${xtreamId ? xtreamName : hlsName} • LIVE`
      : isEpisode ? `S${season}:E${episode} • ${activeItem.title}` : activeItem.title
  const backTo = portalMovie ? '/movies?source=portal' : portalSeries ? '/tv?source=portal' : liveMode ? '/live' : `/details/${baseId}`

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0
  const volumeIcon = muted || volume === 0 ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'

  return (
    <main className="relative min-h-screen flex flex-col bg-black">
      <div className="relative w-full bg-black overflow-hidden">
        {/* Responsive 16:9 stage — fits width on phones, capped by viewport
            height everywhere else, always centred. See .cg-player-stage. */}
        <div
          ref={stageRef}
          className={'cg-player-stage relative mx-auto outline-none ' + (videoMode && !uiVisible ? 'cursor-none' : '')}
          tabIndex={0}
          onKeyDown={stageKeyDown}
          onMouseEnter={() => { if (!videoMode) setChromeHover(true) }}
          onMouseMove={onStageMouseMove}
          onMouseLeave={onStageMouseLeave}
        >
          {videoMode && source.status === 'ready' && source.url ? (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full bg-black"
              autoPlay
              playsInline
              onClick={togglePlay}
              onPlay={() => { setIsPlaying(true); showUi() }}
              onPause={() => { setIsPlaying(false); setUiVisible(true); clearTimeout(uiTimer.current) }}
              onEnded={() => { setIsPlaying(false); setUiVisible(true) }}
              onTimeUpdate={() => { if (!seekingRef.current) setCurrentTime(videoRef.current?.currentTime || 0) }}
              onDurationChange={() => setDuration(videoRef.current?.duration || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
            />
          ) : source.status === 'ready' && source.url ? (
            <iframe
              id="stream-frame"
              src={source.url}
              onError={handleIframeError}
              className="absolute inset-0 w-full h-full border-0"
              allow="fullscreen; autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
              allowFullScreen
              title={title}
            ></iframe>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
              {source.status === 'probing' ? (
                <>
                  <div className="spinner"></div>
                  <p className="font-label-md text-label-md text-on-surface-variant">Finding the best source…</p>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[44px] text-on-surface-variant">cloud_off</span>
                  <p className="font-label-md text-label-md text-on-surface">No streaming source is reachable right now</p>
                  <button
                    onClick={resolveSource}
                    className="px-6 py-2.5 rounded-full font-label-md text-white btn-primary hover:opacity-90 transition-opacity"
                  >
                    Retry
                  </button>
                </>
              )}
            </div>
          )}

          {/* Center play button while paused (video mode) */}
          {videoMode && !isPlaying && source.status === 'ready' && (
            <button
              onClick={togglePlay}
              aria-label="Play"
              className="absolute inset-0 z-20 flex items-center justify-center group"
            >
              <span className="w-20 h-20 rounded-full bg-black/55 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shadow-2xl group-hover:scale-110 group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                <span className="material-symbols-outlined text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </span>
            </button>
          )}

          <div
            className={
              'absolute top-0 left-0 right-0 z-30 flex items-center justify-between p-container-padding-mobile md:p-container-padding-desktop bg-gradient-to-b from-black/80 to-transparent pointer-events-none transition-all duration-300 ' +
              (chromeVisibleFinal ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3')
            }
          >
            <Link
              to={backTo}
              className={
                'flex items-center gap-unit glass-panel rounded-full px-4 py-2 text-on-surface hover:text-primary hover:bg-white/5 transition-all duration-300 cursor-pointer ' +
                (chromeVisibleFinal ? 'pointer-events-auto' : 'pointer-events-none')
              }
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="font-label-md text-label-md uppercase tracking-wider hidden sm:inline">Back</span>
            </Link>
            <div id="player-title" className="font-headline-md text-headline-md font-bold drop-shadow-md text-center px-4 truncate">{title}</div>
            <div className="flex items-center gap-2 pointer-events-none">
              {!liveMode && !portalMode && (
                <button
                  onClick={switchSource}
                  className={
                    'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-panel text-on-surface hover:text-primary hover:bg-white/10 transition-all text-label-sm font-label-sm ' +
                    (chromeVisibleFinal ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')
                  }
                  title="Switch streaming source"
                >
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  {tmdbProvider === 'vidapi' ? 'Source 1' : 'Source 2'}
                </button>
              )}
              <div
                id="player-live-badge"
                className={
                  'items-center gap-1 px-3 py-1 rounded-full bg-primary/20 text-primary font-label-sm text-label-sm uppercase tracking-wider border border-primary/30 ' +
                  (liveMode ? 'flex' : 'hidden')
                }
              >
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span> LIVE
              </div>
              <div id="player-progress-text" className="glass-panel px-4 py-2 rounded-full text-on-surface font-label-sm text-label-sm hidden md:block">{progressText}</div>
            </div>
          </div>

          {/* Custom controls — video mode only (portal titles + Xtream live) */}
          {videoMode && source.status === 'ready' && (
            <div
              className={
                'absolute bottom-0 left-0 right-0 z-40 px-4 md:px-6 pb-3 pt-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-all duration-300 ' +
                (uiVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none')
              }
            >
              {!isLive && (
                <div
                  className="group relative h-1.5 mb-2 cursor-pointer"
                  onPointerDown={(e) => { seekingRef.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekFromPointer(e) }}
                  onPointerMove={(e) => { if (seekingRef.current) seekFromPointer(e) }}
                  onPointerUp={(e) => { seekingRef.current = false; e.currentTarget.releasePointerCapture(e.pointerId) }}
                  role="slider"
                  aria-label="Seek"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(duration)}
                  aria-valuenow={Math.round(currentTime)}
                >
                  <div className="absolute inset-0 rounded-full bg-white/20"></div>
                  <div className="absolute inset-y-0 left-0 rounded-full bg-primary shadow-[0_0_8px_rgba(229,9,20,0.6)]" style={{ width: `${progressPct}%` }}></div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-primary scale-0 group-hover:scale-100 transition-transform shadow-[0_0_10px_rgba(229,9,20,0.8)]"
                    style={{ left: `${progressPct}%` }}
                  ></div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} aria-label={isPlaying ? 'Pause' : 'Play'} className="text-on-surface hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>{isPlaying ? 'pause_circle' : 'play_circle'}</span>
                </button>
                <div className="flex items-center gap-2 group/vol">
                  <button onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'} className="text-on-surface hover:text-primary transition-colors">
                    <span className="material-symbols-outlined text-[24px]">{volumeIcon}</span>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    aria-label="Volume"
                    className="w-0 group-hover/vol:w-20 focus:w-20 transition-all duration-300 opacity-0 group-hover/vol:opacity-100 focus:opacity-100"
                  />
                </div>
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/20 border border-primary/40 font-label-sm text-label-sm text-primary uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Live
                  </span>
                ) : (
                  <span className="font-label-sm text-label-sm text-on-surface tabular-nums">
                    {fmtTime(currentTime)} <span className="text-on-surface-variant">/ {fmtTime(duration)}</span>
                  </span>
                )}
                <div className="flex-1"></div>
                {!isLive && (
                  <button onClick={cycleSpeed} aria-label="Playback speed" className="text-on-surface hover:text-primary transition-colors font-label-sm text-label-sm tabular-nums px-1.5">
                    {speed}×
                  </button>
                )}
                {!isLive && (
                  <button onClick={togglePip} aria-label="Picture in picture" className="text-on-surface hover:text-primary transition-colors hidden sm:block">
                    <span className="material-symbols-outlined text-[22px]">picture_in_picture_alt</span>
                  </button>
                )}
                <button onClick={toggleFullscreen} aria-label="Fullscreen" className="text-on-surface hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-[26px]">{isFullscreen ? 'fullscreen_exit' : 'fullscreen'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      {!liveMode && !portalMode && activeItem.type === 'show' && (
        <div className="px-container-padding-mobile md:px-container-padding-desktop py-8 space-y-6 bg-background border-t border-white/5">
          <SeasonsEpisodes item={activeItem} initialSeason={season} />
        </div>
      )}
      {!liveMode && !portalMode && (
        <div className="px-container-padding-mobile md:px-container-padding-desktop py-8 space-y-6 bg-background border-t border-white/5">
          <SimilarRow item={activeItem} />
        </div>
      )}
      <Footer />
    </main>
  )
}

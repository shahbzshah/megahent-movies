import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * In-app trailer theatre — MegahEnt-branded playback over a YouTube source.
 * Native YouTube controls are stripped (controls=0) and replaced with our own
 * control bar: play/pause, seek, time, mute, fullscreen. The corner watermark
 * area carries the MegahEnt wordmark instead.
 *
 * NOTE: the stage deliberately avoids backdrop-filter/opacity compositing
 * (no .glass-panel) — those effects make Chromium drop the iframe's video
 * layer (black screen, sound only).
 */

let ytApiPromise = null
function loadYTApi() {
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve(window.YT)
      const prev = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prev === 'function') prev()
        resolve(window.YT)
      }
      const s = document.createElement('script')
      s.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(s)
    })
  }
  return ytApiPromise
}

const fmt = (t) => {
  const m = Math.floor(t / 60)
  const sec = Math.floor(t % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export default function TrailerPlayer({ trailers, index, onClose }) {
  const active = trailers[index]
  const holderRef = useRef(null)
  const stageRef = useRef(null)
  const playerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cur, setCur] = useState(0)
  const [dur, setDur] = useState(0)

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === ' ' && playerRef.current) {
        e.preventDefault()
        const p = playerRef.current.getPlayerState()
        p === 1 ? playerRef.current.pauseVideo() : playerRef.current.playVideo()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  useEffect(() => {
    let destroyed = false
    let poll = null
    loadYTApi().then((YT) => {
      if (destroyed || !holderRef.current || !active) return
      playerRef.current = new YT.Player(holderRef.current, {
        videoId: active.key,
        playerVars: { autoplay: 1, controls: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3 },
        events: {
          onReady: () => {
            if (destroyed) return
            setReady(true)
            playerRef.current.playVideo()
            poll = setInterval(() => {
              try {
                setCur(playerRef.current.getCurrentTime() || 0)
                setDur(playerRef.current.getDuration() || 0)
                setPlaying(playerRef.current.getPlayerState() === 1)
                setMuted(playerRef.current.isMuted())
              } catch { /* mid-teardown */ }
            }, 300)
          },
        },
      })
    })
    return () => {
      destroyed = true
      clearInterval(poll)
      try { playerRef.current?.destroy() } catch { /* gone */ }
      playerRef.current = null
    }
  }, [active?.key])

  if (!active) return null

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    p.getPlayerState() === 1 ? p.pauseVideo() : p.playVideo()
  }

  // Portal to <body>: an ancestor with transform/filter would otherwise
  // become the containing block for position:fixed and drag the theatre
  // out of the viewport centre.
  return createPortal(
    <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col" role="dialog" aria-modal="true" aria-label="Official Trailer">
      {/* Top chrome */}
      <header className="flex items-center justify-between gap-4 px-container-padding-mobile md:px-container-padding-desktop py-4 shrink-0">
        <div className="min-w-0">
          <h2 className="font-headline-sm text-headline-sm text-on-surface truncate">Official Trailer</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mt-0.5">{active.name}</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close trailer player"
          className="shrink-0 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-on-surface hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-container-padding-mobile md:px-container-padding-desktop pb-6">
        <div ref={stageRef} className="relative group/stage bg-black rounded-lg overflow-hidden select-none"
             style={{ aspectRatio: '16 / 9', width: '100%', maxWidth: 'min(1400px, calc((100dvh - 8rem) * 16 / 9))' }}>
          {/* YT iframe lands here (replaces the div) */}
          <div ref={holderRef} className="absolute inset-0 w-full h-full [&>iframe]:absolute [&>iframe]:inset-0 [&>iframe]:w-full [&>iframe]:h-full"></div>

          {/* Click layer: tap video to toggle play */}
          {!playing && ready && (
            <button onClick={togglePlay} aria-label="Play" className="absolute inset-0 flex items-center justify-center">
              <span className="w-20 h-20 rounded-full bg-white/10 border border-white/25 flex items-center justify-center text-white hover:bg-primary hover:text-on-primary-container transition-colors">
                <span className="material-symbols-outlined text-[44px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
              </span>
            </button>
          )}

          {/* Brand chip masks YouTube's corner watermark with ours */}
          <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/60 font-headline-sm text-[13px] font-extrabold tracking-tight pointer-events-none">
            <span className="text-white">MEGAH</span><span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">ENT</span>
          </span>

          {/* Our own control bar */}
          <div className="absolute left-0 right-0 bottom-0 z-10 bg-gradient-to-t from-black/85 to-transparent pt-10 pb-3 px-4 flex items-center gap-3">
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'} className="text-on-surface hover:text-primary transition-colors">
              <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>{ready && playing ? 'pause' : 'play_arrow'}</span>
            </button>
            <span className="font-label-sm text-[12px] text-on-surface-variant tabular-nums w-10 text-right">{fmt(cur)}</span>
            <input
              type="range" min="0" max={dur || 0} step="1" value={cur}
              onChange={(e) => { setCur(Number(e.target.value)); playerRef.current?.seekTo(Number(e.target.value), true) }}
              aria-label="Seek" className="flex-1 h-1 cursor-pointer"
            />
            <span className="font-label-sm text-[12px] text-on-surface-variant tabular-nums w-10">{fmt(dur)}</span>
            <button
              onClick={() => { const p = playerRef.current; if (!p) return; p.isMuted() ? p.unMute() : p.mute() }}
              aria-label={muted ? 'Unmute' : 'Mute'}
              className="text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">{muted ? 'volume_off' : 'volume_up'}</span>
            </button>
            <button
              onClick={() => {
                const el = stageRef.current
                if (!el) return
                document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen?.()
              }}
              aria-label="Fullscreen"
              className="text-on-surface hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">fullscreen</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

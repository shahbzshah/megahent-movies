import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { fetchDetailsExtras, matchPercent } from '../lib/tmdb'
import { useStore } from '../store/useStore'
import SeasonsEpisodes from '../components/ui/SeasonsEpisodes'
import SimilarRow from '../components/ui/SimilarRow'
import Skeleton from '../components/ui/Skeleton'
import TrailerPlayer from '../components/ui/TrailerPlayer'

export default function Details() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = useStore((s) => s.CONTENT.find((c) => c.id === id))
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)
  const mergeContent = useStore((s) => s.mergeContent)

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  const [extras, setExtras] = useState(null)
  const [trailerIdx, setTrailerIdx] = useState(null)

  const inList = useStore((s) => (item ? s.myList.some((i) => i.id === item.id) : false))

  useEffect(() => {
    if (!item?.id) return
    let alive = true
    setExtras(null)
    fetchDetailsExtras(item).then((ex) => {
      if (!alive) return
      setExtras(ex)
      if (ex.meta) mergeContent([ex.meta])
      if (ex.similarItems.length) mergeContent(ex.similarItems)
    })
    return () => {
      alive = false
    }
  }, [item?.id])

  if (!item) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-24 px-container-padding-mobile md:px-container-padding-desktop text-center">
        {loadState !== 'ready' ? (
          <>
            <div className="spinner mb-6"></div>
            <p className="text-on-surface-variant font-body-md text-body-md">Loading title…</p>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">movie_off</span>
            <h2 className="font-headline-lg text-headline-lg text-on-surface mb-2">Title not found</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6">This title is no longer in the library.</p>
            <Link to="/" className="px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity">
              Back to Home
            </Link>
          </>
        )}
      </main>
    )
  }

  const isShow = item.type === 'show'

  return (
    <main className="relative min-h-screen flex flex-col pb-24">
      <section className="relative min-h-[540px] max-h-[92svh] w-full flex items-end md:min-h-[600px]">
        <div className="absolute inset-0 z-0">
          <div
            id="details-bg"
            className="w-full h-full bg-cover bg-center bg-no-repeat mix-blend-luminosity opacity-60"
            style={{ backgroundImage: `url('${item.banner || item.poster}')` }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent"></div>
        </div>
        <div className="relative z-10 w-full px-container-padding-mobile md:px-container-padding-desktop pb-section-gap pt-24">
          <div className="max-w-4xl space-y-6">
            <div className="flex flex-wrap items-center gap-3 font-label-sm text-label-sm uppercase tracking-wider">
              <span id="details-match" className="glass-panel px-3 py-1 rounded-full text-primary font-bold shadow-[0_0_10px_rgba(229,9,20,0.2)]">{matchPercent(item)}% Match</span>
              <span id="details-year" className="glass-panel px-3 py-1 rounded-full text-on-surface">{item.year}</span>
              {(item.duration || !isShow) && (
                <span id="details-duration" className="glass-panel px-3 py-1 rounded-full text-on-surface">{item.duration || '2h'}</span>
              )}
              {isShow && item.seasons && (
                <span id="details-seasons-badge" className="glass-panel px-3 py-1 rounded-full text-on-surface">{item.seasons} Season{item.seasons > 1 ? 's' : ''}</span>
              )}
              <span id="details-quality" className="glass-panel px-3 py-1 rounded-full text-on-surface flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">4k</span> {item.quality || 'HD'}
              </span>
            </div>
            <h1 id="details-title" className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background text-glow">{item.title}</h1>
            <p id="details-genre" className="text-primary font-label-md text-label-md uppercase tracking-[0.2em]">{item.genre || 'Movie'} • {isShow ? 'TV Series' : 'Movie'}</p>
            <p id="details-desc" className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">{item.desc}</p>
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                id="details-play-btn"
                onClick={() => navigate(`/player/${item.id}`)}
                className="btn-primary text-white px-8 py-4 rounded-lg font-label-md text-label-md font-bold flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Play Now
              </button>
              {extras?.trailers?.length > 0 && (
                <button
                  id="details-trailer-btn"
                  onClick={() => setTrailerIdx(0)}
                  className="glass-panel text-on-background px-8 py-4 rounded-lg font-label-md text-label-md font-bold flex items-center gap-2 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>smart_display</span> Trailer
                </button>
              )}
              <button
                id="details-list-btn"
                onClick={() => useStore.getState().toggleMyList(item.id)}
                className="glass-panel text-on-background px-8 py-4 rounded-lg font-label-md text-label-md font-bold flex items-center gap-2 hover:bg-white/10 hover:border-white/20 hover:scale-105 transition-all duration-300"
              >
                <span className="material-symbols-outlined">{inList ? 'check' : 'add'}</span> <span>{inList ? 'In My List' : 'Add to My List'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-container-padding-mobile md:px-container-padding-desktop space-y-section-gap relative z-20 -mt-10">
        {isShow && (
          <section id="details-seasons-wrap">
            <SeasonsEpisodes item={item} />
          </section>
        )}
        <section className="space-y-6">
          <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-3">
            <span className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></span> Cast &amp; Crew
          </h2>
          {!extras ? (
            <Skeleton className="w-full h-32 max-w-xl" />
          ) : extras.cast.length ? (
            <div id="details-cast" className="flex gap-gutter overflow-x-auto pb-4 no-scrollbar">
              {extras.cast.map((a) => (
                <div key={a.name + a.character} className="flex-shrink-0 w-32 group">
                  <div className="w-32 h-32 rounded-full overflow-hidden glass-panel border-2 border-transparent group-hover:border-primary/50 transition-all duration-300 mb-3 shadow-lg group-hover:shadow-[0_0_20px_rgba(229,9,20,0.2)]">
                    <img
                      alt={a.name}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      src={a.photo}
                      onError={(e) => {
                        e.currentTarget.src = 'https://picsum.photos/128/128'
                      }}
                    />
                  </div>
                  <h3 className="font-label-md text-label-md text-on-background text-center group-hover:text-primary transition-colors">{a.name}</h3>
                  <p className="font-label-sm text-label-sm text-on-surface-variant text-center mt-1 truncate">{a.character}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-on-surface-variant font-body-md text-body-md">Cast not available.</p>
          )}
        </section>
        <SimilarRow item={item} />
      </div>
      {trailerIdx !== null && extras && extras.trailers.length > 0 && (
        <TrailerPlayer
          trailers={extras.trailers}
          index={trailerIdx}
          onSelect={setTrailerIdx}
          onClose={() => setTrailerIdx(null)}
        />
      )}
    </main>
  )
}

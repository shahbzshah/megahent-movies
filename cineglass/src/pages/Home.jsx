import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { matchPercent, newestFirst } from '../lib/tmdb'
import { selectInList, useStore } from '../store/useStore'
import Carousel from '../components/ui/Carousel'
import PosterCard from '../components/ui/PosterCard'
import Skeleton from '../components/ui/Skeleton'
import WideCard from '../components/ui/WideCard'

export default function Home() {
  const navigate = useNavigate()
  const CONTENT = useStore((s) => s.CONTENT)
  const progress = useStore((s) => s.progress)
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)
  const retryLoad = useStore((s) => s.retryLoad)

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  const [heroIndex, setHeroIndex] = useState(0)
  const [heroLoaded, setHeroLoaded] = useState(false)

  const movies = useMemo(() => newestFirst(CONTENT.filter((c) => c.type === 'movie')), [CONTENT])
  const shows = useMemo(() => newestFirst(CONTENT.filter((c) => c.type === 'show')), [CONTENT])
  // Hero rotation interleaves the newest movies and series so both get the spotlight.
  const heroPool = useMemo(() => {
    const pool = []
    for (let i = 0; i < Math.max(movies.length, shows.length); i++) {
      if (movies[i]) pool.push(movies[i])
      if (shows[i]) pool.push(shows[i])
    }
    return pool.slice(0, 7)
  }, [movies, shows])

  useEffect(() => {
    if (heroPool.length < 2) return
    const t = setInterval(() => {
      setHeroIndex((i) => i + 1)
      setHeroLoaded(false)
    }, 8000)
    return () => clearInterval(t)
  }, [heroPool.length])

  const hero = heroPool.length ? heroPool[heroIndex % heroPool.length] : null
  const heroInList = useStore((s) => (hero ? selectInList(s, hero.id) : false))

  const inProgress = useMemo(
    () =>
      Object.keys(progress)
        .map((id) => CONTENT.find((c) => c.id === id))
        .filter(Boolean),
    [progress, CONTENT],
  )
  const trending = useMemo(() => CONTENT.filter((c) => c.type === 'movie' && (c.isNew || c.rating >= 4.5)).slice(0, 12), [CONTENT])
  const trendingShows = useMemo(() => CONTENT.filter((c) => c.type === 'show' && (c.isNew || c.rating >= 4.5)).slice(0, 12), [CONTENT])
  const curatedRows = useStore((s) => s.curatedRows)

  const loading = loadState === 'idle' || loadState === 'loading'

  return (
    <main className="flex-1 relative min-h-screen pb-section-gap pt-20">
      <section className="relative w-full min-h-[540px] max-h-[92svh] overflow-hidden md:min-h-[600px]">
        {hero ? (
          <>
            <div className="absolute inset-0 w-full h-full">
              <img
                key={hero.id}
                id="hero-bg"
                alt="Hero Background"
                onLoad={() => setHeroLoaded(true)}
                className={'w-full h-full object-cover transition-opacity duration-700 ' + (heroLoaded ? 'opacity-100' : 'opacity-0')}
                src={hero.banner || hero.poster}
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
            <div className="absolute bottom-16 left-container-padding-mobile md:left-container-padding-desktop right-container-padding-mobile md:right-container-padding-desktop max-w-3xl z-10">
              <div className="flex items-center gap-3 mb-4 font-label-md text-label-md text-on-surface-variant">
                <span className="text-primary font-bold">{matchPercent(hero)}% Match</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50" aria-hidden="true"></span>
                <span>{hero.year}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50" aria-hidden="true"></span>
                <span className="uppercase tracking-wider">{hero.type === 'show' ? 'Series' : 'Film'}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50" aria-hidden="true"></span>
                <span className="uppercase tracking-wider">{hero.genre}</span>
              </div>
              <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-4 drop-shadow-2xl">{hero.title}</h2>
              <p className="font-body-lg text-body-lg text-tertiary mb-8 max-w-2xl drop-shadow-md line-clamp-3">{hero.desc}</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/player/${hero.id}`)}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                  Play Now
                </button>
                <button
                  onClick={() => useStore.getState().toggleMyList(hero.id)}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-lg font-label-md text-label-md text-white btn-ghost hover:bg-white/10 transition-transform hover:scale-105 active:scale-95"
                >
                  <span className="material-symbols-outlined">{heroInList ? 'check' : 'add'}</span>
                  <span>{heroInList ? 'In My List' : 'My List'}</span>
                </button>
              </div>
              {heroPool.length > 1 && (
                <div className="flex items-center gap-2 mt-8" role="tablist" aria-label="Featured titles">
                  {heroPool.map((m, i) => {
                    const activeDot = i === heroIndex % heroPool.length
                    return (
                      <button
                        key={m.id}
                        role="tab"
                        aria-selected={activeDot}
                        aria-label={`Show ${m.title}`}
                        onClick={() => {
                          setHeroIndex(i)
                          setHeroLoaded(false)
                        }}
                        className={
                          'h-1.5 rounded-full transition-all duration-300 ' +
                          (activeDot ? 'w-6 bg-primary shadow-[0_0_8px_rgba(229,9,20,0.6)]' : 'w-2 bg-white/30 hover:bg-white/50')
                        }
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <Skeleton className="absolute inset-0 min-h-[600px] rounded-none" />
        )}
      </section>

      {loading && (
        <section className="px-container-padding-mobile md:px-container-padding-desktop mt-10">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="flex gap-gutter overflow-hidden">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="flex-none w-72 h-48" />
            ))}
          </div>
        </section>
      )}

      {loadState === 'error' && (
        <section className="px-container-padding-mobile md:px-container-padding-desktop mt-section-gap">
          <div className="glass-panel rounded-2xl p-12 flex flex-col items-center justify-center text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">wifi_off</span>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Couldn&apos;t load titles</h3>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">The TMDB service could not be reached. Check your connection and try again.</p>
            <button onClick={retryLoad} className="mt-6 px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity">
              Retry
            </button>
          </div>
        </section>
      )}

      {inProgress.length > 0 && (
        <section id="home-continue-watching" className="px-container-padding-mobile md:px-container-padding-desktop mt-10">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">Continue Watching</h2>
          <Carousel>
            {inProgress.slice(0, 4).map((s) => (
              <WideCard key={s.id} item={s} percent={progress[s.id]?.percent ?? 66} />
            ))}
          </Carousel>
        </section>
      )}

      {trending.length > 0 && (
        <section id="home-trending" className="px-container-padding-mobile md:px-container-padding-desktop mt-section-gap">
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 whitespace-nowrap">Trending Movies
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </h2>
          </div>
          <Carousel className="pb-10 -mb-10">
            {trending.map((c) => (
              <PosterCard key={c.id} item={c} />
            ))}
          </Carousel>
        </section>
      )}

      {trendingShows.length > 0 && (
        <section id="home-trending-shows" className="px-container-padding-mobile md:px-container-padding-desktop mt-section-gap">
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 whitespace-nowrap">Trending Series
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </h2>
          </div>
          <Carousel className="pb-10 -mb-10">
            {trendingShows.map((c) => (
              <PosterCard key={c.id} item={c} />
            ))}
          </Carousel>
        </section>
      )}

      {curatedRows.map((row) => (
        <section key={row.id} id={`home-curated-${row.id}`} className="px-container-padding-mobile md:px-container-padding-desktop mt-section-gap">
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2">
              {row.title}
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            </h2>
          </div>
          <Carousel className="pb-10 -mb-10">
            {row.items.map((c) => (
              <PosterCard key={c.id} item={c} />
            ))}
          </Carousel>
        </section>
      ))}
    </main>
  )
}

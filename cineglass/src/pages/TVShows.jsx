import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { matchPercent, newestFirst } from '../lib/tmdb'
import { selectInList, useStore } from '../store/useStore'
import Carousel from '../components/ui/Carousel'
import PosterCard from '../components/ui/PosterCard'
import WideCard from '../components/ui/WideCard'
import SortSelect, { sortContent } from '../components/ui/SortSelect'

export default function TVShows() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get('sort') || 'newest'

  const CONTENT = useStore((s) => s.CONTENT)
  const progress = useStore((s) => s.progress)
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)
  const catalogLoading = useStore((s) => s.catalogLoading)
  const catalogHasMore = useStore((s) => s.catalogHasMore.show)
  const loadMoreCatalog = useStore((s) => s.loadMoreCatalog)

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  const shows = useMemo(() => CONTENT.filter((c) => c.type === 'show'), [CONTENT])
  const sorted = useMemo(() => sortContent(shows, sort), [shows, sort])
  const banner = useMemo(() => newestFirst(shows)[0], [shows])
  const bannerInList = useStore((s) => (banner ? selectInList(s, banner.id) : false))

  const inProgress = useMemo(
    () =>
      Object.keys(progress)
        .map((id) => CONTENT.find((c) => c.id === id))
        .filter(Boolean),
    [progress, CONTENT],
  )
  const cwContent = [...inProgress, ...shows.slice(0, 2)].slice(0, 3)

  // Netflix-style categorisation: one row per genre, biggest first.
  const genreRows = useMemo(() => {
    const byGenre = new Map()
    for (const s of shows) {
      if (!s.genre) continue
      if (!byGenre.has(s.genre)) byGenre.set(s.genre, [])
      byGenre.get(s.genre).push(s)
    }
    return [...byGenre.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({ name, items: sortContent(items, sort) }))
  }, [shows, sort])

  const setSort = (s) => {
    const params = new URLSearchParams(searchParams)
    if (s === 'newest') params.delete('sort')
    else params.set('sort', s)
    setSearchParams(params)
  }

  return (
    <main className="relative min-h-screen pb-24 md:pb-0">
      <section className="relative min-h-[540px] max-h-[92svh] w-full flex items-end pt-20 md:min-h-[600px]">
        <div className="absolute inset-0 z-0">
          <div
            id="tv-banner-bg"
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: banner ? `url('${banner.banner || banner.poster}')` : "url('https://picsum.photos/1280/720')" }}
          ></div>
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10"></div>
        </div>
        <div className="relative z-20 px-container-padding-mobile md:px-container-padding-desktop w-full max-w-4xl pb-section-gap">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high/60 backdrop-blur-md border border-white/10 mb-4">
            <span id="tv-banner-genre" className="font-label-sm text-label-sm text-primary uppercase tracking-widest">{banner?.genre || 'TV Series'}</span>
          </div>
          <h1 id="tv-banner-title" className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2 shadow-sm">
            {banner?.title || 'Loading series…'}
          </h1>
          {banner && (
            <>
              <div className="flex items-center gap-4 mb-6 font-label-md text-label-md text-on-surface-variant">
                <span id="tv-banner-match" className="text-secondary font-bold">{matchPercent(banner)}% Match</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50"></span>
                <span id="tv-banner-year">{banner.year}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50"></span>
                <span id="tv-banner-seasons">{banner.seasons ? `${banner.seasons} Season${banner.seasons > 1 ? 's' : ''}` : 'Series'}</span>
                <span className="w-1 h-1 rounded-full bg-on-surface-variant/50"></span>
                <span className="px-1.5 py-0.5 rounded bg-white/10 border border-white/20 text-[10px] uppercase tracking-wider">HD</span>
              </div>
              <p id="tv-banner-desc" className="font-body-lg text-body-lg text-on-surface/80 max-w-2xl mb-8 line-clamp-3 md:line-clamp-none">{banner.desc}</p>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  id="tv-banner-play-btn"
                  onClick={() => navigate(`/player/${banner.id}`)}
                  className="btn-primary text-white flex items-center gap-2 px-8 py-4 rounded-lg font-label-md text-label-md font-bold hover:scale-105 transition-all duration-300"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Play S1:E1
                </button>
                <button
                  id="tv-banner-list-btn"
                  onClick={() => useStore.getState().toggleMyList(banner.id)}
                  className="glass-button flex items-center gap-2 px-6 py-4 rounded-lg text-on-surface font-label-md text-label-md hover:bg-white/10 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                >
                  <span className="material-symbols-outlined">{bannerInList ? 'check' : 'add'}</span> <span>{bannerInList ? 'In My List' : 'Add to My List'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      <div className="px-container-padding-mobile md:px-container-padding-desktop flex flex-col gap-section-gap relative z-20 -mt-10">
        <section id="tv-continue-watching">
          {cwContent.length > 0 && (
            <>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">Continue Watching</h2>
              <Carousel>
                {cwContent.map((s) => (
                  <WideCard key={s.id} item={s} percent={progress[s.id]?.percent ?? 66} />
                ))}
              </Carousel>
            </>
          )}
        </section>
        <section id="tv-trending">
          <div className="flex justify-between items-end mb-6 gap-4">
            <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-2 whitespace-nowrap">Trending Now
              <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            </h2>
            <SortSelect value={sort} onChange={setSort} />
          </div>
          <Carousel className="pb-10 -mb-10">
            {sorted.slice(0, 18).map((s) =>
              s.isNew ? (
                <PosterCard key={s.id} item={s} badge={
                  <div className="absolute top-2 left-2 px-2 py-1 rounded bg-secondary/20 text-secondary text-[10px] uppercase font-bold tracking-wider backdrop-blur-sm border border-secondary/30 z-10">New</div>
                } />
              ) : (
                <PosterCard key={s.id} item={s} />
              ),
            )}
          </Carousel>
        </section>
        {genreRows.map(({ name, items }) => (
          <section key={name}>
            <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3 mb-6">
              <span className="w-1 h-6 bg-secondary rounded-full shadow-[0_0_10px_rgba(173,198,255,0.5)]"></span>
              {name}
              <span className="font-label-sm text-label-sm text-on-surface-variant/60 font-normal">{items.length}</span>
            </h3>
            <Carousel>
              {items.slice(0, 16).map((s) => (
                <PosterCard key={s.id} item={s} />
              ))}
            </Carousel>
          </section>
        ))}
        {catalogHasMore && (
          <div className="flex flex-col items-center gap-3 mt-12">
            <button
              onClick={() => loadMoreCatalog('show')}
              disabled={catalogLoading}
              className="px-8 py-3 rounded-full glass-button font-label-md text-label-md text-on-surface hover:bg-white/10 active:scale-95 transition-all disabled:opacity-50"
            >
              {catalogLoading ? (
                <span className="flex items-center gap-2">
                  <span className="spinner"></span> Loading more from TMDB…
                </span>
              ) : (
                'Load More'
              )}
            </button>
            <p className="font-label-sm text-label-sm text-on-surface-variant/60">Fetching more series beyond the trending rows</p>
          </div>
        )}
      </div>
    </main>
  )
}

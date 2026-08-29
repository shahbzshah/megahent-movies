import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { newestFirst } from '../lib/tmdb'
import { selectInList, useStore } from '../store/useStore'
import Carousel from '../components/ui/Carousel'
import PosterCard from '../components/ui/PosterCard'
import Skeleton from '../components/ui/Skeleton'
import SortSelect, { sortContent } from '../components/ui/SortSelect'

function GenreRow({ title, items }) {
  if (!items.length) return null
  return (
    <section className="mb-section-gap">
      <h3 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3 mb-6">
        <span className="w-1 h-6 bg-secondary rounded-full shadow-[0_0_10px_rgba(173,198,255,0.5)]"></span>
        {title}
        <span className="font-label-sm text-label-sm text-on-surface-variant/60 font-normal">{items.length}</span>
      </h3>
      <Carousel>
        {items.map((m) => (
          <PosterCard key={m.id} item={m} />
        ))}
      </Carousel>
    </section>
  )
}

export default function Movies() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get('sort') || 'newest'

  const CONTENT = useStore((s) => s.CONTENT)
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)
  const catalogLoading = useStore((s) => s.catalogLoading)
  const catalogHasMore = useStore((s) => s.catalogHasMore.movie)
  const loadMoreCatalog = useStore((s) => s.loadMoreCatalog)

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  const movies = useMemo(() => CONTENT.filter((c) => c.type === 'movie'), [CONTENT])
  const sorted = useMemo(() => sortContent(movies, sort), [movies, sort])
  const banner = useMemo(() => newestFirst(movies)[0], [movies])
  const bannerInList = useStore((s) => (banner ? selectInList(s, banner.id) : false))

  // Netflix-style categorisation: one row per genre, biggest first.
  const genreRows = useMemo(() => {
    const byGenre = new Map()
    for (const m of movies) {
      if (!m.genre) continue
      if (!byGenre.has(m.genre)) byGenre.set(m.genre, [])
      byGenre.get(m.genre).push(m)
    }
    return [...byGenre.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, items]) => ({ name, items: sortContent(items, sort) }))
  }, [movies, sort])

  const setSort = (s) => {
    const params = new URLSearchParams(searchParams)
    if (s === 'newest') params.delete('sort')
    else params.set('sort', s)
    setSearchParams(params)
  }

  return (
    <main className="relative pt-24 md:pt-32 px-container-padding-mobile md:px-container-padding-desktop pb-32">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
        <div>
          <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">Movies Hub</h2>
          <p className="font-body-lg text-body-lg text-tertiary">Explore our curated collection of cinematic masterpieces.</p>
        </div>
        <SortSelect value={sort} onChange={setSort} />
      </div>

      {banner && (
        <section
          className="mb-section-gap relative rounded-xl overflow-hidden aspect-[21/9] w-full group cursor-pointer"
          id="movies-banner"
          onClick={() => navigate(`/player/${banner.id}`)}
        >
          <div
            id="banner-bg"
            className="absolute inset-0 bg-cover bg-center w-full h-full transform group-hover:scale-105 transition-transform duration-700 ease-in-out"
            style={{ backgroundImage: `url('${banner.banner || banner.poster}')` }}
          ></div>
          <div className="absolute bottom-0 left-0 w-full p-8 bg-gradient-to-t from-background via-background/80 to-transparent">
            <div className="max-w-3xl glass-panel p-6 rounded-xl transform translate-y-4 opacity-90 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase tracking-widest border border-white/10">New Release</span>
                <span id="banner-badge-quality" className="px-2.5 py-1 rounded-full bg-surface-variant text-on-surface font-label-sm text-label-sm uppercase tracking-widest border border-white/10 text-primary">{banner.quality || 'HD'}</span>
              </div>
              <h3 id="banner-title" className="font-headline-xl text-headline-xl text-on-surface mb-2">{banner.title}</h3>
              <p id="banner-desc" className="font-body-md text-body-md text-tertiary mb-6 line-clamp-2">{banner.desc}</p>
              <div className="flex gap-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/player/${banner.id}`)
                  }}
                  className="px-6 py-3 rounded-lg btn-primary text-white font-label-md text-label-md font-bold flex items-center gap-2 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Play Now
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    useStore.getState().toggleMyList(banner.id)
                  }}
                  className="px-6 py-3 rounded-lg glass-panel text-on-surface font-label-md text-label-md flex items-center gap-2 hover:bg-white/10 transition-all"
                >
                  <span className="material-symbols-outlined">{bannerInList ? 'check' : 'add'}</span> <span>{bannerInList ? 'In My List' : 'My List'}</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {loadState !== 'ready' && !sorted.length ? (
        <div id="movies-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-gutter">
          {Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="aspect-[2/3]" />)}
        </div>
      ) : (
        <>
          <GenreRow title="Trending Movies" items={sorted.slice(0, 18)} />
          {genreRows.map(({ name, items }) => (
            <GenreRow key={name} title={name} items={items.slice(0, 16)} />
          ))}
        </>
      )}

      {catalogHasMore && (
        <div className="flex flex-col items-center gap-3 mt-section-gap">
          <button
            onClick={() => loadMoreCatalog('movie')}
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
          <p className="font-label-sm text-label-sm text-on-surface-variant/60">Fetching more titles beyond the trending rows</p>
        </div>
      )}
    </main>
  )
}

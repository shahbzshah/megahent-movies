import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import MovieCard from '../components/ui/MovieCard'
import Skeleton from '../components/ui/Skeleton'

export default function MyList() {
  const myList = useStore((s) => s.myList)
  const CONTENT = useStore((s) => s.CONTENT)
  const loadState = useStore((s) => s.loadState)
  const load = useStore((s) => s.load)

  useEffect(() => {
    if (loadState === 'idle') load()
  }, [])

  const items = myList.map((l) => CONTENT.find((c) => c.id === l.id)).filter(Boolean)

  return (
    <main className="relative pt-24 md:pt-32 px-container-padding-mobile md:px-container-padding-desktop pb-32">
      <div className="mb-12">
        <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">My List</h2>
        <p id="mylist-count" className="font-body-lg text-body-lg text-tertiary">
          {items.length === 0 ? 'Your saved movies and shows.' : `${items.length} saved ${items.length === 1 ? 'title' : 'titles'}`}
        </p>
      </div>
      <div id="mylist-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-gutter">
        {loadState !== 'ready' && items.length === 0
          ? Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="aspect-[2/3]" />)
          : items.map((m) => <MovieCard key={m.id} item={m} />)}
      </div>
      {items.length === 0 && (
        <div id="mylist-empty" className="glass-panel rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <span className="material-symbols-outlined text-[64px] text-on-surface-variant mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>add_to_photos</span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Your list is empty</h3>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">Browse Movies, TV Shows, or Live TV and tap &quot;My List&quot; to save content for later.</p>
          <Link to="/movies" className="mt-6 px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity">
            Browse Movies
          </Link>
        </div>
      )}
    </main>
  )
}

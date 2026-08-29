import { useEffect, useMemo, useState } from 'react'
import { fetchSimilar } from '../../lib/tmdb'
import { useStore } from '../../store/useStore'
import PosterCard from './PosterCard'
import Skeleton from './Skeleton'

export default function SimilarRow({ item }) {
  const mergeContent = useStore((s) => s.mergeContent)
  const CONTENT = useStore((s) => s.CONTENT)
  const [pool, setPool] = useState(null)

  const fallback = useMemo(() => {
    if (!item) return []
    let list = CONTENT.filter((c) => c.id !== item.id && c.type === item.type && c.genre === item.genre).slice(0, 8)
    if (list.length < 4) {
      const extra = CONTENT.filter(
        (c) => c.id !== item.id && c.type === item.type && !list.find((p) => p.id === c.id),
      ).slice(0, 8 - list.length)
      list = list.concat(extra)
    }
    return list
  }, [CONTENT, item])

  useEffect(() => {
    if (!item?.tmdb) return
    let alive = true
    setPool(null)
    fetchSimilar(item).then((items) => {
      if (!alive) return
      if (items.length) mergeContent(items)
      setPool(items)
    })
    return () => {
      alive = false
    }
  }, [item?.id])

  const finalPool = pool === null ? null : pool.length ? pool : fallback

  return (
    <section className="space-y-6">
      <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-3">
        <span className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></span> More Like This
      </h2>
      {finalPool === null ? (
        <div className="flex gap-gutter overflow-hidden pb-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="flex-none w-48 h-72" />
          ))}
        </div>
      ) : finalPool.length ? (
        <div className="flex gap-gutter overflow-x-auto pb-4 no-scrollbar snap-x">
          {finalPool.map((s) => (
            <PosterCard key={s.id} item={s} />
          ))}
        </div>
      ) : (
        <p className="text-on-surface-variant font-body-md text-body-md">No similar titles found.</p>
      )}
    </section>
  )
}

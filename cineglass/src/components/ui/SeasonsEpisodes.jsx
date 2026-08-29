import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSeasonEpisodes, fetchShowSeasons } from '../../lib/tmdb'
import Skeleton from './Skeleton'

export default function SeasonsEpisodes({ item, initialSeason = null }) {
  const navigate = useNavigate()
  const [seasons, setSeasons] = useState(null)
  const [active, setActive] = useState(initialSeason)
  const [episodes, setEpisodes] = useState(null)

  useEffect(() => {
    if (initialSeason != null) setActive(initialSeason)
  }, [initialSeason])

  useEffect(() => {
    let alive = true
    if (!item?.tmdb || item.type !== 'show') {
      setSeasons([])
      return
    }
    setSeasons(null)
    fetchShowSeasons(item.tmdb).then((list) => {
      if (!alive) return
      setSeasons(list)
      setActive((cur) => cur ?? list[0]?.season_number ?? null)
    })
    return () => {
      alive = false
    }
  }, [item?.id])

  useEffect(() => {
    if (item?.type !== 'show' || !item?.tmdb || active == null) return
    let alive = true
    setEpisodes(null)
    fetchSeasonEpisodes(item.tmdb, active).then((data) => {
      if (alive) setEpisodes(data?.episodes || [])
    })
    return () => {
      alive = false
    }
  }, [active, item?.id])

  if (!seasons) return null

  return (
    <div className="space-y-6">
      <h2 className="font-headline-md text-headline-md text-on-background flex items-center gap-3">
        <span className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></span> Seasons &amp; Episodes
      </h2>
      {seasons.length === 0 ? (
        <p className="text-on-surface-variant font-body-md text-body-md">No seasons found.</p>
      ) : (
        <>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {seasons.map((s) => (
              <button
                key={s.season_number}
                onClick={() => setActive(s.season_number)}
                className={
                  'px-5 py-2 rounded-full font-label-md text-label-md whitespace-nowrap transition-colors ' +
                  (s.season_number === active
                    ? 'bg-primary text-on-primary-container shadow'
                    : 'glass-panel text-on-surface-variant hover:bg-white/10')
                }
              >
                {s.name} <span className="opacity-60 text-xs">({s.episode_count})</span>
              </button>
            ))}
          </div>
          {episodes === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <p className="text-on-surface-variant col-span-full">No episodes in this season.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {episodes.map((ep) => (
                <div
                  key={ep.episode_number}
                  onClick={() => navigate(`/player/${item.id}-s${active}e${ep.episode_number}`)}
                  className="group flex gap-4 p-3 rounded-xl glass-panel hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <div className="relative w-40 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
                    <img
                      src={ep.still_path ? `https://image.tmdb.org/t/p/w300${ep.still_path}` : item.poster}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = 'https://picsum.photos/300/170'
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <span className="material-symbols-outlined text-white text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
                      </span>
                    </div>
                    <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px]">{ep.runtime ? ep.runtime + 'm' : 'HD'}</span>
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-label-md text-label-md text-on-surface truncate">{ep.episode_number}. {ep.name || `Episode ${ep.episode_number}`}</h4>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1 line-clamp-2">{ep.overview || 'No description.'}</p>
                    <div className="flex items-center gap-2 mt-2 font-label-sm text-[11px] text-on-surface-variant">
                      <span>{ep.air_date || ''}</span><span>•</span>
                      <span className="text-primary">Play S{active}:E{ep.episode_number}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

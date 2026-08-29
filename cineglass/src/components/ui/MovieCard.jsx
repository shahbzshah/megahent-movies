import { useNavigate } from 'react-router-dom'
import { selectInList, useStore } from '../../store/useStore'

export default function MovieCard({ item, onOpen }) {
  const navigate = useNavigate()
  const inList = useStore((s) => selectInList(s, item.id))
  const percent = useStore((s) => s.progress[item.id]?.percent || 0)
  const toggleMyList = useStore((s) => s.toggleMyList)
  const open = () => (onOpen ? onOpen(item) : navigate(`/details/${item.id}`))

  return (
    <div
      className="group relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container-low ring-1 ring-white/5 cursor-pointer transition-all duration-300 group-hover:ring-white/20 hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]"
      onClick={open}
    >
      {item.isNew && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-primary text-white text-[10px] uppercase font-bold tracking-wider z-10">New</span>
      )}
      <img
        alt={`${item.title} Poster`}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
        src={item.poster}
        onError={(e) => {
          e.currentTarget.src = 'https://picsum.photos/500/750'
        }}
      />
      <div className="absolute inset-0 movie-card-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <div className="transform translate-y-3 group-hover:translate-y-0 transition-transform duration-300">
          <h4 className="font-label-md text-label-md text-on-surface truncate">{item.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{item.rating}</span>
            <span className="text-on-surface-variant/50 text-[10px]" aria-hidden="true">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">{item.year}</span>
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={(e) => {
                e.stopPropagation()
                open()
              }}
              aria-label={`Play ${item.title}`}
              className="flex-1 px-2 py-1.5 rounded-md btn-primary text-white font-label-sm text-label-sm flex items-center justify-center gap-1 transition-all"
            >
              <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Play
            </button>
            {!onOpen && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleMyList(item.id)
                }}
                aria-label={inList ? `Remove ${item.title} from My List` : `Add ${item.title} to My List`}
                className="flex-1 px-2 py-1.5 rounded-md bg-white/10 border border-white/15 backdrop-blur-sm text-on-surface font-label-sm text-label-sm flex items-center justify-center gap-1 hover:bg-white/20 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">{inList ? 'check' : 'add'}</span>
                <span>{inList ? 'Added' : 'List'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
      {percent > 0 && percent < 98 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }}></div>
        </div>
      )}
    </div>
  )
}

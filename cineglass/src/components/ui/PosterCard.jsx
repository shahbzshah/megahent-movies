import { useNavigate } from 'react-router-dom'

export default function PosterCard({ item, badge = '' }) {
  const navigate = useNavigate()
  return (
    <div className="flex-none w-44 md:w-56 snap-start group cursor-pointer" onClick={() => navigate(`/details/${item.id}`)}>
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-surface-container-low ring-1 ring-white/5 transition-all duration-300 ease-out group-hover:ring-white/20 group-hover:scale-[1.04] group-hover:-translate-y-1 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
        <img
          src={item.poster}
          alt={`${item.title} poster`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://picsum.photos/500/750'
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/70 to-transparent"></div>
        {badge}
        <div className="absolute inset-x-0 bottom-0 p-3.5">
          <h3 className="font-label-md text-label-md text-on-surface mb-1 truncate">{item.title}</h3>
          <div className="flex items-center gap-2 font-label-sm text-[11px] text-on-surface-variant">
            <span>{item.year}</span><span aria-hidden="true">•</span><span className="truncate">{item.genre}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/player/${item.id}`)
            }}
            className="mt-2.5 px-3 py-1.5 rounded-md btn-primary text-white font-label-sm text-label-sm flex items-center justify-center gap-1 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 focus-visible:opacity-100"
          >
            <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span> Play
          </button>
        </div>
      </div>
    </div>
  )
}

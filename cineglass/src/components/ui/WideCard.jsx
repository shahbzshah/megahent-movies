import { useNavigate } from 'react-router-dom'

export default function WideCard({ item, percent = 66, badge = '' }) {
  const navigate = useNavigate()
  return (
    <div className="flex-none w-72 md:w-80 snap-start group cursor-pointer" onClick={() => navigate(`/details/${item.id}`)}>
      <div className="relative aspect-video rounded-lg overflow-hidden bg-surface-container-low ring-1 ring-white/5 transition-all duration-300 group-hover:ring-white/20 group-hover:shadow-[0_16px_40px_rgba(0,0,0,0.6)]">
        <img
          src={item.poster}
          alt={`${item.title} backdrop`}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => {
            e.currentTarget.src = 'https://picsum.photos/500/750'
          }}
        />
        {badge}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-4">
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/player/${item.id}`)
            }}
            aria-label={`Play ${item.title}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full btn-primary text-white flex items-center justify-center transform scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 focus-visible:opacity-100 focus-visible:scale-100"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60">
          <div className="h-full bg-primary" style={{ width: `${percent}%` }}></div>
        </div>
      </div>
      <div className="mt-2.5">
        <h3 className="font-label-md text-label-md text-on-surface truncate group-hover:text-white transition-colors">{item.title}</h3>
        <p className="font-label-sm text-label-sm text-on-surface-variant truncate mt-0.5">{item.genre} • {item.year}</p>
      </div>
    </div>
  )
}

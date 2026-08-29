import { NavLink } from 'react-router-dom'
import { useStore } from '../../store/useStore'

const BASE_LINKS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/movies', icon: 'movie', label: 'Movies' },
  { to: '/tv', icon: 'tv', label: 'TV' },
  { to: '/live', icon: 'live_tv', label: 'Live' },
  { to: '/mylist', icon: 'add_to_photos', label: 'My List' },
]

export default function BottomNav() {
  const liveTvEnabled = useStore((s) => s.liveTvEnabled)
  const LINKS = BASE_LINKS.filter((l) => l.to !== '/live' || liveTvEnabled)
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[68px] bg-surface/95 backdrop-blur-md z-50 flex justify-around items-start px-2 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] border-t border-white/8 shadow-[0_-10px_40px_rgba(0,0,0,0.6)]">
      {LINKS.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.end}
          className={({ isActive }) =>
            'bottom-link relative flex flex-col items-center justify-center gap-1 w-16 rounded-lg text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer focus-visible:bg-white/5' +
            (isActive ? ' active' : '')
          }
        >
          <span className="material-symbols-outlined text-[24px] nav-icon">{l.icon}</span>
          <span className="font-label-sm text-[10px] leading-none tracking-wide">{l.label}</span>
          <span className="bottom-dot absolute -top-2.5 w-6 h-0.5 rounded-full bg-primary opacity-0 scale-x-50 transition-all duration-300" aria-hidden="true"></span>
        </NavLink>
      ))}
    </nav>
  )
}

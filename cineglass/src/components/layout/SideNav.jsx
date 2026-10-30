import { Link, NavLink } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import UserMenu from './UserMenu'
import { IS_SHELL } from '../../lib/platform'

const BASE_LINKS = [
  { to: '/', icon: 'home', label: 'Home', end: true },
  { to: '/movies', icon: 'movie', label: 'Movies' },
  { to: '/tv', icon: 'tv', label: 'TV Shows' },
  { to: '/live', icon: 'live_tv', label: 'Live TV' },
  { to: '/mylist', icon: 'add_to_photos', label: 'My List' },
]

export default function SideNav() {
  const user = useStore((s) => s.user)
  const setUpgradeModalOpen = useStore((s) => s.setUpgradeModalOpen)
  const isPro = user && user.plan !== 'free'
  const showDownload = !IS_SHELL
  const liveTvEnabled = useStore((s) => s.liveTvEnabled)
  const LINKS = BASE_LINKS.filter((l) => l.to !== '/live' || liveTvEnabled)

  return (
    <nav className="hidden md:flex h-screen w-64 fixed left-0 top-0 bg-surface/90 backdrop-blur-md border-r border-white/5 flex-col py-8 px-4 z-50 transition-transform duration-300">
      <Link to="/" className="mb-10 px-3 flex items-center gap-3 group" aria-label="MegahEnt home">
        <span className="w-1.5 h-8 rounded-full bg-primary shadow-[0_0_12px_rgba(255,87,26,0.6)]" aria-hidden="true"></span>
        <span>
          <span className="block font-headline-md text-headline-md font-bold tracking-[0.14em] leading-none group-hover:text-white">
            <span className="text-on-surface">MEGAH</span><span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">ENT</span>
          </span>
          <span className="font-label-sm text-label-sm text-on-surface-variant mt-1 block">{showDownload ? 'Premium Streaming' : 'Desktop'}</span>
        </span>
      </Link>
      <div className="flex-1 flex flex-col gap-1.5">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) =>
              'nav-link group flex items-center gap-4 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-300 cursor-pointer' +
              (isActive ? ' active' : '')
            }
          >
            <span className="material-symbols-outlined nav-icon transition-transform group-hover:scale-105">{l.icon}</span>
            <span className="font-label-md text-label-md">{l.label}</span>
          </NavLink>
        ))}
        {!IS_SHELL && (
          <NavLink
            to="/download"
            className={({ isActive }) =>
              'nav-link group flex items-center gap-4 px-4 py-2.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-300 cursor-pointer' +
              (isActive ? ' active' : '')
            }
          >
            <span className="material-symbols-outlined nav-icon transition-transform group-hover:scale-105">download</span>
            <span className="font-label-md text-label-md">Get the App</span>
          </NavLink>
        )}
      </div>
      <div className="mt-auto flex flex-col gap-4">
        <UserMenu />
        {isPro ? (
          <div className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg glass-active border border-primary/30 font-label-md text-label-md text-primary uppercase tracking-widest cursor-default" title={`${user.name} — ${user.plan} member`}>
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span> PRO
          </div>
        ) : (
          <button
            onClick={() => setUpgradeModalOpen(true)}
            className="w-full py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity"
          >
            Upgrade to Pro
          </button>
        )}
        <div className="flex flex-col gap-2 mt-4 border-t border-white/10 pt-4">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              'nav-link flex items-center gap-4 px-4 py-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all duration-300 cursor-pointer' +
              (isActive ? ' active' : '')
            }
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </NavLink>
        </div>
        <p className="text-[10px] text-on-surface-variant/60 px-4 leading-relaxed">
          This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
      </div>
    </nav>
  )
}

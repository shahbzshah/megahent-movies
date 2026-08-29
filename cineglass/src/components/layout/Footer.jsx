import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { IS_SHELL } from '../../lib/platform'

const SOCIALS = [
  {
    name: 'X',
    href: 'https://x.com/MegahEnt',
    path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z',
  },
  {
    name: 'YouTube',
    href: 'https://youtube.com/@MegahEnt',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
  {
    name: 'Instagram',
    href: 'https://instagram.com/MegahEnt',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
]

const BROWSE = [
  { to: '/', label: 'Home', end: true },
  { to: '/movies', label: 'Movies' },
  { to: '/tv', label: 'TV Shows' },
  { to: '/live', label: 'Live TV' },
  { to: '/mylist', label: 'My List' },
]

const COMPANY = [
  { to: '/privacy', label: 'About MegahEnt' },
  { to: '/terms', label: 'Terms of Service' },
  { to: '/privacy', label: 'Privacy Policy' },
]

export default function Footer() {
  const showToast = useStore((s) => s.showToast)
  const [email, setEmail] = useState('')

  const subscribe = (e) => {
    e.preventDefault()
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
    if (!valid) {
      showToast('Please enter a valid email address', 'error')
      return
    }
    showToast('Subscribed! New release alerts are on their way.', 'mark_email_read')
    setEmail('')
  }

  return (
    <footer className="border-t border-white/5 bg-surface-dim/60 backdrop-blur-xl pb-20 md:pb-0">
      <div className="px-container-padding-mobile md:px-container-padding-desktop py-12 grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="space-y-4 max-w-sm col-span-2 lg:col-span-1">
          <Link to="/" className="inline-flex items-center gap-3 group">
            <span className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-headline-md font-bold text-label-md">CG</span>
            <span>
              <span className="block font-headline-md text-headline-md font-bold tracking-[0.12em] uppercase group-hover:text-white transition-colors"><span className="text-on-surface">MEGAH</span><span className="bg-gradient-to-r from-primary to-primary-container bg-clip-text text-transparent">ENT</span></span>
              <span className="block font-label-sm text-label-sm text-on-surface-variant">Premium Streaming</span>
            </span>
          </Link>
          <p className="font-body-md text-body-md text-tertiary leading-relaxed">
            A curated cinematic library of trending movies and series — browse, save, and stream in one glassy place.
          </p>
          <div className="flex items-center gap-3">
            {SOCIALS.map((s) => (
              <a key={s.name} href={s.href} target="_blank" rel="noreferrer" aria-label={`MegahEnt on ${s.name}`} className="w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/30 hover:bg-white/5 transition-all duration-300">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
          <form onSubmit={subscribe} className="pt-2" noValidate>
            <label htmlFor="newsletter-email" className="block font-label-md text-label-md text-on-surface mb-2">Get new release alerts</label>
            <div className="flex gap-2">
              <input
                id="newsletter-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="flex-1 min-w-0 bg-surface-container/50 border border-white/10 rounded-full py-2.5 px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
              <button type="submit" className="px-5 py-2.5 rounded-full font-label-md text-label-md text-white btn-primary hover:opacity-90 active:scale-95 transition-all shrink-0">
                Subscribe
              </button>
            </div>
          </form>
        </div>

        <nav aria-label="Browse" className="space-y-3">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface">Browse</h3>
          <ul className="space-y-2">
            {BROWSE.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Support" className="space-y-3">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface">Support</h3>
          <ul className="space-y-2">
            <li><button onClick={() => showToast('Help center coming soon!', 'help')} className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">Help Center</button></li>
            <li><a href="mailto:support@MegahEnt.app" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">Contact Us</a></li>
            {!IS_SHELL && <li><Link to="/download" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">Get the App</Link></li>}
            <li><Link to="/settings" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">Manage Account</Link></li>
            <li><Link to="/settings" className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">Settings</Link></li>
          </ul>
        </nav>

        <nav aria-label="Legal" className="space-y-3">
          <h3 className="font-label-md text-label-md uppercase tracking-widest text-on-surface">Legal</h3>
          <ul className="space-y-2">
            {COMPANY.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="font-body-md text-body-md text-on-surface-variant hover:text-primary transition-colors">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-white/5 px-container-padding-mobile md:px-container-padding-desktop py-6 space-y-2">
        <p className="font-label-sm text-label-sm text-on-surface-variant/70">
          © {new Date().getFullYear()} MegahEnt. All rights reserved.
        </p>
        <p className="font-label-sm text-label-sm text-on-surface-variant/50 leading-relaxed max-w-3xl">
          This product uses the TMDB API but is not endorsed or certified by TMDB. Streaming playback is provided by third-party sources; MegahEnt hosts no video content.
        </p>
      </div>
    </footer>
  )
}

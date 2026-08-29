/**
 * Full-screen branded "temporarily unavailable" page shown when the admin
 * flips the site kill-switch to OFFLINE.
 */
export default function SiteOffline({ message }) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-background text-center px-6">
      <div className="max-w-md">
        <div
          className="text-5xl font-extrabold tracking-tight mb-6"
          style={{
            background: 'linear-gradient(90deg,#7dd3fc,#a78bfa,#f472b6)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          MegahEnt
        </div>
        <span className="material-symbols-outlined text-[44px] text-on-surface-variant mb-4 block">
          movie_off
        </span>
        <h1 className="font-headline-md text-headline-md text-on-surface mb-3">
          We'll be right back
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
          {message || 'MegahEnt is temporarily unavailable. Please check back soon.'}
        </p>
      </div>
    </div>
  )
}
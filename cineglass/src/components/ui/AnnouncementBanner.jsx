/**
 * Slim dismissible banner under the top nav, driven by the admin panel.
 */
import { useState } from 'react'

export default function AnnouncementBanner({ announcement }) {
  const [dismissedId, setDismissedId] = useState(null)
  if (!announcement || dismissedId === announcement.id) return null

  return (
    <div className="relative z-30 flex items-center justify-center gap-2 px-4 py-2 bg-primary/15 border-b border-primary/30 backdrop-blur-sm">
      <span className="material-symbols-outlined text-primary text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
        {announcement.icon || 'campaign'}
      </span>
      <p className="font-label-md text-label-md text-on-surface">{announcement.message}</p>
      <button
        onClick={() => setDismissedId(announcement.id)}
        aria-label="Dismiss announcement"
        className="ml-2 text-on-surface-variant hover:text-on-surface cursor-pointer"
      >
        <span className="material-symbols-outlined text-base">close</span>
      </button>
    </div>
  )
}
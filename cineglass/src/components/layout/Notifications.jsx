import { useEffect, useRef, useState } from 'react'
import { selectUnreadCount, useStore } from '../../store/useStore'

export default function Notifications() {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const notifications = useStore((s) => s.notifications)
  const markAllRead = useStore((s) => s.markAllNotificationsRead)
  const selectOne = useStore((s) => s.selectNotification)
  const unread = useStore(selectUnreadCount)

  useEffect(() => {
    const handler = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        className="relative text-on-surface-variant hover:text-primary transition-colors rounded-full"
      >
        <span className="material-symbols-outlined text-[24px]">notifications</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-on-primary-container font-label-sm text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(229,9,20,0.5)]">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-40px)] glass-panel rounded-xl overflow-hidden shadow-2xl z-[70]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-label-md text-label-md text-on-surface font-semibold">Notifications</h3>
            {unread > 0 && (
              <button onClick={markAllRead} className="font-label-md text-label-sm text-secondary hover:text-primary transition-colors">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto no-scrollbar">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span className="material-symbols-outlined text-[32px] text-on-surface-variant/50">notifications_off</span>
                <p className="font-label-md text-label-md text-on-surface-variant mt-2">You're all caught up</p>
                <p className="font-body-sm text-on-surface-variant/60 text-[12px] mt-1">New alerts will appear here.</p>
              </div>
            ) : notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  selectOne(n.id)
                }}
                className={
                  'w-full text-left flex gap-3 px-4 py-3 hover:bg-white/5 transition-colors border-b border-white/5 last:border-b-0 ' +
                  (n.read ? 'opacity-60' : '')
                }
              >
                <span
                  className={
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ' +
                    (n.read ? 'bg-surface-container-high text-on-surface-variant' : 'bg-primary/20 text-primary')
                  }
                >
                  <span className="material-symbols-outlined text-[18px]">{n.icon}</span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-label-md text-label-md text-on-surface truncate">{n.title}</p>
                  <p className="font-body-sm text-on-surface-variant text-[12px] leading-snug line-clamp-2">{n.body}</p>
                  <p className="font-label-sm text-[11px] text-on-surface-variant/60 mt-1">{n.time}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2"></span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

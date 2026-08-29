import { useEffect, useState } from 'react'
import { useStore } from '../../store/useStore'

function ToastItem({ toast, onDone }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), 2700)
    const b = setTimeout(onDone, 3000)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [])
  return (
    <div className={'toast' + (leaving ? ' hiding' : '')}>
      <span className="material-symbols-outlined">{toast.icon}</span>
      <span>{toast.message}</span>
    </div>
  )
}

export default function Toast() {
  const toasts = useStore((s) => s.toasts)
  const dismissToast = useStore((s) => s.dismissToast)
  return (
    <div id="toast-container">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDone={() => dismissToast(t.id)} />
      ))}
    </div>
  )
}

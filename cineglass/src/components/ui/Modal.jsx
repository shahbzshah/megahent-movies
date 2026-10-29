import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
}

export default function Modal({ open, onClose, title, size = 'md', children }) {
  const panelRef = useRef(null)
  // onClose is a fresh inline function on every parent render (every
  // keystroke in a form inside the modal). Holding the latest one in a ref
  // keeps the focus effect below from re-running on each keystroke — the
  // old behaviour re-focused the first focusable element (the Close button)
  // after every letter, which dropped the input and closed the keyboard.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement
    const panel = panelRef.current
    panel?.querySelector(FOCUSABLE)?.focus()

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab' || !panel) return
      const focusables = [...panel.querySelectorAll(FOCUSABLE)]
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-container-padding-mobile" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-[toastIn_0.2s_ease]" onClick={onClose}></div>
      <div
        ref={panelRef}
        className={`relative w-full ${SIZES[size]} glass-panel glass-floating rounded-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto no-scrollbar`}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          {title && <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto -mt-1 -mr-1 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors shrink-0"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

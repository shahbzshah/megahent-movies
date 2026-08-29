import { useEffect, useRef, useState } from 'react'

export default function Carousel({ children, className = '' }) {
  const ref = useRef(null)
  const [canLeft, setCanLeft] = useState(false)
  const [canRight, setCanRight] = useState(true)

  const updateEdges = () => {
    const el = ref.current
    if (!el) return
    setCanLeft(el.scrollLeft > 4)
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4)
  }

  useEffect(() => {
    updateEdges()
  }, [children])

  const scrollByCards = (dir) => {
    const el = ref.current
    if (!el) return
    const card = el.firstElementChild
    const gap = parseFloat(getComputedStyle(el).columnGap) || 24
    const step = card ? (card.offsetWidth + gap) * 2 : 640
    el.scrollBy({ left: dir * step, behavior: 'smooth' })
  }

  const arrowClass =
    'absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-surface-container-high/90 border border-white/10 backdrop-blur-sm shadow-xl flex items-center justify-center text-on-surface hover:text-white hover:bg-surface-container-highest hover:border-white/25 active:scale-95 transition-all duration-300 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary'

  return (
    <div className="relative group/car">
      {canLeft && (
        <button aria-label="Scroll left" onClick={() => scrollByCards(-1)} className={`${arrowClass} left-0 -translate-x-3 opacity-0 group-hover/car:opacity-100`}>
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
      )}
      <div ref={ref} onScroll={updateEdges} className={`flex gap-3 md:gap-gutter overflow-x-auto no-scrollbar pb-8 -mb-8 snap-x ${className}`}>
        {children}
      </div>
      {canRight && (
        <button aria-label="Scroll right" onClick={() => scrollByCards(1)} className={`${arrowClass} right-0 translate-x-3 opacity-0 group-hover/car:opacity-100`}>
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      )}
    </div>
  )
}

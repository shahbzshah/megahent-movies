export const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'rating', label: 'Top Rated' },
  { id: 'az', label: 'A–Z' },
]

export function sortContent(items, sortId) {
  const list = [...items]
  if (sortId === 'rating') return list.sort((a, b) => (b.rating || 0) - (a.rating || 0))
  if (sortId === 'az') return list.sort((a, b) => (a.title || '').localeCompare(b.title || ''))
  return list.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0))
}

export default function SortSelect({ value, onChange }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Sort by</span>
      <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px] pointer-events-none">swap_vert</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none bg-surface-container/60 border border-white/10 rounded-full py-2 pl-9 pr-8 font-label-md text-label-md text-on-surface cursor-pointer hover:border-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary"
      >
        {SORTS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined absolute right-3 text-on-surface-variant text-[16px] pointer-events-none">expand_more</span>
    </label>
  )
}

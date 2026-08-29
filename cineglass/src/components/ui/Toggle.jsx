export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={
        'relative w-12 h-6 rounded-full transition-colors duration-300 shrink-0 ' +
        (checked ? 'bg-primary shadow-[0_0_12px_rgba(229,9,20,0.4)]' : 'bg-surface-container-highest border border-white/10')
      }
    >
      <span
        className={
          'absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-300 ' +
          (checked ? 'translate-x-6 bg-on-primary' : 'translate-x-0 bg-on-surface-variant')
        }
      ></span>
    </button>
  )
}

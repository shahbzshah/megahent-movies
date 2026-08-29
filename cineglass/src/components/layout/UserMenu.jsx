import { useStore } from '../../store/useStore'

export default function UserMenu({ compact = false }) {
  const user = useStore((s) => s.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)

  if (!user) {
    return (
      <button
        onClick={() => setAuthModalOpen(true)}
        aria-label="Sign in to MegahEnt"
        title="Sign in"
        className={'group flex items-center gap-4 cursor-pointer ' + (compact ? '' : 'mb-12 px-4')}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 group-hover:border-primary/50 transition-colors">
          <img alt="Guest user avatar" className="w-full h-full object-cover" src="https://picsum.photos/80/80" />
        </div>
        {!compact && (
          <div className="text-left">
            <p className="font-label-md text-label-md text-on-surface">Sign in</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Access your account</p>
          </div>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={() => setAuthModalOpen(true)}
      title={`${user.name} — manage account`}
      className={'group flex items-center gap-4 cursor-pointer ' + (compact ? '' : 'mb-12 px-4')}
    >
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-headline-md font-bold text-label-md text-on-primary group-hover:scale-105 transition-transform shrink-0">
        {user.name.charAt(0).toUpperCase()}
      </div>
      {!compact && (
        <div className="text-left min-w-0">
          <p className="font-label-md text-label-md text-on-surface truncate">{user.name}</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant capitalize">
            {user.plan === 'free' ? 'Free plan' : `${user.plan} plan`}
          </p>
        </div>
      )}
    </button>
  )
}

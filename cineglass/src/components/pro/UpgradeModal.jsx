import Modal from '../ui/Modal'
import { useStore } from '../../store/useStore'

const PLANS = [
  {
    id: 'Basic',
    price: 'Free',
    tagline: 'The essentials',
    features: ['Full movie & TV library', 'My List + Continue Watching', 'Live TV guide', 'HD streaming'],
  },
  {
    id: 'Pro',
    price: '$9.99',
    period: '/mo',
    tagline: 'Best for most viewers',
    features: ['Everything in Basic', '4K UHD where available', 'No ad interruptions', 'Early access to premieres', 'Priority support'],
    highlight: true,
  },
  {
    id: 'Premium',
    price: '$19.99',
    period: '/mo',
    tagline: 'For the true cinephile',
    features: ['Everything in Pro', '4 screens at once', 'Offline downloads', 'Dolby Atmos audio', 'Exclusive behind-the-scenes'],
  },
]

export default function UpgradeModal() {
  const open = useStore((s) => s.upgradeModalOpen)
  const setOpen = useStore((s) => s.setUpgradeModalOpen)
  const user = useStore((s) => s.user)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const upgradeToPro = useStore((s) => s.upgradeToPro)

  const choosePlan = (plan) => {
    if (plan.id === 'Basic') return
    if (!user) {
      setOpen(false)
      setAuthModalOpen(true)
      return
    }
    if (user.plan === plan.id.toLowerCase()) return
    upgradeToPro(plan.id)
  }

  const planState = (plan) => {
    if (!user || user.plan === 'free') return plan.id === 'Basic' ? 'current' : 'available'
    return user.plan === plan.id.toLowerCase() ? 'current' : 'available'
  }

  return (
    <Modal open={open} onClose={() => setOpen(false)} size="lg" title="Upgrade to Pro">
      <p className="font-body-md text-body-md text-tertiary -mt-2 mb-6">
        Unlock the full MegahEnt experience. Cancel anytime — plans are managed from your account.
      </p>
      <div className="grid gap-4 md:grid-cols-3 items-stretch">
        {PLANS.map((plan) => {
          const state = planState(plan)
          return (
            <div
              key={plan.id}
              className={
                'relative rounded-xl p-5 flex flex-col transition-all duration-300 ' +
                (plan.highlight
                  ? 'glass-active border border-primary/30 shadow-[0_0_30px_rgba(229,9,20,0.15)]'
                  : 'glass-panel')
              }
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-on-primary-container font-label-sm text-[10px] uppercase font-bold tracking-widest">
                  Most Popular
                </span>
              )}
              <h3 className="font-headline-md text-headline-md text-on-surface">{plan.id}</h3>
              <p className="font-label-sm text-label-sm text-on-surface-variant mb-3">{plan.tagline}</p>
              <p className="mb-4">
                <span className="font-display-lg-mobile text-[28px] font-bold text-on-surface">{plan.price}</span>
                {plan.period && <span className="font-label-md text-label-md text-on-surface-variant">{plan.period}</span>}
              </p>
              <ul className="space-y-2 flex-1 mb-5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px] text-primary mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                    <span className="text-[13px] leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              {state === 'current' ? (
                <button disabled className="w-full py-2.5 rounded-lg glass-panel font-label-md text-label-md text-on-surface-variant cursor-default">
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => choosePlan(plan)}
                  className={
                    'w-full py-2.5 rounded-lg font-label-md text-label-md transition-all active:scale-[0.98] ' +
                    (plan.highlight
                      ? 'text-white btn-primary hover:opacity-90'
                      : 'glass-panel text-on-surface hover:bg-white/10')
                  }
                >
                  {!user && plan.id !== 'Basic' ? 'Sign in to Subscribe' : `Choose ${plan.id}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="font-label-sm text-label-sm text-on-surface-variant/60 text-center mt-6">
        Demo checkout — no payment is processed and nothing is charged.
      </p>
    </Modal>
  )
}

import { useState } from 'react'
import Modal from '../ui/Modal'
import { useStore } from '../../store/useStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export default function AuthModal() {
  const open = useStore((s) => s.authModalOpen)
  const setOpen = useStore((s) => s.setAuthModalOpen)
  const user = useStore((s) => s.user)
  const signIn = useStore((s) => s.signIn)
  const signOut = useStore((s) => s.signOut)
  const setUpgradeModalOpen = useStore((s) => s.setUpgradeModalOpen)

  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const close = () => {
    setOpen(false)
    setError('')
  }

  const submit = (e) => {
    e.preventDefault()
    if (mode === 'signup' && name.trim().length < 2) {
      setError('Please enter your name.')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setError('')
    const displayName = mode === 'signup' ? name.trim() : email.split('@')[0].replace(/[._-]/g, ' ')
    signIn(displayName.charAt(0).toUpperCase() + displayName.slice(1), email.trim())
    setPassword('')
  }

  const planChip = (plan) =>
    ({
      free: { label: 'Free', cls: 'bg-surface-container-high text-on-surface-variant border-white/10' },
      pro: { label: 'PRO', cls: 'bg-primary/20 text-primary border-primary/40' },
      premium: { label: 'PREMIUM', cls: 'bg-secondary/20 text-secondary border-secondary/40' },
    })[plan] || { label: plan, cls: 'bg-surface-container-high text-on-surface-variant border-white/10' }

  return (
    <Modal open={open} onClose={close} size="sm" title={user ? 'Your Account' : mode === 'signup' ? 'Create Account' : 'Welcome Back'}>
      {user ? (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center font-headline-md text-headline-md font-bold text-on-primary shrink-0">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-body-lg text-body-lg text-on-surface truncate">{user.name}</p>
              <p className="font-body-md text-body-md text-on-surface-variant truncate">{user.email}</p>
            </div>
          </div>
          {(() => {
            const chip = planChip(user.plan)
            return (
              <span className={`inline-flex px-3 py-1 rounded-full border font-label-sm text-label-md uppercase tracking-widest ${chip.cls}`}>
                {chip.label} Plan
              </span>
            )
          })()}
          <div className="flex flex-col gap-2 pt-2">
            {user.plan === 'free' && (
              <button
                onClick={() => {
                  close()
                  setUpgradeModalOpen(true)
                }}
                className="w-full py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity"
              >
                Upgrade to Pro
              </button>
            )}
            <button
              onClick={() => {
                signOut()
                setName('')
                setEmail('')
                setPassword('')
              }}
              className="w-full py-3 rounded-lg glass-panel font-label-md text-label-md text-on-surface hover:bg-white/10 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex gap-2 p-1 rounded-full glass-panel mb-6">
            {[
              ['signin', 'Sign In'],
              ['signup', 'Sign Up'],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id)
                  setError('')
                }}
                className={
                  'flex-1 py-2 rounded-full font-label-md text-label-md transition-colors ' +
                  (mode === id ? 'bg-primary/20 text-primary' : 'text-on-surface-variant hover:text-on-surface')
                }
              >
                {label}
              </button>
            ))}
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-name" className="block font-label-md text-label-md text-on-surface mb-1.5">Name</label>
                <input
                  id="auth-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="block font-label-md text-label-md text-on-surface mb-1.5">Email</label>
              <input
                id="auth-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            <div>
              <label htmlFor="auth-password" className="block font-label-md text-label-md text-on-surface mb-1.5">Password</label>
              <input
                id="auth-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                className="w-full bg-surface-container/50 border border-white/10 rounded-lg py-3 px-4 font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-secondary transition-all"
              />
            </div>
            {error && (
              <p role="alert" className="font-label-md text-label-md text-error flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">error</span> {error}
              </p>
            )}
            <button type="submit" className="w-full py-3.5 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 active:scale-[0.98] transition-all">
              {mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
            <p className="font-label-sm text-label-sm text-on-surface-variant/60 text-center leading-relaxed">
              Demo authentication — credentials stay on this device and never leave your browser.
            </p>
          </form>
        </>
      )}
    </Modal>
  )
}

import { useState } from 'react'
import { useStore } from '../store/useStore'
import Modal from '../components/ui/Modal'
import Toggle from '../components/ui/Toggle'
import { fetchPortalInfo, DEFAULT_PORTAL } from '../lib/xtream'
const QUALITIES = ['Auto', '4K UHD', '1080p', '720p']
const SUBTITLE_LANGS = ['Off', 'English', 'Spanish', 'French', 'German', 'Arabic']

function Section({ title, icon, children }) {
  return (
    <section className="space-y-4">
      <h2 className="font-headline-md text-headline-md text-on-surface flex items-center gap-3">
        <span className="w-1 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(229,9,20,0.5)]"></span>
        {title}
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">{icon}</span>
      </h2>
      <div className="glass-panel rounded-xl divide-y divide-white/5">{children}</div>
    </section>
  )
}

function Row({ label, hint, children }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface">{label}</p>
        {hint && <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Select({ value, onChange, options, id, renderLabel }) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-surface-container/60 border border-white/10 rounded-full py-2 pl-4 pr-8 font-label-md text-label-md text-on-surface cursor-pointer hover:border-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary shrink-0"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {renderLabel ? renderLabel(o) : o}
        </option>
      ))}
    </select>
  )
}

export default function Settings() {
  const user = useStore((s) => s.user)
  const settings = useStore((s) => s.settings)
  const updateSetting = useStore((s) => s.updateSetting)
  const setAuthModalOpen = useStore((s) => s.setAuthModalOpen)
  const setUpgradeModalOpen = useStore((s) => s.setUpgradeModalOpen)
  const signOut = useStore((s) => s.signOut)
  const clearHistory = useStore((s) => s.clearHistory)
  const resetAllData = useStore((s) => s.resetAllData)
  const historyCount = useStore((s) => Object.keys(s.progress).length)

  const [confirm, setConfirm] = useState(null)


  return (
    <main className="relative pt-24 md:pt-32 px-container-padding-mobile md:px-container-padding-desktop pb-32">
      <div className="max-w-3xl">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">Settings</h1>
        <p className="font-body-lg text-body-lg text-tertiary mb-10">Preferences are stored locally on this device.</p>

        <div className="space-y-10">
          <Section title="Account" icon="person">
            <Row
              label={user ? user.name : 'Not signed in'}
              hint={user ? `${user.email} · ${user.plan === 'free' ? 'Free plan' : `${user.plan} plan`}` : 'Sign in to sync your list across sessions on this device'}
            >
              {user ? (
                <button onClick={() => setConfirm('signout')} className="px-5 py-2 rounded-full glass-panel font-label-md text-label-md text-on-surface hover:bg-white/10 transition-colors shrink-0">
                  Sign Out
                </button>
              ) : (
                <button onClick={() => setAuthModalOpen(true)} className="px-5 py-2 rounded-full font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity shrink-0">
                  Sign In
                </button>
              )}
            </Row>
            <Row label="Plan" hint={user && user.plan !== 'free' ? `You're on the ${user.plan} tier — thanks for the support!` : 'Upgrade for 4K, ad-free playback and more'}>
              {(!user || user.plan === 'free') && (
                <button onClick={() => setUpgradeModalOpen(true)} className="px-5 py-2 rounded-full font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity shrink-0">
                  Upgrade
                </button>
              )}
            </Row>
          </Section>

          <Section title="Playback" icon="tune">
            <Row label="Default quality" hint="Used when Auto fails or for new streams">
              <Select id="quality" value={settings.quality} onChange={(v) => updateSetting('quality', v)} options={QUALITIES} />
            </Row>
            <Row label="Autoplay next episode" hint="Start the next episode automatically">
              <Toggle checked={settings.autoplay} onChange={(v) => updateSetting('autoplay', v)} label="Autoplay next episode" />
            </Row>
            <Row label="Subtitles" hint="Preferred subtitle language">
              <Select id="subtitles" value={settings.subtitles} onChange={(v) => updateSetting('subtitles', v)} options={SUBTITLE_LANGS} />
            </Row>
          </Section>

          <Section title="Content" icon="dns">
            <Row label="English content only" hint="Hides non-English categories, channels and titles, plus adult content">
              <Toggle checked={settings.englishOnly !== false} onChange={(v) => updateSetting('englishOnly', v)} label="English content only" />
            </Row>
          </Section>

          <Section title="Data" icon="database">
            <Row label="Clear Continue Watching" hint={`Removes ${historyCount} entries from your history`}>
              <button
                onClick={() => setConfirm('history')}
                disabled={historyCount === 0}
                className="px-5 py-2 rounded-full glass-panel font-label-md text-label-md text-error hover:bg-error/10 border border-transparent hover:border-error/30 disabled:opacity-40 disabled:pointer-events-none transition-colors shrink-0"
              >
                Clear
              </button>
            </Row>
            <Row label="Reset all local data" hint="My List, history, account and preferences — cannot be undone">
              <button onClick={() => setConfirm('reset')} className="px-5 py-2 rounded-full glass-panel font-label-md text-label-md text-error hover:bg-error/10 border border-transparent hover:border-error/30 transition-colors shrink-0">
                Reset
              </button>
            </Row>
          </Section>
        </div>
      </div>

      <Modal open={confirm === 'signout'} onClose={() => setConfirm(null)} title="Sign out?" size="sm">
        <p className="font-body-md text-body-md text-tertiary mb-6">Your list and history stay on this device — only your session ends.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirm(null)} className="px-6 py-2.5 rounded-lg glass-panel font-label-md text-label-md text-on-surface hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              signOut()
              setConfirm(null)
            }}
            className="px-6 py-2.5 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md font-semibold hover:brightness-110 transition-all"
          >
            Sign Out
          </button>
        </div>
      </Modal>

      <Modal open={confirm === 'history'} onClose={() => setConfirm(null)} title="Clear Continue Watching?" size="sm">
        <p className="font-body-md text-body-md text-tertiary mb-6">This removes all viewing progress from this device. Your saved My List is not affected.</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirm(null)} className="px-6 py-2.5 rounded-lg glass-panel font-label-md text-label-md text-on-surface hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              clearHistory()
              setConfirm(null)
            }}
            className="px-6 py-2.5 rounded-lg bg-error-container text-on-error-container font-label-md text-label-md font-semibold hover:brightness-110 transition-all"
          >
            Clear History
          </button>
        </div>
      </Modal>

      <Modal open={confirm === 'reset'} onClose={() => setConfirm(null)} title="Reset everything?" size="sm">
        <p className="font-body-md text-body-md text-tertiary mb-6">
          This permanently deletes your My List, viewing history, account and all preferences stored on this device.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirm(null)} className="px-6 py-2.5 rounded-lg glass-panel font-label-md text-label-md text-on-surface hover:bg-white/10 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              resetAllData()
              setConfirm(null)
            }}
            className="px-6 py-2.5 rounded-lg bg-error text-on-error font-label-md text-label-md font-bold hover:brightness-110 transition-all"
          >
            Reset All Data
          </button>
        </div>
      </Modal>
    </main>
  )
}

const DOWNLOADS = [
  {
    id: 'windows',
    icon: 'desktop_windows',
    title: 'Windows / Mac / Linux',
    desc: 'Desktop app with built-in ad blocking — no ads around the players, ever.',
    href: '/downloads/cineglass-setup.exe',
    cta: 'Download for Desktop',
    size: '~120 MB',
  },
  {
    id: 'android',
    icon: 'smartphone',
    title: 'Android (phone & TV box)',
    desc: 'WebView shell with network-level ad blocking and D-pad support for TV boxes.',
    href: '/downloads/cineglass.apk',
    cta: 'Download APK',
    size: '~25 MB',
  },
]

export default function Download() {
  return (
    <main className="flex-1 relative min-h-screen pb-section-gap pt-20">
      <section className="px-container-padding-mobile md:px-container-padding-desktop mt-10">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <span className="material-symbols-outlined text-[56px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
            download
          </span>
          <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-4">
            Get the MegahEnt App
          </h1>
          <p className="font-body-lg text-body-lg text-tertiary max-w-xl mx-auto">
            Enjoy MegahEnt with zero ad interruptions. Our free apps block ads at the network level —
            right around the embedded players — so playback always works smoothly.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {DOWNLOADS.map((d) => (
            <div key={d.id} className="glass-panel rounded-2xl p-8 flex flex-col items-center text-center">
              <span className="material-symbols-outlined text-[48px] text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>
                {d.icon}
              </span>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">{d.title}</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6 flex-1">{d.desc}</p>
              <a
                href={d.href}
                download
                className="flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity w-full"
              >
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>download</span>
                {d.cta}
              </a>
              <p className="font-label-sm text-label-sm text-on-surface-variant/60 mt-3">{d.size}</p>
            </div>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-12">
          <div className="glass-panel rounded-2xl p-8">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">help</span>
              Setup Instructions
            </h2>
            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="flex-none w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-label-md text-label-md">1</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <strong className="text-on-surface">Download</strong> the app for your device above.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-none w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-label-md text-label-md">2</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <strong className="text-on-surface">Install</strong> it — on Android you may need to allow
                  &ldquo;install from unknown sources&rdquo; for the APK.
                </p>
              </li>
              <li className="flex gap-3">
                <span className="flex-none w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-label-md text-label-md">3</span>
                <p className="font-body-md text-body-md text-on-surface-variant">
                  <strong className="text-on-surface">Open the app</strong> — ad blocking is on by default.
                  No ads around the players, ever.
                </p>
              </li>
            </ol>
          </div>
        </div>
      </section>
    </main>
  )
}

const CONTENT = {
  about: {
    title: 'About MegahEnt',
    updated: 'Last updated: August 2026',
    body: [
      'MegahEnt is a premium cinematic streaming interface that lets you discover trending movies and TV series, curate a personal watchlist, track what you are watching, and stream titles through integrated third-party players.',
      'The catalogue is powered by The Movie Database (TMDB), which supplies titles, artwork, cast information, and episode guides. MegahEnt itself hosts no video content; playback is provided by external streaming sources embedded in the player view.',
      'MegahEnt is an independent product and is not endorsed by or affiliated with TMDB or any content provider referenced within the app.',
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'Last updated: August 2026',
    body: [
      'By accessing or using MegahEnt you agree to these terms. If you do not agree, please discontinue use of the application.',
      'MegahEnt provides discovery and organisation features for publicly available movie metadata. Video playback is performed by third-party providers accessed via embedded players. MegahEnt does not host, store, or transmit any video files and is not responsible for the availability, quality, or legality of third-party streams.',
      'Your watchlist, viewing progress, and preferences are stored locally on your device using browser storage. Clearing your browser data will remove them. MegahEnt does not operate user accounts or servers for personal data at this time.',
      'The service is provided "as is", without warranties of any kind. Availability of titles, metadata accuracy, and third-party stream uptime are not guaranteed.',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    updated: 'Last updated: August 2026',
    body: [
      'MegahEnt is designed to work without collecting personal data. There are no user accounts and no analytics tracking in the current version.',
      'Data stored locally on your device includes your saved list (cineglass_myList), viewing progress (cineglass_progress), and any preferences you set. This data never leaves your browser except where a feature explicitly sends it (for example, an email address you voluntarily submit to the newsletter form).',
      'Requests for movie metadata are proxied to TMDB purely to retrieve titles, images, and credits. We do not sell, share, or process your local data for advertising purposes.',
      'You can erase all stored data at any time by clearing site data in your browser settings.',
    ],
  },
}

export default function Legal({ kind }) {
  const page = CONTENT[kind]
  return (
    <main className="relative pt-28 md:pt-36 px-container-padding-mobile md:px-container-padding-desktop pb-32">
      <div className="max-w-3xl">
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-2">{page.title}</h1>
        <p className="font-label-sm text-label-sm uppercase tracking-widest text-on-surface-variant mb-10">{page.updated}</p>
        <div className="space-y-6 glass-panel rounded-2xl p-8 md:p-10">
          {page.body.map((para, i) => (
            <p key={i} className="font-body-md text-body-md text-tertiary leading-relaxed">{para}</p>
          ))}
        </div>
      </div>
    </main>
  )
}

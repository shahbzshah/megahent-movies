import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-container-padding-mobile md:px-container-padding-desktop text-center">
      <p className="font-display-lg text-display-lg text-gradient mb-4 select-none">404</p>
      <h1 className="font-headline-lg text-headline-lg text-on-surface mb-2">This page went off-script</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md mb-8">
        The page you are looking for does not exist or may have moved. Head back to the library and keep browsing.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link to="/" className="px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-primary hover:opacity-90 transition-opacity">
          Back to Home
        </Link>
        <Link to="/movies" className="px-8 py-3 rounded-lg font-label-md text-label-md text-white btn-ghost hover:bg-white/10 transition-colors">
          Browse Movies
        </Link>
      </div>
    </main>
  )
}

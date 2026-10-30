import { useEffect } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import SideNav from './components/layout/SideNav'
import TopNav from './components/layout/TopNav'
import BottomNav from './components/layout/BottomNav'
import Footer from './components/layout/Footer'
import Home from './pages/Home'
import Movies from './pages/Movies'
import TVShows from './pages/TVShows'
import LiveTV from './pages/LiveTV'
import Details from './pages/Details'
import Player from './pages/Player'
import MyList from './pages/MyList'
import Legal from './pages/Legal'
import NotFound from './pages/NotFound'
import Settings from './pages/Settings'
import Download from './pages/Download'
import AuthModal from './components/auth/AuthModal'
import UpgradeModal from './components/pro/UpgradeModal'
import SiteOffline from './components/ui/SiteOffline'
import AnnouncementBanner from './components/ui/AnnouncementBanner'
import { useStore } from './store/useStore'
import { ADMIN_API_ENABLED } from './lib/admin'
import { startSiteStatusWatcher, stopSiteStatusWatcher } from './lib/siteStatusWatcher'
import { IS_SHELL } from './lib/platform'

function Shell() {
  const location = useLocation()
  const isPlayer = location.pathname.startsWith('/player')
  const siteStatus = useStore((s) => s.siteStatus)
  const offlineMessage = useStore((s) => s.offlineMessage)
  const announcement = useStore((s) => s.announcement)
  const loadAdminData = useStore((s) => s.loadAdminData)

  // Load curated rows once; a background watcher re-checks the kill-switch
  // every second so admin changes (offline screen, announcements) go live
  // without a reload.
  useEffect(() => {
    if (!ADMIN_API_ENABLED) return
    loadAdminData()
    startSiteStatusWatcher()
    return () => stopSiteStatusWatcher()
  }, [])

  if (siteStatus === 'offline') {
    return <SiteOffline message={offlineMessage} />
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-surface-container-high focus:text-primary focus:border focus:border-primary/40"
      >
        Skip to content
      </a>
      {!isPlayer && (
        <>
          <SideNav />
          <TopNav />
          <AnnouncementBanner announcement={announcement} />
          <BottomNav />
        </>
      )}
      <div key={location.pathname} id="main-content" className={isPlayer ? '' : 'md:ml-64 page-enter'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/movies" element={<Movies />} />
          <Route path="/tv" element={<TVShows />} />
          <Route path="/live" element={<LiveTV />} />
          <Route path="/player/live" element={<Player />} />
          <Route path="/player/:id" element={<Player />} />
          <Route path="/details/:id" element={<Details />} />
          <Route path="/mylist" element={<MyList />} />
          <Route path="/settings" element={<Settings />} />
          {!IS_SHELL && <Route path="/download" element={<Download />} />}
          <Route path="/privacy" element={<Legal kind="privacy" />} />
          <Route path="/terms" element={<Legal kind="terms" />} />
          <Route path="/about" element={<Legal kind="about" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        {!isPlayer && <Footer />}
      </div>
      <AuthModal />
      <UpgradeModal />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Shell />
    </BrowserRouter>
  )
}

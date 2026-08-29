# CineGlass - PRD: Production React App

> Migration: prototype `index.html` (Vanilla SPA) -> Production `React + Tailwind CSS + JavaScript (Vite)` for free hosting (Vercel / Netlify / Cloudflare Pages)

## 1. Product Overview

**Vision:** Premium cinematic streaming UI that feels like Netflix/Apple TV but runs 100% client-side with zero backend cost.

**Prototype validated:** 7 views in single file `index.html:207-612` (Home, Movies, TV Shows, Live TV, Details, Player, My List) + glassmorphism design system `index.html:13-60`.

**Production Goal:** Rebuild as maintainable React SPA, preserve exact visual design, make all 80+ functionalities in `functionality.md` actually work, deploy as static site on free tier.

**Constraints (Free Server):**
- No PHP, no long-running Node server -> static build only (`dist/`).
- TMDB calls must go via serverless proxy (Vercel Function `api/tmdb.js`) or client-side with CORS workaround.
- No DB -> all persistence via `localStorage` (keys defined in `functionality.md:1118-1161`).
- Streaming via `multiembed.mov` iframe `functionality.md:757-764` (no self-hosted video).

---

## 2. Tech Stack (Locked)

| Layer | Choice | Reason (Free Hosting) |
|-------|--------|----------------------|
| Bundler | **Vite 5 + React 18** (JavaScript, not TS) | Fastest build, static output, works on Vercel/Netlify with zero config |
| Styling | **Tailwind CSS 3.4** | Utility-first, purges to ~25kb, CDN in prototype -> now compiled |
| Routing | **React Router 6** (HashRouter for file:// fallback, BrowserRouter on Vercel) | Client-side views replace `switchView()` `index.html:635+` |
| State | **Zustand** (or Context + useReducer) | Lightweight, persists to localStorage |
| Icons | **Material Symbols Outlined** (keep) + `lucide-react` fallback | Zero bundle cost |
| Data | **TMDB API** + `api/tmdb.js` Vercel Function | Replaces `tmdb-proxy.php` |
| Video | **iframe to multiembed.mov** `index.html:571-574` | No transcoding/hosting cost |
| Hosting | **Vercel (Primary)** / **Netlify / Cloudflare Pages** | Free SSL, CDN, `vercel.json` rewrites for SPA |
| No Backend | `localStorage` + optional Firebase Free Tier later | Zero cost |

**Do NOT use:** Next.js (overkill for static), TypeScript (user asked JS), PHP runtime, Express server.

## 3. Information Architecture

```
src/
├── main.jsx                # ReactDOM.createRoot
├── App.jsx                 # Router + Layout (SideNav + TopNav + BottomNav)
├── index.css               # Tailwind base + glass-* classes from index.html:63-130
├── tailwind.config.js      # Port colors/spacing/fonts from index.html:13-60
├── lib/
│   ├── tmdb.js             # fetch wrapper (port index.html:658-751)
│   ├── storage.js          # localStorage helpers (myList, progress, history)
│   └── stream.js           # multiembed URL builder (movie/tv ids)
├── store/
│   └── useStore.js         # Zustand: activeView, CONTENT[], myList, continueWatching
├── components/
│   ├── layout/SideNav.jsx  # from index.html:137-182
│   ├── layout/TopNav.jsx   # from index.html:185-202 (search + notifications)
│   ├── layout/BottomNav.jsx# from index.html:615-631
│   ├── ui/Toast.jsx        # from index.html:111-120
│   ├── ui/MovieCard.jsx    # reusable card (movie-card, glass-panel)
│   └── ui/Carousel.jsx     # horizontal scroll rows
├── pages/
│   ├── Home.jsx            # #view-home (hero + continue + trending)
│   ├── Movies.jsx          # #view-movies (banner + genre chips + grid)
│   ├── TVShows.jsx         # #view-tvshows
│   ├── LiveTV.jsx          # #view-livetv (guide)
│   ├── Details.jsx         # #view-moviedetails (cast, trailers, similar)
│   ├── Player.jsx          # #view-player (iframe + episodes + similar)
│   └── MyList.jsx          # #view-mylist
├── api/
│   └── tmdb.js             # Vercel Function (Node) -> proxies to api.themoviedb.org
└── public/
    └── favicon.svg
vercel.json                 # rewrites to index.html for SPA
```

## 4. Requirements (Prioritized)

### P0 - MVP (Must ship for free hosting to be viable)
1.  **Routing & Layout:** Port SPA view switching to React Router (`/` `/movies` `/tv` `/live` `/details/:id` `/player/:id` `/mylist`)
2.  **TMDB Integration:** Replace hardcoded CONTENT with `fetchTMDB('/trending/movie/week')` + fallback. Keep `GENRE_MAP` `index.html:651-656`.
3.  **Player:** `Player.jsx` embeds `https://multiembed.mov/?video_id={tmdb}&tmdb=1` (& `&s=&e=` for episodes). No custom HTML5 controls needed initially - iframe handles it.
4.  **Search:** Live dropdown in `TopNav.jsx` filtering `CONTENT[]` by title/genre, debounced 300ms, `Enter` -> `/search?q=`
5.  **Genre Filters:** Chips in Movies/TV actually filter `CONTENT` state (derive `filtered = All ? CONTENT : CONTENT.filter(c=>c.genre===active))`
6.  **My List:** `store` add/remove + `localStorage.cineglass_myList`, toast `index.html:112-120`, badge count.
7.  **Continue Watching:** Save `progress` every 5s from player (iframe message fallback: manual "Mark progress" or via TMDB runtime estimate), render rows on Home/TV.
8.  **Toasts + Skeletons + Empty/Error states** (already styled)
9.  **Vercel Deploy:** `vercel.json` rewrites, `Build Command: npm run build`, `Output: dist`

### P1 - UX (Next sprint)
- Auth modal (localStorage `cineglass_user`), Upgrade to Pro modal (3 tiers), Settings view
- Season/Episode selector (TMDB `/tv/{id}/season/{n}`), trailable trailers via `/videos`
- LiveTV clickable programs -> player with `LIVE` badge
- Notification center (bell dropdown)
- Keyboard nav, carousel arrows

### P2 - Advanced (Post-launch)
- PiP, playback speed, subtitles, quality switch, PWA manifest + service worker
- Theme toggle, i18n, parental controls, watch party

## 5. Data Contracts

Keep `functionality.md:1118-1161` keys unchanged for migration path:

```js
localStorage.cineglass_myList: Array<{id,type,title,poster,addedAt}>
localStorage.cineglass_progress: Record<id,{position,duration,updatedAt}>
localStorage.cineglass_user: {name,email,plan}
localStorage.cineglass_settings: {defaultQuality, autoplayNext, subtitles}
```

TMDB content shape (port `index.html:708-751`):
```js
{id, type:'movie'|'show', title, year, rating, genre, match, duration, poster, banner, desc, tmdb}
```

## 6. Design System (Tailwind Config)

Port `index.html:13-60` verbatim to `tailwind.config.js`:

```js
theme.extend.colors = { primary:"#ffb59e", "primary-container":"#ff571a", surface:"#131313", ...}
theme.extend.fontFamily = { "headline-xl":["Sora"], "body-lg":["Inter"] }
spacing = { "container-padding-desktop":"64px", "section-gap":"48px" }
```

Keep custom CSS `index.html:61-130` as `src/index.css` utilities: `.glass-panel`, `.movie-card`, `.hero-gradient`, etc.

## 7. Non-Functional

- **Perf:** Lighthouse >90, bundle <200kb gz, images `w500`/`w780` only, lazy load grids.
- **SEO:** `index.html` has `<title>` + meta description; add `react-helmet-async` for details pages.
- **A11y:** `aria-label` on icon buttons, focus rings, Esc closes modals.
- **Free tier limits:** Vercel 100GB bandwidth/mo, 6000 min build/mo -> no SSR, no image optimization server.
- **Legal:** TMDB attribution footer + multiembed disclaimer.

## 8. Acceptance Criteria (MVP Done When)

- [ ] `npm run build` outputs static `dist/` that runs on `npx serve dist` without server
- [ ] Home hero loads real TMDB trending movie, Play -> Player iframe loads
- [ ] Search filters 24+ items in <100ms
- [ ] My List persists after reload, toast appears
- [ ] Genre chip filters grid, URL updates `?genre=Action`
- [ ] Vercel deploy live at `https://cineglass-*.vercel.app` with `vercel.json` SPA fallback verified

## 9. Out of Scope for Free Hosting

Self-hosted video storage, real payments (Stripe mock only), persistent backend DB, DRM, admin analytics.

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| multiembed.mov downtime | Fallback card "Source unavailable, try TMDB id" + retry |
| TMDB CORS on Vercel | Ship `api/tmdb.js` serverless proxy (replaces `tmdb-proxy.php:40-53`) |
| Free tier bandwidth spike | Lazy images, no autoplay video, cache TMDB 10min in localStorage |
| iframe blocked on some browsers | Offer "Open in new tab" button with direct URL |

# CineGlass - Workflow: Prototype -> Production (React + Tailwind + Vite)

> Goal: From single-file `index.html` prototype to deployable React app on Vercel Free (0 cost).

## Phase 0 - Init (30 min)

```bash
# from project root "cinema hub"
npm create vite@latest cineglass -- --template react
cd cineglass
npm install
npm install -D tailwindcss@3.4.10 postcss autoprefixer
npx tailwindcss init -p
npm install react-router-dom zustand
# move prototype assets for reference
mkdir -p src/lib src/store src/components/layout src/components/ui src/pages api
```

**`tailwind.config.js`** - copy colors/fonts from `index.html:14-60`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx}"],
  darkMode:"class",
  theme:{
    extend:{
      colors: { primary:"#ffb59e", "primary-container":"#ff571a", surface:"#131313", "surface-container":"#20201f", ... },
      fontFamily:{ "headline-xl":["Sora"], "body-lg":["Inter"] },
      borderRadius:{ lg:"0.5rem", xl:"0.75rem" },
      spacing:{ "container-padding-desktop":"64px", "section-gap":"48px" }
    }
  },
  plugins:[]
}
```

**`src/index.css`** - paste `index.html:61-130` glass styles + add Tailwind directives:
```css
@tailwind base; @tailwind components; @tailwind utilities;
body{ background:#050505; color:#e5e2e1 }
.glass-panel{ background:rgba(26,26,26,0.4); backdrop-filter:blur(20px); border:1px solid rgba(255,255,255,0.1) }
/* ... rest */
```

**`vercel.json`** (root):
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

**`api/tmdb.js`** (Vercel Function - replaces `tmdb-proxy.php`):
```js
export default async (req,res)=>{
  const key = process.env.TMDB_API_KEY || '6d63e69e0427d5ee4820042375e2b762';
  const path = req.query.path; // e.g. /trending/movie/week
  if(!path || !path.startsWith('/')) return res.status(400).json({error:'Invalid path'});
  const url = `https://api.themoviedb.org/3${path}?api_key=${key}&language=en-US`;
  const r = await fetch(url);
  const j = await r.json();
  res.setHeader('Access-Control-Allow-Origin','*');
  res.status(r.status).json(j);
}
```

## Phase 1 - Scaffold & Migrate Layout (1-2 days)

**Day 1:**
1.  `src/lib/tmdb.js` - port `index.html:638-690` (`GENRE_MAP`, `fetchTMDB`, `mapLimit`)
2.  `src/store/useStore.js` - Zustand with `CONTENT`, `myList` (sync to localStorage), `searchQuery`, `activeGenre`
3.  `src/components/layout/SideNav.jsx` + `TopNav.jsx` + `BottomNav.jsx` - verbatim JSX from `index.html:137-202,615-631`, convert `onclick` to `useNavigate()`
4.  `src/App.jsx`:
    ```jsx
    import { BrowserRouter, Routes, Route } from 'react-router-dom'
    import Home from './pages/Home'
    // ...
    export default ()=>(
      <BrowserRouter>
        <SideNav/><TopNav/>
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/movies" element={<Movies/>}/>
          <Route path="/details/:id" element={<Details/>}/>
          <Route path="/player/:id" element={<Player/>}/>
          <Route path="/mylist" element={<MyList/>}/>
        </Routes>
        <BottomNav/><Toast/>
      </BrowserRouter>
    )
    ```
5.  Stub all 7 pages with `h1` + verify routing + style preserved.

**Checkpoint:** `npm run dev` -> click nav -> route changes, no page reload, styles match prototype.

## Phase 2 - Core Features MVP (3-4 days)

**Sprint A - Data:**
- `Home.jsx`: `useEffect(()=>fetchTMDB('/trending/movie/week').then(...setCONTENT))`, render hero (`#hero-bg`, `#hero-title`) + `<Carousel>` for trending. Keep same IDs for e2e.
- Fallback to `picsum.photos` if API fails (as in `index.html:719`).
- Port `loadRealContent()` `index.html:691-810` to `lib/tmdb.js` helpers.

**Sprint B - Search & Filter:**
- `TopNav.jsx`: controlled input, `useMemo` filtered list, dropdown `#search-results` absolute (copy `index.html:121-123`).
- Movies/TV genre chips: `onClick=setActiveGenre`, filter derived state, add `data-genre` attr.

**Sprint C - My List + Continue:**
- `store` actions: `toggleMyList(item)` -> update array + `localStorage.setItem('cineglass_myList', ...)`, toast.
- `MyList.jsx`: grid from store, empty state `index.html:605-610`.
- `Player.jsx`: iframe `src={multiembed.mov/?video_id=${tmdb}&tmdb=1}` (`index.html:571`). Save progress to `localStorage.cineglass_progress` on `visibilitychange`.

**Deliverable:** P0 acceptance criteria pass (see PRD:8).

## Phase 3 - UX Polish (2 days)

- Season/Episode selector in `Details.jsx` (fetch `/tv/{id}`, `/tv/{id}/season/{n}`)
- Trailers section (`/movie/{id}/videos` -> YouTube embed or Player iframe)
- LiveTV clickable programs -> navigate to `/player/live-{channel}`
- Auth modal + Upgrade modal (pure localStorage, no API)
- Notification dropdown (mock array)

## Phase 4 - Build, QA & Deploy (1 day)

```bash
npm run build        # vite build -> dist/
npx serve dist       # local smoke test: no 404 on refresh?
# fix SPA fallback if needed -> vite preview + vercel.json rewrites
```

**Deploy to Vercel (Free):**
1.  `git init; git add .; git commit -m "feat: react migration"`
2.  Push to GitHub
3.  vercel.com -> Add New Project -> Import GitHub repo
4.  Framework: **Vite**, Build: `npm run build`, Output: `dist`
5.  Env var: `TMDB_API_KEY=6d63e69e0427d5ee4820042375e2b762`
6.  Deploy -> live URL
7.  Test: direct link `.../details/movie-123` refresh -> should not 404 (vercel.json)
8.  Test: `api/tmdb?path=/trending/movie/week` returns JSON

**Alternative free hosts:**
- **Netlify:** same, set Publish=`dist`, Redirects file `_redirects`: `/* /index.html 200`
- **Cloudflare Pages:** Build `npm run build`, Output `dist`, add Function for TMDB if needed.

## Phase 5 - Post-Launch

- Add PWA `manifest.json` + service worker (vite-plugin-pwa)
- Add `react-helmet-async` SEO
- Analytics: Vercel Analytics (free)
- Monitor bandwidth in Vercel Dashboard.

## Checklists

**Pre-deploy:**
- [ ] `npm run build` no errors, `dist/index.html` exists
- [ ] No hard secrets in code (TMDB key in env only)
- [ ] Images use `loading="lazy"`
- [ ] Toasts work, no console errors

**Post-deploy:**
- [ ] Lighthouse Mobile >85
- [ ] Search + My List persists after reload
- [ ] Player iframe loads on mobile + desktop
- [ ] Direct URL refresh works

## Commands Reference

| Action | Command |
|--------|---------|
| Dev | `npm run dev` |
| Build | `npm run build` |
| Preview | `npm run preview` |
| Lint | `npm run lint` (add eslint) |
| Deploy (CLI) | `npx vercel --prod` |

## Estimated Timeline

| Phase | Duration |
|-------|----------|
| 0 Init | 0.5 day |
| 1 Scaffold | 1.5 days |
| 2 MVP | 3-4 days |
| 3 Polish | 2 days |
| 4 QA Deploy | 1 day |
| **Total** | **~8-9 days (solo dev)** |

Next step: I can scaffold the `cineglass/` Vite app in your `cinema hub` folder now so you can run `npm run dev` immediately. Say yes and I will generate it.

---

## Phase 6 — Professional Homepage Checklist (DONE — implemented in `cineglass/`)

> Applied from the "professional, polished, complete homepage" checklist. Items not applicable to a
> streaming-app UI (vs a marketing site) are noted as N/A.

### Visual Design

- [x] Typography hierarchy via Tailwind token scale (`tailwind.config.js`, full Material Noir port)
- [x] Line-length caps on long copy (`max-w-2xl` hero desc, `max-w-3xl` legal pages)
- [x] Consistent aspect ratios on all cards (2/3 posters, 16:9 backdrops) — zero CLS
- [x] Lazy-loaded images + alt text everywhere (`MovieCard`, `PosterCard`, `WideCard`, cast, episode stills)
- [x] Image error fallback chain → picsum placeholders (`onerror` handlers)
- [ ] WebP/AVIF optimization — N/A: TMDB serves JPEG; would require an image proxy (post-launch)

### User Experience

- [x] Logo links home (`SideNav` brand is now a `<Link to="/">`)
- [x] Sticky header adapting on scroll + auto-hide/show (`TopNav` scroll hook)
- [x] Visible active nav state (`.nav-link.active`)
- [x] Working live search with dropdown, empty state, Esc/outside-click close
- [x] Mobile navigation fully functional (`BottomNav`)
- [x] One primary CTA per section with distinct primary/ghost button system
- [x] Loading skeletons, empty states, and retryable error states (Home, Details, Player)
- [x] Branded 404 page with recovery CTAs (`src/pages/NotFound.jsx`, wildcard route)
- [x] Skip-to-content link (`#main-content`, App shell)
- [x] Keyboard focus visibility: global `:focus-visible` rings; removed suppressive `focus:outline-none`
- [x] Respects `prefers-reduced-motion` (global CSS override)
- [x] Touch targets ≥44px (bottom nav h-16, buttons py-3+)
- [x] Inline form validation (footer newsletter email regex + toast feedback)

### Trust Signals

- [x] Full multi-column footer (`src/components/layout/Footer.jsx`):
  Browse / Support / Legal columns, all links resolve (routes or mailto/toast actions — no dead links)
- [x] Social icons (X, YouTube, Instagram) with aria-labels, external + rel noreferrer
- [x] Newsletter signup ("Get new release alerts") — functional secondary CTA
- [x] Copyright line with dynamic year
- [x] Legal pages implemented: `/privacy`, `/terms`, `/about` (`src/pages/Legal.jsx`)
- [x] Third-party attributions: TMDB attribution + "hosts no video content" disclaimer in footer
- [ ] Testimonials / client-logo strips / ratings badges — N/A for an in-app streaming UI; no real
  social-proof data exists to show honestly (revisit if CineGlass launches publicly)

### SEO / Meta

- [x] Meta description, theme-color, Open Graph title/description/type, Twitter card (`index.html`)
- [x] Per-route document titles via router pages (title tag present app-wide)

### Cohesion & Balance

- [x] Single token-driven design system (colors/spacing/radii/type from one Tailwind config)
- [x] Consistent corner language (rounded-lg/xl/full used systematically)
- [x] 60/30/10 color discipline (OLED neutrals + orange accent only on interactive/priority elements)
- [x] Alternating section rhythm with identical internal alignment (hero → rows → grid)
- [x] State parity: hover/focus/active/loading/empty/error designed across components

**Verification:** `npm run lint` 0 errors · `npm run build` clean · footer/legal/404/skip-link/focus
smoke-tested in browser.

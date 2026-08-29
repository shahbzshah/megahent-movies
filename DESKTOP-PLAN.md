# CineGlass Desktop — Multi-Platform Shell Plan

Goal: block ads around the embedded players **at the network/shell layer** (like uBlock Origin does)
without touching the player iframes, so playback always works. The web app in `cineglass/` stays
unchanged; shells wrap it.

## Architecture

```
                 ┌── central brain (your shared host) ──────────────┐
                 │  /cineglass-filters.txt   ← blocklist you control │
                 │  /downloads/*             ← installers & APKs     │
                 └───────────────┬──────────────────────────────────┘
                                 │ fetched at startup by every shell
   ┌─────────────┬───────────────┼────────────────┬────────────────┐
   │ Windows/Mac │ Android phone │ Android TV/box │ Plain web      │
   │ Linux       │ WebView shell │ WebView shell  │ (Brave/uBlock  │
   │ Electron    │ shouldInter-  │ + D-pad layout │ users, no work)│
   │ + adblocker │ ceptRequest   │                │                │
   └─────────────┴───────────────┴────────────────┴────────────────┘
                                 │ loads
                     https://cineglass.vercel.app (Vercel free)
```

## Phases

### Phase 1 — Electron desktop shell (Windows/Mac/Linux) ✅ DONE
- `cineglass-desktop/` standalone project: `main.js`, `config.json`, `start.cmd`
- `@ghostery/adblocker-electron` v2.18 (EasyList + uBlock filter engine) intercepting all requests
  from the site AND player iframes — ad/tracker requests cancelled before they happen
- Popup kill: `setWindowOpenHandler(() => deny)` — new-tab ads impossible at shell level
  (site-origin links are forwarded to the system browser instead)
- Redirect guard: `will-navigate` blocked for foreign origins (anti tab-hijack), logged
- `config.json`: target URL, adblock on/off, popup guard, custom filter list URLs (Phase 2 hook),
  window size
- Verified live: `[cineglass] ad blocking ENABLED` + `loaded → http://localhost:5173/`
- Run with: `start.cmd` (clears VS Code's stray ELECTRON_RUN_AS_NODE env var)

### Phase 2 — Central filter list on shared host ✅ DONE
- `cineglass-filters.txt` published at project root, served by the CineGlass vhost (`http://localhost:8090/cineglass-filters.txt`)
- Shells fetch it via config `filterListUrls` (additive on top of EasyList/uBlock base); updating blocking = editing one file, no app updates
- Resilient fetch in `main.js`: each central URL probed individually — unreachable hosts are skipped with a warning, blocking never breaks; local `filters/custom.txt` always appended as extra layer
- Verified live: `lists: 19 (base: 17 | central: 1 | custom: 1)` + graceful `central: 0` when host stopped + `ad blocking ENABLED`
- `start.cmd` now `cd`s to its own folder (`%~dp0`) so it works from any working directory
- **To go live:** upload `cineglass-filters.txt` to the real shared host root, then point `filterListUrls` in `config.json` at `https://yourdomain.com/cineglass-filters.txt`

### Phase 3 — Download portal on shared host ✅ DONE (local sim) / pending real host upload
- **Dedicated `/download` page** in the webapp (`src/pages/Download.jsx`) — download links for `.exe` installer and `.apk`, plus setup instructions. Hidden inside shells via UA flag (`IS_SHELL`) — web-only, per product decision
- Entry points: SideNav "Get the App", TopNav download icon, Footer link (all web-only)
- **Real Windows installer built** with electron-builder 26 (NSIS, x64): `cineglass-desktop/release/cineglass-setup.exe` → copied to `downloads/cineglass-setup.exe` (99.3 MB), replacing the placeholder. Verified served at `http://localhost:8090/downloads/cineglass-setup.exe`
- Packaged app reads `config.json` from beside the installed exe first (user-editable target URL post-install), bundled config as fallback; `filters/custom.txt` ships inside the app
- **To go live:** build Android APK (Phase 4), upload both to shared host `/downloads/`, change the two `href`s in `Download.jsx` from `localhost:8090` to the production domain

### Phase 4 — Android shell (phone / TV box) ✅ DONE (v1)
- `cineglass-android/` — dependency-free Kotlin-free project (single `MainActivity.java`), built
  manually via SDK tools pipeline: `aapt2 → javac → d8 → jar → zipalign → apksigner` (`build.cmd`),
  no Gradle needed. Uses existing build-tools 36 + android-37 platform + Studio JBR + debug keystore
- **Ad blocking**: `shouldInterceptRequest()` cancels requests whose host matches the central filter
  list (`||domain^` rules parsed to a domain set, subdomains included). List fetched at startup from
  `FILTER_URL`, cached to internal storage; bundled `assets/filters.txt` fallback when offline
- **Popup kill**: `onCreateWindow` returns true — new-window ads never open
- **External links** open in the device browser; back button navigates WebView history
- UA flagged `CineGlassAndroid/1.0` (webapp hides download UI in-app, same as desktop)
- Built & signed APK deployed: `downloads/cineglass.apk` (17 KB), served on :8090 ✓
- **Config for testing:** constants at top of `MainActivity.java` — `SITE_URL` currently
  `http://10.0.2.2:5173` (emulator → host dev server). For a LAN phone/TV box use your PC's LAN IP;
  for production use the Vercel URL. Same for `FILTER_URL`. Rebuild with `build.cmd`
- Known limits v1: cosmetic `##` filter rules not applied (network blocking only); no D-pad polish yet

### Out of scope / notes
- Plain-web users keep using Brave/uBlock themselves — the site must stay fully usable without a shell
- Tauri rejected for Phase 1 (WebView2 lacks robust request interception); Electron chosen
- Packaging (electron-builder → `.exe`) happens after Phase 1 is validated interactively

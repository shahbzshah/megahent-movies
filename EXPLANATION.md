# CineGlass - Premium Streaming App

## Overview

CineGlass is a premium, cinematic streaming application UI built as a **single-page application (SPA)**. The entire app now lives in **one file: `index.html`** — no separate folders or pages are needed.

Previously, the project was split across 6 separate HTML pages plus a design system document. All of that has been consolidated into a single file with JavaScript-based view switching.

---

## What Was Consolidated

| Old File/Folder | Purpose | Now Located In |
|---|---|---|
| `index.html` (redirect) | Redirected to home dashboard | Replaced by the full unified app |
| `home_dashboard/code.html` | Main landing page with hero banner | `#view-home` section |
| `movies_hub/code.html` | Movie browsing with genre filters & grid | `#view-movies` section |
| `tv_shows_hub/code.html` | TV shows with Continue Watching & Trending | `#view-tvshows` section |
| `live_tv_guide/code.html` | Live TV channel guide with program grid | `#view-livetv` section |
| `movie_details_starlight_horizon/code.html` | Movie details, cast & crew, trailers | `#view-moviedetails` section |
| `video_player_starlight_horizon/code.html` | Immersive video player UI | `#view-player` section |
| `cinematic_noir/DESIGN.md` | Design system (colors, typography, spacing) | Inline in `<style>` + Tailwind config |

---

## How the Unified App Works

### 1. Single HTML File
Everything — HTML structure, Tailwind CSS configuration, custom CSS, and JavaScript — is contained in `index.html`.

### 2. View Switching (SPA Navigation)
- Each "page" is a `<section>` with a class of `view` and a unique `id` (e.g., `view-home`, `view-movies`).
- Only one view is visible at a time (`.view.active { display: block; }`).
- Clicking any element with a `data-view` attribute (sidebar links, mobile nav, "Play Now" buttons) calls `switchView(viewName)`.
- `switchView()`:
  - Removes `active` from all views
  - Adds `active` to the target view
  - Updates the active state of nav links
  - Scrolls to the top of the page

### 3. Shared Navigation
- **Desktop Sidebar** (visible on `md:` screens and up): Fixed left sidebar with brand logo, nav links (Home, Movies, TV Shows, Live TV, My List), Upgrade to Pro button, Settings, and Help.
- **Mobile Bottom Nav** (visible below `md:`): Fixed bottom bar with the same 5 nav destinations.
- **Top Nav Bar**: Fixed header with search input, notifications, download, and user avatar. It gains a background + shadow when the page is scrolled past 50px.

---

## The 6 Views

### 1. Home (`#view-home`)
- Full-screen hero banner for the featured movie **"Starlight Horizon"**.
- Genre badges: Sci-Fi Epic, 2024, 98% Match.
- "Play Now" button navigates to Movie Details view.
- "My List" button (placeholder).

### 2. Movies (`#view-movies`)
- Header: "Movies Hub" with subtitle.
- Genre filter chips: All, Action, Drama, Sci-Fi, More.
- Featured banner: **"Starlight Protocol"** (New Release, 4K HDR) with Play Now → Movie Details.
- "Trending Action" grid of 5 movie poster cards:
  - Cyber Drift (4.8, 2024)
  - Desert Fury (4.5, 2023)
  - Nightfall Pursuit (4.2, 2024)
  - The Ghost Directive (4.9, 2023)
  - Arena Blood (4.6, 2022)
- Each card has a hover overlay with rating and year.

### 3. TV Shows (`#view-tvshows`)
- Hero banner for **"ASCENT: THE SERIES"** (Sci-Fi Drama, 98% Match, 2024, 3 Seasons, HDR).
- "Play S1:E1" button → Player view.
- Filter chips: All, Sci-Fi, Drama, Thriller, Comedy, Documentary.
- **Continue Watching** row (horizontal scroll):
  - Neon Nights — S2:E4 "Shadows Fall" (66% progress)
  - The Eldertree — S1:E8 "Roots of Power" (25% progress)
- **Trending Now** row (horizontal scroll):
  - Synthetica (2024, TV-MA, 95%) — Top 10 badge
  - The Margin (2023, TV-14, 88%)
  - Iron & Blood (2024, TV-MA, 92%) — New Season badge

### 4. Live TV (`#view-livetv`)
- Interactive TV guide with:
  - **Timeline header** (8:00 PM → 10:00 PM in 30-min slots) with a glowing "current time" indicator line.
  - **Channels column** (fixed left): HBO HD (Ch 501), Showcase (Ch 504), FX Network (Ch 512), Nat Geo (Ch 540).
  - **Programs grid** (scrollable horizontally & vertically):
    - HBO HD: Dune: Part Two (LIVE, 80% progress), Succession
    - Showcase: The Last of Us (LIVE, 40%), True Detective: Night Country
    - FX Network: Shōgun - Episode 4 (LIVE, 65%), Fargo
- **Scroll sync**: Scrolling the programs grid horizontally syncs the timeline header; scrolling vertically syncs the channels list.

### 5. Movie Details (`#view-moviedetails`)
- Hero section for **"Starlight Horizon"** with badges (98% Match, 2024, 2h 15m, UHD).
- Synopsis text.
- "Play Now" → Player view.
- **Cast & Crew** (horizontal scroll of circular avatars):
  - Alex Mercer as Capt. Elias
  - Sarah Chen as Dr. Vance
  - Marcus Thorne as Pilot Kael
  - Elena Rostova as Chief Eng.
- **Trailers & Extras** (bento grid):
  - Official Trailer 1 (2m 34s) — large feature card
  - Behind the Scenes: "Making the Horizon"
  - Teaser: "The Threat" (0m 45s)

### 6. Player (`#view-player`)
- Immersive cinematic player UI over a nebula background.
- Top bar: Back button (→ Movie Details), title "Starlight Horizon".
- "Skip Intro" button.
- **Progress bar**: 01:24:10 elapsed / 02:15:00 total (65% played) with buffer bar and hover handle.
- **Control bar** (glassmorphic):
  - Left: Replay 10s, Pause, Forward 10s, Volume (with hover-reveal slider)
  - Right: Subtitles, Settings, Fullscreen
- **Auto-hide UI**: The player controls fade out after 3 seconds of inactivity (mouse move or click brings them back).

### 7. My List (`#view-mylist`)
- Placeholder view with an empty-state message: "Your list is empty".
- Explains how to save content.

---

## Design System (from `cinematic_noir/DESIGN.md`)

### Brand & Style
- **Personality**: Sophisticated, high-end, atmospheric.
- **Aesthetic**: Glassmorphism + Modern Minimalism.
- **Emotion**: Exclusive access and curated quality.

### Colors (Material 3 "Cinematic Noir" palette)
- **Primary (Sunset Orange)** `#ffb59e` / `#ff571a`: CTAs, progress bars, "New" indicators.
- **Secondary (Electric Blue)** `#adc6ff` / `#4b8eff`: Focus states, selections, metadata highlights.
- **Background**: `#050505` (OLED black) with charcoal surface containers.
- **Surfaces**: `#131313` base, `#1c1b1b` low, `#20201f` container, `#2a2a2a` high, `#353535` highest.
- **Text**: `#e5e2e1` on-surface, `#e6beb2` on-surface-variant.

### Typography
- **Sora** for headings (display-lg 64px, headline-xl 40px, headline-lg 32px, headline-md 24px).
- **Inter** for body text (body-lg 18px, body-md 16px) and labels (label-md 14px, label-sm 12px).
- Headlines use tight letter-spacing; labels use 0.05em tracking.

### Spacing
- 8px base unit.
- Desktop: 64px side margins; Mobile: 20px margins.
- Section gap: 48px; Gutter: 24px.

### Elevation & Depth
- Base: flat `#050505`.
- Surface: blur 20px, 40% opacity `#1A1A1A`, 1px white/10 border.
- Floating/Active: blur 40px + primary/secondary glow at 10%.
- All transitions use ease-in-out.

### Shapes
- Primary containers: `rounded-2xl` (24px) "squircle".
- Buttons/chips: `rounded-lg` (16px).

### Components
- **Primary buttons**: gradient fill (Sunset Orange → Red-Orange).
- **Ghost buttons**: transparent + 1px white border + backdrop blur.
- **Movie cards**: hover scale 1.05x, bottom gradient overlay for metadata.
- **Progress bars**: primary orange fill with glow, dark charcoal track.
- **Chips/Badges**: pill-shaped, semi-transparent gray, uppercase Inter.

---

## Key JavaScript Features

| Feature | Description |
|---|---|
| `switchView()` | SPA navigation between the 6 views |
| Top nav scroll effect | Adds background/shadow after scrolling 50px |
| Live TV scroll sync | Syncs timeline header + channels list with programs grid |
| Player UI auto-hide | Controls fade after 3s idle; reappear on mouse move/click |

---

## How to Run

Simply open `index.html` in any modern web browser. No build step, no server, no dependencies to install.

- **Tailwind CSS** is loaded via CDN.
- **Google Fonts** (Inter, Sora, Material Symbols) are loaded via CDN.
- All images are remote URLs (Google AI-generated placeholder art).

---

## File Structure (After Consolidation)

```
cinema hub/
├── index.html      ← THE ENTIRE APP (single file)
└── EXPLANATION.md  ← This documentation
```

All old folders (`home_dashboard/`, `movies_hub/`, `tv_shows_hub/`, `live_tv_guide/`, `movie_details_starlight_horizon/`, `video_player_starlight_horizon/`, `cinematic_noir/`) have been **removed**.
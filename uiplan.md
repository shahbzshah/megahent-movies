# CineGlass UI Plan

## Goal

Refresh CineGlass into a polished, cinematic streaming app inspired by modern streaming platforms such as Netflix, while preserving the current functionality, routes, data sources, and playback behavior.

## Visual Direction

- Near-black and charcoal surfaces
- Restrained cinematic red accent for primary actions
- Bright white titles with muted gray metadata
- Image-led layouts with strong gradients for readability
- Minimal glass effects instead of heavy glassmorphism
- Bold, cinematic typography with clear hierarchy
- Subtle motion for page entry, hover states, and carousel interactions

## Scope

### Shared App Shell

- Redesign the desktop sidebar into a cleaner streaming navigation system.
- Improve the mobile bottom navigation and spacing.
- Strengthen CineGlass branding and logo presentation.
- Refine the top search bar, search suggestions, notifications, and user menu.
- Keep the player route free of the browsing shell.
- Update the footer to match the new visual language.

### Reusable Components

- Standardize poster, movie, and continue-watching card dimensions.
- Use image-first cards with clear hover actions.
- Add consistent play, My List, badge, rating, and progress treatments.
- Improve carousel spacing, arrow controls, focus states, and mobile scrolling.
- Update shared modals, toasts, toggles, selects, skeletons, announcements, and episode rows.

### Discovery Pages

- Make the Home hero more cinematic with readable layered gradients.
- Use stronger title hierarchy and compact metadata in hero sections.
- Tighten spacing between content rows.
- Present Trending, Continue Watching, and curated collections as streaming rows.
- Make Movies and TV Shows filters feel like focused library controls.
- Preserve sorting, genre filters, pagination, loading states, and error handling.

### Details and Utility Pages

- Apply the new theme to Details, Live TV, My List, Player, Settings, Download, Legal, and Not Found pages.
- Improve details-page hierarchy for title, metadata, description, playback, cast, trailers, seasons, and similar titles.
- Keep account actions, settings controls, confirmation modals, and local data behavior unchanged.
- Preserve empty states and responsive behavior.

## Design Rules

- Use consistent content widths and responsive spacing.
- Avoid oversized decorative panels and nested cards.
- Keep text readable over images with layered gradients.
- Use red only for important actions, active states, progress, and emphasis.
- Ensure all interactive controls have visible hover and keyboard focus states.
- Keep buttons and controls usable on small screens.
- Prevent horizontal overflow and clipped content at mobile widths.
- Preserve accessible labels and meaningful alt text.
- Retain the existing Material Symbols icon system.

## Implementation Files

- `cineglass/src/index.css`
- `cineglass/tailwind.config.js`
- `cineglass/index.html`
- `cineglass/src/components/layout/`
- `cineglass/src/components/ui/`
- `cineglass/src/pages/`

## Functionality To Preserve

- TMDB content loading and metadata
- Search suggestions and details navigation
- Hero and carousel navigation
- Play buttons and player routing
- My List toggling
- Continue Watching progress indicators
- Genre and sort query parameters
- Authentication and upgrade modals
- Settings controls and confirmation dialogs
- Site offline and announcement states
- Responsive player-shell separation

## Verification Checklist

- Run `npm run lint` from the `cineglass` folder.
- Run `npm run build` from the `cineglass` folder.
- Check Home, Movies, TV Shows, Live TV, Details, My List, Settings, and Player routes.
- Verify desktop and mobile layouts.
- Test search result navigation.
- Test carousel arrows and horizontal scrolling.
- Test playback buttons and My List actions.
- Test filters, sorting, pagination, toggles, selects, and modals.
- Confirm no clipped text, broken offsets, unexpected overflow, or inaccessible controls.

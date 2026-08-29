# CineGlass - Functionality Specification

## Overview

CineGlass is a premium, cinematic streaming application UI currently built as a **static single-page application (SPA)**. The current version (`index.html`) contains beautiful, fully-designed views for Home, Movies, TV Shows, Live TV, Movie Details, Player, and My List — but **all content is hardcoded and no features are functional beyond view switching**.

This document defines the complete set of functionalities required to transform CineGlass from a static UI prototype into a **real, working premium streaming application**.

---

## Current State vs. Target State

| Area | Current State | Target State |
|---|---|---|
| Video Playback | Static nebula background image | Real HTML5 video player with full controls |
| Search | Non-functional input field | Live search across all content with results |
| My List | Empty placeholder view | Working add/remove with localStorage persistence |
| Continue Watching | Hardcoded progress bars | Real progress tracking from actual playback |
| User Accounts | Static avatar image | Full sign-up/login with profiles |
| Live TV | Static program grid | Clickable channels that play, reminders, favorites |
| TV Shows | Static episode cards | Season/episode selectors with real data |
| Movie Details | Static cast & trailers | Interactive cast pages, ratings, reviews |
| Notifications | Static bell icon | Real notification center with toasts |
| Settings | Static links | Full settings panel with preferences |
| Data | All hardcoded in HTML | Dynamic data from localStorage / API |

---

## 1. Core Streaming & Playback

### 1.1 Real Video Playback
- **Description**: Replace the static nebula background in the Player view with an actual `<video>` element that plays real video content.
- **Location**: `#view-player`
- **Behavior**: 
  - Video loads and plays when the user clicks "Play Now"
  - Supports standard HTML5 video formats (MP4, WebM) and HLS streams
  - Poster frame shows the cinematic background before playback
- **Priority**: Core

### 1.2 Play / Pause Toggle
- **Description**: The center pause button and the control bar play/pause button must actually control video playback.
- **Location**: `#view-player` control bar
- **Behavior**:
  - Click pause → video pauses, icon changes to play
  - Click play → video resumes, icon changes to pause
  - Spacebar toggles play/pause
  - Clicking the video itself toggles play/pause
- **Priority**: Core

### 1.3 Seek Controls (Replay 10s / Forward 10s)
- **Description**: The `replay_10` and `forward_10` buttons must seek the video backward/forward by 10 seconds.
- **Location**: `#view-player` control bar (left side)
- **Behavior**:
  - Click replay_10 → video jumps back 10 seconds
  - Click forward_10 → video jumps forward 10 seconds
  - Arrow keys ← / → seek by 10 seconds
- **Priority**: Core

### 1.4 Progress Bar Scrubbing
- **Description**: The progress bar must be clickable and draggable to seek to any position in the video.
- **Location**: `#view-player` progress bar
- **Behavior**:
  - Click anywhere on the bar → seeks to that position
  - Drag the handle → live preview of time, seek on release
  - Buffer bar shows actual buffered content
  - Time labels update in real-time (elapsed / total)
- **Priority**: Core

### 1.5 Volume Control
- **Description**: The volume button and hover-reveal slider must control audio output.
- **Location**: `#view-player` control bar (left side)
- **Behavior**:
  - Hover over volume icon → slider appears
  - Drag slider → adjusts volume (0–100%)
  - Click volume icon → mute/unmute (icon changes to volume_off)
  - M key toggles mute
- **Priority**: Core

### 1.6 Fullscreen Mode
- **Description**: The fullscreen button must enter/exit browser fullscreen for the player.
- **Location**: `#view-player` control bar (right side)
- **Behavior**:
  - Click → enters fullscreen (video fills entire screen)
  - Click again or press Esc → exits fullscreen
  - F key toggles fullscreen
  - Fullscreen button icon changes (fullscreen ↔ fullscreen_exit)
- **Priority**: Core

### 1.7 Picture-in-Picture (PiP)
- **Description**: Allow the video to play in a small floating window while the user browses other views.
- **Location**: `#view-player` control bar
- **Behavior**:
  - Click PiP button → video detaches into a floating mini-player
  - User can navigate to other views while video continues playing
  - Click PiP again → returns video to the player view
- **Priority**: Recommended

### 1.8 Playback Speed Control
- **Description**: Allow the user to change playback speed (0.5x, 1x, 1.25x, 1.5x, 2x).
- **Location**: `#view-player` settings menu
- **Behavior**:
  - Settings menu opens a speed selector
  - Selected speed applies to the video immediately
  - Current speed is displayed on the button
- **Priority**: Recommended

### 1.9 Quality Selection
- **Description**: The quality menu (Auto/4K/1080p/720p/480p) must actually switch video quality.
- **Location**: `#view-player` settings menu (already in HTML)
- **Behavior**:
  - Selecting a quality reloads the video at that resolution
  - "Auto" picks the best quality based on connection speed
  - Current quality is highlighted with a checkmark
  - Quality preference is saved in localStorage
- **Priority**: Core

### 1.10 Subtitle / Caption Support
- **Description**: The subtitles button must toggle captions and allow language selection.
- **Location**: `#view-player` control bar (right side)
- **Behavior**:
  - Click subtitles button → opens language menu (English, Spanish, French, etc.)
  - Selecting a language enables captions in that language
  - Toggle off disables captions
  - Subtitle preference saved in localStorage
- **Priority**: Recommended

### 1.11 Keyboard Shortcuts
- **Description**: Full keyboard navigation for the player.
- **Location**: `#view-player` (global when player is active)
- **Behavior**:
  - `Space` = Play/Pause
  - `←` / `→` = Seek ±10 seconds
  - `↑` / `↓` = Volume up/down
  - `M` = Mute/Unmute
  - `F` = Fullscreen
  - `P` = Picture-in-Picture
  - `C` = Toggle captions
  - `Esc` = Exit fullscreen / close menus
- **Priority**: Core

### 1.12 Skip Intro Button
- **Description**: The "Skip Intro" button must actually skip the intro sequence.
- **Location**: `#view-player` (top-right of controls)
- **Behavior**:
  - Appears during the first ~90 seconds of playback
  - Click → seeks to the end of the intro (e.g., 1:30)
  - Auto-dismisses after the intro window passes
- **Priority**: Recommended

### 1.13 Up Next / Auto-Play
- **Description**: When a video ends (or is near the end), show an "Up Next" card with a countdown.
- **Location**: `#view-player` (overlay, already partially in HTML)
- **Behavior**:
  - 10-second countdown appears when video is within 30 seconds of ending
  - Countdown auto-plays the next episode/movie
  - "Cancel" button stops the countdown
  - "Play Now" button immediately plays the next content
- **Priority**: Recommended

### 1.14 Resume Playback
- **Description**: Remember where the user stopped watching and resume from that position.
- **Location**: `#view-player` + `#view-tvshows` (Continue Watching)
- **Behavior**:
  - Playback position is saved to localStorage every 5 seconds
  - When the user reopens the content, a "Resume from 24:10?" prompt appears
  - Continue Watching cards show the saved progress percentage
- **Priority**: Core

---

## 2. Search & Discovery

### 2.1 Global Search
- **Description**: The search bar in the top nav must perform a live search across all content.
- **Location**: Top nav bar (all views)
- **Behavior**:
  - Typing shows a dropdown with matching results (movies, shows, actors, genres)
  - Results grouped by category (Movies / TV Shows / Actors)
  - Each result shows poster thumbnail, title, year, and rating
  - Clicking a result navigates to the relevant view
  - "No results" empty state with suggestions
  - Enter key opens a full search results view
- **Priority**: Core

### 2.2 Search Filters
- **Description**: Advanced filtering within search results.
- **Location**: Search results view
- **Behavior**:
  - Filter by genre (Action, Drama, Sci-Fi, Comedy, etc.)
  - Filter by year range
  - Filter by rating (4+ stars, etc.)
  - Filter by content type (Movie / TV Show / Live TV)
  - Sort by relevance, newest, top-rated
- **Priority**: Recommended

### 2.3 Working Genre Filter Chips
- **Description**: The genre chips on Movies and TV Shows views must actually filter the content.
- **Location**: `#view-movies`, `#view-tvshows`
- **Behavior**:
  - Clicking "Action" filters the grid to only Action movies
  - Clicking "All" resets the filter
  - Active chip is highlighted (already styled)
  - Filtered grid shows matching content with smooth transition
- **Priority**: Core

### 2.4 Sort Options
- **Description**: Allow sorting content rows by different criteria.
- **Location**: `#view-movies`, `#view-tvshows`
- **Behavior**:
  - Sort by: Newest, Top Rated, Most Popular, A–Z
  - Sort dropdown next to section headers
  - Selection persists per view
- **Priority**: Recommended

### 2.5 Trending / Top 10 / New Releases
- **Description**: Home page should have dynamic content rows.
- **Location**: `#view-home`
- **Behavior**:
  - "Trending Now" row — most-watched content
  - "Top 10" row — ranked list with number badges
  - "New Releases" row — recently added content
  - "Continue Watching" row — in-progress content
  - Rows populate from localStorage/API data
- **Priority**: Core

### 2.6 Personalized Recommendations
- **Description**: Recommend content based on the user's watch history and My List.
- **Location**: `#view-home`
- **Behavior**:
  - "Because you watched [Title]" row
  - "More like [Title]" row on Movie Details
  - Recommendations update as watch history grows
- **Priority**: Advanced

### 2.7 Similar Titles
- **Description**: Show similar content on the Movie Details page.
- **Location**: `#view-moviedetails`
- **Behavior**:
  - "More Like This" horizontal scroll row
  - Based on genre, rating, and tags
  - Clicking a card opens that title's details
- **Priority**: Recommended

---

## 3. My List & Watch History

### 3.1 Add / Remove from My List
- **Description**: Every "My List" / "Add to My List" button must actually save/remove content.
- **Location**: All views (Home hero, Movies grid, TV Shows, Movie Details)
- **Behavior**:
  - Click "Add" → content added to My List, button changes to "✓ Added" (or "Remove")
  - Click again → content removed
  - Toast notification confirms: "Added to My List" / "Removed from My List"
  - State persists in localStorage
- **Priority**: Core

### 3.2 My List View
- **Description**: The My List view must display all saved content as a grid.
- **Location**: `#view-mylist`
- **Behavior**:
  - Grid of poster cards for all saved movies/shows
  - Each card shows title, year, rating, and progress (if watched)
  - Click card → opens details
  - "Remove" button on each card
  - Empty state (already exists) when list is empty
  - Sort by: Date Added, A–Z, Rating
- **Priority**: Core

### 3.3 Continue Watching
- **Description**: Track in-progress content with real progress.
- **Location**: `#view-home`, `#view-tvshows`
- **Behavior**:
  - Shows content the user has started but not finished
  - Progress bar reflects actual playback position
  - Clicking resumes from saved position
  - Removes from row when completed
  - "Remove from Continue Watching" option
- **Priority**: Core

### 3.4 Watch History
- **Description**: Track everything the user has watched.
- **Location**: Settings → Watch History
- **Behavior**:
  - List of all watched content with date/time
  - "Clear History" button
  - Used for recommendations
  - Stored in localStorage
- **Priority**: Recommended

### 3.5 localStorage Persistence
- **Description**: All user data survives page reloads.
- **Location**: Global
- **Behavior**:
  - My List items stored in `localStorage.cineglass_myList`
  - Watch progress stored in `localStorage.cineglass_progress`
  - Watch history stored in `localStorage.cineglass_history`
  - Settings stored in `localStorage.cineglass_settings`
  - User account stored in `localStorage.cineglass_user`
- **Priority**: Core

---

## 4. User Accounts & Profiles

### 4.1 Sign Up / Login
- **Description**: Allow users to create an account and log in.
- **Location**: New Auth modal (accessible from avatar click)
- **Behavior**:
  - Sign up form: name, email, password, confirm password
  - Login form: email, password
  - Validation with error messages
  - Account stored in localStorage (demo mode)
  - "Forgot password" flow (demo)
  - Session persists across reloads
- **Priority**: Core

### 4.2 User Profile Page
- **Description**: Display and edit user profile information.
- **Location**: New Profile view (accessible from avatar)
- **Behavior**:
  - Shows avatar, name, email, member since
  - Edit name, change avatar (from preset options)
  - Change password
  - Account deletion option
- **Priority**: Recommended

### 4.3 Multiple Profiles
- **Description**: Allow multiple profiles per account (like Netflix).
- **Location**: Profile switcher (avatar click → profile menu)
- **Behavior**:
  - "Who's watching?" screen with profile cards
  - Each profile has its own My List, history, and progress
  - Add/remove profiles (max 5)
  - Kids profile with parental controls
- **Priority**: Advanced

### 4.4 Logout / Switch Profile
- **Description**: Allow users to log out or switch profiles.
- **Location**: Avatar menu
- **Behavior**:
  - Logout returns to login screen
  - Switch profile shows profile picker
  - Active profile shown in sidebar
- **Priority**: Core

### 4.5 Upgrade to Pro
- **Description**: The "Upgrade to Pro" button must open a subscription modal.
- **Location**: Sidebar (all views)
- **Behavior**:
  - Modal with 3 plans: Basic (Free), Pro ($9.99/mo), Premium ($14.99/mo)
  - Plan comparison table (quality, screens, downloads)
  - "Subscribe" button simulates payment (demo)
  - After subscribing, user gets "PRO" badge and premium features unlock
  - Cancel subscription option in Settings
- **Priority**: Core

### 4.6 Parental Controls
- **Description**: Restrict content based on maturity ratings.
- **Location**: Settings → Parental Controls
- **Behavior**:
  - Set maximum content rating (G, PG, PG-13, R, TV-MA)
  - PIN required to change settings
  - Content above the limit is hidden/blurred
  - Kids profile automatically restricted
- **Priority**: Advanced

---

## 5. TV Shows & Episodes

### 5.1 Season Selector
- **Description**: Allow browsing episodes by season.
- **Location**: `#view-tvshows` (new section)
- **Behavior**:
  - Season dropdown (S1, S2, S3...)
  - Selecting a season shows its episode list
  - Season artwork and description
- **Priority**: Core

### 5.2 Episode List
- **Description**: Display all episodes for the selected season.
- **Location**: `#view-tvshows`
- **Behavior**:
  - Each episode shows: thumbnail, number, title, duration, synopsis
  - Watched episodes have a checkmark
  - In-progress episodes show progress bar
  - Click episode → plays it in the Player
- **Priority**: Core

### 5.3 Next Episode Auto-Play
- **Description**: Automatically play the next episode when one finishes.
- **Location**: `#view-player` (Up Next)
- **Behavior**:
  - "Up Next: S1:E2 - [Title]" card with countdown
  - Auto-plays next episode after countdown
  - Marks completed episode as watched
- **Priority**: Recommended

### 5.4 Episode Progress Tracking
- **Description**: Track which episodes have been watched.
- **Location**: `#view-tvshows`, `#view-player`
- **Behavior**:
  - Watched episodes marked with checkmark
  - "Continue Watching" shows next unwatched episode
  - Progress saved per show/season/episode
- **Priority**: Core

### 5.5 New Season Notifications
- **Description**: Alert users when a new season is available.
- **Location**: Notification center
- **Behavior**:
  - "New Season of [Show] is now available" notification
  - Badge on TV Shows nav link
  - "New Season" badge on show cards (already styled)
- **Priority**: Advanced

---

## 6. Live TV Enhancements

### 6.1 Clickable Programs
- **Description**: Clicking a program in the Live TV guide opens the player for that channel.
- **Location**: `#view-livetv` programs grid
- **Behavior**:
  - Click any program card → opens Player view
  - Player shows the channel name and current program
  - "LIVE" indicator in the player
- **Priority**: Core

### 6.2 Channel Favorites
- **Description**: Allow users to favorite channels.
- **Location**: `#view-livetv` channels column
- **Behavior**:
  - Star icon on each channel
  - Click → toggles favorite (star fills)
  - Favorited channels sort to the top
  - Favorites persist in localStorage
- **Priority**: Recommended

### 6.3 Program Reminders
- **Description**: Set reminders for upcoming programs.
- **Location**: `#view-livetv` program cards
- **Behavior**:
  - "Remind Me" button on future programs
  - Notification fires when the program starts
  - Reminders listed in notification center
  - Persist in localStorage
- **Priority**: Advanced

### 6.4 Real-Time "Now Playing"
- **Description**: The guide should reflect the actual current time.
- **Location**: `#view-livetv` timeline
- **Behavior**:
  - Current time indicator line moves in real-time
  - Programs update as time passes
  - "LIVE" badges appear on currently-airing programs
  - Uses JavaScript `Date` object
- **Priority**: Recommended

### 6.5 Start from Beginning
- **Description**: For in-progress live programs, allow starting from the beginning.
- **Location**: `#view-livetv` live program cards
- **Behavior**:
  - "Start from Beginning" button on live programs
  - Player seeks to the program's start time
  - "Watch Live" button jumps to the live edge
- **Priority**: Advanced

---

## 7. Movie Details Page

### 7.1 Interactive Cast & Crew
- **Description**: Clicking an actor opens their profile.
- **Location**: `#view-moviedetails` Cast & Crew section
- **Behavior**:
  - Click actor avatar → actor profile modal/page
  - Actor page shows: photo, bio, filmography, known-for titles
  - Clicking a filmography title opens that title's details
- **Priority**: Recommended

### 7.2 User Ratings & Reviews
- **Description**: Allow users to rate and review content.
- **Location**: `#view-moviedetails` (new section)
- **Behavior**:
  - Star rating widget (1–5 stars)
  - User's rating saved to localStorage
  - Average rating updates
  - Review text area with submit
  - Reviews list with user avatars and dates
- **Priority**: Recommended

### 7.3 Playable Trailers & Extras
- **Description**: Trailer cards must actually play video.
- **Location**: `#view-moviedetails` Trailers & Extras
- **Behavior**:
  - Click trailer → opens Player view with trailer
  - Trailer plays in a modal or the player
  - Duration labels match actual trailer lengths
- **Priority**: Core

### 7.4 Technical Specs
- **Description**: Display full technical information.
- **Location**: `#view-moviedetails`
- **Behavior**:
  - Resolution (4K UHD, 1080p HD)
  - Audio (Dolby Atmos, 5.1, Stereo)
  - Runtime, release date, genres
  - Content rating (PG-13, R, etc.)
  - Director, writers, producers
- **Priority**: Recommended

### 7.5 Share Functionality
- **Description**: Allow sharing content with others.
- **Location**: `#view-moviedetails` (share button)
- **Behavior**:
  - Copy link to clipboard
  - Share via social media (Twitter/X, Facebook, WhatsApp)
  - Native Web Share API on supported devices
- **Priority**: Advanced

### 7.6 Download for Offline
- **Description**: Allow downloading content for offline viewing (Pro feature).
- **Location**: `#view-moviedetails`, `#view-player`
- **Behavior**:
  - Download button on details page
  - Progress indicator during "download"
  - Downloaded content available in "Downloads" section
  - Only available for Pro/Premium users
- **Priority**: Advanced

---

## 8. Notifications & Alerts

### 8.1 Toast Notifications
- **Description**: Small popup notifications for user actions.
- **Location**: Global (top-right corner)
- **Behavior**:
  - "Added to My List ✓"
  - "Removed from My List"
  - "Download complete"
  - "New season available"
  - Auto-dismiss after 3 seconds
  - Slide-in/slide-out animation
- **Priority**: Core

### 8.2 Notification Center
- **Description**: The bell icon must open a notification dropdown.
- **Location**: Top nav bar (bell icon)
- **Behavior**:
  - Dropdown with notification list
  - Each notification: icon, message, timestamp
  - Unread notifications have a dot/badge
  - "Mark all as read" button
  - Click notification → navigates to relevant content
  - Badge count on bell icon
- **Priority**: Recommended

### 8.3 New Release Alerts
- **Description**: Notify users when new content is added.
- **Location**: Notification center
- **Behavior**:
  - "New Release: [Title] is now available"
  - Based on user's preferences (genres they watch)
  - Daily digest option
- **Priority**: Advanced

### 8.4 Live TV Reminders
- **Description**: Notify users when a program they set a reminder for starts.
- **Location**: Notification center
- **Behavior**:
  - Fires at program start time
  - "Click to watch" navigates to Live TV
- **Priority**: Advanced

---

## 9. Settings & Preferences

### 9.1 Playback Settings
- **Description**: Default playback preferences.
- **Location**: Settings view
- **Behavior**:
  - Default quality (Auto/4K/1080p/720p/480p)
  - Autoplay next episode (on/off)
  - Default subtitles (language/off)
  - Default playback speed
  - "Skip intro" auto-skip toggle
- **Priority**: Core

### 9.2 Account Settings
- **Description**: Manage account information.
- **Location**: Settings view
- **Behavior**:
  - Edit name, email
  - Change password
  - Manage subscription (upgrade/downgrade/cancel)
  - Delete account
- **Priority**: Core

### 9.3 Notification Preferences
- **Description**: Control which notifications the user receives.
- **Location**: Settings view
- **Behavior**:
  - Toggles: New releases, Live TV reminders, Recommendations, Promotions
  - Email notification toggle
  - Push notification toggle (PWA)
- **Priority**: Recommended

### 9.4 Language Selection
- **Description**: Multi-language UI support.
- **Location**: Settings view
- **Behavior**:
  - Language dropdown (English, Spanish, French, German, etc.)
  - UI text changes immediately
  - Preference saved in localStorage
- **Priority**: Advanced

### 9.5 Theme Toggle
- **Description**: Dark/Light theme switching.
- **Location**: Settings view
- **Behavior**:
  - Dark mode (current, default)
  - Light mode (new light color palette)
  - "System" option (follows OS preference)
  - Smooth transition between themes
- **Priority**: Recommended

### 9.6 Data Management
- **Description**: Clear user data.
- **Location**: Settings view
- **Behavior**:
  - Clear watch history
  - Clear My List
  - Clear all data (factory reset)
  - Confirmation dialogs before clearing
- **Priority**: Recommended

### 9.7 Accessibility Settings
- **Description**: Accessibility options.
- **Location**: Settings view
- **Behavior**:
  - Reduced motion (disables animations)
  - Larger text sizes
  - High contrast mode
  - Screen reader friendly (ARIA labels)
- **Priority**: Advanced

---

## 10. UI/UX Enhancements

### 10.1 Loading Skeletons
- **Description**: Show placeholder skeletons while content loads.
- **Location**: All views with content grids
- **Behavior**:
  - Gray shimmering blocks matching card dimensions
  - Appear for ~500ms on view switch
  - Fade out when content renders
- **Priority**: Recommended

### 10.2 Empty States
- **Description**: Friendly empty states for all content areas.
- **Location**: My List, Search results, Continue Watching, Downloads
- **Behavior**:
  - Icon + message + action button
  - "Your list is empty — Browse Movies" (already exists for My List)
  - "No results for '[query]'" with suggestions
- **Priority**: Core

### 10.3 Error States
- **Description**: Handle errors gracefully.
- **Location**: Player, content grids, search
- **Behavior**:
  - Video error: "Video unavailable" with retry button
  - Network error: "Connection lost" with retry
  - Content error: "Something went wrong" with reload
- **Priority**: Core

### 10.4 Modal Dialogs
- **Description**: Reusable modal component.
- **Location**: Global
- **Behavior**:
  - Confirmation dialogs (remove from list, clear history)
  - Detail modals (actor bio, episode info)
  - Subscription modal (Upgrade to Pro)
  - Backdrop blur + centered card
  - Close on backdrop click or Esc
- **Priority**: Core

### 10.5 Carousel Arrows
- **Description**: Arrow buttons for horizontal scroll rows.
- **Location**: All horizontal scroll rows (Trending, Continue Watching, Cast)
- **Behavior**:
  - Left/right arrow buttons on row edges
  - Click → scrolls row by one card width
  - Arrows appear on hover (desktop)
  - Touch swipe still works on mobile
- **Priority**: Recommended

### 10.6 Infinite Scroll / Load More
- **Description**: Load more content as the user scrolls.
- **Location**: Movies grid, TV Shows grid, Search results
- **Behavior**:
  - "Load More" button at grid bottom
  - Or auto-load on scroll near bottom
  - New cards append with fade-in
- **Priority**: Advanced

### 10.7 Responsive Improvements
- **Description**: Better layouts for tablets and TV screens.
- **Location**: Global
- **Behavior**:
  - Tablet: adjusted grid columns and padding
  - TV (10-foot UI): larger text, focus rings, remote-friendly
  - Landscape mobile: optimized player
- **Priority**: Recommended

### 10.8 Keyboard Navigation
- **Description**: Full keyboard navigation for menus and grids.
- **Location**: Global
- **Behavior**:
  - Tab through nav links with visible focus rings
  - Arrow keys navigate card grids
  - Enter activates focused element
  - Esc closes modals/menus
- **Priority**: Recommended

### 10.9 PWA Support
- **Description**: Make the app installable and offline-capable.
- **Location**: Global
- **Behavior**:
  - Web App Manifest (name, icons, theme color)
  - Service Worker for offline caching
  - Install prompt on supported browsers
  - Works offline for cached content
  - Push notifications
- **Priority**: Advanced

---

## 11. Streaming Source Integration (multiembed.mov)

### 11.1 Player Embedding (Simple Way)
- **Description**: Use the multiembed.mov iframe player to stream real movies and TV shows.
- **Location**: `#view-player`
- **Behavior**:
  - Embed the player URL in an iframe within the Player view
  - Works on all servers, no extra files needed
  - Just paste the URL into an iframe and the player appears
- **Priority**: Core

### 11.2 Movie Request URLs
- **Description**: Request a movie by IMDB or TMDB ID.
- **Location**: `#view-player`
- **Behavior**:
  - **By IMDB ID**: `https://multiembed.mov/?video_id=tt8385148`
  - **By TMDB ID**: `https://multiembed.mov/?video_id=522931&tmdb=1`
  - Change the IMDB or TMDB ID to load different movies
  - For IMDB ID, use `tt0000000` format or just the number `0000000`
  - Always include `&tmdb=1` when using a TMDB ID
- **Priority**: Core

### 11.3 Episode Request URLs
- **Description**: Request a specific episode of a TV series.
- **Location**: `#view-player`
- **Behavior**:
  - **By IMDB ID**: `https://multiembed.mov/?video_id=tt13157618&s=1&e=2`
  - **By TMDB ID**: `https://multiembed.mov/?video_id=114472&tmdb=1&s=1&e=2`
  - Use `s=1&e=1` or `season=1&episode=1` for season/episode parameters
  - Always include `&tmdb=1` when using a TMDB ID
- **Priority**: Core

### 11.4 VIP Player (Advanced)
- **Description**: Request the VIP player for multi-quality, fast HLS streaming, and subtitles with just one popup ad.
- **Location**: `#view-player`
- **Behavior**:
  - **Movie by IMDB**: `https://multiembed.mov/directstream.php?video_id=tt6791350`
  - **Movie by TMDB**: `https://multiembed.mov/directstream.php?video_id=447365&tmdb=1`
  - **Episode by IMDB**: `https://multiembed.mov/directstream.php?video_id=tt13157618&s=1&e=2`
  - **Episode by TMDB**: `https://multiembed.mov/directstream.php?video_id=114472&tmdb=1&s=1&e=2`
  - If the requested content is not available with VIP player, the normal player is used automatically
- **Priority**: Recommended

### 11.5 VIP Player Availability Check
- **Description**: Check if VIP player is available for a title.
- **Location**: `#view-player` (before loading)
- **Behavior**:
  - Add `&check=1` to the URL: `https://multiembed.mov/directstream.php?video_id=tt6791350&check=1`
  - Returns `0` if not available, `1` if available
  - Use this to decide whether to show VIP or normal player
- **Priority**: Recommended

### 11.6 Custom Subtitles
- **Description**: Add your own subtitles to the player.
- **Location**: `#view-player`
- **Behavior**:
  - Add `&sub_url` and `&sub_label` parameters
  - Subtitles URL must be URL-encoded
  - Custom subtitles appear first in the list and autoplay
  - Example: `https://multiembed.mov/directstream.php?video_id=tt6791350&sub_url=SUBTITLES_URL&sub_label=SUBTITLES_LABEL`
- **Priority**: Advanced

### 11.7 Advanced Server Implementation (PHP)
- **Description**: For servers with PHP and cURL or file_get_contents enabled.
- **Location**: Server-side
- **Behavior**:
  - Download the player PHP file and upload to the website
  - The PHP file calls the multiembed.mov server for a player URL
  - Then redirects to the player URL
  - Enables more control over the player integration
- **Priority**: Advanced

---

## 12. Poster & Image Sources (Free / Open-Source)

### 12.1 TMDB Image API (Recommended)
- **Description**: The Movie Database (TMDB) provides free poster and backdrop images for movies and TV shows.
- **Location**: All content cards, hero banners, movie details
- **Behavior**:
  - Free API key required (sign up at https://www.themoviedb.org/)
  - Poster URL format: `https://image.tmdb.org/t/p/w500/{poster_path}`
  - Backdrop URL format: `https://image.tmdb.org/t/p/w1280/{backdrop_path}`
  - Available sizes: w92, w154, w185, w342, w500, w780, w1280, original
  - Free for non-commercial use with attribution
- **Priority**: Core

### 12.2 OMDb API (Open Movie Database)
- **Description**: Free movie poster API that returns poster URLs from IMDB data.
- **Location**: Movie cards, movie details
- **Behavior**:
  - Free API key from http://www.omdbapi.com/
  - Request: `https://img.omdbapi.com/?apikey={KEY}&i=tt8385148`
  - Returns poster image directly
  - Free tier: 1,000 requests/day
- **Priority**: Recommended

### 12.3 Wikimedia Commons (Public Domain)
- **Description**: Public domain and freely-licensed movie posters from Wikipedia/Wikimedia.
- **Location**: Movie cards, movie details
- **Behavior**:
  - Search: `https://commons.wikimedia.org/w/index.php?search={movie_title}`
  - Free to use with attribution
  - Good for classic and older films
  - No API key required
- **Priority**: Recommended

### 12.4 JustWatch
- **Description**: Free streaming availability and poster data.
- **Location**: Movie cards, movie details
- **Behavior**:
  - Free API access
  - Provides poster URLs and streaming availability
  - Good for "Where to Watch" feature
- **Priority**: Advanced

### 12.5 Picsum Photos (Placeholder Images)
- **Description**: Free placeholder images for development and testing.
- **Location**: Development/testing only
- **Behavior**:
  - URL format: `https://picsum.photos/500/750` (poster size)
  - URL format: `https://picsum.photos/1280/720` (backdrop size)
  - Random images, no API key required
  - Use as fallback when real posters fail to load
- **Priority**: Core (fallback)

### 12.6 Unsplash / Pexels (Free Stock Images)
- **Description**: Free high-quality stock images for hero banners and backgrounds.
- **Location**: Hero banners, backgrounds, empty states
- **Behavior**:
  - Unsplash: `https://source.unsplash.com/1920x1080/?cinema`
  - Pexels: `https://images.pexels.com/photos/{id}/pexels-photo-{id}.jpeg`
  - Free to use, no attribution required for Pexels
  - Good for cinematic backgrounds
- **Priority**: Recommended

### 12.7 Poster Fallback Strategy
- **Description**: Graceful fallback when a poster fails to load.
- **Location**: All image elements
- **Behavior**:
  - Primary: TMDB poster URL
  - Fallback 1: OMDb poster URL
  - Fallback 2: Picsum placeholder
  - Fallback 3: Gradient placeholder with title text
  - Implement via `onerror` handler on `<img>` elements
- **Priority**: Core

---

## 13. Data & Backend (Future / Advanced)

### 13.1 TMDB API Integration
- **Description**: Real movie/TV show data from The Movie Database API.
- **Location**: All content views
- **Behavior**:
  - Real posters, titles, synopses, ratings
  - Real cast & crew data
  - Real trailers and video URLs
  - Trending, Top Rated, Now Playing endpoints
  - Search API for global search
- **Priority**: Advanced

### 13.2 Real Video Streams (HLS/DASH)
- **Description**: Stream real video content.
- **Location**: `#view-player`
- **Behavior**:
  - HLS.js or native HLS support for adaptive streaming
  - DASH support for 4K content
  - DRM support (Widevine, FairPlay) for protected content
  - Bandwidth-adaptive quality switching
- **Priority**: Advanced

### 13.3 Backend with Cloud Sync
- **Description**: Real user accounts with server-side storage.
- **Location**: Global
- **Behavior**:
  - Firebase Auth / Supabase Auth for real authentication
  - Cloud Firestore / PostgreSQL for user data
  - My List, history, and progress sync across devices
  - Real subscription payments (Stripe)
- **Priority**: Advanced

### 13.4 Cross-Device Resume
- **Description**: Resume playback on any device.
- **Location**: `#view-player`
- **Behavior**:
  - Playback position synced to cloud
  - "Continue on this device?" prompt
  - Works across phone, tablet, TV, web
- **Priority**: Advanced

### 13.5 Watch Party
- **Description**: Watch content together with friends.
- **Location**: `#view-player`
- **Behavior**:
  - Create watch party room with invite link
  - Synchronized playback for all participants
  - Chat sidebar during playback
  - Host controls (pause for everyone)
- **Priority**: Advanced

### 13.6 Admin Analytics Dashboard
- **Description**: Content performance analytics.
- **Location**: New admin view
- **Behavior**:
  - Views per title, watch time, completion rate
  - User growth and retention charts
  - Popular genres and search trends
  - Revenue/subscription analytics
- **Priority**: Advanced

---

## 14. Technology Stack

### 14.1 Frontend (Client-Side)
- **Description**: The entire app is built as a single-page application using pure HTML, CSS, and JavaScript.
- **Location**: Global
- **Details**:
  - **HTML5** — Semantic structure for all views
  - **CSS** — Custom styles with the Cinematic Noir design system
  - **Tailwind CSS** — Utility-first CSS framework (loaded via CDN)
  - **JavaScript (Vanilla)** — No framework needed for the current scope
  - **localStorage** — Client-side persistence for My List, progress, settings, and user data
- **Priority**: Core

### 14.2 Why No Framework (Yet)
- **Description**: The current app works perfectly as a vanilla JS SPA.
- **Location**: Global
- **Details**:
  - Zero build step — open `index.html` and it works
  - Zero dependencies to install
  - Perfect for free hosting on Vercel
  - Can migrate to React/Vue later if the app grows
- **Priority**: Core

### 14.3 Optional Frontend Frameworks (Future)
- **Description**: If the app grows beyond the vanilla JS scope, migrate to a framework.
- **Location**: Global
- **Details**:
  - **React + Vite**: Best for complex state management and component reuse
  - **Vue 3 + Vite**: Simpler learning curve, great for SPAs
  - **Svelte + Vite**: Smallest bundle size, fast runtime
  - All work perfectly on Vercel's free tier
- **Priority**: Advanced

### 14.4 External Services (Free Tiers)
- **Description**: All external services used are free or open-source.
- **Location**: Global
- **Details**:
  - **Tailwind CSS** — Free CDN
  - **Google Fonts** (Inter, Sora, Material Symbols) — Free CDN
  - **multiembed.mov** — Free streaming player (iframe embed)
  - **TMDB API** — Free poster/metadata (API key required)
  - **OMDb API** — Free poster/metadata (1,000 req/day free tier)
- **Priority**: Core

---

## 15. Vercel Hosting (Free)

### 15.1 Why Vercel
- **Description**: Vercel provides free hosting for static websites with automatic deployment.
- **Location**: Deployment
- **Details**:
  - Free tier: unlimited static sites, SSL, global CDN
  - Automatic HTTPS certificates
  - Deploy via Git (GitHub/GitLab/Bitbucket)
  - No server needed — perfect for this static app
  - Automatic preview deployments for every change
- **Priority**: Core

### 15.2 Deployment Steps (GitHub + Vercel)
- **Description**: How to deploy the app to Vercel for free.
- **Location**: Deployment
- **Details**:
  1. Create a GitHub repository
  2. Push `index.html`, `EXPLANATION.md`, and `functionality.md` to the repo
  3. Go to https://vercel.com and sign up with GitHub
  4. Click "Add New Project" → import the repository
  5. Framework preset: "Other" (static site)
  6. Build command: (leave empty for static site)
  7. Output directory: (leave empty — root)
  8. Click "Deploy" — done!
  9. Your app is live at `https://your-project.vercel.app`
- **Priority**: Core

### 15.3 Project Structure for Vercel
- **Description**: The exact file structure Vercel will deploy.
- **Location**: Deployment
- **Details**:
  ```
  cinema hub/
  ├── index.html        ← Main app (entry point)
  ├── functionality.md  ← Documentation
  └── EXPLANATION.md    ← Documentation
  ```
  - Vercel automatically serves `index.html` as the entry point
  - No configuration files needed
  - No build step required
- **Priority**: Core

### 15.4 Custom Domain (Optional)
- **Description**: Connect a custom domain to the Vercel deployment.
- **Location**: Deployment
- **Details**:
  - Vercel free tier includes one custom domain
  - Add domain in Vercel dashboard → Settings → Domains
  - Update DNS records at your domain registrar
  - Free SSL certificate issued automatically
- **Priority**: Advanced

### 15.5 Vercel Configuration File (Optional)
- **Description**: Add a `vercel.json` for custom routing/headers.
- **Location**: Project root
- **Details**:
  ```json
  {
    "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
    "headers": [
      {
        "source": "/(.*)",
        "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }]
      }
    ]
  }
  ```
- **Priority**: Advanced

---

## Implementation Roadmap

### Phase 1: Core Functionality (MVP)
1. Real video playback with working controls (play/pause, seek, volume, fullscreen)
2. Resume playback + Continue Watching with localStorage
3. Working My List (add/remove, My List view, persistence)
4. Working global search with results
5. Genre filter chips that filter content
6. Toast notifications
7. Loading skeletons and empty/error states

### Phase 2: User Experience
1. Sign up / Login with localStorage
2. User profile page + logout
3. Upgrade to Pro subscription modal
4. TV Shows season/episode selector
5. Live TV clickable programs + channel favorites
6. Playable trailers on Movie Details
7. Settings panel (playback, account, data management)
8. Notification center dropdown
9. Carousel arrows + keyboard navigation

### Phase 3: Advanced Features
1. Multiple profiles + parental controls
2. User ratings & reviews
3. Picture-in-Picture + playback speed + subtitles
4. Program reminders + real-time Live TV guide
5. Theme toggle (dark/light) + language selection
6. PWA support (installable, offline)
7. Share functionality + downloads (Pro)

### Phase 4: Production / Backend
1. TMDB API for real content data
2. HLS/DASH streaming with DRM
3. Firebase/Supabase backend with cloud sync
4. Cross-device resume
5. Watch party + social features
6. Admin analytics dashboard

---

## Data Model (localStorage Schema)

```javascript
// My List
localStorage.cineglass_myList = [
  { id: "starlight-horizon", type: "movie", title: "Starlight Horizon", addedAt: "2026-08-20T10:00:00Z" }
];

// Watch Progress
localStorage.cineglass_progress = {
  "starlight-horizon": { position: 5050, duration: 8100, updatedAt: "2026-08-20T10:30:00Z" },
  "ascent-s1e1": { position: 120, duration: 2700, updatedAt: "2026-08-20T09:00:00Z" }
};

// Watch History
localStorage.cineglass_history = [
  { id: "starlight-horizon", title: "Starlight Horizon", watchedAt: "2026-08-20T10:30:00Z", completed: false }
];

// User Account
localStorage.cineglass_user = {
  name: "Alex Mercer",
  email: "alex@example.com",
  plan: "pro", // free | pro | premium
  createdAt: "2026-08-01T00:00:00Z"
};

// Settings
localStorage.cineglass_settings = {
  defaultQuality: "auto",
  autoplayNext: true,
  subtitles: "off",
  playbackSpeed: 1,
  theme: "dark",
  language: "en",
  notifications: { newReleases: true, liveReminders: true, recommendations: true }
};

// Channel Favorites
localStorage.cineglass_favoriteChannels = ["hbo-hd", "fx-network"];

// Program Reminders
localStorage.cineglass_reminders = [
  { program: "Dune: Part Two", channel: "HBO HD", startTime: "2026-08-20T21:00:00Z" }
];
```

---

## Summary

This specification defines **80+ functionalities** across **15 categories** that will transform CineGlass from a static UI prototype into a fully functional premium streaming application:

1. **Core Streaming & Playback** — 14 features for a real video player experience
2. **Search & Discovery** — 7 features for finding content
3. **My List & Watch History** — 5 features for saving and tracking
4. **User Accounts & Profiles** — 6 features for authentication and subscriptions
5. **TV Shows & Episodes** — 5 features for series content
6. **Live TV Enhancements** — 5 features for live channel experience
7. **Movie Details Page** — 6 features for rich title pages
8. **Notifications & Alerts** — 4 features for user engagement
9. **Settings & Preferences** — 7 features for user customization
10. **UI/UX Enhancements** — 9 features for polish and usability
11. **Streaming Source Integration (multiembed.mov)** — 7 features for embedding real movies/TV using IMDB/TMDB IDs via iframe or VIP player
12. **Poster & Image Sources (Free / Open-Source)** — 7 features for free poster/backdrop images from TMDB, OMDb, Wikimedia, Picsum, Unsplash, and Pexels
13. **Data & Backend** — 6 features for production-ready backend
14. **Technology Stack** — Pure HTML/CSS/JavaScript SPA with optional React/Vue/Svelte migration path
15. **Vercel Hosting (Free)** — Free static hosting with 5-step deployment guide and optional custom domain

**Recommended Technology Stack:**
- **Frontend**: Pure HTML5 + CSS + Vanilla JavaScript (single-file SPA)
- **Styling**: Tailwind CSS (CDN) + custom Cinematic Noir theme
- **Persistence**: localStorage (no backend needed)
- **Streaming**: multiembed.mov iframe (free)
- **Posters**: TMDB / OMDb API (free keys)
- **Hosting**: Vercel Free Tier (automatic SSL, global CDN, Git-based deploys)

The implementation is phased so that core features (playback, My List, search, streaming integration, free poster sources) can be delivered first, with advanced features (accounts, backend, PWA) added incrementally.

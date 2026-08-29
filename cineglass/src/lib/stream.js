// Playback sources for TMDB titles (movie-/show- ids).
// Primary: VidAPI -> VAPlayer embed (netflix skin, brand red, no title/controls).
// Fallback: NontonGo embed.
// Portal titles (pvod-/pser-) and live channels are resolved elsewhere.
const NONTONGO_BASE = 'https://www.nontongo.win'
const VIDAPI_BASE = 'https://vidapi.ru'
const VAPLAYER_SKIN = 'skin=netflix&color=e50914&title=false&controls=false'

// Primary source — VidAPI 301s to vaplayer.ru with the skin params preserved.
export function buildStreamUrl(content, season, episode) {
  if (!content?.tmdb) return ''
  return content.type === 'show'
    ? `${VIDAPI_BASE}/embed/tv/${content.tmdb}/${season || 1}/${episode || 1}?${VAPLAYER_SKIN}`
    : `${VIDAPI_BASE}/embed/movie/${content.tmdb}?${VAPLAYER_SKIN}`
}

// Fallback source.
export function fallbackStreamUrl(content, season, episode) {
  if (!content?.tmdb) return ''
  return content.type === 'show'
    ? `${NONTONGO_BASE}/embed/tv/${content.tmdb}/${season || 1}/${episode || 1}`
    : `${NONTONGO_BASE}/embed/movie/${content.tmdb}`
}

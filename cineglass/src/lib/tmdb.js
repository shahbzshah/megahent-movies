const TMDB_BASE = 'https://api.themoviedb.org/3'
export const TMDB_IMG = 'https://image.tmdb.org/t/p'

export const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
}

const FETCH_TIMEOUT_MS = 8000

export async function fetchTMDB(endpoint) {
  // Endpoint may carry its own query string (?page=2, ?query=batman). It must
  // be split out: the proxy expects extra params as real GET args, and the
  // direct URL would otherwise end up with two '?' characters.
  const [path, qs] = endpoint.split('?')
  const suffix = qs ? `&${qs}` : ''
  const attempts = [`/api/tmdb?path=${encodeURIComponent(path)}${suffix}`]
  const directKey = import.meta.env.VITE_TMDB_API_KEY
  if (directKey) {
    attempts.push(`${TMDB_BASE}${path}?api_key=${directKey}&language=en-US${suffix}`)
  }
  for (const url of attempts) {
    try {
      // Hard timeout so a hanging proxy can never stall the UI; the loop
      // falls through to the next transport instead.
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
      try {
        const res = await fetch(url, { signal: ctrl.signal })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        return await res.json()
      } finally {
        clearTimeout(timer)
      }
    } catch (e) {
      console.warn('TMDB fetch failed for', url.split('?')[0], ':', e.message)
    }
  }
  return null
}

export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

const round1 = (n) => Math.round(n * 10) / 10

export function mapTmdbItem(m, isTV, opts = {}) {
  const vote = m.vote_average ?? 7
  const genre = GENRE_MAP[m.genre_ids?.[0]] || (isTV ? 'TV Show' : 'Movie')
  return {
    id: `${isTV ? 'show' : 'movie'}-${m.id}`,
    type: isTV ? 'show' : 'movie',
    title: m.title || m.name || 'Untitled',
    year: (m.release_date || m.first_air_date || '').slice(0, 4),
    rating: round1(vote),
    genre,
    match: Math.round(vote * 10),
    poster: m.poster_path ? `${TMDB_IMG}/w500${m.poster_path}` : 'https://picsum.photos/500/750',
    banner: m.backdrop_path
      ? `${TMDB_IMG}/w1280${m.backdrop_path}`
      : m.poster_path
        ? `${TMDB_IMG}/w500${m.poster_path}`
        : 'https://picsum.photos/1280/720',
    desc: m.overview || 'No description available.',
    tmdb: m.id,
    ...opts,
  }
}

const LIBRARY_SOURCES = [
  { endpoint: '/trending/movie/week', pages: 3, isTV: false, isNew: true },
  { endpoint: '/movie/popular', pages: 5, isTV: false },
  { endpoint: '/movie/top_rated', pages: 5, isTV: false },
  { endpoint: '/movie/now_playing', pages: 3, isTV: false },
  { endpoint: '/trending/tv/week', pages: 3, isTV: true, isNew: true },
  { endpoint: '/tv/popular', pages: 5, isTV: true },
  { endpoint: '/tv/top_rated', pages: 5, isTV: true },
  { endpoint: '/tv/on_the_air', pages: 3, isTV: true },
]

export async function loadLibrary() {
  const jobs = []
  for (const src of LIBRARY_SOURCES) {
    for (let p = 1; p <= src.pages; p++) {
      jobs.push({ ...src, page: p })
    }
  }
  const results = await mapLimit(jobs, 8, async (job) => {
    const res = await fetchTMDB(`${job.endpoint}?page=${job.page}`)
    return (res?.results || []).map((m) =>
      mapTmdbItem(m, job.isTV, { isNew: Boolean(job.isNew), quality: '4K UHD' }),
    )
  })
  const map = new Map()
  for (const list of results.flat()) {
    if (list?.id) map.set(list.id, list)
  }
  return [...map.values()]
}

export async function fetchDetailsExtras(item) {
  if (!item.tmdb) return { cast: [], trailers: [], similarItems: [], meta: null }
  const type = item.type === 'show' ? 'tv' : 'movie'
  const [detail, credits, videos, similarRes, recRes] = await Promise.all([
    fetchTMDB(`/${type}/${item.tmdb}`),
    fetchTMDB(`/${type}/${item.tmdb}/credits`),
    fetchTMDB(`/${type}/${item.tmdb}/videos?include_video_language=en,null`),
    fetchTMDB(`/${type}/${item.tmdb}/similar`),
    fetchTMDB(`/${type}/${item.tmdb}/recommendations`),
  ])
  let meta = null
  if (detail) {
    meta =
      type === 'tv'
        ? { id: item.id, seasons: detail.number_of_seasons || 1 }
        : {
            id: item.id,
            duration: detail.runtime
              ? `${Math.floor(detail.runtime / 60)}h ${detail.runtime % 60}m`
              : undefined,
          }
  }
  const cast = (credits?.cast || []).slice(0, 8).map((a) => ({
    name: a.name,
    character: a.character || '',
    photo: a.profile_path ? `${TMDB_IMG}/w185${a.profile_path}` : 'https://picsum.photos/128/128',
  }))
  // Best-trailer-first ordering: Official Trailer beats Trailer beats Teaser,
  // then official flags and recency break ties. include_video_language=en,null
  // pulls English + untagged videos so non-English titles still get trailers.
  const typeRank = { Trailer: 0, Teaser: 1, Clip: 2, 'Behind the Scenes': 3, Featurette: 4 }
  const rawVideos = (videos?.results || []).filter((v) => v.site === 'YouTube' && v.type !== 'Opening Credits')
  rawVideos.sort((a, b) => {
    const ta = typeRank[a.type] ?? 9
    const tb = typeRank[b.type] ?? 9
    if (ta !== tb) return ta - tb
    const oa = (a.official ? 1 : 0) + (a.name || '').toLowerCase().includes('official')
    const ob = (b.official ? 1 : 0) + (b.name || '').toLowerCase().includes('official')
    if (oa !== ob) return ob - oa
    return new Date(b.published_at || 0) - new Date(a.published_at || 0)
  })
  const trailers = rawVideos.slice(0, 1).map((v) => ({ key: v.key, name: v.name }))
  const simResults = similarRes?.results || []
  const raw = simResults.length ? simResults : recRes?.results || []
  const similarItems = raw.slice(0, 12).map((m) => mapTmdbItem(m, type === 'tv'))
  return { cast, trailers, similarItems, meta }
}

// Full-catalogue search across movies and TV. Person results are dropped —
// there is no cast page to land on. Returns null when TMDB is unreachable so
// callers can fall back to the locally loaded library.
const SEARCH_CACHE_LIMIT = 60
const searchCache = new Map()

export async function searchTMDB(query) {
  const key = query.trim().toLowerCase()
  if (!key) return []
  if (searchCache.has(key)) {
    // Refresh LRU position so the hottest queries survive eviction.
    const hit = searchCache.get(key)
    searchCache.delete(key)
    searchCache.set(key, hit)
    return hit
  }
  const res = await fetchTMDB(
    `/search/multi?query=${encodeURIComponent(key)}&include_adult=false`,
  )
  if (!res?.results) return null
  const mapped = res.results
    .filter((m) => m.media_type === 'movie' || m.media_type === 'tv')
    .slice(0, 8)
    .map((m) => mapTmdbItem(m, m.media_type === 'tv'))
  searchCache.set(key, mapped)
  if (searchCache.size > SEARCH_CACHE_LIMIT) {
    searchCache.delete(searchCache.keys().next().value)
  }
  return mapped
}

// One page of the full TMDB catalogue, most popular first. Used to extend
// browsing far beyond the seeded trending rows (discover exposes ~10k titles
// per query vs the handful of curated lists the library starts with).
export async function fetchDiscoverPage(mediaType, page) {
  const res = await fetchTMDB(
    `/discover/${mediaType}?sort_by=popularity.desc&include_adult=false&include_video=false&page=${page}`,
  )
  if (!res?.results) return null
  return {
    items: res.results.map((m) => mapTmdbItem(m, mediaType === 'tv')),
    totalPages: res.total_pages || 1,
  }
}

export async function fetchSimilar(item) {
  if (!item.tmdb) return []
  const type = item.type === 'show' ? 'tv' : 'movie'
  const [simRes, recRes] = await Promise.all([
    fetchTMDB(`/${type}/${item.tmdb}/similar`),
    fetchTMDB(`/${type}/${item.tmdb}/recommendations`),
  ])
  const raw = simRes?.results?.length ? simRes.results : recRes?.results || []
  return raw.slice(0, 12).map((m) => mapTmdbItem(m, type === 'tv'))
}

export async function fetchShowSeasons(tmdbId) {
  const detail = await fetchTMDB(`/tv/${tmdbId}`)
  return (detail?.seasons || []).filter((s) => s.season_number > 0)
}

export async function fetchSeasonEpisodes(tmdbId, seasonNum) {
  return fetchTMDB(`/tv/${tmdbId}/season/${seasonNum}`)
}

export function newestFirst(arr) {
  return [...arr].sort(
    (a, b) => (b.year || 0) - (a.year || 0) || (b.rating || 0) - (a.rating || 0),
  )
}

export function matchPercent(item) {
  return item.match ?? Math.round((item.rating || 0) * 10)
}

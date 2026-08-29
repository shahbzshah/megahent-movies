const PREFIX = 'cineglass_'

function safeParse(raw, fallback) {
  try {
    const v = JSON.parse(raw)
    return v ?? fallback
  } catch {
    return fallback
  }
}

export function loadMyList() {
  return safeParse(localStorage.getItem(`${PREFIX}myList`), [])
}

export function saveMyList(list) {
  localStorage.setItem(`${PREFIX}myList`, JSON.stringify(list))
}

// Divergence from PRD section 5: the prototype stores { percent } because the
// multiembed iframe exposes no playback events; PRD's { position, duration }
// assumed an HTML5 player. Shape kept as { percent, updatedAt }.
export function loadProgress() {
  return safeParse(localStorage.getItem(`${PREFIX}progress`), {})
}

export function saveProgress(progress) {
  localStorage.setItem(`${PREFIX}progress`, JSON.stringify(progress))
}

export function loadUser() {
  return safeParse(localStorage.getItem(`${PREFIX}user`), null)
}

export function saveUser(user) {
  if (user) localStorage.setItem(`${PREFIX}user`, JSON.stringify(user))
  else localStorage.removeItem(`${PREFIX}user`)
}

export const DEFAULT_SETTINGS = {
  quality: 'Auto',
  autoplay: true,
  subtitles: 'Off',
  portalUrl: '',
  portalUser: '',
  portalPass: '',
  englishOnly: true,
}

export function loadSettings() {
  return { ...DEFAULT_SETTINGS, ...safeParse(localStorage.getItem(`${PREFIX}settings`), {}) }
}

export function saveSettings(settings) {
  localStorage.setItem(`${PREFIX}settings`, JSON.stringify(settings))
}

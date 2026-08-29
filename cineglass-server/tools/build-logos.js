// Build a DaddyLive channel-name -> logo URL map from the iptv-org dataset.
const fs = require('fs')

const logos = JSON.parse(fs.readFileSync(process.env.TEMP + '\\iptv_logos.json', 'utf8'))
const channels = JSON.parse(fs.readFileSync(process.env.TEMP + '\\iptv_channels.json', 'utf8'))
const dlRaw = JSON.parse(fs.readFileSync(process.env.TEMP + '\\daddylive_channels.json', 'utf8'))
const daddylive = Array.isArray(dlRaw) ? { channels: dlRaw } : dlRaw

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')                       // "(Fusball TV 1)" gone
    .replace(/^#+/, ' ')                              // "#Vamos"
    // strip leading country tokens: "UK:", "US |", "CA-", etc.
    .replace(/^[\s(|]*(uk|us|usa|ca|au|nz|de|fr|es|it|pt|eu|ar|tr|in|pk|nl|be|se|no|dk|ro|gr|int|world|multi)[\s|:\-)\]]*/i, '')
    .replace(/\b(fhd|uhd|4k|8k|hd|sd|hq|hifi)\b/g, ' ')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const GENERIC = new Set(['tv', 'channel', 'channels', 'plus', 'one', 'two', 'hd', 'the', 'and', 'of', 'live'])
const isGenericish = (tokens) => tokens.every((t) => GENERIC.has(t) || t.length < 3)

// channel id -> normalized name(s)
const idToNames = new Map()
for (const c of channels) {
  const names = [c.name, ...(c.alt_names || [])].map(norm).filter(Boolean)
  idToNames.set(c.id, names)
}

// normalized name -> best logo (prefer PNG, then largest width)
const nameToLogo = new Map()
const addToIndex = (n, entry) => {
  const existing = nameToLogo.get(n)
  const score = (e) => (e.format === 'PNG' ? 10000 : 0) + (e.width || 0)
  if (!existing || score(entry) > score(existing)) nameToLogo.set(n, entry.url)
}
for (const l of logos) {
  if (!l.url || !l.channel) continue
  const names = idToNames.get(l.channel) || []
  for (const n of names) addToIndex(n, l)
}

// match DaddyLive names — multiple passes, first hit wins
const COUNTRY = new Set(['uk','us','usa','ca','au','nz','de','fr','es','it','pt','eu','ar','tr','in','pk','nl','be','se','no','dk','ro','gr','int','world','multi'])
const out = {}
let matched = 0
const unmatched = []
for (const ch of daddylive.channels || []) {
  const n = norm(ch.channel_name)
  let tokens = n.split(' ').filter(Boolean)
  const url = (() => {
    // pass 1: exact
    let hit = nameToLogo.get(n)
    if (hit) return hit
    // pass 2: drop trailing country token ("dave uk" -> "dave")
    if (tokens.length > 1 && COUNTRY.has(tokens[tokens.length - 1])) {
      hit = nameToLogo.get(tokens.slice(0, -1).join(' '))
      if (hit) return hit
    }
    // pass 3: reverse containment — indexed name fully inside daddylive name
    if (!isGenericish(tokens)) {
      let best = null, bestLen = Infinity
      for (const [indexed, u] of nameToLogo) {
        const iTokens = indexed.split(' ')
        if (isGenericish(iTokens)) continue
        if (iTokens.length < bestLen && iTokens.every((t) => tokens.includes(t))) {
          best = u; bestLen = iTokens.length
        }
      }
      if (best) return best
    }
    // pass 4: forward containment — daddylive core tokens inside indexed name
    const core = tokens.filter((t) => !GENERIC.has(t) && !COUNTRY.has(t) && t.length >= 3)
    if (core.length && !isGenericish(core)) {
      for (const [indexed, u] of nameToLogo) {
        const iTokens = indexed.split(' ')
        if (core.every((t) => iTokens.includes(t))) return u
      }
    }
    return null
  })()
  if (url) { out[ch.channel_name] = url; matched++ }
  else unmatched.push(ch.channel_name)
}

const dest = 'C:\\Users\\User\\AppData\\Local\\Temp\\opencode\\deploy-staging\\daddylive-logos.json'
fs.writeFileSync(dest, JSON.stringify(out))
console.log('matched:', matched, '/', (daddylive.channels || []).length)
console.log('sample unmatched:', unmatched.slice(0, 8).join(' | '))
console.log('sample matched:')
for (const k of Object.keys(out).slice(0, 6)) console.log(' ', k, '->', out[k].slice(0, 70))

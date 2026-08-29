/**
 * Deep-scan core: per-provider verdicts from a real headless browser.
 * true = plays, false = provider says missing, null = unknown (blocked/down).
 */
const { chromium } = require('playwright')

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

function urlsFor(id, type, season, episode) {
  return {
    vidlink: type === 'tv' ? `https://vidlink.pro/tv/${id}/${season}/${episode}` : `https://vidlink.pro/movie/${id}`,
    vidsrc: type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${season}-${episode}` : `https://vidsrc.to/embed/movie/${id}`,
    multiembed: type === 'tv' ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}` : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  }
}

const NEGATIVE_TEXT = [
  'could not find', "couldn't find", 'cannot find', 'not found',
  'no sources', 'no video', 'unavailable', 'does not exist',
  'content is not available', 'title not available',
]

async function judge(scope) {
  const body = (await scope.textContent('body').catch(() => '')) || ''
  const low = body.toLowerCase()
  const hasNegative = NEGATIVE_TEXT.some((t) => low.includes(t))
  const hasPlayer =
    (await scope.locator('video').count().catch(() => 0)) > 0 ||
    (await scope.locator('iframe[src*="player"], iframe[src*="embed"], iframe[src*="vsembed"], iframe[src*="multiembed"]').count().catch(() => 0)) > 0 ||
    (await scope.evaluate(() => !!(window.jwplayer || window.videojs || window.Plyr)).catch(() => false))
  const hasStreamSignals =
    low.includes('.m3u8') || low.includes('/playlist.json') || low.includes('jwplayer') ||
    (await scope.evaluate(() => Array.from(document.scripts).some((s) => /hls|m3u8|playlist\.json/i.test(s.src || ''))).catch(() => false))

  if (hasNegative && !hasStreamSignals && !hasPlayer) return false
  if (hasPlayer || hasStreamSignals) return true
  if (hasNegative) return false
  return null
}

async function check(browser, url, referer, waitMs) {
  const page = await browser.newPage({ userAgent: UA })
  try {
    await page.addInitScript(() => {
      window.open = () => null
      document.addEventListener('click', (e) => e.preventDefault(), true)
    })
    await page.goto(url, { referer, waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(waitMs)
    const frame = page.frames().find((f) => /vsembed|multiembed|player/.test(f.url()))
    const verdict = frame ? await judge(frame) : await judge(page)
    return verdict
  } catch {
    return null
  } finally {
    await page.close().catch(() => {})
  }
}

async function deepScan(id, type, season = 1, episode = 1) {
  const browser = await chromium.launch({ headless: true })
  try {
    const targets = urlsFor(id, type, season, episode)
    return {
      vidlink: await check(browser, targets.vidlink, 'https://vidlink.pro/', 6000),
      vidsrc: await check(browser, targets.vidsrc, 'https://vidsrc.to/', 12000),
      multiembed: await check(browser, targets.multiembed, 'https://multiembed.mov/', 15000),
    }
  } finally {
    await browser.close().catch(() => {})
  }
}

module.exports = { deepScan }

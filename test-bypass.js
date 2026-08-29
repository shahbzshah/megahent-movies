const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

async function getDaddyUrl() {
  // Scrape the chain with curl (proven to work) to get the current thatframe URL
  const tmp = require('os').tmpdir();
  const jar = tmp + '\\cj_test.txt';
  execSync(`curl.exe -s -A "${UA}" -e "https://nontongo.win/livetv/play-movie.php?id=269" "https://dlstreams.st/stream/stream-269.php" -o "${tmp}\\s.html"`, { timeout: 30000 });
  const html = fs.readFileSync(tmp + '\\s.html', 'utf8');
  const m = html.match(/<iframe[^>]*src="([^"]+)"[^>]*id="thatframe"/);
  return m ? m[1] : null;
}

(async () => {
  const daddy = await getDaddyUrl();
  console.log('daddy5 url:', daddy);
  if (!daddy) process.exit(1);

  // extract the m3u8 from the daddy page via curl too
  execSync(`curl.exe -s -A "${UA}" -e "https://dlstreams.st/stream/stream-269.php" "${daddy}" -o "${tmp}\\d.html"`, { timeout: 30000 });
  const dhtml = fs.readFileSync(tmp + '\\d.html', 'utf8');
  const atob = dhtml.match(/atob\('([^']+)'\)/);
  const m3u8 = Buffer.from(atob[1], 'base64').toString('utf8');
  console.log('m3u8 url:', m3u8);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ userAgent: UA });
  const page = await ctx.newPage();

  // Test 1: open a page AT the daddy5 origin (the replacement-player scenario)
  await page.goto(daddy, { timeout: 30000, waitUntil: 'domcontentloaded' });
  const status1 = await page.evaluate(async (u) => {
    try { const r = await fetch(u); return r.status; } catch (e) { return 'ERR ' + e.message; }
  }, m3u8);
  console.log('fetch from daddy5-origin page ->', status1);

  // Test 2: <video> style media request (no-cors) — see if the segment host responds at all
  const status2 = await page.evaluate(async (u) => {
    try { const r = await fetch(u, { mode: 'no-cors' }); return 'no-cors ' + r.status + ' ' + r.type; } catch (e) { return 'ERR ' + e.message; }
  }, m3u8);
  console.log('no-cors fetch ->', status2);

  // Test 3: actually load it in a <video> element and see if it errors
  const videoResult = await page.evaluate(async (u) => {
    return new Promise((resolve) => {
      const v = document.createElement('video');
      v.muted = true; v.autoplay = true;
      const done = (r) => resolve(r);
      v.addEventListener('loadeddata', () => done('VIDEO LOADED OK'));
      v.addEventListener('error', () => done('VIDEO ERROR ' + (v.error ? v.error.code : '?')));
      v.src = u;
      setTimeout(() => done('TIMEOUT (10s) — readyState=' + v.readyState), 10000);
    });
  }, m3u8);
  console.log('<video> playback ->', videoResult);

  await browser.close();
})();

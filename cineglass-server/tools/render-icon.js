const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 600, height: 600 } })
  await page.goto('file:///' + path.resolve(__dirname, 'icon.html').replace(/\\/g, '/'))
  await page.waitForTimeout(500)
  const out = 'C:\\xampp\\htdocs\\code\\iptv\\cinema hub\\cineglass-desktop\\build'
  fs.mkdirSync(out, { recursive: true })
  await page.locator('#logo').screenshot({ path: path.join(out, 'icon.png') })
  await browser.close()
  console.log('icon written')
})()

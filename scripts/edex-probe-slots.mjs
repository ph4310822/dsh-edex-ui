import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('pageerror', err => console.log('PAGE-ERR:', String(err).slice(0, 200)))
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(6000)
const slots = await page.evaluate(() => {
  const hosts = [...document.querySelectorAll('[data-slot]')].map(el => el.getAttribute('data-slot'))
  return hosts
})
console.log('SLOTS:', JSON.stringify(slots))
await browser.close()

import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(7000)
const info = await page.evaluate(() => {
  const convHost = document.querySelector('[data-slot="conversation"]')
  // Walk to leaf text-bearing elements with meaningful content
  const seen = new Set()
  const sizes = []
  const walk = (el) => {
    if (el.nodeType !== 1) return
    const text = (el.textContent || '').trim()
    if (text.length > 25 && !el.querySelector('*')) {
      const cs = getComputedStyle(el)
      const key = cs.fontSize + '|' + cs.fontFamily.slice(0, 30)
      if (!seen.has(key)) { seen.add(key); sizes.push({ tag: el.tagName, fs: cs.fontSize, ff: cs.fontFamily.slice(0, 36), sample: text.slice(0, 30) }) }
    }
    for (const c of el.children) walk(c)
  }
  if (convHost) walk(convHost)
  return { leafSizes: sizes.slice(0, 8) }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

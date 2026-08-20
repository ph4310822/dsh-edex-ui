import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(7000)
// expand the collapsed sidebar if needed
await page.evaluate(() => {
  const toggle = document.querySelector('[data-slot="sidebar"] button[aria-label="Open sidebar"]')
  toggle?.click()
})
await page.waitForTimeout(1200)
const info = await page.evaluate(() => {
  const treeitems = [...document.querySelectorAll('[data-slot="sidebar.workspaces"] [role="treeitem"]')]
  const sizes = new Map()
  for (const el of treeitems) {
    const fs = getComputedStyle(el).fontSize
    sizes.set(fs, (sizes.get(fs) || 0) + 1)
  }
  const conv = document.querySelector('[data-slot="conversation"]')
  const textNodes = []
  const walk = (el) => {
    for (const child of el.children) {
      const text = (child.textContent || '').trim()
      if (child.children.length === 0 && text.length > 8) {
        textNodes.push({ tag: child.tagName, fs: getComputedStyle(child).fontSize, ff: getComputedStyle(child).fontFamily.slice(0, 40), sample: text.slice(0, 40) })
      }
      walk(child)
    }
  }
  if (conv) walk(conv)
  const bodyFs = getComputedStyle(document.body).fontSize
  return {
    bodyFont: bodyFs,
    treeitemCount: treeitems.length,
    treeitemFonts: Object.fromEntries(sizes),
    treeitemSample: treeitems[0] ? (treeitems[0].textContent || '').trim().slice(0, 30) : null,
    conversationText: textNodes.slice(0, 6),
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

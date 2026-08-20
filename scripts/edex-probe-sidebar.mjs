import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('pageerror', err => console.log('PAGE-ERR:', String(err).slice(0, 300)))
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(6000)
const info = await page.evaluate(() => {
  const frame = document.querySelector('[data-shell-overlay]')?.parentElement
  const sidebarCol = frame?.firstElementChild
  const root = sidebarCol?.firstElementChild
  const dump = (el, depth) => {
    if (!el || depth > 3) return []
    const out = []
    const tag = el.tagName.toLowerCase()
    const cls = (el.getAttribute('class') || '').split(' ').slice(0, 2).join('.')
    const attrs = [...el.attributes].filter(a => a.name.startsWith('data-') || a.name === 'role' || a.name === 'aria-label').map(a => `${a.name}="${String(a.value).slice(0, 24)}"`).join(' ')
    const label = attrs ? ` ${attrs}` : ''
    const clsStr = cls ? `.${cls}` : ''
    out.push(`${'  '.repeat(depth)}<${tag}${clsStr}${label}>`)
    for (const child of el.children) out.push(...dump(child, depth + 1))
    return out
  }
  return {
    sidebarRootTag: root ? { tag: root.tagName, cls: (root.getAttribute('class') || '').slice(0, 60) } : null,
    tree: dump(root, 0).slice(0, 60),
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 250)) })
page.on('pageerror', err => errors.push('PAGE-ERR: ' + String(err).slice(0, 300)))
await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(8000)
await page.evaluate(() => document.querySelector('[data-slot="sidebar"] button[aria-label="Open sidebar"]')?.click())
await page.waitForTimeout(1000)
const info = await page.evaluate(() => {
  const treeitems = [...document.querySelectorAll('[data-slot="sidebar.workspaces"] [role="treeitem"]')]
  const prompt = document.querySelector('[data-edex-prompt]')
  const promptBefore = prompt ? getComputedStyle(prompt).fontSize + ' / ' + getComputedStyle(prompt).fontFamily.slice(0, 30) : null
  return {
    treeitemFonts: [...new Set(treeitems.map(el => getComputedStyle(el).fontSize))],
    treeitemSample: treeitems[0] ? (treeitems[0].textContent || '').trim().slice(0, 30) : null,
    promptText: prompt ? (prompt.textContent || '').slice(0, 60) : null,
    promptDisplay: prompt ? getComputedStyle(prompt).display : null,
    promptStyle: promptBefore,
    hasShell: !!document.querySelector('[data-edex-shell]'),
  }
})
console.log('INFO', JSON.stringify(info, null, 1))
if (errors.length) console.log('ERRORS:', errors.join('\n'))
await page.screenshot({ path: '/Users/daniel/workspace/dsh-edex-ui/probe-shot.png' })
await browser.close()

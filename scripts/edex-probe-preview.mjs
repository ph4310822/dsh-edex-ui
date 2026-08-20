import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errors = []
page.on('console', msg => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text().slice(0, 300)) })
page.on('pageerror', err => errors.push('PAGE-ERR: ' + String(err).slice(0, 400)))
await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(7000)
const base = await page.evaluate(() => {
  const shell = document.querySelector('[data-edex-shell]')
  const preview = document.querySelector('[data-testid="edex-preview-pane"]')
  const entries = [...document.querySelectorAll('[data-testid="edex-fs-entry"]')].map(b => b.textContent || '')
  return {
    hasShell: !!shell,
    hasPreviewPane: !!preview,
    previewText: preview ? (preview.textContent || '').replace(/\s+/g, ' ').slice(0, 50) : null,
    fsEntries: entries.slice(0, 10),
    fileEntries: entries.filter(n => !n.includes('▣')).slice(0, 5),
  }
})
console.log('BASE', JSON.stringify(base, null, 1))
if (errors.length) console.log('ERRORS:', errors.join('\n'))

// Click a file entry and check the preview pane updates.
const result = await page.evaluate(async () => {
  const cell = [...document.querySelectorAll('[data-testid="edex-fs-entry"]')]
    .find(b => (b.textContent || '').includes('▤'))
  if (!cell) return { clicked: false }
  cell.click()
  await new Promise(r => setTimeout(r, 2500))
  const preview = document.querySelector('[data-testid="edex-preview-pane"]')
  const selected = document.querySelector('[data-testid="edex-fs-entry"][data-selected]')
  return {
    clicked: true,
    clickedName: (cell.textContent || '').replace('▤', '').trim(),
    selectedName: selected ? (selected.textContent || '').replace('▤', '').trim() : null,
    previewText: preview ? (preview.textContent || '').replace(/\s+/g, ' ').slice(0, 120) : null,
    previewKind: preview ? (preview.querySelector('pre') ? 'text' : preview.querySelector('img') ? 'image' : preview.querySelector('video') ? 'video' : 'other') : null,
  }
})
console.log('CLICK', JSON.stringify(result, null, 1))
if (errors.length) console.log('ERRORS AFTER CLICK:', errors.join('\n'))
await page.screenshot({ path: '/Users/daniel/workspace/dsh-edex-ui/probe-shot.png' })
await browser.close()

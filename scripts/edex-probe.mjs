import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE-ERR:', msg.text().slice(0, 200)) })
page.on('pageerror', err => console.log('PAGE-ERR:', String(err).slice(0, 300)))
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(6000)
const info = await page.evaluate(() => {
  const shell = document.querySelector('[data-edex-shell]')
  const card = document.querySelector('[data-composer-card]')
  const ta = document.querySelector('textarea[data-phase]')
  const backdrop = document.querySelector('[data-input-backdrop]')
  const mirror = document.querySelector('[data-input-mirror]')
  const frame = document.querySelector('[data-shell-overlay]')?.parentElement
  const cs = (el) => el ? { font: getComputedStyle(el).fontFamily, color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, pos: getComputedStyle(el).position, caret: getComputedStyle(el).caretColor, caretShape: getComputedStyle(el).caretShape } : null
  return {
    hasShell: !!shell,
    hasCard: !!card,
    hasTextarea: !!ta,
    textarea: cs(ta),
    backdrop: cs(backdrop),
    mirror: cs(mirror),
    frameStyle: frame ? { pos: getComputedStyle(frame).position, left: getComputedStyle(frame).left, right: getComputedStyle(frame).right, bottom: getComputedStyle(frame).bottom, bg: getComputedStyle(frame).backgroundColor } : null,
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyTokens: { bgBase: getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-base'), label: getComputedStyle(document.body).getPropertyValue('--dsw-alias-label-primary') },
  }
})
console.log('INFO', JSON.stringify(info, null, 1))
await page.screenshot({ path: '/Users/daniel/workspace/dsh-edex-ui/probe-shot.png' })
await browser.close()

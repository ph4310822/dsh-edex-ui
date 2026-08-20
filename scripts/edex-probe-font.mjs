import { chromium } from '/Users/daniel/workspace/deepseek-harness/node_modules/.pnpm/playwright@1.61.1/node_modules/playwright/index.mjs'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
await page.goto('http://127.0.0.1:3083/', { waitUntil: 'domcontentloaded', timeout: 30000 })
await page.waitForTimeout(7000)
const info = await page.evaluate(() => {
  const ta = document.querySelector('textarea[data-phase]')
  const backdrop = document.querySelector('[data-input-backdrop]')
  const card = document.querySelector('[data-composer-card]')
  const convScroll = document.querySelector('[data-conversation-scroll]')
  // a text node in the chat: find elements with role/text under the conversation
  const convHost = document.querySelector('[data-slot="conversation"]')
  const texts = convHost ? [...convHost.querySelectorAll('p, div')].filter(el => (el.textContent || '').trim().length > 30).slice(0, 6).map(el => ({ tag: el.tagName, fs: getComputedStyle(el).fontSize, ff: getComputedStyle(el).fontFamily.slice(0, 40), cls: (el.getAttribute('class')||'').slice(0,40) })) : []
  const cs = (el) => el ? { fs: getComputedStyle(el).fontSize, ff: getComputedStyle(el).fontFamily.slice(0, 40), lh: getComputedStyle(el).lineHeight } : null
  return {
    textarea: cs(ta),
    backdrop: cs(backdrop),
    card: cs(card),
    convScroll: convScroll ? { fs: getComputedStyle(convScroll).fontSize } : null,
    messageSamples: texts,
  }
})
console.log(JSON.stringify(info, null, 1))
await browser.close()

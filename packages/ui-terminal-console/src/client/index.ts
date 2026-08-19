/**
 * Terminal-console plugin, browser half: injects a terminal-style
 * stylesheet for the composer input.
 */

/** Global stylesheet that gives the conversation composer a terminal look. */
const TERMINAL_INPUT_CSS = `
[data-composer-card] {
  font-family: var(--ds-font-family-code, 'SF Mono', 'JetBrains Mono', Consolas, Menlo, monospace) !important;
  border: 1px solid var(--dsw-alias-border-l1, currentColor) !important;
  border-radius: 0 !important;
  background: var(--dsw-alias-bg-layer-1, #000) !important;
}
[data-composer-card] textarea {
  font-family: inherit !important;
  color: var(--dsw-alias-label-primary, currentColor) !important;
  caret-color: var(--dsw-alias-brand-primary, currentColor) !important;
  padding-left: 26px !important;
}
[data-input-scroll] {
  position: relative !important;
}
[data-input-scroll]::before {
  content: '$ ';
  position: absolute;
  left: 10px;
  top: 10px;
  color: var(--dsw-alias-label-secondary, currentColor);
  font-family: var(--ds-font-family-code, 'SF Mono', 'JetBrains Mono', Consolas, Menlo, monospace);
  font-size: 13px;
  line-height: 20px;
  pointer-events: none;
  z-index: 1;
}
`

/**
 * Client plugin body: inject the terminal input stylesheet.
 */
export function apply(): void {
  // Terminal-style composer: a global stylesheet over the stable composer DOM
  // hooks (data-composer-card / data-input-scroll).
  const style = document.createElement('style')
  style.dataset.plugin = 'ui-terminal-console'
  style.textContent = TERMINAL_INPUT_CSS
  document.head.appendChild(style)
}

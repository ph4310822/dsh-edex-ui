/**
 * Terminal theme plugin, browser half: registers the CRT `terminal` theme with
 * the theme service (alias-token overrides over the dark base palette) and
 * contributes one Appearance row that activates it. Purely additive — the
 * default surface is untouched, so every existing slot/widget keeps working
 * and picks up the palette automatically.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ThemeTokens } from '@deepseek-ai/dsh-client-ui-theme/client'
// Type-only: pulls the theme plugin's Context merge (ctx.theme) into this compilation.
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import { NS, zh, en } from './locales.ts'
import { TerminalThemeRow, type TerminalThemeRowInjected } from './TerminalThemeRow.tsx'

/** Theme id this plugin registers (the setTheme argument). */
export const THEME_ID = 'terminal'

/** Bare observable snapshot source (getSnapshot + subscribe). */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/**
 * CRT palette as alias-token overrides. The presenter writes these as inline
 * CSS variables over the dark base palette, so the whole default UI (and any
 * widget registered into its slots) is recolored.
 */
const TOKENS: ThemeTokens = {
  '--dsw-alias-bg-base': '#000a00',
  '--dsw-alias-bg-layer-1': '#02120a',
  '--dsw-alias-bg-layer-2': '#031d10',
  '--dsw-alias-bg-overlay': '#000a00',
  '--dsw-alias-border-l1': '#1d7a3f',
  '--dsw-alias-border-l2': '#2ea854',
  '--dsw-alias-brand-primary': '#35e06a',
  '--dsw-alias-label-primary': '#35e06a',
  '--dsw-alias-label-secondary': '#2ea854',
  '--dsw-alias-state-error-primary': '#e05a5a',
  '--dsw-alias-state-success-primary': '#35e06a',
  '--dsw-alias-state-warn-primary': '#e0c05a',
  '--dsw-specific-sidebar-fill': '#001408',
}

/** Required services: slot registry for the Appearance row, the theme service, and locale. */
export const inject = ['slots', 'theme', 'locale']

/**
 * Client plugin body: register the terminal theme and the Appearance row that
 * selects it.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-theme-terminal: dictionaries')

  const disposeTheme = ctx.theme.register({ id: THEME_ID, colorScheme: 'dark', tokens: TOKENS })
  ctx.effect(() => () => void disposeTheme(), 'ui-theme-terminal: theme registration')

  // "Is the terminal theme active" source for the row's hook seat; re-reads
  // the active theme on every theme/change and is disposable with the fiber.
  const terminalActiveSource: ObservableSource<boolean> = {
    getSnapshot: () => ctx.theme.getTheme().active.id === THEME_ID,
    subscribe: (listener) => ctx.on('theme/change', () => listener()),
  }

  // The built-in Appearance row occupies settings.general.item at order 10;
  // this row joins it (list slot, additive) at order 11.
  ctx.slots.inject('settings.general.item', () => ctx.slots.register({
    name: 'settings.general.item',
    id: 'appearance-terminal',
    order: 11,
    locale: NS,
    inject: (): TerminalThemeRowInjected => ({
      setTerminal: () => { ctx.theme.setTheme(THEME_ID) },
      hooks: { terminalActive: terminalActiveSource },
    }),
  }, TerminalThemeRow))
}

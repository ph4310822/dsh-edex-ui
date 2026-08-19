/**
 * Appearance row that activates the terminal theme. Mirrors the built-in
 * Appearance row's shape: one settings.general.item entry with a toggle that
 * calls theme.setTheme('terminal'); the active state rides the theme/change
 * hook seat.
 */
import type { InjectFace, PropsLocale, TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ThemeTerminalKey } from './locales.ts'
import type { ObservableSource } from './index.ts'
import css from './TerminalThemeRow.module.css'

/** The row's inject face: the setter plus the active-state hook source. */
export interface TerminalThemeRowInjected {
  /** Activate the terminal theme (theme.setTheme('terminal')). */
  setTerminal: () => void
  /** Bare observable "terminal theme is active" source bound to useTerminalActive. */
  hooks: { terminalActive: ObservableSource<boolean> }
}

/** Full composed props of the row. */
export type TerminalThemeRowProps =
  & PropsLocale<'theme-terminal'>
  & InjectFace<TerminalThemeRowInjected>

/** The Appearance row: label + toggle. */
export function TerminalThemeRow({
  useTerminalActive, setTerminal, t,
}: TerminalThemeRowProps) {
  const active = useTerminalActive(s => s)
  return (
    <div className={css.row} data-testid="appearance-terminal">
      <span className={css.label}>{t('appearance.terminal' as ThemeTerminalKey)}</span>
      <button
        type="button"
        className={css.toggle}
        data-active={active ? '' : undefined}
        aria-pressed={active}
        onClick={setTerminal}
      >
        {active ? '▣' : '▢'}
      </button>
    </div>
  )
}

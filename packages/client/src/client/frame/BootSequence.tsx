/**
 * One-shot CRT boot overlay: a short typed-byline sequence shown while the
 * frame settles. Pure component; the dwell timer lives in TerminalFrame.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { ShellKey } from './TerminalFrame.tsx'
import css from './BootSequence.module.css'

/** Boot overlay props. */
export interface BootSequenceProps {
  t: TranslateNS<'terminal'>
}

/** The full-screen boot overlay. */
export function BootSequence({ t }: BootSequenceProps) {
  return (
    <div className={css.overlay} role="status" aria-live="polite">
      <div className={css.crt}>
        <pre className={css.logo}>
          {'╔══════════════════════════════════════╗\n'
          + '║  D E E P S E E K   H A R N E S S    ║\n'
          + '╚══════════════════════════════════════╝'}
        </pre>
        <div className={css.byline}>{t('shell.boot.byline')}</div>
        <div className={css.cursor} aria-hidden="true">▌</div>
      </div>
    </div>
  )
}

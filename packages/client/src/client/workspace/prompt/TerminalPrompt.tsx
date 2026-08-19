/**
 * Terminal prompt line: a `$`-prefixed inline input with Enter-to-send,
 * Ctrl+C to cancel, and Up/Down history navigation. Controlled component.
 */
import type { KeyboardEvent } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import css from './TerminalPrompt.module.css'

/** Prompt line props. */
export interface TerminalPromptProps {
  /** Current draft text (owned by the session store). */
  draft: string
  onDraft: (text: string) => void
  /** Submit the current draft. */
  onSubmit: () => void
  onHistoryUp: () => void
  onHistoryDown: () => void
  /** Cancel the running turn (Ctrl+C). */
  onCancel: () => void
  /** Whether a turn is running (disables submit while busy). */
  busy: boolean
  t: TranslateNS<'terminal'>
}

/** Handle one prompt-line key. */
export function handlePromptKey(
  event: KeyboardEvent<HTMLInputElement>,
  props: Pick<TerminalPromptProps, 'onSubmit' | 'onHistoryUp' | 'onHistoryDown' | 'onCancel' | 'busy'>,
): void {
  if (event.key === 'Enter') {
    if (props.busy) return
    event.preventDefault()
    props.onSubmit()
    return
  }
  if (event.key === 'c' && event.ctrlKey) {
    event.preventDefault()
    props.onCancel()
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    props.onHistoryUp()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    props.onHistoryDown()
  }
}

/** The `$` prompt line. */
export function TerminalPrompt({ draft, onDraft, onSubmit, onHistoryUp, onHistoryDown, onCancel, busy, t }: TerminalPromptProps) {
  return (
    <div className={css.prompt} data-testid="terminal-prompt">
      <span className={css.mark} aria-hidden="true">$</span>
      <input
        className={css.input}
        type="text"
        value={draft}
        placeholder={t('shell.prompt.placeholder')}
        aria-label={t('shell.prompt.aria')}
        onChange={(event) => { onDraft(event.target.value) }}
        onKeyDown={(event) => {
          handlePromptKey(event, { onSubmit, onHistoryUp, onHistoryDown, onCancel, busy })
        }}
        autoFocus
        spellCheck={false}
      />
    </div>
  )
}

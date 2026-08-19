/**
 * Terminal-style chat log: renders ordered log lines, auto-scrolls to the
 * newest line while the reader is at the bottom, and shows the running
 * indicator. Pure component over pre-projected lines.
 */
import { useEffect, useRef } from 'react'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { TerminalLine } from '../../contract.ts'
import css from './TerminalChat.module.css'

/** Chat log props. */
export interface TerminalChatProps {
  /** Pre-projected log lines in render order. */
  lines: readonly TerminalLine[]
  /** Whether the session currently runs a turn. */
  running: boolean
  t: TranslateNS<'terminal'>
}

/** One log line row. */
function LineRow({ line }: { line: TerminalLine }) {
  return (
    <div className={css[line.kind]} data-testid="terminal-line">
      {line.kind === 'prompt' && <span className={css.promptMark}>user@harness:~$ </span>}
      <span className={css.text}>{line.text}</span>
      {line.detail !== undefined && <span className={css.detail}>{line.detail}</span>}
    </div>
  )
}

/** The auto-scrolling chat log. */
export function TerminalChat({ lines, running, t }: TerminalChatProps) {
  const scrollport = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = scrollport.current
    if (element === null) return
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48
    if (atBottom) element.scrollTop = element.scrollHeight
  }, [lines])

  return (
    <div className={css.chat} data-testid="terminal-chat">
      <div className={css.scrollport} ref={scrollport}>
        {lines.length === 0 && (
          <div className={css.empty} data-testid="terminal-chat-empty">
            {t('shell.chat.empty')}
          </div>
        )}
        {lines.map(line => <LineRow key={line.key} line={line} />)}
      </div>
      {running && <div className={css.running} data-testid="terminal-running">▮ {t('shell.chat.running')}</div>}
    </div>
  )
}

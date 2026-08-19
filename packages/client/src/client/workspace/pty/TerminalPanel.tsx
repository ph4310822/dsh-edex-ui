/**
 * Embedded PTY panel: an xterm.js terminal wired to the session's PtyClient.
 * Mounts → opens the PTY; unmounts (tab switch or workspace switch) → closes
 * it. Output deltas stream through the client's poll loop; input passes
 * through raw (Enter, Ctrl-C, arrows all ride the byte stream).
 */
import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { TerminalReadResult } from '@deepseek-ai/dsh-host-terminal-bridge/types'
import type { PtyStatus } from '../../contract.ts'
import css from './TerminalPanel.module.css'

/** The PTY verbs the panel drives (a narrowed PtyClient face for testability). */
export interface TerminalPanelPty {
  open: (cwd?: string) => void
  write: (text: string) => void
  close: () => void
  /** Output-delta sink the panel assigns on mount and clears on unmount. */
  onOutput: ((read: TerminalReadResult) => void) | null
}

/** Terminal panel props. */
export interface TerminalPanelProps {
  pty: TerminalPanelPty
  /** Session workspace path passed to the PTY open. */
  cwd: string | undefined
  /** Live PTY status from the usePtyStatus hook. */
  status: PtyStatus
  t: TranslateNS<'terminal'>
}

/** Phosphor-green xterm theme matching the CRT palette. */
export const TERMINAL_THEME = {
  background: '#000a00',
  foreground: '#35e06a',
  cursor: '#35e06a',
  cursorAccent: '#000a00',
  selectionBackground: '#14401f',
  black: '#000a00',
  red: '#e05a5a',
  green: '#35e06a',
  yellow: '#e0c05a',
  blue: '#5ab0e0',
  magenta: '#c05ae0',
  cyan: '#5ae0c0',
  white: '#c8e0d0',
  brightBlack: '#40704f',
  brightRed: '#ff7a7a',
  brightGreen: '#7affa0',
  brightYellow: '#ffe07a',
  brightBlue: '#7ac8ff',
  brightMagenta: '#e07aff',
  brightCyan: '#7afff0',
  brightWhite: '#f0fff4',
} as const

/** Build one xterm instance (separated for test seams). */
export function createTerminal(): Terminal {
  return new Terminal({
    fontFamily: 'var(--ds-font-family-code, monospace)',
    fontSize: 13,
    cursorBlink: true,
    theme: TERMINAL_THEME,
    scrollback: 2000,
  })
}

/** The embedded PTY panel. */
export function TerminalPanel({ pty, cwd, status, t }: TerminalPanelProps) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = host.current
    if (element === null) return undefined
    const terminal = createTerminal()
    const fit = new FitAddon()
    terminal.loadAddon(fit)
    terminal.open(element)
    try {
      fit.fit()
    } catch {
      // Container not measurable yet (hidden/zero-size); xterm keeps its
      // default geometry until the next fit.
    }
    pty.onOutput = (read) => {
      if (read.truncated) terminal.reset()
      terminal.write(read.text)
    }
    terminal.onData((data) => { pty.write(data) })
    void pty.open(cwd)
    return () => {
      pty.onOutput = null
      void pty.close()
      terminal.dispose()
    }
  }, [pty, cwd])

  return (
    <div className={css.panel} data-testid="terminal-panel">
      <div className={css.host} ref={host} />
      {status.state === 'connecting' && (
        <div className={css.status} data-testid="terminal-panel-status">{t('shell.pty.connecting')}</div>
      )}
      {status.state === 'failed' && (
        <div className={css.statusError} data-testid="terminal-panel-status">
          {t('shell.pty.failed')}
          {status.error !== null ? `: ${status.error}` : ''}
        </div>
      )}
      {status.state === 'closed' && (
        <div className={css.status} data-testid="terminal-panel-status">{t('shell.pty.closed')}</div>
      )}
    </div>
  )
}

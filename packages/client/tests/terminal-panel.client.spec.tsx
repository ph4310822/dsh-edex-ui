// @vitest-environment jsdom
/** TerminalPanel specs: xterm wiring with a mocked xterm library. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { TerminalReadResult } from '@deepseek-ai/dsh-host-terminal-bridge/types'
import { IDLE_PTY_STATUS } from '../src/client/contract.ts'
import { TerminalPanel, type TerminalPanelPty } from '../src/client/workspace/pty/TerminalPanel.tsx'

/** xterm instance mock recording wiring. */
function createTerminalMock() {
  const onDataHandlers: ((data: string) => void)[] = []
  const terminal = {
    loadAddon: vi.fn(),
    open: vi.fn(),
    reset: vi.fn(),
    write: vi.fn(),
    onData: vi.fn((handler: (data: string) => void) => { onDataHandlers.push(handler) }),
    dispose: vi.fn(),
  }
  const fit = { fit: vi.fn() }
  return { terminal, fit, onDataHandlers }
}

vi.mock('@xterm/xterm', () => ({ Terminal: vi.fn() }))
vi.mock('@xterm/addon-fit', () => ({ FitAddon: vi.fn() }))

function t(key: string): string {
  return key
}

afterEach(() => {
  cleanup()
})

describe('TerminalPanel', () => {
  it('opens the PTY on mount, feeds output, forwards input, and closes on unmount', async () => {
    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')
    const mock = createTerminalMock()
    ;(Terminal as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mock.terminal)
    ;(FitAddon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mock.fit)

    const pty: TerminalPanelPty = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn(),
      onOutput: null,
    }
    const { unmount } = render(<TerminalPanel pty={pty} cwd="/work" status={IDLE_PTY_STATUS} t={t} />)
    expect(pty.open).toHaveBeenCalledWith('/work')
    expect(mock.terminal.loadAddon).toHaveBeenCalledWith(mock.fit)
    expect(mock.terminal.open).toHaveBeenCalled()

    // Output deltas flow into xterm; truncation resets first.
    const read: TerminalReadResult = { text: 'out', truncated: true, exited: false }
    pty.onOutput?.(read)
    expect(mock.terminal.reset).toHaveBeenCalled()
    expect(mock.terminal.write).toHaveBeenCalledWith('out')

    // Input passes through raw.
    expect(mock.onDataHandlers).toHaveLength(1)
    mock.onDataHandlers[0]('ls\r')
    expect(pty.write).toHaveBeenCalledWith('ls\r')

    unmount()
    expect(pty.close).toHaveBeenCalled()
    expect(pty.onOutput).toBeNull()
    expect(mock.terminal.dispose).toHaveBeenCalled()
  })

  it('shows connecting, failed, and closed overlays from the status', async () => {
    const { Terminal } = await import('@xterm/xterm')
    const { FitAddon } = await import('@xterm/addon-fit')
    const mock = createTerminalMock()
    ;(Terminal as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mock.terminal)
    ;(FitAddon as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mock.fit)
    const pty: TerminalPanelPty = { open: vi.fn(), write: vi.fn(), close: vi.fn(), onOutput: null }

    const { rerender, unmount } = render(<TerminalPanel pty={pty} cwd={undefined} status={{ id: null, state: 'connecting', error: null }} t={t} />)
    expect(screen.getByText('shell.pty.connecting')).toBeTruthy()
    rerender(<TerminalPanel pty={pty} cwd={undefined} status={{ id: null, state: 'failed', error: 'boom' }} t={t} />)
    expect(screen.getByText(/shell.pty.failed/)).toBeTruthy()
    rerender(<TerminalPanel pty={pty} cwd={undefined} status={{ id: null, state: 'closed', error: null }} t={t} />)
    expect(screen.getByText('shell.pty.closed')).toBeTruthy()
    unmount()
  })
})

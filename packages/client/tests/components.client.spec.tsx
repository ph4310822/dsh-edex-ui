// @vitest-environment jsdom
/** TerminalChat, TerminalPrompt, SystemMonitorBar, and BootSequence specs. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { TerminalLine } from '../src/client/contract.ts'
import { TerminalChat } from '../src/client/workspace/chat/TerminalChat.tsx'
import { handlePromptKey, TerminalPrompt } from '../src/client/workspace/prompt/TerminalPrompt.tsx'
import { BootSequence } from '../src/client/frame/BootSequence.tsx'
import {
  formatBytes, formatUptime, SystemMonitorBar,
} from '../src/client/frame/SystemMonitorBar.tsx'
import type { MonitorObservation } from '../src/client/monitor-poller.ts'

function t(key: string): string {
  return key
}

const LINE: TerminalLine = { key: 'k1', seq: 1, kind: 'output', text: 'hello' }

afterEach(() => {
  cleanup()
})

describe('TerminalChat', () => {
  it('renders log lines and an empty state', () => {
    render(<TerminalChat lines={[LINE]} running={false} t={t} />)
    expect(screen.getByText('hello')).toBeTruthy()
  })

  it('renders the empty hint when there are no lines', () => {
    render(<TerminalChat lines={[]} running={false} t={t} />)
    expect(screen.getByTestId('terminal-chat-empty')).toBeTruthy()
  })

  it('shows the running indicator while a turn runs', () => {
    render(<TerminalChat lines={[]} running={true} t={t} />)
    expect(screen.getByTestId('terminal-running')).toBeTruthy()
  })
})

describe('TerminalPrompt', () => {
  it('submits on Enter and cancels on Ctrl+C', () => {
    const onSubmit = vi.fn()
    const onCancel = vi.fn()
    const props = {
      draft: 'text', onDraft: vi.fn(), onSubmit, onHistoryUp: vi.fn(), onHistoryDown: vi.fn(),
      onCancel, busy: false, t,
    }
    render(<TerminalPrompt {...props} />)
    const input = screen.getByLabelText('shell.prompt.aria')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSubmit).toHaveBeenCalled()
    fireEvent.keyDown(input, { key: 'c', ctrlKey: true })
    expect(onCancel).toHaveBeenCalled()
  })

  it('navigates history with arrow keys', () => {
    const onHistoryUp = vi.fn()
    const onHistoryDown = vi.fn()
    const props = {
      draft: '', onDraft: vi.fn(), onSubmit: vi.fn(), onHistoryUp, onHistoryDown,
      onCancel: vi.fn(), busy: false, t,
    }
    render(<TerminalPrompt {...props} />)
    const input = screen.getByLabelText('shell.prompt.aria')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(onHistoryUp).toHaveBeenCalled()
    expect(onHistoryDown).toHaveBeenCalled()
  })

  it('blocks Enter while busy', () => {
    const onSubmit = vi.fn()
    const event = { key: 'Enter', ctrlKey: false, preventDefault: vi.fn() } as unknown as Parameters<typeof handlePromptKey>[0]
    handlePromptKey(event, { onSubmit, onHistoryUp: vi.fn(), onHistoryDown: vi.fn(), onCancel: vi.fn(), busy: true })
    expect(onSubmit).not.toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('writes the draft through onDraft on change', () => {
    const onDraft = vi.fn()
    render(<TerminalPrompt draft="" onDraft={onDraft} onSubmit={vi.fn()} onHistoryUp={vi.fn()} onHistoryDown={vi.fn()} onCancel={vi.fn()} busy={false} t={t} />)
    fireEvent.change(screen.getByLabelText('shell.prompt.aria'), { target: { value: 'x' } })
    expect(onDraft).toHaveBeenCalledWith('x')
  })
})

describe('SystemMonitorBar', () => {
  const SNAPSHOT = {
    loadavg: [1, 2, 3] as readonly [number, number, number],
    cpuBusyRatio: 0.42,
    totalMemoryBytes: 2048,
    freeMemoryBytes: 1024,
    uptimeSeconds: 3661,
    timestamp: 0,
  }

  it('renders meters from a live observation', () => {
    const observation: MonitorObservation = { ok: true, snapshot: SNAPSHOT }
    render(<SystemMonitorBar observation={observation} t={t} />)
    expect(screen.getByText('42%')).toBeTruthy()
    expect(screen.getByText(/1.0 KB free/)).toBeTruthy()
    expect(screen.getByText('1h 1m 1s')).toBeTruthy()
  })

  it('renders dashes on failure', () => {
    render(<SystemMonitorBar observation={{ ok: false }} t={t} />)
    expect(screen.getAllByText('shell.monitor.unavailable')).toHaveLength(3)
  })
})

describe('formatBytes', () => {
  it('formats byte counts compactly', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1023)).toBe('1023 B')
    expect(formatBytes(1024)).toBe('1.0 KB')
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB')
  })

  it('degrades non-finite input', () => {
    expect(formatBytes(Number.NaN)).toBe('--')
    expect(formatBytes(-1)).toBe('--')
  })
})

describe('formatUptime', () => {
  it('formats seconds as Hh Mm Ss', () => {
    expect(formatUptime(0)).toBe('0m 0s')
    expect(formatUptime(3661)).toBe('1h 1m 1s')
  })

  it('degrades non-finite input', () => {
    expect(formatUptime(Number.NaN)).toBe('--')
    expect(formatUptime(-5)).toBe('--')
  })
})

describe('BootSequence', () => {
  it('renders the byline', () => {
    render(<BootSequence t={t} />)
    expect(screen.getByText('shell.boot.byline')).toBeTruthy()
  })
})

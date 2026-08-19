// @vitest-environment jsdom
/** TerminalFrame specs: boot overlay, tabs, rail, monitor bar, and session verbs. */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { createTerminalFrameStore } from '../src/client/stores.ts'
import { TerminalFrame, type TerminalFrameProps } from '../src/client/frame/TerminalFrame.tsx'
import type { MonitorObservation } from '../src/client/monitor-poller.ts'
import type { ObservableSource } from '../src/client/pty-client.ts'

/** Static observable source stub. */
function staticSource<T>(value: T): ObservableSource<T> {
  return {
    getSnapshot: () => value,
    subscribe: () => () => {},
  }
}

const SNAPSHOT = {
  loadavg: [1, 2, 3] as readonly [number, number, number],
  cpuBusyRatio: 0.5,
  totalMemoryBytes: 2048,
  freeMemoryBytes: 1024,
  uptimeSeconds: 3661,
  timestamp: 0,
}

function t(key: string): string {
  return key
}

/** Build a fully-wired frame under the four-share props form. */
function mountFrame(overrides: Partial<TerminalFrameProps> = {}) {
  const { store } = createTerminalFrameStore().create()
  const sessions: SessionListState = {
    ids: ['s1' as never, 's2' as never],
    byId: {
      's1' as never: { displayTitle: 'First', running: true, blank: false } as never,
      's2' as never: { displayTitle: 'Second', running: false, blank: false } as never,
    },
    current: 's1' as never,
    phase: 'ready' as never,
    subagentsByParent: {},
    jobsBySession: {},
  } as unknown as SessionListState
  const monitor: MonitorObservation = { ok: true, snapshot: SNAPSHOT }
  const actions = {
    setPanel: vi.fn(),
    toggleMonitor: vi.fn(),
  }
  // Capture the owner props the frame hands to the workspace slot.
  const owner = { current: undefined as { panel?: 'chat' | 'pty'; onSetPanel?: (panel: 'chat' | 'pty') => void } | undefined }
  const props: TerminalFrameProps = {
    renderSlot: vi.fn((_key: string, ownerProps: unknown) => {
      owner.current = ownerProps as never
      return <div data-testid="workspace-slot" />
    }),
    useStore: () => store.getSnapshot(),
    actions: actions as never,
    useSessions: () => sessions,
    useWorkspaces: () => ({ items: [], archivedSessionIds: [], state: 'ready', phase: 'ready' } as never),
    useMonitor: () => monitor,
    t,
    openSession: vi.fn(),
    newSession: vi.fn(),
    hooks: { monitor: staticSource(monitor) },
    ...overrides,
  }
  return { ...props, store, actions, owner }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('TerminalFrame', () => {
  it('shows the boot overlay then settles into the frame', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    expect(screen.getByRole('status')).toBeTruthy()
    act(() => { vi.advanceTimersByTime(1600) })
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByTestId('workspace-slot')).toBeTruthy()
  })

  it('renders the session rail and selects a session', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText('First')).toBeTruthy()
    fireEvent.click(screen.getByText('Second'))
    expect(props.openSession).toHaveBeenCalledWith('s2')
  })

  it('runs the New Session flow from the rail button', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    act(() => { vi.advanceTimersByTime(1600) })
    fireEvent.click(screen.getByLabelText('shell.newSession'))
    expect(props.newSession).toHaveBeenCalled()
  })

  it('switches the active panel through the store actions', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    act(() => { vi.advanceTimersByTime(1600) })
    fireEvent.click(screen.getByText('shell.shell'))
    expect(props.actions.setPanel).toHaveBeenCalledWith('pty')
  })

  it('hands the active panel and a panel switch to the workspace slot', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(props.owner.current?.panel).toBe('chat')
    props.owner.current?.onSetPanel?.('pty')
    expect(props.actions.setPanel).toHaveBeenCalledWith('pty')
  })

  it('renders the monitor bar and toggles it off', () => {
    const props = mountFrame()
    render(<TerminalFrame {...props} />)
    act(() => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText('50%')).toBeTruthy()
    fireEvent.click(screen.getByText(/shell.monitor/))
    expect(props.actions.toggleMonitor).toHaveBeenCalled()
  })
})

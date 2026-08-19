// @vitest-environment jsdom
/** TerminalWorkspace specs: no-session hint, chat/prompt flow, and PTY panel switch. */

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ConversationSnapshot, SessionListState } from '@deepseek-ai/dsh-client-runtime/client'
import { createTerminalSessionStore } from '../src/client/stores.ts'
import { IDLE_PTY_STATUS } from '../src/client/contract.ts'
import { TerminalWorkspace, type TerminalWorkspaceProps } from '../src/client/workspace/TerminalWorkspace.tsx'

function t(key: string): string {
  return key
}

const EMPTY_SNAPSHOT = {
  chat: { order: [], nodes: { get: () => undefined, values: () => [] }, locations: {}, timeline: { turnOrder: [], turns: new Map() }, legacy: {} },
  pending: [],
  running: false,
  openState: 'open',
} as unknown as ConversationSnapshot

function mountWorkspace(overrides: Partial<TerminalWorkspaceProps> = {}) {
  const { store, actions } = createTerminalSessionStore().create()
  const send = vi.fn()
  const cancel = vi.fn()
  const pty = {
    open: vi.fn(),
    write: vi.fn(),
    close: vi.fn(),
    onOutput: null,
  }
  const props: TerminalWorkspaceProps = {
    sessionId: 's1' as never,
    useSession: () => EMPTY_SNAPSHOT,
    useSessions: (sel: (s: SessionListState) => unknown) => sel({ ids: [], byId: {}, current: 's1', phase: 'ready', subagentsByParent: {}, jobsBySession: {} } as unknown as SessionListState),
    useStore: () => store.getSnapshot(),
    actions: actions as never,
    t,
    panel: 'chat',
    onSetPanel: vi.fn(),
    send,
    cancel,
    pty: pty as never,
    usePtyStatus: () => IDLE_PTY_STATUS,
    ...overrides,
  }
  return { ...props, store, actions, send, cancel, pty }
}

afterEach(() => {
  cleanup()
})

describe('TerminalWorkspace', () => {
  it('renders the no-session hint without a session', () => {
    const props = mountWorkspace({ sessionId: undefined, useSession: () => undefined })
    render(<TerminalWorkspace {...props} />)
    expect(screen.getByTestId('terminal-no-session')).toBeTruthy()
  })

  it('shows a loading hint while the session is opening', () => {
    const props = mountWorkspace({ useSession: () => ({ ...EMPTY_SNAPSHOT, openState: 'loading' }) })
    render(<TerminalWorkspace {...props} />)
    expect(screen.getByText('loading history…')).toBeTruthy()
  })

  it('shows the open error instead of the chat when history fails', () => {
    const props = mountWorkspace({
      useSession: () => ({
        ...EMPTY_SNAPSHOT,
        openState: 'error',
        openError: { code: 'internal', message: 'corrupt session log: seq gap', details: {} },
      }),
    })
    render(<TerminalWorkspace {...props} />)
    expect(screen.getByText('failed to open session')).toBeTruthy()
    expect(screen.getByText('corrupt session log: seq gap')).toBeTruthy()
  })

  it('renders the chat log and prompt in chat mode', () => {
    const props = mountWorkspace()
    render(<TerminalWorkspace {...props} />)
    expect(screen.getByTestId('terminal-chat')).toBeTruthy()
    expect(screen.getByTestId('terminal-prompt')).toBeTruthy()
  })

  it('submits the draft through the inject send and clears it', () => {
    const props = mountWorkspace()
    render(<TerminalWorkspace {...props} />)
    const input = screen.getByLabelText('shell.prompt.aria')
    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(props.send).toHaveBeenCalledWith('hello')
    expect(props.store.getSnapshot().draft).toBe('')
  })

  it('cancels the running turn on Ctrl+C', () => {
    const props = mountWorkspace()
    render(<TerminalWorkspace {...props} />)
    const input = screen.getByLabelText('shell.prompt.aria')
    fireEvent.keyDown(input, { key: 'c', ctrlKey: true })
    expect(props.cancel).toHaveBeenCalled()
  })

  it('renders the PTY panel in shell mode', () => {
    const props = mountWorkspace({ panel: 'pty', status: { id: null, state: 'connected', error: null } })
    render(<TerminalWorkspace {...props} />)
    expect(screen.getByTestId('terminal-panel')).toBeTruthy()
  })

  it('closes the PTY when the workspace unmounts', () => {
    const props = mountWorkspace({ panel: 'pty' })
    const { unmount } = render(<TerminalWorkspace {...props} />)
    unmount()
    expect(props.pty.close).toHaveBeenCalled()
  })
})

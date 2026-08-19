/** chat-lines projection specs: nodes and pending interactions → log lines. */

import { describe, expect, it } from 'vitest'
import type {
  ChatConversationViewNode, PendingInteraction,
} from '@deepseek-ai/dsh-client-runtime/client'
import { TOOL_RESULT_MAX_CHARS, renderChatLines } from '../src/client/chat-lines.ts'
import type { TerminalChatData, TerminalChatKind } from '../src/client/contract.ts'

/** Build one chat node with the given kind and payload. */
function node(key: string, seq: number, kind: TerminalChatKind, data: TerminalChatData): ChatConversationViewNode {
  return {
    key,
    kind,
    id: key,
    target: 'chat',
    anchorSeq: seq,
    location: { kind: 'unresolved' },
    visibility: 'visible',
    data,
  }
}

const pending: PendingInteraction = {
  kind: 'approval',
  key: 'a:1',
  sessionId: 's1' as never,
  payload: { sessionId: 's1' as never, promptId: 'p1', request: {} },
  respond: () => {},
} as unknown as PendingInteraction

describe('renderChatLines', () => {
  it('renders a user prompt with the shell mark and its text', () => {
    const lines = renderChatLines({
      nodes: [node('u1', 1, 'terminal-user', { kind: 'user', seq: 1, time: 0, text: 'hello' })],
      pending: [],
    })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ key: 'user-1', kind: 'prompt', seq: 1, text: 'hello' })
  })

  it('renders a context injection as a system line with its source', () => {
    const lines = renderChatLines({
      nodes: [node('c1', 2, 'terminal-context', { kind: 'context', seq: 2, time: 0, text: 'rules', source: 'filesystem' })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'system', text: '[context] rules' })
  })

  it('renders a settled assistant as output lines, one per physical line', () => {
    const lines = renderChatLines({
      nodes: [node('a1', 3, 'terminal-assistant', {
        kind: 'assistant', seq: 3, time: 0, turn: 1, step: 1, status: 'settled', text: 'line one\nline two', tools: [],
      })],
      pending: [],
    })
    expect(lines).toHaveLength(2)
    expect(lines[0]).toMatchObject({ kind: 'output', text: 'line one', seq: 3 })
    expect(lines[1]).toMatchObject({ kind: 'output', text: 'line two' })
  })

  it('renders a running assistant first line as a stream line with a cursor', () => {
    const lines = renderChatLines({
      nodes: [node('a2', 4, 'terminal-assistant', {
        kind: 'assistant', seq: 4, time: 0, turn: 1, step: 2, status: 'running', text: 'stream', tools: [],
      })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'stream', text: 'stream▌' })
  })

  it('renders assistant tool calls and reasoning as tool and system lines', () => {
    const lines = renderChatLines({
      nodes: [node('a3', 5, 'terminal-assistant', {
        kind: 'assistant', seq: 5, time: 0, turn: 1, step: 3, status: 'settled', text: '',
        tools: [{ callId: 'c1', name: 'bash' }], reasoning: 'think',
      })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'tool', text: '── tool: bash ──' })
    expect(lines[1]).toMatchObject({ kind: 'system', text: '[reasoning] think' })
  })

  it('renders an interrupted assistant with no content as ^C', () => {
    const lines = renderChatLines({
      nodes: [node('a4', 6, 'terminal-assistant', {
        kind: 'assistant', seq: 6, time: 0, turn: 1, step: 4, status: 'interrupted', text: '', tools: [],
      })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'error', text: '^C (interrupted)' })
  })

  it('renders a settled tool row with ok status and bounded detail', () => {
    const long = 'x'.repeat(TOOL_RESULT_MAX_CHARS + 50)
    const lines = renderChatLines({
      nodes: [node('t1', 7, 'terminal-tool', {
        kind: 'tool', seq: 7, time: 0, callId: 'c1', name: 'bash', status: 'ok', detail: long,
      })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'tool', text: '── tool: bash [ok] ──' })
    expect(lines[0].detail?.length).toBe(TOOL_RESULT_MAX_CHARS)
  })

  it('renders an error tool row with error kind', () => {
    const lines = renderChatLines({
      nodes: [node('t2', 8, 'terminal-tool', {
        kind: 'tool', seq: 8, time: 0, callId: 'c2', name: 'read', status: 'error',
      })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'error', text: '── tool: read [error] ──' })
  })

  it('renders turn errors and compaction checkpoints as error/system lines', () => {
    const lines = renderChatLines({
      nodes: [
        node('e1', 9, 'terminal-turn-error', { kind: 'turn-error', seq: 9, time: 0, message: 'boom' }),
        node('k1', 10, 'terminal-compaction', { kind: 'compaction', seq: 10, time: 0 }),
      ],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'error', text: '[error] boom' })
    expect(lines[1]).toMatchObject({ kind: 'system', text: '[compaction] history compacted' })
  })

  it('renders unknown events as system rows', () => {
    const lines = renderChatLines({
      nodes: [node('u2', 11, 'terminal-unknown', { kind: 'unknown', seq: 11, time: 0, type: 'todo/write' })],
      pending: [],
    })
    expect(lines[0]).toMatchObject({ kind: 'system', text: '[unknown:todo/write]' })
  })

  it('appends pending interactions after all nodes', () => {
    const lines = renderChatLines({
      nodes: [node('u3', 12, 'terminal-user', { kind: 'user', seq: 12, time: 0, text: 'hi' })],
      pending: [pending],
    })
    expect(lines).toHaveLength(2)
    expect(lines[1]).toMatchObject({ kind: 'system', text: '[waiting: approval]' })
  })

  it('returns no lines for an empty chat', () => {
    expect(renderChatLines({ nodes: [], pending: [] })).toEqual([])
  })
})

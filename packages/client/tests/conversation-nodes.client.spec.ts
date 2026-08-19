/** Terminal conversation Definitions + Chat builder specs, driven through the assembler. */

import { describe, expect, it } from 'vitest'
import type {
  ChatSnapshot, ConversationEventInput, ConversationNodeDefinition, ConversationViewDefinition,
} from '@deepseek-ai/dsh-client-runtime/client'
import { ConversationNodeAssembler } from '@deepseek-ai/dsh-client-runtime/client'
import {
  assistantDefinition, compactionDefinition, messageDefinition, terminalChatViewDefinition,
  toolDefinition, turnErrorDefinition, unknownDefinition,
} from '../src/client/conversation-nodes.ts'

const DEFINITIONS: readonly ConversationNodeDefinition[] = [
  messageDefinition,
  assistantDefinition,
  toolDefinition,
  turnErrorDefinition,
  compactionDefinition,
]

class TestEventDefinitions {
  entries(): readonly ConversationNodeDefinition[] {
    return DEFINITIONS
  }

  fallbackEntry(): ConversationNodeDefinition {
    return unknownDefinition
  }
}

class TestViewDefinitions {
  entries(): readonly ConversationViewDefinition[] {
    return [terminalChatViewDefinition]
  }
}

/** Build one raw append-surface event input. */
function at(seq: number, type: string, data: unknown): ConversationEventInput {
  return {
    event: {
      seq,
      time: 1_700_000_000_000 + seq,
      type,
      data,
      surface: 'append',
    } as unknown as ConversationEventInput['event'],
    view: undefined,
  }
}

function assemble(entries: readonly ConversationEventInput[]): ConversationNodeAssembler {
  const value = new ConversationNodeAssembler(new TestEventDefinitions(), new TestViewDefinitions())
  value.replaceWindow(entries, false)
  value.flush()
  return value
}

function chat(value: ConversationNodeAssembler): ChatSnapshot {
  const current = value.snapshot('chat') as ChatSnapshot | undefined
  if (current === undefined) throw new Error('chat view was not registered')
  return current
}

function visibleNodes(value: ConversationNodeAssembler): { kind: string; data: unknown }[] {
  return chat(value).order
    .map(key => chat(value).nodes.get(key))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .map(node => ({ kind: node.kind, data: node.data }))
}

describe('terminal-message definition', () => {
  it('renders a user message as a terminal-user node', () => {
    const value = assemble([
      at(1, 'turn/start', { turn: 1 }),
      at(2, 'step/start', { turn: 1, step: 1 }),
      at(3, 'user/message', { id: 'm1', time: 1, content: [{ type: 'text', text: 'hello' }], source: { kind: 'user' } }),
    ])
    const nodes = visibleNodes(value)
    expect(nodes[0]).toMatchObject({ kind: 'terminal-user', data: { kind: 'user', text: 'hello' } })
  })

  it('renders a plugin-injected context message as a terminal-context node', () => {
    const value = assemble([
      at(1, 'user/message', {
        id: 'c1',
        time: 1,
        content: [{ type: 'text', text: 'workspace rules' }],
        source: { kind: 'plugin', plugin: 'filesystem' },
      }),
    ])
    const nodes = visibleNodes(value)
    expect(nodes[0]).toMatchObject({ kind: 'terminal-context', data: { kind: 'context', text: 'workspace rules', source: 'filesystem' } })
  })

  it('skips the durable compaction checkpoint', () => {
    const value = assemble([
      at(1, 'user/message', {
        id: 'k1',
        time: 1,
        content: [{ type: 'text', text: 'compact now' }],
        source: { kind: 'plugin', plugin: 'compact' },
      }),
    ])
    expect(visibleNodes(value).map(node => node.kind)).not.toContain('terminal-user')
  })
})

describe('terminal-assistant definition', () => {
  const chunk = (seq: number, turn: number, step: number, type: string, data: Record<string, unknown>): ConversationEventInput =>
    at(seq, 'assistant/chunk', { turn, step, chunk: { type, ...data } })

  it('accumulates streaming text into a running node', () => {
    const value = assemble([
      at(1, 'step/start', { turn: 1, step: 1 }),
      chunk(2, 1, 1, 'block-start', { index: 0, blockType: 'text' }),
      chunk(3, 1, 1, 'text-delta', { index: 0, text: 'hel' }),
      chunk(4, 1, 1, 'text-delta', { index: 0, text: 'lo' }),
      at(5, 'step/end', { turn: 1, step: 1 }),
    ])
    const nodes = visibleNodes(value)
    const assistant = nodes.find(node => node.kind === 'terminal-assistant')
    expect(assistant?.data).toMatchObject({ status: 'running', text: 'hello' })
  })

  it('settles with the durable message content', () => {
    const value = assemble([
      at(1, 'step/start', { turn: 1, step: 1 }),
      at(2, 'assistant/message', {
        turn: 1,
        step: 1,
        message: { id: 'a1', role: 'assistant', source: { kind: 'model', provider: 'deepseek', model: 'x' }, content: [{ type: 'text', text: 'done' }] },
      }),
      at(3, 'step/end', { turn: 1, step: 1 }),
    ])
    const assistant = visibleNodes(value).find(node => node.kind === 'terminal-assistant')
    expect(assistant?.data).toMatchObject({ status: 'settled', text: 'done' })
  })

  it('marks a closed step with content but no final message as interrupted', () => {
    const value = assemble([
      at(1, 'step/start', { turn: 1, step: 1 }),
      chunk(2, 1, 1, 'block-start', { index: 0, blockType: 'text' }),
      chunk(3, 1, 1, 'text-delta', { index: 0, text: 'par' }),
      at(4, 'step/end', { turn: 1, step: 1 }),
      at(5, 'turn/end', { turn: 1, reason: { kind: 'aborted' } }),
    ])
    const assistant = visibleNodes(value).find(node => node.kind === 'terminal-assistant')
    expect(assistant?.data).toMatchObject({ status: 'interrupted', text: 'par' })
  })
})

describe('terminal-tool definition', () => {
  it('renders a running tool until its result lands', () => {
    const value = assemble([
      at(1, 'tool/call', { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{}' }),
    ])
    expect(visibleNodes(value).find(node => node.kind === 'terminal-tool')?.data)
      .toMatchObject({ status: 'running', name: 'bash' })
  })

  it('renders the settled tool with ok status and detail', () => {
    const value = assemble([
      at(1, 'tool/call', { turn: 1, step: 1, callId: 'c1', name: 'bash', arguments: '{}' }),
      at(2, 'tool/result', {
        turn: 1,
        step: 1,
        message: {
          id: 'r1',
          role: 'user',
          source: { kind: 'tool', name: 'bash' },
          content: [{ type: 'tool-result', toolCallId: 'c1', content: [{ type: 'text', text: 'ok' }] }],
        },
      }),
    ])
    expect(visibleNodes(value).find(node => node.kind === 'terminal-tool')?.data)
      .toMatchObject({ status: 'ok', detail: 'ok' })
  })

  it('renders an error tool with error status', () => {
    const value = assemble([
      at(1, 'tool/call', { turn: 1, step: 1, callId: 'c2', name: 'read', arguments: '{}' }),
      at(2, 'tool/result', {
        turn: 1,
        step: 1,
        message: {
          id: 'r2',
          role: 'user',
          source: { kind: 'tool', name: 'read' },
          content: [{ type: 'tool-result', toolCallId: 'c2', content: [{ type: 'text', text: 'boom' }], isError: true }],
        },
      }),
    ])
    expect(visibleNodes(value).find(node => node.kind === 'terminal-tool')?.data)
      .toMatchObject({ status: 'error', detail: 'boom' })
  })
})

describe('terminal-turn-error definition', () => {
  it('renders a failed turn as an error node', () => {
    const value = assemble([
      at(1, 'turn/start', { turn: 2 }),
      at(2, 'turn/end', { turn: 2, reason: { kind: 'error', error: { name: 'LlmFailure', code: 'E1', message: 'boom' } } }),
    ])
    expect(visibleNodes(value).find(node => node.kind === 'terminal-turn-error')?.data)
      .toMatchObject({ message: 'boom' })
  })
})

describe('terminal-compaction definition', () => {
  it('renders the durable compaction checkpoint', () => {
    const value = assemble([
      at(1, 'user/message', {
        id: 'k1',
        time: 1,
        content: [{ type: 'text', text: 'compact now' }],
        source: { kind: 'plugin', plugin: 'compact' },
      }),
    ])
    expect(visibleNodes(value).find(node => node.kind === 'terminal-compaction')?.data)
      .toMatchObject({ kind: 'compaction' })
  })
})

describe('terminal-unknown fallback', () => {
  it('renders unknown surface events and skips log-only and owned events', () => {
    const value = assemble([
      at(1, 'todo/write', { todos: [] }),
      at(2, 'user/message', { id: 'm2', time: 1, content: [{ type: 'text', text: 'x' }], source: { kind: 'user' } }),
      at(3, 'session/end-seed', {}),
    ])
    const kinds = visibleNodes(value).map(node => node.kind)
    expect(kinds).toEqual(['terminal-user'])
  })
})

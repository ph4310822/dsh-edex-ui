/**
 * Pure chat-to-terminal-log projection: ordered `TerminalLine[]` out of the
 * chat store's rendered nodes plus pending interactions. Presentation methods
 * stay pure functions of their input so the chat component can memoize on the
 * snapshot and the projection is unit-testable without rendering machinery.
 */
import type {
  ChatConversationViewNode, PendingInteraction,
} from '@deepseek-ai/dsh-client-runtime/client'
import type {
  TerminalAssistantData, TerminalChatData, TerminalChatKind, TerminalToolData,
} from './contract.ts'
import type { TerminalLine } from './contract.ts'

/** Bounds for one tool-result body line. */
export const TOOL_RESULT_MAX_CHARS = 500

/** The projection input the chat component feeds from the session snapshot. */
export interface ChatRenderInput {
  /** Rendered chat nodes in render order. */
  readonly nodes: readonly ChatConversationViewNode[]
  /** Host-owned pending interactions (approval/question waits). */
  readonly pending: readonly PendingInteraction[]
}

/** Split one text block into physical log lines (single trailing newline dropped). */
function splitLines(text: string): string[] {
  const trimmed = text.replace(/\n$/, '')
  return trimmed === '' ? [] : trimmed.split('\n')
}

/** Project one settled or streaming assistant node into log lines. */
function assistantLines(keyPrefix: string, data: TerminalAssistantData): TerminalLine[] {
  const lines: TerminalLine[] = []
  for (const [index, text] of splitLines(data.text).entries()) {
    lines.push({
      key: `${keyPrefix}-${index}`,
      seq: data.seq + index / 1000,
      kind: data.status === 'running' && index === 0 ? 'stream' : 'output',
      text: data.status === 'running' && index === 0 ? `${text}▌` : text,
    })
  }
  for (const tool of data.tools) {
    lines.push({ key: `${keyPrefix}-tool-${tool.callId}`, seq: data.seq, kind: 'tool', text: `── tool: ${tool.name} ──` })
  }
  if (data.reasoning !== undefined) {
    lines.push({ key: `${keyPrefix}-reasoning`, seq: data.seq, kind: 'system', text: `[reasoning] ${data.reasoning}` })
  }
  if (data.status === 'interrupted' && lines.length === 0) {
    lines.push({ key: `${keyPrefix}-int`, seq: data.seq, kind: 'error', text: '^C (interrupted)' })
  }
  return lines
}

/** Project one tool lifecycle node into a log line. */
function toolLine(data: TerminalToolData): TerminalLine {
  const status = data.status === 'running' ? 'running' : data.status
  const detail = data.detail === undefined ? undefined : data.detail.slice(0, TOOL_RESULT_MAX_CHARS)
  return {
    key: `tool-${data.callId}`,
    seq: data.seq,
    kind: data.status === 'error' ? 'error' : 'tool',
    text: `── tool: ${data.name} [${status}] ──`,
    ...detail === undefined ? {} : { detail },
  }
}

/** Project one chat node into one or more log lines. */
function nodeLines(node: ChatConversationViewNode): TerminalLine[] {
  const data = node.data as TerminalChatData
  switch (data.kind as TerminalChatKind) {
    case 'user':
      return [{ key: `user-${data.seq}`, seq: data.seq, kind: 'prompt', text: data.text }]
    case 'context':
      return [{ key: `context-${data.seq}`, seq: data.seq, kind: 'system', text: `[context] ${data.text}` }]
    case 'assistant':
      return assistantLines(node.key, data as TerminalAssistantData)
    case 'tool':
      return [toolLine(data as TerminalToolData)]
    case 'turn-error':
      return [{ key: `error-${data.seq}`, seq: data.seq, kind: 'error', text: `[error] ${data.message}` }]
    case 'compaction':
      return [{ key: `compaction-${data.seq}`, seq: data.seq, kind: 'system', text: '[compaction] history compacted' }]
    case 'unknown':
      return [{ key: `unknown-${data.seq}`, seq: data.seq, kind: 'system', text: `[unknown:${data.type}]` }]
    default: {
      /* v8 ignore next -- unreachable: every TerminalChatKind has an arm above; the default guards future kind additions. */
      const exhaustive: never = data
      return [{ key: `node-${exhaustive as unknown as number}`, seq: exhaustive as unknown as number, kind: 'system', text: '[event]' }]
    }
  }
}

/** Project one pending interaction into a system line. */
function pendingLine(pending: PendingInteraction): TerminalLine {
  return {
    key: `pending-${pending.key}`,
    seq: Number.MAX_SAFE_INTEGER - 1,
    kind: 'system',
    text: `[waiting: ${pending.kind}]`,
  }
}

/**
 * Project a session snapshot's chat facts into ordered terminal log lines.
 * @param input - rendered nodes and pending interactions.
 * @returns log lines in ascending render order.
 */
export function renderChatLines(input: ChatRenderInput): TerminalLine[] {
  const lines: TerminalLine[] = []
  for (const node of input.nodes) lines.push(...nodeLines(node))
  for (const pending of input.pending) lines.push(pendingLine(pending))
  return lines
}

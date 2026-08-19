/** TerminalUIBridgeService specs: cursor lifecycle over a fake terminals seam. */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type {
  TerminalBackendSession, TerminalReadRequest, TerminalSendOperation, TerminalSendRequest,
  TerminalSessionIdValue, TerminalSessionStatus, TerminalSignalResult,
} from '@deepseek-ai/dsh-terminal'
import { TerminalSessionId } from '@deepseek-ai/dsh-terminal'
import TerminalUIBridgeService from '../src/index.ts'

/** Fake backend session with retained scrollback pages. */
class FakeBackendSession implements TerminalBackendSession {
  readonly motd = 'welcome'
  readonly pid = 7
  private lines: string[] = []
  closeReason: string | undefined
  signals: string[] = []
  written: string[] = []

  push(lines: string[]): void {
    this.lines = [...this.lines, ...lines]
  }

  async write(text: string): Promise<void> {
    this.written.push(text)
  }

  startSend(_request: TerminalSendRequest): TerminalSendOperation {
    throw new Error('not used by the bridge')
  }

  read(request: TerminalReadRequest = {}) {
    const totalLines = this.lines.length
    const offset = request.offset ?? 0
    const count = request.count ?? this.lines.length
    const end = Math.max(0, totalLines - offset)
    const start = Math.max(0, end - count)
    return {
      text: this.lines.slice(start, end).join('\n'),
      totalLines,
      lineBegin: offset,
      lineEnd: offset + (end - start),
      truncated: false,
    }
  }

  async signal(signal: string): Promise<TerminalSignalResult> {
    this.signals.push(signal)
    return { delivered: true, targetPgid: 11 }
  }

  status(): TerminalSessionStatus {
    return { kind: 'running' }
  }

  async close(reason: string): Promise<void> {
    this.closeReason = reason
  }
}

/** Fake terminals seam exposing the service methods the bridge calls. */
function fakeTerminals() {
  const sessions = new Map<TerminalSessionIdValue, FakeBackendSession>()
  return {
    service: {
      async spawn(_owner: unknown, request: { type: string; name?: string; cwd?: string; rows?: number; cols?: number }) {
        const session = new FakeBackendSession()
        const id = TerminalSessionId(`pty-${sessions.size + 1}`)
        sessions.set(id, session)
        return { sessionId: id, motd: session.motd, type: request.type, name: request.name, status: { kind: 'running' } }
      },
      read(_owner: unknown, id: TerminalSessionIdValue, request: TerminalReadRequest) {
        return expectSession(sessions, id).read(request)
      },
      write(_owner: unknown, id: TerminalSessionIdValue, text: string) {
        return expectSession(sessions, id).write(text)
      },
      signal(_owner: unknown, id: TerminalSessionIdValue, signal: string) {
        return expectSession(sessions, id).signal(signal)
      },
      kill(_owner: unknown, id: TerminalSessionIdValue, _reason: string) {
        expectSession(sessions, id)
        sessions.delete(id)
        return Promise.resolve(true)
      },
      list() {
        return [...sessions.keys()].map(id => ({ sessionId: id }))
      },
    },
    sessions,
  }
}

function expectSession(
  sessions: Map<TerminalSessionIdValue, FakeBackendSession>,
  id: TerminalSessionIdValue,
): FakeBackendSession {
  const session = sessions.get(id)
  if (session === undefined) throw new Error(`no fake terminal ${id}`)
  return session
}

function makeBridge() {
  const fake = fakeTerminals()
  const ctx = new Context()
  ctx.provide('terminals', fake.service as never)
  const service = new TerminalUIBridgeService(ctx)
  const agent = { id: 'agent-1' } as any
  return { fake, service, agent }
}

describe('TerminalUIBridgeService', () => {
  it('binds the terminalUI Remote namespace', () => {
    const { service } = makeBridge()
    expect(service.typertRemote).toMatchObject({ serviceKey: 'terminalUI', namespace: 'terminalUI' })
  })

  it('open spawns a bash PTY and seeds the read cursor past the MOTD', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, { cwd: '/work', rows: 30, cols: 100 })
    expect(opened.motd).toBe('welcome')
    const session = fake.sessions.get(opened.id)
    expect(session).toBeDefined()
    // A poll immediately after open returns nothing (the MOTD is the initial output).
    const read = service.read(agent, { id: opened.id })
    expect(read.text).toBe('')
  })

  it('read returns incremental deltas by retained-line cursor', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, {})
    fake.sessions.get(opened.id)?.push(['line1', 'line2'])
    const first = service.read(agent, { id: opened.id })
    expect(first.text).toBe('line1\nline2')
    expect(first.exited).toBe(false)
    fake.sessions.get(opened.id)?.push(['line3'])
    const second = service.read(agent, { id: opened.id })
    expect(second.text).toBe('line3')
    const third = service.read(agent, { id: opened.id })
    expect(third.text).toBe('')
  })

  it('read reports exited when the session leaves the registry', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, {})
    fake.sessions.delete(opened.id)
    const read = service.read(agent, { id: opened.id })
    expect(read.exited).toBe(true)
    // The cursor is dropped after an exited read.
    expect(() => service.read(agent, { id: opened.id })).toThrow(/unknown or closed/)
  })

  it('write forwards raw text through the seam', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, {})
    await service.write(agent, { id: opened.id, text: 'ls\r' })
    expect(fake.sessions.get(opened.id)?.written).toEqual(['ls\r'])
  })

  it('signal delivers to the foreground group', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, {})
    const result = await service.signal(agent, { id: opened.id, signal: 'SIGINT' })
    expect(result.targetPgid).toBe(11)
    expect(fake.sessions.get(opened.id)?.signals).toEqual(['SIGINT'])
  })

  it('close kills the PTY and drops the cursor', async () => {
    const { fake, service, agent } = makeBridge()
    const opened = await service.open(agent, {})
    const closed = await service.close(agent, { id: opened.id, reason: 'bye' })
    expect(closed).toBe(true)
    expect(fake.sessions.has(opened.id)).toBe(false)
    expect(() => service.read(agent, { id: opened.id })).toThrow(/unknown or closed/)
  })

  it('every operation rejects an unknown or closed terminal', async () => {
    const { service, agent } = makeBridge()
    const id = TerminalSessionId('pty-missing')
    await expect(service.write(agent, { id, text: 'x' })).rejects.toThrow(/unknown or closed/)
    expect(() => service.read(agent, { id })).toThrow(/unknown or closed/)
    await expect(service.signal(agent, { id, signal: 'SIGINT' })).rejects.toThrow(/unknown or closed/)
    await expect(service.close(agent, { id })).rejects.toThrow(/unknown or closed/)
  })
})

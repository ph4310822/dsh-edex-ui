/** PtyClient specs: open/write/read/close lifecycle with a fake terminalUI Remote. */

import { describe, expect, it, vi } from 'vitest'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { IDLE_PTY_STATUS, type TerminalUIRemote } from '../src/client/contract.ts'
import { PTY_POLL_INTERVAL_MS, PtyClient } from '../src/client/pty-client.ts'

const SESSION = 's1' as never

/** Fake terminalUI Remote recording calls. */
class FakeTerminalRemote implements TerminalUIRemote {
  readonly calls: string[] = []
  readResults: RemoteResult<{ text: string; truncated: boolean; exited: boolean }>[] = []
  openResult: RemoteResult<{ id: string; motd: string }> = { ok: true, value: { id: 'pty-1', motd: 'welcome' } }
  writeResult: RemoteResult<void> = { ok: true, value: undefined }

  async open(): Promise<RemoteResult<{ id: string; motd: string }>> {
    this.calls.push('open')
    return this.openResult
  }

  async write(): Promise<RemoteResult<void>> {
    this.calls.push('write')
    return this.writeResult
  }

  async read(): Promise<RemoteResult<{ text: string; truncated: boolean; exited: boolean }>> {
    this.calls.push('read')
    return this.readResults.shift() ?? { ok: true, value: { text: '', truncated: false, exited: false } }
  }

  async signal(): Promise<RemoteResult<{ targetPgid: number }>> {
    this.calls.push('signal')
    return { ok: true, value: { targetPgid: 1 } }
  }

  async close(): Promise<RemoteResult<boolean>> {
    this.calls.push('close')
    return { ok: true, value: true }
  }
}

/** Wait for the poll interval plus a microtask flush. */
function tickPoll(): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, PTY_POLL_INTERVAL_MS + 10) })
}

describe('PtyClient', () => {
  it('starts idle with a readable status source', () => {
    const client = new PtyClient(SESSION, new FakeTerminalRemote())
    expect(client.statusSource.getSnapshot()).toEqual(IDLE_PTY_STATUS)
  })

  it('open connects, seeds the id, and starts polling output', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeTerminalRemote()
      remote.readResults = [
        { ok: true, value: { text: 'delta', truncated: false, exited: false } },
      ]
      const client = new PtyClient(SESSION, remote)
      const output: string[] = []
      client.onOutput = (read) => { output.push(read.text) }
      const opened = client.open()
      await vi.advanceTimersByTimeAsync(0)
      await opened
      expect(client.statusSource.getSnapshot()).toMatchObject({ state: 'connected', id: 'pty-1' })
      await vi.advanceTimersByTimeAsync(PTY_POLL_INTERVAL_MS)
      expect(output).toEqual(['delta'])
      expect(remote.calls).toContain('read')
      await client.close()
    } finally {
      vi.useRealTimers()
    }
  })

  it('open failure surfaces a failed status', async () => {
    const remote = new FakeTerminalRemote()
    remote.openResult = { ok: false, error: { code: 'internal', message: 'no backend', details: {} } }
    const client = new PtyClient(SESSION, remote)
    await client.open()
    expect(client.statusSource.getSnapshot()).toMatchObject({ state: 'failed', error: 'no backend' })
  })

  it('a superseded open never reconnects after close', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeTerminalRemote()
      let release!: (result: RemoteResult<{ id: string; motd: string }>) => void
      const gate = new Promise<RemoteResult<{ id: string; motd: string }>>((resolve) => { release = resolve })
      remote.open = async () => gate
      const client = new PtyClient(SESSION, remote)
      const opened = client.open()
      const closed = client.close()
      release({ ok: true, value: { id: 'pty-9', motd: '' } })
      await opened
      await closed
      // The stale open resolved after close: status must stay closed, no polling.
      expect(client.statusSource.getSnapshot()).toMatchObject({ state: 'closed', id: null })
      await vi.advanceTimersByTimeAsync(PTY_POLL_INTERVAL_MS * 2)
      expect(remote.calls.filter(call => call === 'read')).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('write forwards raw text to the Remote', async () => {
    const remote = new FakeTerminalRemote()
    const client = new PtyClient(SESSION, remote)
    remote.openResult = { ok: true, value: { id: 'pty-1', motd: '' } }
    await client.open()
    await client.write('ls\r')
    expect(remote.calls).toContain('write')
  })

  it('write is a no-op before open', async () => {
    const remote = new FakeTerminalRemote()
    const client = new PtyClient(SESSION, remote)
    await client.write('x')
    expect(remote.calls).not.toContain('write')
  })

  it('read exited closes the terminal and stops polling', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeTerminalRemote()
      remote.readResults = [
        { ok: true, value: { text: 'bye', truncated: false, exited: true } },
      ]
      const client = new PtyClient(SESSION, remote)
      const output: string[] = []
      client.onOutput = (read) => { output.push(read.text) }
      await client.open()
      await vi.advanceTimersByTimeAsync(PTY_POLL_INTERVAL_MS)
      expect(output).toEqual(['bye'])
      expect(client.statusSource.getSnapshot()).toMatchObject({ state: 'closed' })
      expect(remote.calls).toContain('close')
      await vi.advanceTimersByTimeAsync(PTY_POLL_INTERVAL_MS * 2)
      expect(remote.calls.filter(call => call === 'read')).toHaveLength(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('close is idempotent and safe when idle', async () => {
    const remote = new FakeTerminalRemote()
    const client = new PtyClient(SESSION, remote)
    await client.close()
    await client.close()
    expect(remote.calls).not.toContain('close')
    expect(client.statusSource.getSnapshot()).toMatchObject({ state: 'closed' })
  })

  it('truncated reads surface through the output sink', async () => {
    vi.useFakeTimers()
    try {
      const remote = new FakeTerminalRemote()
      remote.readResults = [
        { ok: true, value: { text: 'full', truncated: true, exited: false } },
      ]
      const client = new PtyClient(SESSION, remote)
      const reads: { text: string; truncated: boolean }[] = []
      client.onOutput = (read) => { reads.push({ text: read.text, truncated: read.truncated }) }
      await client.open()
      await vi.advanceTimersByTimeAsync(PTY_POLL_INTERVAL_MS)
      expect(reads[0]).toEqual({ text: 'full', truncated: true })
      await client.close()
    } finally {
      vi.useRealTimers()
    }
  })
})

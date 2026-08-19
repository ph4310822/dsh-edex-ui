/**
 * Per-session embedded-PTY controller: opens one browser terminal through the
 * terminalUI Remote, streams output deltas through a poll loop, and exposes a
 * bare observable status source for the inject hooks compartment. The poll
 * loop is generation-fenced so a superseded open or close can never reconnect
 * a stale terminal.
 */
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { TerminalReadResult } from '@deepseek-ai/dsh-host-terminal-bridge/types'
import { IDLE_PTY_STATUS, type PtyStatus, type TerminalUIRemote } from './contract.ts'

/** Poll interval for PTY output deltas. */
export const PTY_POLL_INTERVAL_MS = 200

/** Bare observable snapshot source (getSnapshot + subscribe). */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** Mutable observable source backing the PTY status hook. */
class PtyStatusSource implements ObservableSource<PtyStatus> {
  private value: PtyStatus = IDLE_PTY_STATUS
  private readonly listeners = new Set<() => void>()

  getSnapshot(): PtyStatus {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: PtyStatus): void {
    this.value = next
    for (const listener of this.listeners) listener()
  }
}

/**
 * One session's embedded browser terminal.
 * @param sessionId - owning session identity sent as the Remote agent scope.
 * @param remote - the terminalUI Remote face.
 * @param pollIntervalMs - output delta poll cadence.
 */
export class PtyClient {
  private readonly source = new PtyStatusSource()
  private timer: ReturnType<typeof setInterval> | undefined
  private generation = 0
  private id: string | null = null

  /** Sink for output deltas; assigned by the terminal panel component. */
  onOutput: ((read: TerminalReadResult) => void) | null = null

  constructor(
    private readonly sessionId: SessionId,
    private readonly remote: TerminalUIRemote,
    private readonly pollIntervalMs: number = PTY_POLL_INTERVAL_MS,
  ) {}

  /** Bare observable status source bound to the `usePtyStatus` hook by the renderer. */
  get statusSource(): ObservableSource<PtyStatus> {
    return this.source
  }

  /**
   * Open a bash PTY for the session and start polling output.
   * @param cwd - optional initial working directory.
   */
  async open(cwd?: string): Promise<void> {
    const generation = ++this.generation
    this.source.set({ id: null, state: 'connecting', error: null })
    const result = await this.remote.open(this.sessionId, {
      ...cwd !== undefined ? { cwd } : {},
    })
    if (generation !== this.generation) return
    if (!result.ok) {
      this.source.set({ id: null, state: 'failed', error: result.error.message })
      return
    }
    this.id = result.value.id
    this.source.set({ id: this.id, state: 'connected', error: null })
    this.startPolling(generation)
  }

  /**
   * Write raw text to the open PTY.
   * @param text - raw bytes.
   */
  async write(text: string): Promise<void> {
    const id = this.id
    if (id === null) return
    const result = await this.remote.write(this.sessionId, { id, text })
    // A transient write failure surfaces through the poll loop, not here.
    void result
  }

  /**
   * Close the PTY and stop polling. Safe to call repeatedly and when idle.
   * @param reason - closing reason recorded on the host.
   */
  async close(reason = 'browser panel closed'): Promise<void> {
    this.generation += 1
    const id = this.id
    this.id = null
    this.stopPolling()
    this.source.set({ id: null, state: 'closed', error: null })
    if (id === null) return
    const result = await this.remote.close(this.sessionId, { id, reason })
    // Best-effort: the host closes the owned process tree; a failure leaves
    // the owner cleanup to the agent lifecycle.
    void result
  }

  private startPolling(generation: number): void {
    this.stopPolling()
    this.timer = setInterval(() => { void this.poll(generation) }, this.pollIntervalMs)
  }

  private stopPolling(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  private async poll(generation: number): Promise<void> {
    const id = this.id
    if (id === null || generation !== this.generation) return
    const result = await this.remote.read(this.sessionId, { id })
    if (generation !== this.generation) return
    if (!result.ok) return
    const read = result.value
    this.onOutput?.(read)
    if (read.exited) void this.close('pty exited')
  }
}

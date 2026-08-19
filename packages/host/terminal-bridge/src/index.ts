/** Browser terminal Host Remote: interactive PTY control over the terminal seam. */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
// Type-only: pulls the terminal service's Context merge (ctx.terminals).
import type {} from '@deepseek-ai/dsh-terminal'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { TerminalSessionIdValue } from '@deepseek-ai/dsh-terminal'
// Typert-generated ./typert and ./remote artifacts import Zod at runtime.
import type {} from 'zod'
import type {
  TerminalCloseRequest,
  TerminalOpenRequest,
  TerminalOpenResult,
  TerminalReadRequest,
  TerminalReadResult,
  TerminalSignalRequest,
  TerminalWriteRequest,
} from './types.ts'

export type * from './types.ts'

/** Host-side incremental-read cursor for one browser PTY. */
interface ReadCursor {
  /** Retained line count observed at the previous read. */
  lastTotalLines: number
}

/** Runtime mirror: the browser terminal name reserved on the PTY registry. */
const UI_TERMINAL_NAME = 'ui-terminal'

/** Remote-only service bridging browser terminal panels to {@link TerminalSessionService}. */
export class TerminalUIBridgeService extends TypertRemoteService {
  static inject = ['terminals']

  private readonly cursors = new Map<TerminalSessionIdValue, ReadCursor>()

  constructor(ctx: Context) {
    super(ctx, 'terminalUI')
  }

  /**
   * Spawn one interactive bash PTY under the session's agent and seed its read
   * cursor so the first poll returns only output after the MOTD.
   * @param agent - exact live Agent resolved from the wire identity.
   * @param request - optional cwd and initial geometry.
   * @returns identity and initial output for the new PTY.
   */
  @Remote('open')
  async open(agent: Agent, request?: TerminalOpenRequest): Promise<TerminalOpenResult> {
    const req = request ?? {}
    const result = await this.ctx.terminals.spawn(agent, {
      type: 'bash',
      name: UI_TERMINAL_NAME,
      ...req.cwd !== undefined ? { cwd: req.cwd } : {},
      ...req.rows !== undefined ? { rows: req.rows } : {},
      ...req.cols !== undefined ? { cols: req.cols } : {},
    })
    const seed = this.ctx.terminals.read(agent, result.sessionId, { offset: 0, count: 1 })
    this.cursors.set(result.sessionId, { lastTotalLines: seed.totalLines })
    return { id: result.sessionId, motd: result.motd }
  }

  /**
   * Write raw bytes to one browser PTY without an exclusive send wait.
   * @param agent - exact live Agent resolved from the wire identity.
   * @param request - target identity and raw text.
   */
  @Remote('write')
  async write(agent: Agent, request: TerminalWriteRequest): Promise<void> {
    this.expectCursor(request.id)
    await this.ctx.terminals.write(agent, request.id, request.text)
  }

  /**
   * Read the next incremental output delta of one browser PTY. The cursor
   * advances by retained line count; a scrollback reset returns the whole
   * retained buffer with `truncated: true` so the client redraws.
   * @param agent - exact live Agent resolved from the wire identity.
   * @param request - target identity.
   * @returns new output since the previous read, or a full redraw on reset.
   */
  @Remote('read')
  read(agent: Agent, request: TerminalReadRequest): TerminalReadResult {
    const cursor = this.expectCursor(request.id)
    const probe = this.ctx.terminals.read(agent, request.id, { offset: 0, count: 1 })
    const exited = !this.ctx.terminals.list(agent).some(session => session.sessionId === request.id)
    if (exited) {
      this.cursors.delete(request.id)
      return { text: '', truncated: false, exited: true }
    }
    if (probe.totalLines < cursor.lastTotalLines) {
      cursor.lastTotalLines = probe.totalLines
      const full = this.ctx.terminals.read(agent, request.id, { offset: 0 })
      return { text: full.text, truncated: true, exited: false }
    }
    const delta = probe.totalLines - cursor.lastTotalLines
    cursor.lastTotalLines = probe.totalLines
    if (delta <= 0) return { text: '', truncated: false, exited: false }
    const tail = this.ctx.terminals.read(agent, request.id, { offset: 0, count: delta })
    return { text: tail.text, truncated: tail.truncated, exited: false }
  }

  /**
   * Deliver one allowed signal to one browser PTY.
   * @param agent - exact live Agent resolved from the wire identity.
   * @param request - target identity and signal name.
   * @returns the delivered foreground process-group identity.
   */
  @Remote('signal')
  signal(agent: Agent, request: TerminalSignalRequest): Promise<{ targetPgid: number }> {
    this.expectCursor(request.id)
    return this.ctx.terminals.signal(agent, request.id, request.signal)
  }

  /**
   * Close one browser PTY and drop its read cursor.
   * @param agent - exact live Agent resolved from the wire identity.
   * @param request - target identity and optional closing reason.
   * @returns whether the session was still open when killed.
   */
  @Remote('close')
  async close(agent: Agent, request: TerminalCloseRequest): Promise<boolean> {
    this.expectCursor(request.id)
    this.cursors.delete(request.id)
    return this.ctx.terminals.kill(agent, request.id, request.reason ?? 'browser terminal closed')
  }

  /**
   * Require a live cursor for the target identity.
   * @param id - target PTY identity from open.
   * @returns the cursor record.
   */
  private expectCursor(id: TerminalSessionIdValue): ReadCursor {
    const cursor = this.cursors.get(id)
    if (cursor === undefined) {
      throw new Error(`terminalUI: unknown or closed browser terminal "${id}"`)
    }
    return cursor
  }
}

export default TerminalUIBridgeService

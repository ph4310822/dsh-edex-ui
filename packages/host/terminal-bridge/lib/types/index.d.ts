/** Browser terminal Host Remote: interactive PTY control over the terminal seam. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { TerminalCloseRequest, TerminalOpenRequest, TerminalOpenResult, TerminalReadRequest, TerminalReadResult, TerminalSignalRequest, TerminalWriteRequest } from './types.ts';
export type * from './types.ts';
/** Remote-only service bridging browser terminal panels to {@link TerminalSessionService}. */
export declare class TerminalUIBridgeService extends TypertRemoteService {
    static inject: string[];
    private readonly cursors;
    constructor(ctx: Context);
    /**
     * Spawn one interactive bash PTY under the session's agent and seed its read
     * cursor so the first poll returns only output after the MOTD.
     * @param agent - exact live Agent resolved from the wire identity.
     * @param request - optional cwd and initial geometry.
     * @returns identity and initial output for the new PTY.
     */
    open(agent: Agent, request?: TerminalOpenRequest): Promise<TerminalOpenResult>;
    /**
     * Write raw bytes to one browser PTY without an exclusive send wait.
     * @param agent - exact live Agent resolved from the wire identity.
     * @param request - target identity and raw text.
     */
    write(agent: Agent, request: TerminalWriteRequest): Promise<void>;
    /**
     * Read the next incremental output delta of one browser PTY. The cursor
     * advances by retained line count; a scrollback reset returns the whole
     * retained buffer with `truncated: true` so the client redraws.
     * @param agent - exact live Agent resolved from the wire identity.
     * @param request - target identity.
     * @returns new output since the previous read, or a full redraw on reset.
     */
    read(agent: Agent, request: TerminalReadRequest): TerminalReadResult;
    /**
     * Deliver one allowed signal to one browser PTY.
     * @param agent - exact live Agent resolved from the wire identity.
     * @param request - target identity and signal name.
     * @returns the delivered foreground process-group identity.
     */
    signal(agent: Agent, request: TerminalSignalRequest): Promise<{
        targetPgid: number;
    }>;
    /**
     * Close one browser PTY and drop its read cursor.
     * @param agent - exact live Agent resolved from the wire identity.
     * @param request - target identity and optional closing reason.
     * @returns whether the session was still open when killed.
     */
    close(agent: Agent, request: TerminalCloseRequest): Promise<boolean>;
    /**
     * Require a live cursor for the target identity.
     * @param id - target PTY identity from open.
     * @returns the cursor record.
     */
    private expectCursor;
}
export default TerminalUIBridgeService;
//# sourceMappingURL=index.d.ts.map
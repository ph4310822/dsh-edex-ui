/**
 * Per-session embedded-PTY controller: opens one browser terminal through the
 * terminalUI Remote, streams output deltas through a poll loop, and exposes a
 * bare observable status source for the inject hooks compartment. The poll
 * loop is generation-fenced so a superseded open or close can never reconnect
 * a stale terminal.
 */
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { TerminalReadResult } from '@deepseek-ai/dsh-host-terminal-bridge/types';
import { type PtyStatus, type TerminalUIRemote } from './contract.ts';
/** Poll interval for PTY output deltas. */
export declare const PTY_POLL_INTERVAL_MS = 200;
/** Bare observable snapshot source (getSnapshot + subscribe). */
export interface ObservableSource<T> {
    getSnapshot(): T;
    subscribe(listener: () => void): () => void;
}
/**
 * One session's embedded browser terminal.
 * @param sessionId - owning session identity sent as the Remote agent scope.
 * @param remote - the terminalUI Remote face.
 * @param pollIntervalMs - output delta poll cadence.
 */
export declare class PtyClient {
    private readonly sessionId;
    private readonly remote;
    private readonly pollIntervalMs;
    private readonly source;
    private timer;
    private generation;
    private id;
    /** Sink for output deltas; assigned by the terminal panel component. */
    onOutput: ((read: TerminalReadResult) => void) | null;
    constructor(sessionId: SessionId, remote: TerminalUIRemote, pollIntervalMs?: number);
    /** Bare observable status source bound to the `usePtyStatus` hook by the renderer. */
    get statusSource(): ObservableSource<PtyStatus>;
    /**
     * Open a bash PTY for the session and start polling output.
     * @param cwd - optional initial working directory.
     */
    open(cwd?: string): Promise<void>;
    /**
     * Write raw text to the open PTY.
     * @param text - raw bytes.
     */
    write(text: string): Promise<void>;
    /**
     * Close the PTY and stop polling. Safe to call repeatedly and when idle.
     * @param reason - closing reason recorded on the host.
     */
    close(reason?: string): Promise<void>;
    private startPolling;
    private stopPolling;
    private poll;
}
//# sourceMappingURL=pty-client.d.ts.map
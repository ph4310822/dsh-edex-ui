/** Wire vocabulary for the browser terminal Host Remote. */
import type { TerminalSessionId, TerminalSignal } from '@deepseek-ai/dsh-terminal';
/** Request to open one browser PTY under the session's agent. */
export interface TerminalOpenRequest {
    /** Optional initial working directory; falls back to the backend policy root. */
    readonly cwd?: string;
    /** Optional initial terminal rows; backends fall back to their own default. */
    readonly rows?: number;
    /** Optional initial terminal columns; backends fall back to their own default. */
    readonly cols?: number;
}
/** Result of opening one browser PTY. */
export interface TerminalOpenResult {
    /** Registry-minted identity for every later operation. */
    readonly id: TerminalSessionId;
    /** Initial bounded output captured before publication. */
    readonly motd: string;
}
/** Request to write raw bytes to one browser PTY. */
export interface TerminalWriteRequest {
    /** Target PTY identity from open. */
    readonly id: TerminalSessionId;
    /** Raw bytes to write. */
    readonly text: string;
}
/** Request for the next incremental output delta of one browser PTY. */
export interface TerminalReadRequest {
    /** Target PTY identity from open. */
    readonly id: TerminalSessionId;
}
/** Incremental output delta for one browser PTY. */
export interface TerminalReadResult {
    /** New output since the previous read, in chronological order. */
    readonly text: string;
    /** True when retained scrollback was reset; the client should clear and redraw. */
    readonly truncated: boolean;
    /** True when the top-level PTY session is gone (exited or closed). */
    readonly exited: boolean;
}
/** Request to deliver one allowed signal to one browser PTY. */
export interface TerminalSignalRequest {
    /** Target PTY identity from open. */
    readonly id: TerminalSessionId;
    /** Allowed POSIX signal name. */
    readonly signal: TerminalSignal;
}
/** Request to close one browser PTY. */
export interface TerminalCloseRequest {
    /** Target PTY identity from open. */
    readonly id: TerminalSessionId;
    /** Optional closing reason recorded with the owner cleanup. */
    readonly reason?: string;
}
//# sourceMappingURL=types.d.ts.map
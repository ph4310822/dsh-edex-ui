/** Shared contracts for the terminal shell plugin. */
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client';
import type { SystemMetricsSnapshot } from '@deepseek-ai/dsh-host-system-metrics/types';
import type { TerminalCloseRequest, TerminalOpenRequest, TerminalOpenResult, TerminalReadRequest, TerminalReadResult, TerminalSignalRequest, TerminalWriteRequest } from '@deepseek-ai/dsh-host-terminal-bridge/types';
/** The generated systemMetrics Remote face narrowed to what this plugin calls. */
export interface SystemMetricsRemote {
    snapshot: () => Promise<RemoteResult<SystemMetricsSnapshot>>;
}
/** The generated terminalUI Remote face narrowed to what this plugin calls. */
export interface TerminalUIRemote {
    open: (agentId: SessionId, request: TerminalOpenRequest) => Promise<RemoteResult<TerminalOpenResult>>;
    write: (agentId: SessionId, request: TerminalWriteRequest) => Promise<RemoteResult<void>>;
    read: (agentId: SessionId, request: TerminalReadRequest) => Promise<RemoteResult<TerminalReadResult>>;
    signal: (agentId: SessionId, request: TerminalSignalRequest) => Promise<RemoteResult<{
        targetPgid: number;
    }>>;
    close: (agentId: SessionId, request: TerminalCloseRequest) => Promise<RemoteResult<boolean>>;
}
/** Live status of one session's embedded PTY, surfaced through the inject hooks compartment. */
export interface PtyStatus {
    /** Registry-minted terminal identity; null before the first successful open. */
    readonly id: string | null;
    readonly state: 'idle' | 'connecting' | 'connected' | 'closed' | 'failed';
    /** Last failure message when state is `failed`. */
    readonly error: string | null;
}
/** One rendered terminal log line. */
export interface TerminalLine {
    /** Stable identity for React keys. */
    readonly key: string;
    /** Sortable position; terminal lines render in ascending order. */
    readonly seq: number;
    readonly kind: 'prompt' | 'output' | 'tool' | 'system' | 'error' | 'stream';
    /** Visible text without control decorations. */
    readonly text: string;
    /** Optional secondary text (tool result bodies, system details). */
    readonly detail?: string;
}
/** Terminal chat renderer kinds (the plugin's own business view model). */
export type TerminalChatKind = 'terminal-user' | 'terminal-context' | 'terminal-assistant' | 'terminal-tool' | 'terminal-turn-error' | 'terminal-compaction' | 'terminal-unknown';
/** One user or injected-context message row. */
export interface TerminalUserData {
    readonly kind: 'user';
    readonly seq: number;
    readonly time: number;
    readonly text: string;
}
/** One non-user context injection row. */
export interface TerminalContextData {
    readonly kind: 'context';
    readonly seq: number;
    readonly time: number;
    readonly text: string;
    readonly source: string;
}
/** One assistant step: streaming (blocks accumulated), settled, or interrupted. */
export interface TerminalAssistantData {
    readonly kind: 'assistant';
    readonly seq: number;
    readonly time: number;
    readonly turn: number;
    readonly step: number;
    readonly status: 'running' | 'settled' | 'interrupted';
    /** Concatenated visible text of the step's text blocks. */
    readonly text: string;
    /** Tool calls announced in this step, in order. */
    readonly tools: readonly {
        readonly callId: string;
        readonly name: string;
    }[];
    /** Concatenated reasoning text when present. */
    readonly reasoning?: string;
}
/** One tool lifecycle row: running until its result lands. */
export interface TerminalToolData {
    readonly kind: 'tool';
    readonly seq: number;
    readonly time: number;
    readonly callId: string;
    readonly name: string;
    readonly status: 'running' | 'ok' | 'error';
    /** Tool-result body text when available. */
    readonly detail?: string;
}
/** One terminal turn failure row. */
export interface TerminalTurnErrorData {
    readonly kind: 'turn-error';
    readonly seq: number;
    readonly time: number;
    readonly message: string;
}
/** One durable compaction checkpoint row. */
export interface TerminalCompactionData {
    readonly kind: 'compaction';
    readonly seq: number;
    readonly time: number;
}
/** One unknown surface event row. */
export interface TerminalUnknownData {
    readonly kind: 'unknown';
    readonly seq: number;
    readonly time: number;
    readonly type: string;
}
/** Terminal chat node payload map, keyed by renderer kind. */
export interface TerminalChatDataMap {
    'terminal-user': TerminalUserData;
    'terminal-context': TerminalContextData;
    'terminal-assistant': TerminalAssistantData;
    'terminal-tool': TerminalToolData;
    'terminal-turn-error': TerminalTurnErrorData;
    'terminal-compaction': TerminalCompactionData;
    'terminal-unknown': TerminalUnknownData;
}
/** The union of every terminal chat payload. */
export type TerminalChatData = TerminalChatDataMap[TerminalChatKind];
/** Initial PTY status before any interaction. */
export declare const IDLE_PTY_STATUS: PtyStatus;
//# sourceMappingURL=contract.d.ts.map
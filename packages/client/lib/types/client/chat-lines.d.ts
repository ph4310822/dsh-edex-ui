/**
 * Pure chat-to-terminal-log projection: ordered `TerminalLine[]` out of the
 * chat store's rendered nodes plus pending interactions. Presentation methods
 * stay pure functions of their input so the chat component can memoize on the
 * snapshot and the projection is unit-testable without rendering machinery.
 */
import type { ChatConversationViewNode, PendingInteraction } from '@deepseek-ai/dsh-client-runtime/client';
import type { TerminalLine } from './contract.ts';
/** Bounds for one tool-result body line. */
export declare const TOOL_RESULT_MAX_CHARS = 500;
/** The projection input the chat component feeds from the session snapshot. */
export interface ChatRenderInput {
    /** Rendered chat nodes in render order. */
    readonly nodes: readonly ChatConversationViewNode[];
    /** Host-owned pending interactions (approval/question waits). */
    readonly pending: readonly PendingInteraction[];
}
/**
 * Project a session snapshot's chat facts into ordered terminal log lines.
 * @param input - rendered nodes and pending interactions.
 * @returns log lines in ascending render order.
 */
export declare function renderChatLines(input: ChatRenderInput): TerminalLine[];
//# sourceMappingURL=chat-lines.d.ts.map
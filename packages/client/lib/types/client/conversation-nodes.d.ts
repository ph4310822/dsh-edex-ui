/**
 * Terminal chat business assembly: the plugin's own ConversationNode
 * Definitions (user/context, assistant streaming, tool lifecycle, turn
 * failure, unknown fallback) plus a minimal Chat target builder. The default
 * web surface's ui-conversation is not composed in the terminal profile, so
 * this plugin owns the whole chat projection it renders.
 */
import type { Context } from '@deepseek-ai/cordis';
import type { AssistantBlock, ChatConversationViewNode, ChatSnapshot, ConversationMatch, ConversationNodeDefinition, ConversationTimelineSnapshot, ConversationViewBuilder, ConversationViewDefinition } from '@deepseek-ai/dsh-client-runtime/client';
import type { TerminalChatData, TerminalCompactionData, TerminalUnknownData } from './contract.ts';
interface MessageState {
    readonly kind: 'user' | 'context';
    readonly seq: number;
    readonly time: number;
    readonly text: string;
    readonly source: string;
}
/** User and injected-context message Definition. */
export declare const messageDefinition: ConversationNodeDefinition<MessageState>;
interface AssistantState {
    readonly turn: number;
    readonly step: number;
    readonly blocks: readonly (AssistantBlock | undefined)[];
    readonly firstVisibleSeq: number | undefined;
    readonly hidden: boolean;
    readonly final: ConversationMatch | undefined;
}
/** Per-step Assistant streaming/final/interruption Definition. */
export declare const assistantDefinition: ConversationNodeDefinition<AssistantState>;
interface ToolState {
    readonly callId: string;
    readonly name: string;
    readonly callSeq: number;
    readonly result?: {
        readonly seq: number;
        readonly time: number;
        readonly isError: boolean;
        readonly detail: string;
    };
}
/** Tool call/result correlation Definition (no subcall tree in v1). */
export declare const toolDefinition: ConversationNodeDefinition<ToolState>;
interface TurnErrorState {
    readonly turn: number;
    readonly seq: number;
    readonly time: number;
    readonly message: string;
}
/** Terminal turn failure Definition. */
export declare const turnErrorDefinition: ConversationNodeDefinition<TurnErrorState>;
/** Durable compaction checkpoint marker Definition (summary stays a follow-up). */
export declare const compactionDefinition: ConversationNodeDefinition<TerminalCompactionData>;
/** Unknown surface event fallback Definition (documented default arm). */
export declare const unknownDefinition: ConversationNodeDefinition<TerminalUnknownData>;
/** Incremental Chat target builder: order by anchorSeq, minimal legacy slice. */
export declare class TerminalChatBuilder implements ConversationViewBuilder<ChatConversationViewNode, ChatSnapshot> {
    private readonly store;
    private order;
    readonly empty: ChatSnapshot;
    constructor();
    replace(input: {
        nodes: readonly ChatConversationViewNode[];
        timeline: ConversationTimelineSnapshot;
    }): ChatSnapshot;
    apply(input: {
        upserts: readonly ChatConversationViewNode[];
        timeline: ConversationTimelineSnapshot;
    }): ChatSnapshot;
    private snapshot;
}
/** Chat target factory contributed to the Runtime view registry. */
export declare const terminalChatViewDefinition: ConversationViewDefinition<ChatConversationViewNode, ChatSnapshot>;
/** Register every terminal chat Definition and the Chat target builder. */
export declare function registerTerminalConversationNodes(ctx: Context): void;
export type { TerminalChatData };
//# sourceMappingURL=conversation-nodes.d.ts.map
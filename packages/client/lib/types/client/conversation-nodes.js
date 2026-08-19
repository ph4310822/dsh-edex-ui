import { contextProvenance, emptyAssistantBlock, isAppendSurfaceEvent, isReplacementSurfaceEvent, toAssistantBlock, } from '@deepseek-ai/dsh-client-runtime/client';
/** Concatenated plain text of a message's text blocks. */
function contentText(blocks) {
    return blocks
        .filter((block) => block.type === 'text')
        .map(block => block.text)
        .join('')
        .trim();
}
/** Resolve one Context's best currently loaded event Location. */
function contextLocation(context) {
    return context.start?.location ?? context.matches[0]?.location ?? { kind: 'unresolved' };
}
/** Build one final Chat target Node with the engine-owned stable key. */
function chatNode(context, kind, anchorSeq, data, visibility = 'visible') {
    return {
        key: context.key,
        kind,
        id: context.id,
        target: 'chat',
        anchorSeq,
        location: contextLocation(context),
        visibility,
        data,
    };
}
/** Whether one user/message is the durable compaction checkpoint marker. */
function isCompactionCheckpoint(event) {
    if (event.type !== 'user/message' || !isReplacementSurfaceEvent(event))
        return false;
    const source = event.data.source;
    return source.kind === 'plugin' && source.plugin === 'compact';
}
/** User and injected-context message Definition. */
export const messageDefinition = {
    kind: 'terminal-message',
    target: 'chat',
    match: event => event.type === 'user/message'
        && isAppendSurfaceEvent(event)
        && !isCompactionCheckpoint(event)
        ? { id: String(event.data.id), role: 'start' }
        : null,
    start: (_context, match) => {
        if (match.event.type !== 'user/message')
            throw new Error('terminal-message start requires user/message');
        const event = match.event;
        const provenance = contextProvenance(event.data.source);
        return event.data.source.kind === 'user'
            ? {
                kind: 'user',
                seq: event.seq,
                time: event.time,
                text: contentText(event.data.content),
                source: 'user',
            }
            : {
                kind: 'context',
                seq: event.seq,
                time: event.time,
                text: contentText(event.data.content),
                source: provenance.kind === 'plugin' ? provenance.plugin : provenance.kind,
            };
    },
    update: context => context.state,
    buildViewNode: (context) => {
        if (context.state === undefined)
            return null;
        const state = context.state;
        if (state.kind === 'user') {
            const data = { kind: 'user', seq: state.seq, time: state.time, text: state.text };
            return chatNode(context, 'terminal-user', state.seq, data);
        }
        const data = {
            kind: 'context', seq: state.seq, time: state.time, text: state.text, source: state.source,
        };
        return chatNode(context, 'terminal-context', state.seq, data);
    },
};
function initialState(turn, step) {
    return { turn, step, blocks: [], firstVisibleSeq: undefined, hidden: false, final: undefined };
}
function compactBlocks(blocks) {
    return blocks.filter((block) => block !== undefined);
}
function hasVisibleContent(blocks) {
    return blocks.some((block) => {
        if (block.kind === 'tool-call')
            return false;
        if (block.kind === 'text' || block.kind === 'reasoning')
            return block.text.trim() !== '';
        return true;
    });
}
function updateChunk(state, match) {
    if (match.event.type !== 'assistant/chunk')
        return state;
    const chunk = match.event.data.chunk;
    const blocks = [...state.blocks];
    switch (chunk.type) {
        case 'block-start':
            blocks[chunk.index] = emptyAssistantBlock(chunk.blockType);
            break;
        case 'text-delta': {
            const previous = blocks[chunk.index];
            blocks[chunk.index] = { kind: 'text', text: (previous?.kind === 'text' ? previous.text : '') + chunk.text };
            break;
        }
        case 'reasoning-delta': {
            const previous = blocks[chunk.index];
            blocks[chunk.index] = { kind: 'reasoning', text: (previous?.kind === 'reasoning' ? previous.text : '') + chunk.text };
            break;
        }
        case 'tool-call-delta': {
            const previous = blocks[chunk.index];
            const base = previous?.kind === 'tool-call'
                ? previous
                : { kind: 'tool-call', id: '', name: '', arguments: '' };
            blocks[chunk.index] = {
                kind: 'tool-call',
                id: base.id || String(chunk.id),
                name: chunk.name ?? base.name,
                arguments: base.arguments + chunk.argumentsDelta,
            };
            break;
        }
        case 'block-end':
            blocks[chunk.index] = toAssistantBlock(chunk.block);
            break;
        case 'usage':
        case 'finish':
            return state;
        default: {
            /* v8 ignore next -- unreachable: every StreamChunk member has an arm above; the default guards future member additions. */
            const exhaustive = chunk;
            void exhaustive;
            return state;
        }
    }
    const visible = hasVisibleContent(compactBlocks(blocks));
    return {
        ...state,
        blocks,
        hidden: visible ? false : state.hidden,
        ...visible && state.firstVisibleSeq === undefined
            ? { firstVisibleSeq: match.event.seq }
            : {},
    };
}
/** Whether the Context's step or turn has closed (needed to distinguish an interrupted stream from a running one). */
function closedBoundary(context) {
    const location = contextLocation(context);
    if (location.kind === 'step')
        return location.step.status === 'closed' || location.turn.status === 'closed';
    return location.kind === 'turn' && location.turn.status === 'closed';
}
function projectAssistant(context) {
    const state = context.state ?? fallbackState(context);
    if (state === undefined)
        return undefined;
    const settled = state.final?.event.type === 'assistant/message'
        ? state.final.event
        : undefined;
    const blocks = settled === undefined
        ? compactBlocks(state.blocks)
        : settled.data.message.content.map(toAssistantBlock);
    const text = blocks.filter((block) => block.kind === 'text')
        .map(block => block.text)
        .join('')
        .trim();
    const reasoning = blocks
        .filter((block) => block.kind === 'reasoning')
        .map(block => block.text)
        .join('\n');
    const tools = blocks
        .filter((block) => block.kind === 'tool-call')
        .map(block => ({ callId: block.callId, name: block.name }));
    const interrupted = settled === undefined && closedBoundary(context) && hasInterruptionEvidence(blocks);
    const status = interrupted ? 'interrupted' : settled === undefined ? 'running' : 'settled';
    const anchorSeq = settled?.seq ?? state.firstVisibleSeq ?? context.matches[0]?.event.seq ?? 0;
    const time = settled?.time ?? context.matches[0]?.event.time ?? 0;
    return {
        kind: 'assistant',
        seq: anchorSeq,
        time,
        turn: state.turn,
        step: state.step,
        status,
        text,
        tools,
        ...reasoning === '' ? {} : { reasoning },
    };
}
function hasInterruptionEvidence(blocks) {
    return blocks.some((block) => {
        if (block.kind === 'text' || block.kind === 'reasoning')
            return block.text.trim() !== '';
        return true;
    });
}
function fallbackState(context) {
    let state;
    for (const match of context.matches) {
        if (match.event.type === 'assistant/chunk') {
            state ??= initialState(match.event.data.turn, match.event.data.step);
            state = updateChunk(state, match);
            continue;
        }
        if (match.event.type === 'assistant/message' && isAppendSurfaceEvent(match.event)) {
            state ??= initialState(match.event.data.turn, match.event.data.step);
            state = { ...state, hidden: false, final: match };
            continue;
        }
    }
    return state;
}
/** Per-step Assistant streaming/final/interruption Definition. */
export const assistantDefinition = {
    kind: 'terminal-assistant',
    target: 'chat',
    match: (event) => {
        if (event.type === 'step/start')
            return { id: `${event.data.turn}:${event.data.step}`, role: 'start' };
        if (event.type === 'assistant/chunk'
            || (event.type === 'assistant/message' && isAppendSurfaceEvent(event))) {
            return { id: `${event.data.turn}:${event.data.step}`, role: 'update' };
        }
        return null;
    },
    start: (_context, match) => {
        if (match.event.type !== 'step/start')
            throw new Error('terminal-assistant start requires step/start');
        return initialState(match.event.data.turn, match.event.data.step);
    },
    update: (context, match) => {
        if (match.event.type === 'assistant/chunk')
            return updateChunk(context.state, match);
        if (match.event.type === 'assistant/message') {
            return { ...context.state, hidden: false, final: match };
        }
        return context.state;
    },
    publication: (match) => {
        if (match.event.type === 'step/start')
            return 'none';
        if (match.event.type !== 'assistant/chunk')
            return 'immediate';
        const type = match.event.data.chunk.type;
        return type === 'usage' || type === 'finish' ? 'none' : 'animation-frame';
    },
    buildViewNode: (context) => {
        const projected = projectAssistant(context);
        if (projected === undefined)
            return null;
        const visible = projected.text !== '' || projected.tools.length > 0
            || projected.reasoning !== undefined || projected.status !== 'running';
        return chatNode(context, 'terminal-assistant', projected.seq, projected, visible ? 'visible' : 'hidden');
    },
};
/** Tool call/result correlation Definition (no subcall tree in v1). */
export const toolDefinition = {
    kind: 'terminal-tool',
    target: 'chat',
    match: (event) => {
        if (event.type === 'tool/call')
            return { id: String(event.data.callId), role: 'start' };
        if (event.type === 'tool/result')
            return { id: String(event.data.message.content[0]?.toolCallId ?? ''), role: 'update' };
        return null;
    },
    start: (_context, match) => {
        if (match.event.type !== 'tool/call')
            throw new Error('terminal-tool start requires tool/call');
        return { callId: String(match.event.data.callId), name: match.event.data.name, callSeq: match.event.seq };
    },
    update: (context, match) => {
        if (match.event.type !== 'tool/result')
            return context.state;
        const resultBlock = match.event.data.message.content[0];
        return {
            ...context.state,
            result: {
                seq: match.event.seq,
                time: match.event.time,
                isError: resultBlock?.isError === true || match.event.data.error !== undefined,
                detail: resultBlock === undefined ? '' : contentText(resultBlock.content),
            },
        };
    },
    publication: () => 'immediate',
    buildViewNode: (context) => {
        if (context.state === undefined)
            return null;
        const state = context.state;
        const data = state.result === undefined
            ? { kind: 'tool', seq: state.callSeq, time: 0, callId: state.callId, name: state.name, status: 'running' }
            : {
                kind: 'tool',
                seq: state.result.seq,
                time: state.result.time,
                callId: state.callId,
                name: state.name,
                status: state.result.isError ? 'error' : 'ok',
                ...state.result.detail === '' ? {} : { detail: state.result.detail },
            };
        return chatNode(context, 'terminal-tool', data.seq, data);
    },
};
/** Terminal turn failure Definition. */
export const turnErrorDefinition = {
    kind: 'terminal-turn-error',
    target: 'chat',
    match: (event) => {
        if (event.type !== 'turn/end' || event.data.reason.kind !== 'error')
            return null;
        return { id: String(event.data.turn), role: 'start' };
    },
    start: (_context, match) => {
        if (match.event.type !== 'turn/end')
            throw new Error('terminal-turn-error start requires turn/end');
        const failure = match.event.data.reason.error;
        return {
            turn: match.event.data.turn,
            seq: match.event.seq,
            time: match.event.time,
            message: typeof failure.message === 'string' ? failure.message : String(failure),
        };
    },
    update: context => context.state,
    buildViewNode: (context) => {
        if (context.state === undefined)
            return null;
        const state = context.state;
        const data = { kind: 'turn-error', seq: state.seq, time: state.time, message: state.message };
        return chatNode(context, 'terminal-turn-error', state.seq, data);
    },
};
// ── compaction checkpoint ────────────────────────────────────────────────────
/** Durable compaction checkpoint marker Definition (summary stays a follow-up). */
export const compactionDefinition = {
    kind: 'terminal-compaction',
    target: 'chat',
    match: event => event.type === 'user/message' && isCompactionCheckpoint(event)
        ? { id: String(event.data.id), role: 'start' }
        : null,
    start: (_context, match) => {
        if (match.event.type !== 'user/message')
            throw new Error('terminal-compaction start requires user/message');
        return { kind: 'compaction', seq: match.event.seq, time: match.event.time };
    },
    update: context => context.state,
    buildViewNode: (context) => {
        if (context.state === undefined)
            return null;
        return chatNode(context, 'terminal-compaction', context.state.seq, context.state);
    },
};
// ── unknown surface fallback ────────────────────────────────────────────────
/** Unknown surface event fallback Definition (documented default arm). */
export const unknownDefinition = {
    kind: 'terminal-unknown',
    target: 'chat',
    match: (event) => {
        if (!isAppendSurfaceEvent(event) && !isReplacementSurfaceEvent(event))
            return null;
        if (event.type === 'user/message')
            return null;
        if (event.type === 'assistant/message' || event.type === 'tool/result')
            return null;
        return { id: String(event.seq), role: 'start' };
    },
    start: (_context, match) => ({
        kind: 'unknown',
        seq: match.event.seq,
        time: match.event.time,
        type: match.event.type,
    }),
    update: context => context.state,
    buildViewNode: (context) => {
        if (context.state === undefined)
            return null;
        const state = context.state;
        return chatNode(context, 'terminal-unknown', state.seq, state);
    },
};
// ── minimal Chat target builder ─────────────────────────────────────────────
const EMPTY_TURNS = [];
const EMPTY_LIST = [];
/** One store node sorted by anchorSeq with stable reference semantics. */
class TerminalChatStore {
    byKey = new Map();
    valuesCache = EMPTY_LIST;
    valuesDirty = false;
    get(key) {
        return this.byKey.get(key);
    }
    values() {
        if (this.valuesDirty) {
            this.valuesCache = [...this.byKey.values()];
            this.valuesDirty = false;
        }
        return this.valuesCache;
    }
    replace(nodes) {
        this.byKey.clear();
        for (const node of nodes)
            this.byKey.set(node.key, node);
        this.valuesCache = [...this.byKey.values()];
        this.valuesDirty = false;
    }
    upsert(nodes) {
        let changed = false;
        for (const node of nodes) {
            if (this.byKey.get(node.key) === node)
                continue;
            this.byKey.set(node.key, node);
            changed = true;
        }
        if (changed)
            this.valuesDirty = true;
    }
}
const EMPTY_LOCATIONS = {
    getTurn: () => EMPTY_LIST,
    getStep: () => EMPTY_LIST,
};
/** Incremental Chat target builder: order by anchorSeq, minimal legacy slice. */
export class TerminalChatBuilder {
    store = new TerminalChatStore();
    order = EMPTY_LIST;
    empty;
    constructor() {
        this.empty = this.snapshot({ turnOrder: EMPTY_TURNS, turns: new Map() });
    }
    replace(input) {
        this.store.replace(input.nodes);
        this.order = orderedKeys(input.nodes);
        return this.snapshot(input.timeline);
    }
    apply(input) {
        this.store.upsert(input.upserts);
        this.order = orderedKeys(this.store.values());
        return this.snapshot(input.timeline);
    }
    snapshot(timeline) {
        const nodes = this.order.map(key => this.store.get(key)).filter((node) => node !== undefined);
        const legacy = {
            // The terminal chat data objects are the plugin's own presentation
            // model; the legacy slice is a compatibility projection consumed only
            // by unmigrated views (none composed in the terminal profile).
            nodes: nodes.map(node => node.data),
            turnTimings: new Map(),
            turnEnds: new Map(),
            partial: null,
            runningCalls: EMPTY_LIST,
        };
        return { order: this.order, nodes: this.store, locations: EMPTY_LOCATIONS, timeline, legacy };
    }
}
/** Visible node keys in ascending anchorSeq order. */
function orderedKeys(nodes) {
    return nodes
        .filter(node => node.visibility === 'visible')
        .sort((left, right) => left.anchorSeq - right.anchorSeq)
        .map(node => node.key);
}
/** Chat target factory contributed to the Runtime view registry. */
export const terminalChatViewDefinition = {
    target: 'chat',
    create: () => new TerminalChatBuilder(),
};
// ── registration ────────────────────────────────────────────────────────────
/** Register every terminal chat Definition and the Chat target builder. */
export function registerTerminalConversationNodes(ctx) {
    ctx.conversationEvents.register(messageDefinition);
    ctx.conversationEvents.register(assistantDefinition);
    ctx.conversationEvents.register(toolDefinition);
    ctx.conversationEvents.register(turnErrorDefinition);
    ctx.conversationEvents.register(compactionDefinition);
    ctx.conversationEvents.register(unknownDefinition);
    ctx.conversationViews.register(terminalChatViewDefinition);
}
//# sourceMappingURL=conversation-nodes.js.map
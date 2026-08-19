/** Bounds for one tool-result body line. */
export const TOOL_RESULT_MAX_CHARS = 500;
/** Split one text block into physical log lines (single trailing newline dropped). */
function splitLines(text) {
    const trimmed = text.replace(/\n$/, '');
    return trimmed === '' ? [] : trimmed.split('\n');
}
/** Project one settled or streaming assistant node into log lines. */
function assistantLines(keyPrefix, data) {
    const lines = [];
    for (const [index, text] of splitLines(data.text).entries()) {
        lines.push({
            key: `${keyPrefix}-${index}`,
            seq: data.seq + index / 1000,
            kind: data.status === 'running' && index === 0 ? 'stream' : 'output',
            text: data.status === 'running' && index === 0 ? `${text}▌` : text,
        });
    }
    for (const tool of data.tools) {
        lines.push({ key: `${keyPrefix}-tool-${tool.callId}`, seq: data.seq, kind: 'tool', text: `── tool: ${tool.name} ──` });
    }
    if (data.reasoning !== undefined) {
        lines.push({ key: `${keyPrefix}-reasoning`, seq: data.seq, kind: 'system', text: `[reasoning] ${data.reasoning}` });
    }
    if (data.status === 'interrupted' && lines.length === 0) {
        lines.push({ key: `${keyPrefix}-int`, seq: data.seq, kind: 'error', text: '^C (interrupted)' });
    }
    return lines;
}
/** Project one tool lifecycle node into a log line. */
function toolLine(data) {
    const status = data.status === 'running' ? 'running' : data.status;
    const detail = data.detail === undefined ? undefined : data.detail.slice(0, TOOL_RESULT_MAX_CHARS);
    return {
        key: `tool-${data.callId}`,
        seq: data.seq,
        kind: data.status === 'error' ? 'error' : 'tool',
        text: `── tool: ${data.name} [${status}] ──`,
        ...detail === undefined ? {} : { detail },
    };
}
/** Project one chat node into one or more log lines. */
function nodeLines(node) {
    const data = node.data;
    switch (data.kind) {
        case 'user':
            return [{ key: `user-${data.seq}`, seq: data.seq, kind: 'prompt', text: data.text }];
        case 'context':
            return [{ key: `context-${data.seq}`, seq: data.seq, kind: 'system', text: `[context] ${data.text}` }];
        case 'assistant':
            return assistantLines(node.key, data);
        case 'tool':
            return [toolLine(data)];
        case 'turn-error':
            return [{ key: `error-${data.seq}`, seq: data.seq, kind: 'error', text: `[error] ${data.message}` }];
        case 'compaction':
            return [{ key: `compaction-${data.seq}`, seq: data.seq, kind: 'system', text: '[compaction] history compacted' }];
        case 'unknown':
            return [{ key: `unknown-${data.seq}`, seq: data.seq, kind: 'system', text: `[unknown:${data.type}]` }];
        default: {
            /* v8 ignore next -- unreachable: every TerminalChatKind has an arm above; the default guards future kind additions. */
            const exhaustive = data;
            return [{ key: `node-${exhaustive}`, seq: exhaustive, kind: 'system', text: '[event]' }];
        }
    }
}
/** Project one pending interaction into a system line. */
function pendingLine(pending) {
    return {
        key: `pending-${pending.key}`,
        seq: Number.MAX_SAFE_INTEGER - 1,
        kind: 'system',
        text: `[waiting: ${pending.kind}]`,
    };
}
/**
 * Project a session snapshot's chat facts into ordered terminal log lines.
 * @param input - rendered nodes and pending interactions.
 * @returns log lines in ascending render order.
 */
export function renderChatLines(input) {
    const lines = [];
    for (const node of input.nodes)
        lines.push(...nodeLines(node));
    for (const pending of input.pending)
        lines.push(pendingLine(pending));
    return lines;
}
//# sourceMappingURL=chat-lines.js.map
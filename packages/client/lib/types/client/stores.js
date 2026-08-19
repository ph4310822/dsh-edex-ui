/**
 * Terminal shell stores: the root frame store (panel + monitor switches) and
 * the per-session prompt store (draft + history). Module level exports
 * factories only — a module-level handle would pin identity in the module
 * cache (a de-facto singleton surviving plugin reloads). register() receives
 * the factory, components derive their PropsStore shares from the return
 * types, and the inject hooks receive the bound actions.
 */
import { defineStore } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Create the root frame store handle. Transient by design: reload restores
 * the chat panel with the monitor bar visible.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createTerminalFrameStore() {
    return defineStore({
        init: () => ({ panel: 'chat', monitorVisible: true }),
        actions: {
            setPanel: (d, panel) => { d.panel = panel; },
            toggleMonitor: (d) => { d.monitorVisible = !d.monitorVisible; },
        },
    });
}
/** Create the per-session prompt store handle. */
export function createTerminalSessionStore() {
    return defineStore({
        init: () => ({ draft: '', history: [], historyIndex: -1 }),
        actions: {
            setDraft: (d, text) => {
                d.draft = text;
                d.historyIndex = -1;
            },
            submitDraft: (d) => {
                const text = d.draft.trim();
                if (text === '')
                    return;
                d.history = [...d.history, text];
                d.draft = '';
                d.historyIndex = -1;
            },
            historyUp: (d) => {
                if (d.history.length === 0)
                    return;
                const next = d.historyIndex === -1 ? d.history.length - 1 : Math.max(0, d.historyIndex - 1);
                d.historyIndex = next;
                d.draft = d.history[next] ?? '';
            },
            historyDown: (d) => {
                if (d.historyIndex === -1)
                    return;
                const next = d.historyIndex + 1;
                if (next >= d.history.length) {
                    d.historyIndex = -1;
                    d.draft = '';
                    return;
                }
                d.historyIndex = next;
                d.draft = d.history[next] ?? '';
            },
        },
    });
}
//# sourceMappingURL=stores.js.map
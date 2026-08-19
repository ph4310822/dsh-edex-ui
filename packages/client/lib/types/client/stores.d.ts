/**
 * Terminal shell stores: the root frame store (panel + monitor switches) and
 * the per-session prompt store (draft + history). Module level exports
 * factories only — a module-level handle would pin identity in the module
 * cache (a de-facto singleton surviving plugin reloads). register() receives
 * the factory, components derive their PropsStore shares from the return
 * types, and the inject hooks receive the bound actions.
 */
import { type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client';
/** Root frame state: which main panel is active and whether the monitor bar is visible. */
export type TerminalFrameState = {
    panel: 'chat' | 'pty';
    monitorVisible: boolean;
};
/** Annotation twin of the actions literal below (export needs a declared return type). */
type TerminalFrameActions = {
    setPanel: (draft: TerminalFrameState, panel: 'chat' | 'pty') => void;
    toggleMonitor: (draft: TerminalFrameState) => void;
};
/**
 * Create the root frame store handle. Transient by design: reload restores
 * the chat panel with the monitor bar visible.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export declare function createTerminalFrameStore(): EngineStoreHandle<TerminalFrameState, TerminalFrameActions>;
/** Per-session prompt state: the draft and the submitted-history ring. */
export interface TerminalSessionState {
    /** Current composer text. */
    draft: string;
    /** Previously submitted prompts, oldest first. */
    history: readonly string[];
    /** Ring position; -1 means the live draft, otherwise an index into history. */
    historyIndex: number;
}
/** Annotation twin of the actions literal below. */
export type TerminalSessionActions = {
    setDraft: (d: TerminalSessionState, text: string) => void;
    submitDraft: (d: TerminalSessionState) => void;
    historyUp: (d: TerminalSessionState) => void;
    historyDown: (d: TerminalSessionState) => void;
};
/** Create the per-session prompt store handle. */
export declare function createTerminalSessionStore(): EngineStoreHandle<TerminalSessionState, TerminalSessionActions>;
export {};
//# sourceMappingURL=stores.d.ts.map
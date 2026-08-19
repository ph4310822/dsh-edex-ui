/**
 * Terminal shell stores: the root frame store (panel + monitor switches) and
 * the per-session prompt store (draft + history). Module level exports
 * factories only — a module-level handle would pin identity in the module
 * cache (a de-facto singleton surviving plugin reloads). register() receives
 * the factory, components derive their PropsStore shares from the return
 * types, and the inject hooks receive the bound actions.
 */
import { defineStore, type EngineStoreHandle } from '@deepseek-ai/dsh-client-runtime/client'

/** Root frame state: which main panel is active and whether the monitor bar is visible. */
export type TerminalFrameState = { panel: 'chat' | 'pty'; monitorVisible: boolean }

/** Annotation twin of the actions literal below (export needs a declared return type). */
type TerminalFrameActions = {
  setPanel: (draft: TerminalFrameState, panel: 'chat' | 'pty') => void
  toggleMonitor: (draft: TerminalFrameState) => void
}

/**
 * Create the root frame store handle. Transient by design: reload restores
 * the chat panel with the monitor bar visible.
 * @returns the store handle (spec + type + identity + factory in one).
 */
export function createTerminalFrameStore(): EngineStoreHandle<TerminalFrameState, TerminalFrameActions> {
  return defineStore({
    init: (): TerminalFrameState => ({ panel: 'chat', monitorVisible: true }),
    actions: {
      setPanel: (d, panel: 'chat' | 'pty') => { d.panel = panel },
      toggleMonitor: (d) => { d.monitorVisible = !d.monitorVisible },
    },
  })
}

/** Per-session prompt state: the draft and the submitted-history ring. */
export interface TerminalSessionState {
  /** Current composer text. */
  draft: string
  /** Previously submitted prompts, oldest first. */
  history: readonly string[]
  /** Ring position; -1 means the live draft, otherwise an index into history. */
  historyIndex: number
}

/** Annotation twin of the actions literal below. */
export type TerminalSessionActions = {
  setDraft: (d: TerminalSessionState, text: string) => void
  submitDraft: (d: TerminalSessionState) => void
  historyUp: (d: TerminalSessionState) => void
  historyDown: (d: TerminalSessionState) => void
}

/** Create the per-session prompt store handle. */
export function createTerminalSessionStore(): EngineStoreHandle<TerminalSessionState, TerminalSessionActions> {
  return defineStore({
    init: (): TerminalSessionState => ({ draft: '', history: [], historyIndex: -1 }),
    actions: {
      setDraft: (d, text: string) => {
        d.draft = text
        d.historyIndex = -1
      },
      submitDraft: (d) => {
        const text = d.draft.trim()
        if (text === '') return
        d.history = [...d.history, text]
        d.draft = ''
        d.historyIndex = -1
      },
      historyUp: (d) => {
        if (d.history.length === 0) return
        const next = d.historyIndex === -1 ? d.history.length - 1 : Math.max(0, d.historyIndex - 1)
        d.historyIndex = next
        d.draft = d.history[next] ?? ''
      },
      historyDown: (d) => {
        if (d.historyIndex === -1) return
        const next = d.historyIndex + 1
        if (next >= d.history.length) {
          d.historyIndex = -1
          d.draft = ''
          return
        }
        d.historyIndex = next
        d.draft = d.history[next] ?? ''
      },
    },
  })
}

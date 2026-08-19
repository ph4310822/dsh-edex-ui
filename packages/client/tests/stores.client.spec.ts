/** Terminal stores specs: frame store + per-session prompt store. */

import { describe, expect, it } from 'vitest'
import { createTerminalFrameStore, createTerminalSessionStore } from '../src/client/stores.ts'

describe('createTerminalFrameStore', () => {
  it('starts on the chat panel with the monitor visible', () => {
    const { store } = createTerminalFrameStore().create()
    expect(store.getSnapshot()).toEqual({ panel: 'chat', monitorVisible: true })
  })

  it('setPanel switches the active panel', () => {
    const { store, actions } = createTerminalFrameStore().create()
    actions.setPanel('pty')
    expect(store.getSnapshot().panel).toBe('pty')
  })

  it('toggleMonitor flips the monitor visibility', () => {
    const { store, actions } = createTerminalFrameStore().create()
    actions.toggleMonitor()
    expect(store.getSnapshot().monitorVisible).toBe(false)
    actions.toggleMonitor()
    expect(store.getSnapshot().monitorVisible).toBe(true)
  })
})

describe('createTerminalSessionStore', () => {
  it('starts with an empty draft and no history', () => {
    const { store } = createTerminalSessionStore().create()
    expect(store.getSnapshot()).toEqual({ draft: '', history: [], historyIndex: -1 })
  })

  it('setDraft writes the draft and resets the history ring', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.setDraft('one')
    actions.historyUp()
    actions.setDraft('two')
    expect(store.getSnapshot()).toMatchObject({ draft: 'two', historyIndex: -1 })
  })

  it('submitDraft trims, appends to history, and clears the draft', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.setDraft('  hello  ')
    actions.submitDraft()
    expect(store.getSnapshot()).toEqual({ draft: '', history: ['hello'], historyIndex: -1 })
  })

  it('submitDraft ignores blank drafts', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.setDraft('   ')
    actions.submitDraft()
    expect(store.getSnapshot().history).toEqual([])
  })

  it('historyUp walks the ring from the newest entry', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.setDraft('a')
    actions.submitDraft()
    actions.setDraft('b')
    actions.submitDraft()
    actions.historyUp()
    expect(store.getSnapshot()).toMatchObject({ draft: 'b', historyIndex: 1 })
    actions.historyUp()
    expect(store.getSnapshot()).toMatchObject({ draft: 'a', historyIndex: 0 })
    actions.historyUp()
    expect(store.getSnapshot()).toMatchObject({ draft: 'a', historyIndex: 0 })
  })

  it('historyDown returns to the live draft after the oldest entry', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.setDraft('a')
    actions.submitDraft()
    actions.historyUp()
    actions.historyDown()
    expect(store.getSnapshot()).toMatchObject({ draft: '', historyIndex: -1 })
  })

  it('historyUp does nothing with no history', () => {
    const { store, actions } = createTerminalSessionStore().create()
    actions.historyUp()
    expect(store.getSnapshot().historyIndex).toBe(-1)
  })
})

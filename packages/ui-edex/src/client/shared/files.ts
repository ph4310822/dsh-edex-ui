/**
 * Filesystem browser controller: lists directories through the
 * `systemMetrics.listDirectory` Remote, tracks the current path, keeps the
 * storage indicator (from `overview`), and loads file previews for the
 * bottom-right pane through the `readFile` Remote. It also owns the
 * bottom-right editor's save-related status (`writeFile` Remote): dirty
 * tracking, in-flight saves, the last-save line, and the discard guard that
 * pauses navigation away from a dirty buffer until the user confirms. The
 * buffer CONTENT itself lives in the editor view, never in this state.
 * The browser starts at the mount of the harness process cwd (the host's
 * `storage.path`).
 */
import { EMPTY_EDITOR, EMPTY_FILES } from './types.ts'
import type { EditorStatus, FilesState, ObservableSource, SystemMetricsRemote } from './types.ts'

/** Join a child name onto a directory path. */
function joinPath(path: string, name: string): string {
  if (path === '/' || path.endsWith('/')) return `${path}${name}`
  return `${path}/${name}`
}

/** The parent of a directory path ('/' stays '/'). */
function parentPath(path: string): string {
  if (path === '/' || path === '') return '/'
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  if (index <= 0) return '/'
  return trimmed.slice(0, index)
}

/** A navigation action paused by the dirty-buffer discard guard. */
type PendingAction = { readonly kind: 'list'; readonly path: string } | { readonly kind: 'select'; readonly name: string }

/** Mutable observable source backing the `useFiles` hook. */
class FilesSource implements ObservableSource<FilesState> {
  private value: FilesState = EMPTY_FILES
  private readonly listeners = new Set<() => void>()

  getSnapshot(): FilesState {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: FilesState): void {
    this.value = next
    for (const listener of this.listeners) listener()
  }
}

/** Lists directories, tracks the storage indicator, and owns editor saves. */
export class FilesController {
  private readonly source = new FilesSource()
  private currentPath: string | undefined
  private pending: PendingAction | null = null

  constructor(private readonly remote: SystemMetricsRemote) {}

  /** Bare observable files state source bound to the `useFiles` hook. */
  get files(): ObservableSource<FilesState> {
    return this.source
  }

  /** Fetch storage + list the current (or first) directory. */
  async refresh(): Promise<void> {
    const overview = await this.remote.overview()
    if (overview.ok && this.currentPath === undefined) {
      this.currentPath = overview.value.storage.path || '/'
    }
    await this.list(this.currentPath ?? '/')
  }

  /** List one directory and remember it as current. A dirty editor pauses the navigation. */
  async list(path: string): Promise<void> {
    const snapshot = this.source.getSnapshot()
    if (snapshot.editor.dirty && this.pending === null) {
      this.pending = { kind: 'list', path }
      this.source.set({ ...snapshot, editor: { ...snapshot.editor, pendingDiscard: true } })
      return
    }
    this.pending = null
    this.currentPath = path
    const overview = await this.remote.overview()
    const listing = await this.remote.listDirectory(path)
    this.source.set({
      path,
      entries: listing.ok ? listing.value.entries : [],
      storage: overview.ok ? overview.value.storage : this.source.getSnapshot().storage,
      error: listing.ok ? listing.value.error : listing.error.message,
      phase: 'ready',
      // Navigating away clears the preview selection and the editor.
      selected: null,
      preview: null,
      editor: EMPTY_EDITOR,
    })
  }

  /** Navigate into a directory entry (or up for '..'). */
  navigate(name: string): void {
    void this.list(name === '..' ? parentPath(this.currentPath ?? '/') : joinPath(this.currentPath ?? '/', name))
  }

  /** Select a file in the current directory and load its preview (or the editor for text). */
  async selectFile(name: string): Promise<void> {
    const path = joinPath(this.currentPath ?? '/', name)
    const snapshot = this.source.getSnapshot()
    if (snapshot.editor.dirty && this.pending === null) {
      this.pending = { kind: 'select', name }
      this.source.set({ ...snapshot, editor: { ...snapshot.editor, pendingDiscard: true } })
      return
    }
    this.pending = null
    const result = await this.remote.readFile(path)
    const current = this.source.getSnapshot()
    const preview = result.ok
      ? result.value
      : {
        path,
        kind: 'unsupported' as const,
        mime: '',
        sizeBytes: 0,
        truncated: false,
        text: null,
        dataUrl: null,
        error: result.error.message,
      }
    // Text files open the editor (read-only when truncated); anything else
    // closes it and shows the media/unsupported preview.
    const editor: EditorStatus = result.ok && result.value.kind === 'text'
      ? {
        path,
        dirty: false,
        readOnly: result.value.truncated,
        saving: false,
        error: null,
        savedAt: null,
        pendingDiscard: false,
      }
      : EMPTY_EDITOR
    this.source.set({ ...current, selected: name, preview, editor })
  }

  /** Mark the open buffer dirty (called by the editor on every doc change). */
  markDirty(): void {
    const snapshot = this.source.getSnapshot()
    if (snapshot.editor.path === null || snapshot.editor.dirty) return
    this.source.set({ ...snapshot, editor: { ...snapshot.editor, dirty: true } })
  }

  /** Persist the editor buffer through the `writeFile` Remote. */
  async saveEditor(content: string): Promise<void> {
    const snapshot = this.source.getSnapshot()
    const path = snapshot.editor.path
    if (path === null || snapshot.editor.readOnly || snapshot.editor.saving) return
    this.source.set({ ...snapshot, editor: { ...snapshot.editor, saving: true, error: null } })
    const result = await this.remote.writeFile(path, content)
    const after = this.source.getSnapshot()
    if (after.editor.path !== path) return // the buffer switched mid-save
    this.source.set({
      ...after,
      editor: result.ok
        ? {
          ...after.editor,
          dirty: false,
          saving: false,
          error: null,
          savedAt: { at: Date.now(), sizeBytes: result.value.sizeBytes },
        }
        : { ...after.editor, saving: false, error: result.error.message },
    })
  }

  /** Discard the dirty buffer and run the paused navigation. */
  confirmDiscard(): void {
    const pending = this.pending
    this.pending = null
    const snapshot = this.source.getSnapshot()
    this.source.set({ ...snapshot, editor: EMPTY_EDITOR })
    if (pending?.kind === 'list') void this.list(pending.path)
    else if (pending?.kind === 'select') void this.selectFile(pending.name)
  }

  /** Keep the dirty buffer and drop the paused navigation. */
  cancelDiscard(): void {
    this.pending = null
    const snapshot = this.source.getSnapshot()
    this.source.set({ ...snapshot, editor: { ...snapshot.editor, pendingDiscard: false } })
  }
}

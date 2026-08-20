/**
 * Filesystem browser controller: lists directories through the
 * `systemMetrics.listDirectory` Remote, tracks the current path, keeps the
 * storage indicator (from `overview`), and loads file previews for the
 * bottom-right pane through the `readFile` Remote. The browser starts at the
 * mount of the harness process cwd (the host's `storage.path`).
 */
import { EMPTY_FILES } from './types.ts'
import type { FilesState, ObservableSource, SystemMetricsRemote } from './types.ts'

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

/** Lists directories and tracks the storage indicator. */
export class FilesController {
  private readonly source = new FilesSource()
  private currentPath: string | undefined

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

  /** List one directory and remember it as current. */
  async list(path: string): Promise<void> {
    this.currentPath = path
    const overview = await this.remote.overview()
    const listing = await this.remote.listDirectory(path)
    this.source.set({
      path,
      entries: listing.ok ? listing.value.entries : [],
      storage: overview.ok ? overview.value.storage : this.source.getSnapshot().storage,
      error: listing.ok ? listing.value.error : listing.error.message,
      phase: 'ready',
      // Navigating away clears the preview selection.
      selected: null,
      preview: null,
    })
  }

  /** Navigate into a directory entry (or up for '..'). */
  navigate(name: string): void {
    void this.list(name === '..' ? parentPath(this.currentPath ?? '/') : joinPath(this.currentPath ?? '/', name))
  }

  /** Select a file in the current directory and load its preview. */
  async selectFile(name: string): Promise<void> {
    const path = joinPath(this.currentPath ?? '/', name)
    const result = await this.remote.readFile(path)
    const current = this.source.getSnapshot()
    this.source.set({
      ...current,
      selected: name,
      preview: result.ok
        ? result.value
        : {
          path,
          kind: 'unsupported',
          mime: '',
          sizeBytes: 0,
          truncated: false,
          text: null,
          dataUrl: null,
          error: result.error.message,
        },
    })
  }
}

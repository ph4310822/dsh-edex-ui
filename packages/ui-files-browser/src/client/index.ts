/**
 * Filesystem browser plugin, browser half: lists directories through the
 * systemMetrics `listDirectory` Remote and renders the bottom-left file grid
 * with the storage indicator (from `overview`).
 */
import type { Context } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type {
  DirectoryListing, DirectoryEntry, StorageInfo, SystemOverview,
} from '@deepseek-ai/dsh-host-system-metrics/types'
import { FilesBrowser } from './FilesBrowser.tsx'

/** Bare observable snapshot source. */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** The generated systemMetrics Remote face narrowed to what this plugin calls. */
export interface SystemMetricsRemote {
  overview: () => Promise<RemoteResult<SystemOverview>>
  listDirectory: (path: string) => Promise<RemoteResult<DirectoryListing>>
}

/** The browser's state: current path, entries, storage, and error. */
export interface FilesState {
  readonly path: string
  readonly entries: readonly DirectoryEntry[]
  readonly storage: StorageInfo
  readonly error: string | null
  readonly phase: 'loading' | 'ready'
}

class FilesSource implements ObservableSource<FilesState> {
  private value: FilesState = {
    path: '', entries: [], error: null, phase: 'loading',
    storage: { path: '', totalBytes: 0, usedBytes: 0, usedPct: 0 },
  }
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

/** Lists directories and tracks the storage indicator. */
export class FilesController {
  private readonly source = new FilesSource()
  private currentPath: string | undefined

  constructor(private readonly remote: SystemMetricsRemote) {}

  get filesSource(): ObservableSource<FilesState> {
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
    })
  }

  /** Navigate into a directory entry (or up for '..'). */
  navigate(name: string): void {
    void this.list(name === '..' ? parentPath(this.currentPath ?? '/') : joinPath(this.currentPath ?? '/', name))
  }
}

/** Required services: the slot registry and the mounted systemMetrics namespace. */
export const inject = ['slots', 'remote.systemMetrics']

/**
 * Client plugin body: register the filesystem browser into the bottom-left
 * cell.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const metrics = ctx.get('remote.systemMetrics') as SystemMetricsRemote
  const controller = new FilesController(metrics)
  ctx.effect(
    () => ctx.slots.register({
      name: 'shell.bottom.left',
      inject: (): FilesBrowserInjected => ({
        refresh: () => { void controller.refresh() },
        navigate: (name) => { controller.navigate(name) },
        hooks: { files: controller.filesSource },
      }),
    }, FilesBrowser),
    'ui-files-browser: bottom-left registration',
  )
}

/** The browser entry's inject face. */
export interface FilesBrowserInjected {
  /** Fetch storage + the current directory listing. */
  refresh: () => void
  /** Navigate into a directory (or '..' up). */
  navigate: (name: string) => void
  hooks: { files: ObservableSource<FilesState> }
}

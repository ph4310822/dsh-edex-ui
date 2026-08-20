/**
 * Shared client vocabulary for the eDEX shell: observable sources, the
 * derived panel/network snapshots, the filesystem browser state, and the
 * narrowed Remote face this plugin calls. All data originates from the
 * `systemMetrics` Host Remote (host/system-metrics); the client only derives
 * deltas and history.
 */
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {
  DirectoryListing, FilePreview, HardwareInfo, NetworkInfo, ProcessSample, StorageInfo, SystemOverview,
} from '@deepseek-ai/dsh-host-system-metrics/types'

export type { FilePreview }

/** Bare observable snapshot source (getSnapshot + subscribe), the slot hooks seat. */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** The generated systemMetrics Remote face narrowed to what this plugin calls. */
export interface SystemMetricsRemote {
  overview: () => Promise<RemoteResult<SystemOverview>>
  listDirectory: (path: string) => Promise<RemoteResult<DirectoryListing>>
  readFile: (path: string) => Promise<RemoteResult<FilePreview>>
}

/** Left-bar system telemetry snapshot (host overview + client-derived deltas/history). */
export interface PanelSnapshot {
  readonly ok: boolean
  readonly timestamp: number
  readonly platform: string
  readonly uptimeSeconds: number
  readonly loadavg: readonly [number, number, number]
  readonly memoryUsedGiB: number
  readonly memoryTotalGiB: number
  readonly swapUsedGiB: number
  readonly swapTotalGiB: number
  /** Current per-core busy percentage (0..100), one per logical core. */
  readonly cpuBusy: readonly number[]
  /** Per-core sparkline history (0..100), one array per logical core. */
  readonly cpuHistory: readonly (readonly number[])[]
  /** Min/max of the current per-core busy percentages. */
  readonly cpuMin: number
  readonly cpuMax: number
  readonly thermalLevel: number | null
  readonly powerState: string | null
  readonly hardware: HardwareInfo
  readonly tasks: number
  /** Top processes by CPU, descending (capped at five). */
  readonly processes: readonly ProcessSample[]
}

/** Right-bar network snapshot (interface status + derived traffic history). */
export interface NetworkSnapshot {
  readonly ok: boolean
  readonly network: NetworkInfo
  /** Recent up/down throughput samples in MB/s (oldest first). */
  readonly upHistory: readonly number[]
  readonly downHistory: readonly number[]
  readonly upMbs: number
  readonly downMbs: number
}

/** Bottom-left filesystem browser state. */
export interface FilesState {
  readonly path: string
  readonly entries: readonly { readonly name: string; readonly isDirectory: boolean }[]
  readonly storage: StorageInfo
  readonly error: string | null
  readonly phase: 'loading' | 'ready'
  /** Currently selected file name (for the bottom-right preview), or null. */
  readonly selected: string | null
  /** Preview payload of the selected file, or null while none is selected. */
  readonly preview: FilePreview | null
}

/** Empty snapshot values rendered before the first successful overview. */
export const EMPTY_PANEL: PanelSnapshot = {
  ok: false,
  timestamp: 0,
  platform: '',
  uptimeSeconds: 0,
  loadavg: [0, 0, 0],
  memoryUsedGiB: 0,
  memoryTotalGiB: 0,
  swapUsedGiB: 0,
  swapTotalGiB: 0,
  cpuBusy: [],
  cpuHistory: [],
  cpuMin: 0,
  cpuMax: 0,
  thermalLevel: null,
  powerState: null,
  hardware: { manufacturer: '—', model: '—', chassis: '—' },
  tasks: 0,
  processes: [],
}

/** Empty snapshot values rendered before the first successful overview. */
export const EMPTY_NETWORK: NetworkSnapshot = {
  ok: false,
  network: { interfaceName: '—', state: '—', ip: null, pingMs: null, rxBytes: 0, txBytes: 0 },
  upHistory: [],
  downHistory: [],
  upMbs: 0,
  downMbs: 0,
}

/** Empty snapshot values rendered before the first successful overview. */
export const EMPTY_FILES: FilesState = {
  path: '',
  entries: [],
  storage: { path: '', totalBytes: 0, usedBytes: 0, usedPct: 0 },
  error: null,
  phase: 'loading',
  selected: null,
  preview: null,
}

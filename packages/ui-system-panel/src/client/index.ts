/**
 * System panel plugin, browser half: mounts the systemMetrics Host Remote
 * contribution, polls the rich `overview` every 2 s, derives per-core CPU
 * usage deltas + sparkline history, and exposes the result as a hooks
 * compartment source for the panel entry (registered into the root
 * `shell.overlay` list slot as a fixed left column).
 */
import type { Context } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
// Type-only: pulls the api-remotes merge (ctx.remote) into this compilation.
import type {} from '@deepseek-ai/dsh-api-remotes/client'
// Type-only: pulls ui-layout's SlotMap merge (the 'shell.overlay' key).
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { CoreTimes, HardwareInfo, ProcessSample, SystemOverview } from '@deepseek-ai/dsh-host-system-metrics/types'
// The generated Host Remote contribution; mounted in apply (inlined at build).
import systemMetricsRemote from '@deepseek-ai/dsh-host-system-metrics/remote'
import { SystemPanel } from './SystemPanel.tsx'

/** Poll cadence for the system overview. */
export const PANEL_POLL_INTERVAL_MS = 2000
/** Sparkline window length per core (samples; 2 s cadence → 60 s). */
const SPARKLINE_WINDOW = 30

/** Bare observable snapshot source (getSnapshot + subscribe). */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** The generated systemMetrics Remote face narrowed to what this plugin calls. */
export interface SystemMetricsRemote {
  overview: () => Promise<RemoteResult<SystemOverview>>
}

/** Derived panel snapshot (host overview + client-computed deltas/history). */
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
  readonly processes: readonly ProcessSample[]
}

/** Mutable observable source backing the panel hooks compartment. */
class PanelSource implements ObservableSource<PanelSnapshot> {
  private value: PanelSnapshot = {
    ok: false, timestamp: 0, platform: '', uptimeSeconds: 0, loadavg: [0, 0, 0],
    memoryUsedGiB: 0, memoryTotalGiB: 0, swapUsedGiB: 0, swapTotalGiB: 0,
    cpuBusy: [], cpuHistory: [], cpuMin: 0, cpuMax: 0,
    thermalLevel: null, powerState: null,
    hardware: { manufacturer: '—', model: '—', chassis: '—' },
    tasks: 0, processes: [],
  }
  private readonly listeners = new Set<() => void>()

  getSnapshot(): PanelSnapshot {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: PanelSnapshot): void {
    this.value = next
    for (const listener of this.listeners) listener()
  }
}

function giB(bytes: number): number {
  return bytes / 1073741824
}

/** Per-core busy percentages from tick-count deltas vs the previous sample. */
function busyPercent(previous: readonly CoreTimes[] | undefined, current: readonly CoreTimes[]): number[] {
  return current.map((core, index) => {
    const prev = previous?.[index]
    if (prev === undefined) return 0
    const prevBusy = prev.user + prev.nice + prev.sys + prev.irq
    const prevTotal = prevBusy + prev.idle
    const curBusy = core.user + core.nice + core.sys + core.irq
    const curTotal = curBusy + core.idle
    const deltaTotal = curTotal - prevTotal
    if (deltaTotal <= 0) return 0
    return Math.min(100, Math.max(0, ((curBusy - prevBusy) / deltaTotal) * 100))
  })
}

/**
 * Polls the overview remote and derives the panel snapshot.
 * @param remote - the mounted systemMetrics Remote face.
 * @param intervalMs - poll cadence.
 */
export class PanelPoller {
  private readonly source = new PanelSource()
  private timer: ReturnType<typeof setInterval> | undefined
  private previousCores: readonly CoreTimes[] | undefined
  private history: number[][] = []

  constructor(
    private readonly remote: SystemMetricsRemote,
    private readonly intervalMs: number = PANEL_POLL_INTERVAL_MS,
  ) {}

  /** Bare observable snapshot source bound to the `usePanel` hook by the renderer. */
  get panelSource(): ObservableSource<PanelSnapshot> {
    return this.source
  }

  /** Start polling; the first overview is fetched immediately. */
  start(): void {
    if (this.timer !== undefined) return
    void this.poll()
    this.timer = setInterval(() => { void this.poll() }, this.intervalMs)
  }

  /** Stop polling; the last snapshot stays readable. */
  stop(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  private async poll(): Promise<void> {
    const result = await this.remote.overview()
    if (!result.ok) return
    const overview = result.value
    const busy = busyPercent(this.previousCores, overview.cores)
    this.previousCores = overview.cores
    if (this.history.length === 0) this.history = overview.cores.map(() => [])
    busy.forEach((pct, index) => {
      const series = (this.history[index] ??= [])
      series.push(pct)
      if (series.length > SPARKLINE_WINDOW) series.shift()
    })
    const cpuMin = busy.length === 0 ? 0 : Math.min(...busy)
    const cpuMax = busy.length === 0 ? 0 : Math.max(...busy)
    this.source.set({
      ok: true,
      timestamp: overview.timestamp,
      platform: overview.platform,
      uptimeSeconds: overview.uptimeSeconds,
      loadavg: overview.loadavg,
      memoryUsedGiB: giB(overview.memory.usedBytes),
      memoryTotalGiB: giB(overview.memory.totalBytes),
      swapUsedGiB: giB(overview.swap.usedBytes),
      swapTotalGiB: giB(overview.swap.totalBytes),
      cpuBusy: busy,
      cpuHistory: this.history.map(series => [...series]),
      cpuMin,
      cpuMax,
      thermalLevel: overview.thermalLevel,
      powerState: overview.powerState,
      hardware: overview.hardware,
      tasks: overview.tasks,
      processes: overview.processes,
    })
  }
}

/** Required services: the slot registry and the Remote carrier (namespaces mounted in apply). */
export const inject = ['slots', 'remote']

/**
 * Client plugin body: mount the systemMetrics contribution, start the panel
 * poller, and register the left panel into the overlay layer.
 * @param ctx - client root context.
 * @returns disposer that unmounts the Remote namespace on unload.
 */
export async function apply(ctx: Context): Promise<() => Promise<void>> {
  const disposeRemote = await ctx.remote.$mount(systemMetricsRemote)
  let disposed = false
  const dispose = async (): Promise<void> => {
    if (disposed) return
    disposed = true
    await disposeRemote()
  }
  const metrics = ctx.get('remote.systemMetrics') as SystemMetricsRemote

  const poller = new PanelPoller(metrics)
  ctx.effect(() => {
    poller.start()
    return () => { poller.stop() }
  }, 'ui-system-panel: overview poller')

  ctx.effect(
    () => ctx.slots.register({
      // Real grid column left of the sidebar (the layout renders `shell.left`
      // before the sidebar column), so the panel sits beside the original UI
      // instead of covering it.
      name: 'shell.left',
      inject: (): SystemPanelInjected => ({
        hooks: { panel: poller.panelSource },
      }),
    }, SystemPanel),
    'ui-system-panel: left column registration',
  )

  return dispose
}

/** The panel entry's inject face: the panel snapshot hook seat. */
export interface SystemPanelInjected {
  hooks: { panel: ObservableSource<PanelSnapshot> }
}

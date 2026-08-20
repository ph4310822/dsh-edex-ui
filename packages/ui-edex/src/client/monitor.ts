/**
 * One shared poller over the `systemMetrics.overview` Remote driving both the
 * left system panel and the right network panel: per-core CPU usage deltas +
 * sparkline history, memory/swap, thermal/power/hardware, top processes, and
 * up/down network throughput deltas + history. A single overview call per
 * tick keeps the host and the wire quiet.
 */
import type { CoreTimes } from '@deepseek-ai/dsh-host-system-metrics/types'
import { EMPTY_NETWORK, EMPTY_PANEL } from './types.ts'
import type {
  NetworkSnapshot, ObservableSource, PanelSnapshot, SystemMetricsRemote,
} from './types.ts'

/** Poll cadence for the system overview. */
export const POLL_INTERVAL_MS = 2000
/** Sparkline window length per core (samples; 2 s cadence → 60 s). */
const SPARKLINE_WINDOW = 30
/** Traffic history window (samples). */
const TRAFFIC_WINDOW = 30

/** Mutable observable source backed by one snapshot value. */
class Source<T> implements ObservableSource<T> {
  private value: T
  private readonly listeners = new Set<() => void>()

  constructor(initial: T) {
    this.value = initial
  }

  getSnapshot(): T {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: T): void {
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
 * Polls the overview Remote and derives the panel + network snapshots.
 */
export class EdexPoller {
  private readonly panelSource = new Source<PanelSnapshot>(EMPTY_PANEL)
  private readonly networkSource = new Source<NetworkSnapshot>(EMPTY_NETWORK)
  private timer: ReturnType<typeof setInterval> | undefined
  private previousCores: readonly CoreTimes[] | undefined
  private history: number[][] = []
  private previousTraffic: { timestamp: number; rx: number; tx: number } | undefined
  private upHistory: number[] = []
  private downHistory: number[] = []

  constructor(
    private readonly remote: SystemMetricsRemote,
    private readonly intervalMs: number = POLL_INTERVAL_MS,
  ) {}

  /** Bare observable panel snapshot source bound to the `usePanel` hook. */
  get panel(): ObservableSource<PanelSnapshot> {
    return this.panelSource
  }

  /** Bare observable network snapshot source bound to the `useNetwork` hook. */
  get network(): ObservableSource<NetworkSnapshot> {
    return this.networkSource
  }

  /** Start polling; the first overview is fetched immediately. */
  start(): void {
    if (this.timer !== undefined) return
    void this.poll()
    this.timer = setInterval(() => { void this.poll() }, this.intervalMs)
  }

  /** Stop polling; the last snapshots stay readable. */
  stop(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  private async poll(): Promise<void> {
    const result = await this.remote.overview()
    if (!result.ok) return
    const overview = result.value

    // ── system panel ──
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
    this.panelSource.set({
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

    // ── network panel ──
    const now = { timestamp: overview.timestamp, rx: overview.network.rxBytes, tx: overview.network.txBytes }
    let upMbs = 0
    let downMbs = 0
    if (this.previousTraffic !== undefined && now.timestamp > this.previousTraffic.timestamp) {
      const dt = (now.timestamp - this.previousTraffic.timestamp) / 1000
      downMbs = Math.max(0, (now.rx - this.previousTraffic.rx) / 1048576 / dt)
      upMbs = Math.max(0, (now.tx - this.previousTraffic.tx) / 1048576 / dt)
    }
    this.previousTraffic = now
    this.downHistory.push(downMbs)
    this.upHistory.push(upMbs)
    if (this.downHistory.length > TRAFFIC_WINDOW) this.downHistory.shift()
    if (this.upHistory.length > TRAFFIC_WINDOW) this.upHistory.shift()
    this.networkSource.set({
      ok: true,
      network: overview.network,
      upHistory: [...this.upHistory],
      downHistory: [...this.downHistory],
      upMbs,
      downMbs,
    })
  }
}

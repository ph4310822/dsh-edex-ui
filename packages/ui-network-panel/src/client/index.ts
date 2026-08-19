/**
 * Network panel plugin, browser half: polls the systemMetrics `overview`,
 * derives up/down throughput deltas + history, and registers the panel into
 * the `shell.right` column slot.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import type { NetworkInfo, SystemOverview } from '@deepseek-ai/dsh-host-system-metrics/types'
import { NetworkPanel } from './NetworkPanel.tsx'

/** Poll cadence for the network overview. */
export const NETWORK_POLL_INTERVAL_MS = 2000
/** Traffic history window (samples). */
const TRAFFIC_WINDOW = 30

/** Bare observable snapshot source. */
export interface ObservableSource<T> {
  getSnapshot(): T
  subscribe(listener: () => void): () => void
}

/** The generated systemMetrics Remote face narrowed to what this plugin calls. */
export interface SystemMetricsRemote {
  overview: () => Promise<RemoteResult<SystemOverview>>
}

/** Derived network panel snapshot. */
export interface NetworkSnapshot {
  readonly ok: boolean
  readonly network: NetworkInfo
  /** Recent up/down throughput samples in MB/s (oldest first). */
  readonly upHistory: readonly number[]
  readonly downHistory: readonly number[]
  readonly upMbs: number
  readonly downMbs: number
}

class NetworkSource implements ObservableSource<NetworkSnapshot> {
  private value: NetworkSnapshot = {
    ok: false,
    network: { interfaceName: '—', state: '—', ip: null, pingMs: null, rxBytes: 0, txBytes: 0 },
    upHistory: [], downHistory: [], upMbs: 0, downMbs: 0,
  }
  private readonly listeners = new Set<() => void>()

  getSnapshot(): NetworkSnapshot {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: NetworkSnapshot): void {
    this.value = next
    for (const listener of this.listeners) listener()
  }
}

/** Polls the overview and derives traffic deltas + history. */
export class NetworkPoller {
  private readonly source = new NetworkSource()
  private timer: ReturnType<typeof setInterval> | undefined
  private previous: { timestamp: number; rx: number; tx: number } | undefined
  private upHistory: number[] = []
  private downHistory: number[] = []

  constructor(
    private readonly remote: SystemMetricsRemote,
    private readonly intervalMs: number = NETWORK_POLL_INTERVAL_MS,
  ) {}

  get networkSource(): ObservableSource<NetworkSnapshot> {
    return this.source
  }

  start(): void {
    if (this.timer !== undefined) return
    void this.poll()
    this.timer = setInterval(() => { void this.poll() }, this.intervalMs)
  }

  stop(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  private async poll(): Promise<void> {
    const result = await this.remote.overview()
    if (!result.ok) return
    const overview = result.value
    const now = { timestamp: overview.timestamp, rx: overview.network.rxBytes, tx: overview.network.txBytes }
    let upMbs = 0
    let downMbs = 0
    if (this.previous !== undefined && now.timestamp > this.previous.timestamp) {
      const dt = (now.timestamp - this.previous.timestamp) / 1000
      downMbs = Math.max(0, (now.rx - this.previous.rx) / 1048576 / dt)
      upMbs = Math.max(0, (now.tx - this.previous.tx) / 1048576 / dt)
    }
    this.previous = now
    this.downHistory.push(downMbs)
    this.upHistory.push(upMbs)
    if (this.downHistory.length > TRAFFIC_WINDOW) this.downHistory.shift()
    if (this.upHistory.length > TRAFFIC_WINDOW) this.upHistory.shift()
    this.source.set({
      ok: true,
      network: overview.network,
      upHistory: [...this.upHistory],
      downHistory: [...this.downHistory],
      upMbs,
      downMbs,
    })
  }
}

/** Required services: the slot registry and the mounted systemMetrics namespace (mounted by the system panel). */
export const inject = ['slots', 'remote.systemMetrics']

/**
 * Client plugin body: poll the network overview and register the right panel.
 * @param ctx - client root context.
 */
export function apply(ctx: Context): void {
  const metrics = ctx.get('remote.systemMetrics') as SystemMetricsRemote
  const poller = new NetworkPoller(metrics)
  ctx.effect(() => {
    poller.start()
    return () => { poller.stop() }
  }, 'ui-network-panel: poller')

  ctx.effect(
    () => ctx.slots.register({
      name: 'shell.right',
      inject: (): NetworkPanelInjected => ({
        hooks: { network: poller.networkSource },
      }),
    }, NetworkPanel),
    'ui-network-panel: right column registration',
  )
}

/** The panel entry's inject face. */
export interface NetworkPanelInjected {
  hooks: { network: ObservableSource<NetworkSnapshot> }
}

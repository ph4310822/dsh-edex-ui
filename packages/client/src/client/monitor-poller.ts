/**
 * Frame-level system-monitor poller: periodically reads the systemMetrics
 * Remote and exposes a bare observable snapshot source for the monitor bar.
 */
import type { SystemMetricsSnapshot } from '@deepseek-ai/dsh-host-system-metrics/types'
import type { ObservableSource } from './pty-client.ts'
import type { SystemMetricsRemote } from './contract.ts'

/** Monitor poll cadence. */
export const MONITOR_POLL_INTERVAL_MS = 2000

/** One monitor observation: the latest snapshot or a failure marker. */
export type MonitorObservation =
  | { readonly ok: true; readonly snapshot: SystemMetricsSnapshot }
  | { readonly ok: false }

/** Bare observable source backing the monitor bar's `useMonitor` hook. */
class MonitorSource implements ObservableSource<MonitorObservation> {
  private value: MonitorObservation = { ok: false }
  private readonly listeners = new Set<() => void>()

  getSnapshot(): MonitorObservation {
    return this.value
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  set(next: MonitorObservation): void {
    this.value = next
    for (const listener of this.listeners) listener()
  }
}

/** Frame-level monitor controller owning the poll lifecycle. */
export class MonitorPoller {
  private readonly source = new MonitorSource()
  private timer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly remote: SystemMetricsRemote,
    private readonly intervalMs: number = MONITOR_POLL_INTERVAL_MS,
  ) {}

  /** Bare observable observation source bound to the `useMonitor` hook by the renderer. */
  get observationSource(): ObservableSource<MonitorObservation> {
    return this.source
  }

  /** Start polling; the first snapshot is fetched immediately. */
  start(): void {
    if (this.timer !== undefined) return
    void this.poll()
    this.timer = setInterval(() => { void this.poll() }, this.intervalMs)
  }

  /** Stop polling; the last observation stays readable. */
  stop(): void {
    if (this.timer === undefined) return
    clearInterval(this.timer)
    this.timer = undefined
  }

  private async poll(): Promise<void> {
    const result = await this.remote.snapshot()
    this.source.set(result.ok
      ? { ok: true, snapshot: result.value }
      : { ok: false })
  }
}

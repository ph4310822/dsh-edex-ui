/**
 * Frame-level system-monitor poller: periodically reads the systemMetrics
 * Remote and exposes a bare observable snapshot source for the monitor bar.
 */
import type { SystemMetricsSnapshot } from '@deepseek-ai/dsh-host-system-metrics/types';
import type { ObservableSource } from './pty-client.ts';
import type { SystemMetricsRemote } from './contract.ts';
/** Monitor poll cadence. */
export declare const MONITOR_POLL_INTERVAL_MS = 2000;
/** One monitor observation: the latest snapshot or a failure marker. */
export type MonitorObservation = {
    readonly ok: true;
    readonly snapshot: SystemMetricsSnapshot;
} | {
    readonly ok: false;
};
/** Frame-level monitor controller owning the poll lifecycle. */
export declare class MonitorPoller {
    private readonly remote;
    private readonly intervalMs;
    private readonly source;
    private timer;
    constructor(remote: SystemMetricsRemote, intervalMs?: number);
    /** Bare observable observation source bound to the `useMonitor` hook by the renderer. */
    get observationSource(): ObservableSource<MonitorObservation>;
    /** Start polling; the first snapshot is fetched immediately. */
    start(): void;
    /** Stop polling; the last observation stays readable. */
    stop(): void;
    private poll;
}
//# sourceMappingURL=monitor-poller.d.ts.map
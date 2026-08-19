/** Monitor poll cadence. */
export const MONITOR_POLL_INTERVAL_MS = 2000;
/** Bare observable source backing the monitor bar's `useMonitor` hook. */
class MonitorSource {
    value = { ok: false };
    listeners = new Set();
    getSnapshot() {
        return this.value;
    }
    subscribe(listener) {
        this.listeners.add(listener);
        return () => { this.listeners.delete(listener); };
    }
    set(next) {
        this.value = next;
        for (const listener of this.listeners)
            listener();
    }
}
/** Frame-level monitor controller owning the poll lifecycle. */
export class MonitorPoller {
    remote;
    intervalMs;
    source = new MonitorSource();
    timer;
    constructor(remote, intervalMs = MONITOR_POLL_INTERVAL_MS) {
        this.remote = remote;
        this.intervalMs = intervalMs;
    }
    /** Bare observable observation source bound to the `useMonitor` hook by the renderer. */
    get observationSource() {
        return this.source;
    }
    /** Start polling; the first snapshot is fetched immediately. */
    start() {
        if (this.timer !== undefined)
            return;
        void this.poll();
        this.timer = setInterval(() => { void this.poll(); }, this.intervalMs);
    }
    /** Stop polling; the last observation stays readable. */
    stop() {
        if (this.timer === undefined)
            return;
        clearInterval(this.timer);
        this.timer = undefined;
    }
    async poll() {
        const result = await this.remote.snapshot();
        this.source.set(result.ok
            ? { ok: true, snapshot: result.value }
            : { ok: false });
    }
}
//# sourceMappingURL=monitor-poller.js.map
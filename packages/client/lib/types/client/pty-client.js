import { IDLE_PTY_STATUS } from "./contract.js";
/** Poll interval for PTY output deltas. */
export const PTY_POLL_INTERVAL_MS = 200;
/** Mutable observable source backing the PTY status hook. */
class PtyStatusSource {
    value = IDLE_PTY_STATUS;
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
/**
 * One session's embedded browser terminal.
 * @param sessionId - owning session identity sent as the Remote agent scope.
 * @param remote - the terminalUI Remote face.
 * @param pollIntervalMs - output delta poll cadence.
 */
export class PtyClient {
    sessionId;
    remote;
    pollIntervalMs;
    source = new PtyStatusSource();
    timer;
    generation = 0;
    id = null;
    /** Sink for output deltas; assigned by the terminal panel component. */
    onOutput = null;
    constructor(sessionId, remote, pollIntervalMs = PTY_POLL_INTERVAL_MS) {
        this.sessionId = sessionId;
        this.remote = remote;
        this.pollIntervalMs = pollIntervalMs;
    }
    /** Bare observable status source bound to the `usePtyStatus` hook by the renderer. */
    get statusSource() {
        return this.source;
    }
    /**
     * Open a bash PTY for the session and start polling output.
     * @param cwd - optional initial working directory.
     */
    async open(cwd) {
        const generation = ++this.generation;
        this.source.set({ id: null, state: 'connecting', error: null });
        const result = await this.remote.open(this.sessionId, {
            ...cwd !== undefined ? { cwd } : {},
        });
        if (generation !== this.generation)
            return;
        if (!result.ok) {
            this.source.set({ id: null, state: 'failed', error: result.error.message });
            return;
        }
        this.id = result.value.id;
        this.source.set({ id: this.id, state: 'connected', error: null });
        this.startPolling(generation);
    }
    /**
     * Write raw text to the open PTY.
     * @param text - raw bytes.
     */
    async write(text) {
        const id = this.id;
        if (id === null)
            return;
        const result = await this.remote.write(this.sessionId, { id, text });
        // A transient write failure surfaces through the poll loop, not here.
        void result;
    }
    /**
     * Close the PTY and stop polling. Safe to call repeatedly and when idle.
     * @param reason - closing reason recorded on the host.
     */
    async close(reason = 'browser panel closed') {
        this.generation += 1;
        const id = this.id;
        this.id = null;
        this.stopPolling();
        this.source.set({ id: null, state: 'closed', error: null });
        if (id === null)
            return;
        const result = await this.remote.close(this.sessionId, { id, reason });
        // Best-effort: the host closes the owned process tree; a failure leaves
        // the owner cleanup to the agent lifecycle.
        void result;
    }
    startPolling(generation) {
        this.stopPolling();
        this.timer = setInterval(() => { void this.poll(generation); }, this.pollIntervalMs);
    }
    stopPolling() {
        if (this.timer === undefined)
            return;
        clearInterval(this.timer);
        this.timer = undefined;
    }
    async poll(generation) {
        const id = this.id;
        if (id === null || generation !== this.generation)
            return;
        const result = await this.remote.read(this.sessionId, { id });
        if (generation !== this.generation)
            return;
        if (!result.ok)
            return;
        const read = result.value;
        this.onOutput?.(read);
        if (read.exited)
            void this.close('pty exited');
    }
}
//# sourceMappingURL=pty-client.js.map
/** System-monitor Host Remote serving `node:os` resource snapshots to the browser. */
import type { Context } from '@deepseek-ai/cordis';
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { DirectoryListing, SystemMetricsSnapshot, SystemOverview } from './types.ts';
export type * from './types.ts';
/**
 * Remote-only service exposing host resource snapshots to the browser. Every
 * snapshot is projected directly from `node:os` at call time; no cache exists
 * to synchronize.
 */
export declare class SystemMetricsService extends TypertRemoteService {
    constructor(ctx: Context);
    /**
     * Read the current host resource state.
     * @returns load averages, since-boot CPU busy ratio, memory, and uptime.
     */
    snapshot(): SystemMetricsSnapshot;
    /**
     * Read the rich system overview for the left system panel: per-core CPU
     * tick counts (the client computes usage deltas between polls), memory and
     * swap, thermal/power/hardware (best-effort), and top processes.
     * @returns the overview.
     */
    overview(): Promise<SystemOverview>;
    /**
     * List one directory for the filesystem browser.
     * @param path - absolute directory to list.
     * @returns the listing (or an error string when unreadable).
     */
    listDirectory(path: string): Promise<DirectoryListing>;
}
export default SystemMetricsService;
//# sourceMappingURL=index.d.ts.map
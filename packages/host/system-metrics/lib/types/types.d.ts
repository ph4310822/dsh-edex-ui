/** Wire vocabulary for the system-monitor Host Remote. */
/** Point-in-time host resource snapshot for the terminal-shell monitor. */
export interface SystemMetricsSnapshot {
    /** 1-, 5-, and 15-minute load averages in platform units. */
    readonly loadavg: readonly [number, number, number];
    /** Average CPU busy ratio since boot across all cores, 0..1. */
    readonly cpuBusyRatio: number;
    /** Total physical memory in bytes. */
    readonly totalMemoryBytes: number;
    /** Free physical memory in bytes. */
    readonly freeMemoryBytes: number;
    /** Seconds since the host process's machine booted. */
    readonly uptimeSeconds: number;
    /** Wall-clock capture time in epoch milliseconds. */
    readonly timestamp: number;
}
/** One logical core's cumulative tick counts (node:os cpus()[i].times). */
export interface CoreTimes {
    readonly user: number;
    readonly nice: number;
    readonly sys: number;
    readonly idle: number;
    readonly irq: number;
}
/** One top-process row (CPU-sorted). */
export interface ProcessSample {
    readonly pid: number;
    readonly name: string;
    readonly cpuPct: number;
    readonly memPct: number;
}
/** Best-effort static hardware identity (cached after the first read). */
export interface HardwareInfo {
    readonly manufacturer: string;
    readonly model: string;
    readonly chassis: string;
}
/** Rich system overview for the left system panel. */
export interface SystemOverview {
    /** Wall-clock capture time in epoch milliseconds. */
    readonly timestamp: number;
    /** Host platform identifier (darwin/linux/win32/...). */
    readonly platform: string;
    /** Seconds since the host process's machine booted. */
    readonly uptimeSeconds: number;
    /** 1-, 5-, and 15-minute load averages in platform units. */
    readonly loadavg: readonly [number, number, number];
    /** Physical memory totals. */
    readonly memory: {
        readonly totalBytes: number;
        readonly usedBytes: number;
    };
    /** Swap totals (zeros when the platform exposes none). */
    readonly swap: {
        readonly totalBytes: number;
        readonly usedBytes: number;
    };
    /** One entry per logical core: cumulative tick counts; the client computes deltas. */
    readonly cores: readonly CoreTimes[];
    /** CPU thermal level (0..100 on macOS; °C on Linux) when readable, else null. */
    readonly thermalLevel: number | null;
    /** Power state ('CHARGE' | 'AC' | 'BATTERY') when readable, else null. */
    readonly powerState: string | null;
    /** Static hardware identity (best-effort). */
    readonly hardware: HardwareInfo;
    /** Total active process count. */
    readonly tasks: number;
    /** Top processes by CPU, descending. */
    readonly processes: readonly ProcessSample[];
    /** Active network interface status (best-effort). */
    readonly network: NetworkInfo;
    /** Storage usage of the process cwd mount (best-effort). */
    readonly storage: StorageInfo;
}
/** Active network interface status. */
export interface NetworkInfo {
    /** Active interface name (e.g. en0, tun0); '—' when none is found. */
    readonly interfaceName: string;
    /** 'IPv4 ONLINE' when the interface has an IPv4 address, else 'IPv4 OFFLINE'. */
    readonly state: string;
    /** The interface's IPv4 address, or null. */
    readonly ip: string | null;
    /** Round-trip ping to 8.8.8.8 in ms, or null when unreachable. */
    readonly pingMs: number | null;
    /** Cumulative received bytes (client computes throughput deltas). */
    readonly rxBytes: number;
    /** Cumulative transmitted bytes (client computes throughput deltas). */
    readonly txBytes: number;
}
/** Storage usage of one mount (best-effort). */
export interface StorageInfo {
    /** The probed path (the process cwd). */
    readonly path: string;
    readonly totalBytes: number;
    readonly usedBytes: number;
    readonly usedPct: number;
}
/** One filesystem entry. */
export interface DirectoryEntry {
    readonly name: string;
    readonly isDirectory: boolean;
}
/** One directory listing result. */
export interface DirectoryListing {
    /** The requested path. */
    readonly path: string;
    readonly entries: readonly DirectoryEntry[];
    /** Present when the path could not be listed (access/permission/not-found). */
    readonly error: string | null;
}
/** One file-preview result for the bottom-right preview pane. */
export interface FilePreview {
    /** The requested absolute path. */
    readonly path: string;
    /** How the browser should render the content. */
    readonly kind: 'text' | 'image' | 'video' | 'unsupported';
    /** Guessed MIME type ('' when unknown). */
    readonly mime: string;
    /** Total file size in bytes (before truncation). */
    readonly sizeBytes: number;
    /** True when the payload was capped (text 4 MiB / image 4 MiB / video 12 MiB). */
    readonly truncated: boolean;
    /** UTF-8 text content (kind 'text'), else null. */
    readonly text: string | null;
    /** data: URL payload (kind 'image'/'video'), else null. */
    readonly dataUrl: string | null;
    /** Present when the file could not be read (access/permission/not-found). */
    readonly error: string | null;
}
/** One file-write result for the bottom-right editor's save path. */
export interface WriteResult {
    /** The requested absolute path. */
    readonly path: string;
    /** Bytes written (the UTF-8 byte length of the persisted content). */
    readonly sizeBytes: number;
    /** Present when the file could not be written (access/permission/not-found). */
    readonly error: string | null;
}
//# sourceMappingURL=types.d.ts.map
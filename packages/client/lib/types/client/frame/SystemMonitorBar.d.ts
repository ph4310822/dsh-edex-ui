/**
 * Bottom monitor bar: CPU load, memory, and uptime meters projected from the
 * latest monitor observation. Pure component.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots';
import type { MonitorObservation } from '../monitor-poller.ts';
/** Format bytes as a compact human size. */
export declare function formatBytes(bytes: number): string;
/** Format seconds as `Hh Mm Ss`. */
export declare function formatUptime(seconds: number): string;
/** Monitor bar props. */
export interface SystemMonitorBarProps {
    /** Latest observation from the poller hook. */
    observation: MonitorObservation;
    t: TranslateNS<'terminal'>;
}
/** The bottom monitor bar. */
export declare function SystemMonitorBar({ observation, t }: SystemMonitorBarProps): import("react").JSX.Element;
//# sourceMappingURL=SystemMonitorBar.d.ts.map
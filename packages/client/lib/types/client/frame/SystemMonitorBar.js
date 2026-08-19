import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import css from './SystemMonitorBar.module.css';
/** Format bytes as a compact human size. */
export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes < 0)
        return '--';
    if (bytes < 1024)
        return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value.toFixed(1)} ${units[unit]}`;
}
/** Format seconds as `Hh Mm Ss`. */
export function formatUptime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0)
        return '--';
    const total = Math.floor(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    return hours > 0
        ? `${hours}h ${minutes}m ${secs}s`
        : `${minutes}m ${secs}s`;
}
/** One meter row. */
function Meter(props) {
    return (_jsxs("span", { className: css.meter, children: [_jsx("span", { className: css.meterLabel, children: props.label }), _jsx("span", { className: css.meterValue, children: props.text })] }));
}
/** The bottom monitor bar. */
export function SystemMonitorBar({ observation, t }) {
    if (!observation.ok) {
        return (_jsxs("div", { className: css.bar, "data-monitor-failed": "", children: [_jsx(Meter, { label: t('shell.monitor.cpu'), text: t('shell.monitor.unavailable') }), _jsx(Meter, { label: t('shell.monitor.memory'), text: t('shell.monitor.unavailable') }), _jsx(Meter, { label: t('shell.monitor.uptime'), text: t('shell.monitor.unavailable') })] }));
    }
    const snapshot = observation.snapshot;
    const memoryUsedPercent = snapshot.totalMemoryBytes === 0
        ? 0
        : Math.round((1 - snapshot.freeMemoryBytes / snapshot.totalMemoryBytes) * 100);
    return (_jsxs("div", { className: css.bar, children: [_jsx(Meter, { label: t('shell.monitor.cpu'), text: `${Math.round(snapshot.cpuBusyRatio * 100)}%` }), _jsx(Meter, { label: t('shell.monitor.memory'), text: `${memoryUsedPercent}% (${formatBytes(snapshot.freeMemoryBytes)} free)` }), _jsx(Meter, { label: t('shell.monitor.uptime'), text: formatUptime(snapshot.uptimeSeconds) })] }));
}
//# sourceMappingURL=SystemMonitorBar.js.map
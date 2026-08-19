/**
 * Bottom monitor bar: CPU load, memory, and uptime meters projected from the
 * latest monitor observation. Pure component.
 */
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import type { MonitorObservation } from '../monitor-poller.ts'
import type { ShellKey } from './TerminalFrame.tsx'
import css from './SystemMonitorBar.module.css'

/** Format bytes as a compact human size. */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB'] as const
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(1)} ${units[unit]}`
}

/** Format seconds as `Hh Mm Ss`. */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  const total = Math.floor(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  return hours > 0
    ? `${hours}h ${minutes}m ${secs}s`
    : `${minutes}m ${secs}s`
}

/** Monitor bar props. */
export interface SystemMonitorBarProps {
  /** Latest observation from the poller hook. */
  observation: MonitorObservation
  t: TranslateNS<'terminal'>
}

/** One meter row. */
function Meter(props: { label: string; text: string }) {
  return (
    <span className={css.meter}>
      <span className={css.meterLabel}>{props.label}</span>
      <span className={css.meterValue}>{props.text}</span>
    </span>
  )
}

/** The bottom monitor bar. */
export function SystemMonitorBar({ observation, t }: SystemMonitorBarProps) {
  if (!observation.ok) {
    return (
      <div className={css.bar} data-monitor-failed="">
        <Meter label={t('shell.monitor.cpu')} text={t('shell.monitor.unavailable')} />
        <Meter label={t('shell.monitor.memory')} text={t('shell.monitor.unavailable')} />
        <Meter label={t('shell.monitor.uptime')} text={t('shell.monitor.unavailable')} />
      </div>
    )
  }
  const snapshot = observation.snapshot
  const memoryUsedPercent = snapshot.totalMemoryBytes === 0
    ? 0
    : Math.round((1 - snapshot.freeMemoryBytes / snapshot.totalMemoryBytes) * 100)
  return (
    <div className={css.bar}>
      <Meter label={t('shell.monitor.cpu')} text={`${Math.round(snapshot.cpuBusyRatio * 100)}%`} />
      <Meter label={t('shell.monitor.memory')} text={`${memoryUsedPercent}% (${formatBytes(snapshot.freeMemoryBytes)} free)`} />
      <Meter label={t('shell.monitor.uptime')} text={formatUptime(snapshot.uptimeSeconds)} />
    </div>
  )
}

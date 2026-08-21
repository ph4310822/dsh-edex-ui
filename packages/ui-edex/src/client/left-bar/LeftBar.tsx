/**
 * Left bar content: digital clock + system/hardware specs, CPU/memory
 * telemetry with per-core sparklines, and the top-processes table.
 */
import { useEffect, useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { ProcessSample } from '@deepseek-ai/dsh-host-system-metrics/types'
import type { PanelSnapshot } from '../shared/types.ts'
import css from './LeftBar.module.css'

/** HH:MM:SS. */
function clockText(date: Date): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** H:MM:SS from a seconds count. */
function durationText(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${hours}:${pad(minutes)}:${pad(secs)}`
}

/** Tiny SVG sparkline over a 0..100 series. */
function Sparkline({ data, width = 64, height = 18 }: { data: readonly number[]; width?: number; height?: number }) {
  const points = data
    .map((value, index) => {
      const x = data.length <= 1 ? 0 : (index / (data.length - 1)) * width
      const y = height - (Math.min(100, Math.max(0, value)) / 100) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      className={css.spark}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {points !== '' && <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1" />}
    </svg>
  )
}

/** Segmented progress bar (block style). */
function BlockBar({ used, total }: { used: number; total: number }) {
  const blocks = 20
  const ratio = total > 0 ? Math.min(1, Math.max(0, used / total)) : 0
  const filled = Math.round(ratio * blocks)
  return (
    <div className={css.blockBar} aria-hidden="true">
      {Array.from({ length: blocks }, (_, index) => (
        <span key={index} className={index < filled ? css.blockOn : css.blockOff} />
      ))}
    </div>
  )
}

/** CPU core-pair section: sparkline + percentage per pair (#1-2, #3-4...). */
function CpuPairs({ busy, history }: { busy: readonly number[]; history: readonly (readonly number[])[] }) {
  const pairs: { label: string; pct: number; series: readonly number[] }[] = []
  for (let index = 0; index < busy.length; index += 2) {
    const a = busy[index]
    const b = busy[index + 1]
    pairs.push({
      label: b === undefined ? `#${index + 1}` : `#${index + 1}-${index + 2}`,
      pct: Math.round((a + (b ?? a)) / (b === undefined ? 1 : 2)),
      series: history[index] ?? [],
    })
  }
  return (
    <div className={css.cpuPairs}>
      {pairs.map(pair => (
        <div key={pair.label} className={css.cpuPair}>
          <span className={css.cpuLabel}>{pair.label}</span>
          <Sparkline data={pair.series} />
          <span className={css.cpuPct}>{String(pair.pct).padStart(3, ' ')}%</span>
        </div>
      ))}
    </div>
  )
}

/** Top-processes table. */
function ProcessTable({ processes }: { processes: readonly ProcessSample[] }) {
  return (
    <table className={css.procTable}>
      <thead>
        <tr>
          <th>PID</th>
          <th>NAME</th>
          <th className={css.num}>CPU%</th>
          <th className={css.num}>MEM%</th>
        </tr>
      </thead>
      <tbody>
        {processes.map(proc => (
          <tr key={proc.pid}>
            <td>{proc.pid}</td>
            <td className={css.procName}>{proc.name}</td>
            <td className={css.num}>{proc.cpuPct.toFixed(1)}</td>
            <td className={css.num}>{proc.memPct.toFixed(1)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** The left column content (rendered inside the eDEX shell's left bar). */
export function LeftBar({ usePanel }: { usePanel: SnapshotSelectorHook<PanelSnapshot> }) {
  const panel = usePanel(s => s)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => { clearInterval(timer) }
  }, [])

  const year = now.getFullYear()

  return (
    <div className={css.panel} data-testid="edex-left-bar">
      {/* ── clock & system specs ── */}
      <section className={css.section}>
        <div className={css.clock} data-testid="edex-left-bar-clock">{clockText(now)}</div>
        <div className={css.specs}>
          <div className={css.specLine}><span className={css.specKey}>YEAR</span><span>{year}</span></div>
          <div className={css.specLine}><span className={css.specKey}>UPTIME</span><span>{durationText(panel.uptimeSeconds)}</span></div>
          <div className={css.specLine}><span className={css.specKey}>CONNECTION</span><span>{panel.platform === '' ? '—' : panel.platform}</span></div>
          <div className={css.specLine}><span className={css.specKey}>POWER</span><span>{panel.powerState ?? '—'}</span></div>
        </div>
        <div className={css.specs}>
          <div className={css.specLine}><span className={css.specKey}>MANUFACTURER</span><span>{panel.hardware.manufacturer}</span></div>
          <div className={css.specLine}><span className={css.specKey}>MODEL</span><span>{panel.hardware.model}</span></div>
          <div className={css.specLine}><span className={css.specKey}>CHASSIS</span><span>{panel.hardware.chassis}</span></div>
        </div>
      </section>

      {/* ── telemetry & metrics ── */}
      <section className={css.section}>
        <div className={css.sectionTitle}>CPU</div>
        <CpuPairs busy={panel.cpuBusy} history={panel.cpuHistory} />
        <div className={css.metricRow}>
          <div className={css.metric}><span className={css.metricKey}>TEMP</span><span>{panel.thermalLevel === null ? '--' : String(Math.round(panel.thermalLevel))}</span></div>
          <div className={css.metric}><span className={css.metricKey}>MIN</span><span>{String(Math.round(panel.cpuMin))}%</span></div>
          <div className={css.metric}><span className={css.metricKey}>MAX</span><span>{String(Math.round(panel.cpuMax))}%</span></div>
          <div className={css.metric}><span className={css.metricKey}>TASKS</span><span>{panel.tasks}</span></div>
        </div>

        <div className={css.memBlock}>
          <div className={css.memLabel}>
            <span>USING {panel.memoryUsedGiB.toFixed(1)} OF {panel.memoryTotalGiB.toFixed(1)} GiB</span>
            <span className={css.memPct}>{panel.memoryTotalGiB > 0 ? `${Math.round((panel.memoryUsedGiB / panel.memoryTotalGiB) * 100)}%` : ''}</span>
          </div>
          <BlockBar used={panel.memoryUsedGiB} total={panel.memoryTotalGiB} />
          <div className={css.memLabel}>
            <span>SWAP {panel.swapUsedGiB.toFixed(1)} / {panel.swapTotalGiB.toFixed(1)} GiB</span>
            <span className={css.memPct}>{panel.swapTotalGiB > 0 ? `${Math.round((panel.swapUsedGiB / panel.swapTotalGiB) * 100)}%` : ''}</span>
          </div>
          <BlockBar used={panel.swapUsedGiB} total={panel.swapTotalGiB} />
        </div>
      </section>

      {/* ── top processes ── */}
      <section className={`${css.section} ${css.processesSection}`}>
        <div className={css.sectionTitle}>PROCESSES</div>
        <div className={css.procTableWrap}>
          <ProcessTable processes={panel.processes} />
        </div>
      </section>

      <footer className={css.foot}>
        <span className={css.footText}>loadavg {panel.loadavg.map(value => value.toFixed(2)).join(' ')}</span>
      </footer>
    </div>
  )
}

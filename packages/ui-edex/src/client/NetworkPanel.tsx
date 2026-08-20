/**
 * Right column content: network interface status header, rotating wireframe
 * globe with endpoint coordinates, and a dual up/down traffic sparkline.
 */
import { useEffect, useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import type { NetworkSnapshot } from './types.ts'
import css from './NetworkPanel.module.css'

/** Sample endpoints (lat/lon) drawn on the globe. */
const ENDPOINTS: readonly { label: string; lat: number; lon: number }[] = [
  { label: 'US-WEST', lat: 34.05, lon: -118.24 },
  { label: 'US-EAST', lat: 40.71, lon: -74.01 },
  { label: 'EU-CENTRAL', lat: 48.86, lon: 2.35 },
  { label: 'AP-SOUTH', lat: 1.35, lon: 103.82 },
  { label: 'AP-NORTHEAST', lat: 35.68, lon: 139.69 },
]

/** Project lat/lon to the globe's 2D disc (rotation phase in degrees). */
function project(lat: number, lon: number, phase: number, radius: number): { x: number; y: number; visible: boolean } {
  const lonRad = ((lon + phase) * Math.PI) / 180
  const latRad = (lat * Math.PI) / 180
  const cosLon = Math.cos(lonRad)
  return {
    x: radius * Math.cos(latRad) * cosLon,
    y: -radius * Math.sin(latRad),
    visible: cosLon > 0,
  }
}

/** Rotating wireframe globe (meridians + parallels + endpoint dots). */
function Globe() {
  const [phase, setPhase] = useState(0)
  useEffect(() => {
    let raf = 0
    const tick = (): void => {
      setPhase(value => value + 0.4)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf) }
  }, [])
  const radius = 52
  const cx = 70
  const cy = 62
  const meridians = [0, 30, 60, 90, 120, 150].map(offset => {
    const pts: string[] = []
    for (let lat = -90; lat <= 90; lat += 15) {
      const p = project(lat, offset, phase, radius)
      pts.push(`${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`)
    }
    return pts.join(' ')
  })
  const parallels = [-60, -30, 0, 30, 60].map(lat => {
    const pts: string[] = []
    for (let lon = 0; lon <= 360; lon += 15) {
      const p = project(lat, lon, phase, radius)
      pts.push(`${(cx + p.x).toFixed(1)},${(cy + p.y).toFixed(1)}`)
    }
    return pts.join(' ')
  })
  return (
    <svg className={css.globe} viewBox="0 0 140 124" aria-hidden="true">
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      {meridians.map((points, index) => (
        <polyline key={`m${index}`} points={points} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      ))}
      {parallels.map((points, index) => (
        <polyline key={`p${index}`} points={points} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      ))}
      {ENDPOINTS.map(endpoint => {
        const p = project(endpoint.lat, endpoint.lon, phase, radius)
        return (
          <circle
            key={endpoint.label}
            cx={cx + p.x}
            cy={cy + p.y}
            r={2}
            fill={p.visible ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="0.75"
            opacity={p.visible ? 1 : 0.3}
          />
        )
      })}
    </svg>
  )
}

/** Dual up/down sparkline. */
function TrafficChart({ up, down }: { up: readonly number[]; down: readonly number[] }) {
  const width = 160
  const height = 36
  const toPoints = (series: readonly number[]): string => {
    const max = Math.max(1, ...series)
    return series
      .map((value, index) => {
        const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * width
        const y = height - (value / max) * height
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }
  return (
    <svg className={css.traffic} width={width} height={height} aria-hidden="true">
      <polyline points={toPoints(down)} fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <polyline points={toPoints(up)} fill="none" stroke="#e0c05a" strokeWidth="1" opacity="0.9" />
    </svg>
  )
}

/** The right column content (rendered inside the eDEX shell's right bar). */
export function NetworkPanel({ useNetwork }: { useNetwork: SnapshotSelectorHook<NetworkSnapshot> }) {
  const network = useNetwork(s => s)

  return (
    <div className={css.panel} data-testid="edex-network-panel">
      <section className={css.section}>
        <div className={css.title}>NETWORK STATUS</div>
        <div className={css.specLine}><span className={css.key}>INTERFACE</span><span>{network.network.interfaceName}</span></div>
        <div className={css.specLine}><span className={css.key}>STATE</span><span>{network.network.state}</span></div>
        <div className={css.specLine}><span className={css.key}>IP</span><span>{network.network.ip ?? '—'}</span></div>
        <div className={css.specLine}><span className={css.key}>PING</span><span>{network.network.pingMs === null ? '—' : `${network.network.pingMs.toFixed(0)}ms`}</span></div>
      </section>

      <section className={css.section}>
        <div className={css.title}>WORLD VIEW</div>
        <div className={css.globePane}>
          <Globe />
          <div className={css.endpoints}>
            {ENDPOINTS.map(endpoint => (
              <div key={endpoint.label} className={css.endpoint}>
                <span className={css.endpointName}>{endpoint.label}</span>
                <span className={css.endpointCoord}>{endpoint.lat.toFixed(2)}°N {Math.abs(endpoint.lon).toFixed(2)}°{endpoint.lon < 0 ? 'W' : 'E'}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={css.section}>
        <div className={css.title}>TRAFFIC</div>
        <div className={css.trafficHeader}>
          <span><span className={css.key}>UP</span> {network.upMbs.toFixed(2)} MB/s</span>
          <span><span className={css.key}>DOWN</span> {network.downMbs.toFixed(2)} MB/s</span>
        </div>
        <TrafficChart up={network.upHistory} down={network.downHistory} />
      </section>
    </div>
  )
}

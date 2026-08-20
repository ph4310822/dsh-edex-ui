/**
 * Right column content: network interface status header, an encom-globe
 * WebGL world view with endpoint markers and spline links, and a dual up/down
 * traffic sparkline.
 */
import { useEffect, useRef } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
import Globe from 'encom-globe'
import { generateGlobeTiles } from './tiles.ts'
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

/** The encom-globe rendering size (the canvas is CSS-scaled to the pane). */
const GLOBE_WIDTH = 320
const GLOBE_HEIGHT = 240

/** WebGL world view: an encom-globe instance with the endpoint markers chained by splines. */
function WorldView() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    let raf = 0
    let globe: Globe | null = null
    try {
      globe = new Globe(GLOBE_WIDTH, GLOBE_HEIGHT, {
        baseColor: '#46f282',
        markerColor: '#46f282',
        pinColor: '#5ad1e0',
        satelliteColor: '#46f282',
        font: 'Inconsolata',
        introLinesDuration: 1200,
        maxMarkers: ENDPOINTS.length + 2,
        // The hex-particle surface: generated at runtime (the library's
        // precomputed grid.js is ~960 KB; this keeps the bundle small).
        tiles: generateGlobeTiles(),
      })
    } catch {
      return // no WebGL: leave the pane empty rather than crashing the panel
    }
    host.appendChild(globe.domElement)
    const loop = (): void => {
      if (globe !== null && globe.active) globe.tick()
      raf = requestAnimationFrame(loop)
    }
    globe.init(() => {
      let first = true
      for (const endpoint of ENDPOINTS) {
        globe?.addMarker(endpoint.lat, endpoint.lon, endpoint.label, !first)
        first = false
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      cancelAnimationFrame(raf)
      if (globe !== null) {
        globe.destroy()
        globe.domElement.remove()
      }
    }
  }, [])

  return <div ref={hostRef} className={css.globeHost} data-testid="edex-world-view" />
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
          <WorldView />
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

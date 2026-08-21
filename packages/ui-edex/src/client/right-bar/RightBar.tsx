/**
 * Right bar content: network interface status header, an encom-globe WebGL
 * world view with endpoint markers and spline links, and a dual up/down
 * traffic sparkline.
 */
import { useEffect, useRef, useState } from 'react'
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-ui-slots'
// Vendored local encom-globe checkout (modified; see vendor/encom-globe).
import Globe from '../../../vendor/encom-globe/src/Globe.js'
import { generateGlobeTiles } from '../shared/tiles.ts'
import type { NetworkSnapshot } from '../shared/types.ts'
import css from './RightBar.module.css'

/** Sample endpoints (lat/lon) drawn on the globe. */
const ENDPOINTS: readonly { label: string; lat: number; lon: number }[] = [
  { label: 'US-WEST', lat: 34.05, lon: -118.24 },
  { label: 'US-EAST', lat: 40.71, lon: -74.01 },
  { label: 'EU-CENTRAL', lat: 48.86, lon: 2.35 },
  { label: 'AP-SOUTH', lat: 1.35, lon: 103.82 },
  { label: 'AP-NORTHEAST', lat: 35.68, lon: 139.69 },
]

/** The encom-globe rendering size (1:1; the canvas is CSS-scaled to the pane). */
const GLOBE_WIDTH = 320
const GLOBE_HEIGHT = 320

/** WebGL world view: an encom-globe instance with the endpoint markers chained by splines. */
function WorldView({ color }: { color: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    let raf = 0
    let globe: Globe | null = null
    let disposed = false
    try {
      globe = new Globe(GLOBE_WIDTH, GLOBE_HEIGHT, {
        baseColor: color,
        markerColor: color,
        pinColor: '#5ad1e0',
        satelliteColor: color,
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
      if (disposed) return
      let first = true
      for (const endpoint of ENDPOINTS) {
        globe?.addMarker(endpoint.lat, endpoint.lon, endpoint.label, !first)
        first = false
      }
      raf = requestAnimationFrame(loop)
    })
    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      if (globe !== null) {
        globe.destroy()
        globe.domElement.remove()
      }
    }
  }, [color])

  return <div ref={hostRef} className={css.globeHost} data-testid="edex-world-view" />
}

/** Dual up/down sparkline with a light grid overlay. The height is dynamic:
 *  the section flex-fills the bar's leftover space (screen − bottom panel −
 *  network status − globe), and a ResizeObserver sizes the SVG viewBox to
 *  match the box 1:1, so strokes render cleanly at any size. */
function TrafficChart({ up, down }: { up: readonly number[]; down: readonly number[] }) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ w: 316, h: 160 })

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const measure = (): void => {
      const rect = host.getBoundingClientRect()
      setSize({ w: Math.max(80, Math.floor(rect.width)), h: Math.max(48, Math.floor(rect.height)) })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(host)
    return () => { ro.disconnect() }
  }, [])

  const { w, h } = size
  const PAD = 2  // viewBox padding so lines at the extremes never clip (stroke extends ±0.75px)
  const toPoints = (series: readonly number[]): string => {
    const max = Math.max(1, ...series)
    return series
      .map((value, index) => {
        const x = series.length <= 1 ? 0 : (index / (series.length - 1)) * w
        const y = PAD + (1 - value / max) * (h - 2 * PAD)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(' ')
  }
  // Light grid: 4 horizontal bands × 8 vertical columns (1:1 viewBox = 1px strokes).
  const horizontalLines = [0.25, 0.5, 0.75].map(f => PAD + f * (h - 2 * PAD))
  const verticalLines = Array.from({ length: 7 }, (_, i) => (w / 8) * (i + 1))
  return (
    <div ref={hostRef} className={css.trafficChart}>
      <svg
        className={css.traffic}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <g stroke="currentColor" strokeOpacity="0.18" strokeWidth="1">
          {horizontalLines.map(y => <line key={`h${y}`} x1="0" y1={y} x2={w} y2={y} />)}
          {verticalLines.map(x => <line key={`v${x}`} x1={x} y1="0" x2={x} y2={h} />)}
        </g>
        <polyline points={toPoints(down)} fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.9" />
        <polyline className={css.trafficUp} points={toPoints(up)} fill="none" strokeWidth="1.5" opacity="0.9" />
      </svg>
    </div>
  )
}

/** The right column content (rendered inside the eDEX shell's right bar). */
export function RightBar({ useNetwork, color }: { useNetwork: SnapshotSelectorHook<NetworkSnapshot>; color: string }) {
  const network = useNetwork(s => s)

  return (
    <div className={css.panel} data-testid="edex-right-bar">
      <section className={css.section}>
        <div className={css.title}>NETWORK STATUS</div>
        <div className={css.specLine}><span className={css.key}>INTERFACE</span><span>{network.network.interfaceName}</span></div>
        <div className={css.specLine}><span className={css.key}>STATE</span><span>{network.network.state}</span></div>
        <div className={css.specLine}><span className={css.key}>IP</span><span>{network.network.ip ?? '—'}</span></div>
        <div className={css.specLine}><span className={css.key}>PING</span><span>{network.network.pingMs === null ? '—' : `${network.network.pingMs.toFixed(0)}ms`}</span></div>
      </section>

      <section className={`${css.section} ${css.globeSection}`}>
        <div className={css.title}>WORLD VIEW</div>
        <div className={css.globePane}>
          <WorldView color={color} />
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

      <section className={`${css.section} ${css.trafficSection}`}>
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

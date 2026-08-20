/**
 * Minimal type declaration for encom-globe (a plain-CJS WebGL globe library,
 * MIT licensed). Only the surface this plugin uses is typed; the package
 * ships no types of its own.
 */
declare module 'encom-globe' {
  /** One hex tile as the globe's particle builder consumes it. */
  interface GlobeTile {
    lat: number
    lon: number
    b: readonly { x: number; y: number; z: number }[]
  }

  /** Constructor options (defaults mirror the library's own). */
  interface GlobeOptions {
    font?: string
    baseColor?: string
    markerColor?: string
    pinColor?: string
    satelliteColor?: string
    blankPercentage?: number
    thinAntarctica?: number
    mapUrl?: string
    introLinesAltitude?: number
    introLinesDuration?: number
    introLinesColor?: string
    introLinesCount?: number
    scale?: number
    dayLength?: number
    pointsPerDegree?: number
    pointSize?: number
    pointsVariance?: number
    maxPins?: number
    maxMarkers?: number
    data?: readonly { lat: number; lng: number; label: string }[]
    tiles?: readonly GlobeTile[]
    viewAngle?: number
  }

  /** The encom-globe WebGL globe. */
  export default class Globe {
    constructor(width: number, height: number, opts?: GlobeOptions)
    /** The WebGL canvas to attach to the page. */
    domElement: HTMLCanvasElement
    /** False once destroy() begins; the tick loop should stop calling tick(). */
    active: boolean
    /** Initialize the scene; the callback fires when the globe is ready. */
    init(callback: () => void): void
    /** Tear the scene down (one animation frame per call). */
    destroy(callback?: () => void): void
    /** Advance the globe animation by one frame. */
    tick(): void
    /** Drop a labeled pin at lat/lon. */
    addPin(lat: number, lon: number, text: string): void
    /**
     * Drop a marker at lat/lon. `connected` true links it to the previously
     * added marker with a spline; an object links to that specific marker.
     */
    addMarker(lat: number, lon: number, text: string, connected?: boolean | object): void
    setBaseColor(color: string): void
    setMarkerColor(color: string): void
    setPinColor(color: string): void
    setScale(scale: number): void
    setMaxPins(max: number): void
    setMaxMarkers(max: number): void
  }
}

/** Minimal declaration for hexasphere.js (the grid generator encom-globe depends on). */
declare module 'hexasphere.js' {
  interface HexPoint {
    x: number
    y: number
    z: number
    /** Interpolate from this point toward `other` by fraction t (0..1). */
    segment(other: HexPoint, t: number): HexPoint
  }
  interface HexTile {
    centerPoint: HexPoint
    /** Boundary vertices (5 for pentagons, 6 for hexagons). */
    boundary: readonly HexPoint[]
    getLatLon(radius: number, pointIndex?: number): { lat: number; lon: number }
  }
  /** The hexasphere icosphere generator. */
  export default class Hexasphere {
    constructor(radius: number, numDivisions: number, hexSize: number)
    tiles: readonly HexTile[]
  }
}

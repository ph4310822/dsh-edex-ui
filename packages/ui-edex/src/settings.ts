/**
 * eDEX theme-color setting: the single durable accent that drives both the
 * shell frame's palette (`--edex-*`) and the terminal token override layer
 * over the original UI (`--dsw-alias-*`). One color in, a full CRT family
 * out — primary, dim midtone, dark border, and a faint tinted panel tone —
 * while the semantic accents (amber warn, red error, cyan info) stay fixed.
 * Shared by the Host loader entry (schema registration) and the browser half
 * (scope binding, token overrides, and the settings row).
 */
import z from '@deepseek-ai/schemastery'
import type { ThemeTokenOverrides } from '@deepseek-ai/dsh-client-ui-theme/client'

/** Settings namespace owned by the eDEX shell plugin. */
export const EDEX_SETTINGS_NAMESPACE = 'ui-edex'

/** Field carrying the selected theme color. */
export const THEME_COLOR_FIELD = 'themeColor'

/** The default theme color — the classic terminal green. */
export const DEFAULT_THEME_COLOR = '#46f282'

/** Durable theme-color section shared by the Host schema and the browser scope. */
export interface EdexSettings {
  /** The accent color driving the whole eDEX palette. */
  themeColor: string
}

/** Durable theme-color schema; also the wire envelope the browser scope validates against. */
export const EdexSettingsSchema: z<EdexSettings> = z.object({
  [THEME_COLOR_FIELD]: z.string().default(DEFAULT_THEME_COLOR),
})

/** One selectable preset swatch. */
export interface ThemeColorPreset {
  /** Stable preset id (the swatch key). */
  id: string
  /** Locale key for the swatch's accessible name. */
  labelKey: string
  /** The accent color this preset applies. */
  color: string
}

/** Preset swatches offered in the Theme Color settings row. */
export const THEME_COLOR_PRESETS: readonly ThemeColorPreset[] = Object.freeze([
  { id: 'terminal', labelKey: 'edex.preset.terminal', color: '#46f282' },
  { id: 'amber', labelKey: 'edex.preset.amber', color: '#e6c85c' },
  { id: 'cyan', labelKey: 'edex.preset.cyan', color: '#5ad1e0' },
  { id: 'violet', labelKey: 'edex.preset.violet', color: '#c792ea' },
  { id: 'blue', labelKey: 'edex.preset.blue', color: '#7ec8e3' },
])

/** The semantic accents that stay fixed across theme colors. */
export const FIXED_ACCENTS = Object.freeze({
  amber: '#e6c85c',
  red: '#e65a5a',
  cyan: '#5ad1e0',
})

/** The full eDEX palette derived from one accent color. */
export interface EdexPalette {
  /** The primary accent (text, icons, fills). */
  primary: string
  /** Muted midtone (secondary text, icon tints). */
  dim: string
  /** Dark border tone. */
  border: string
  /** Faint tinted panel background. */
  panel2: string
}

/** Normalize an #rgb/#rrggbb hex to lowercase #rrggbb, or null when invalid. */
export function normalizeHex(value: string): string | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim())
  if (match === null) return null
  const hex = match[1] as string
  if (hex.length === 3) return `#${hex.split('').map(c => c + c).join('')}`.toLowerCase()
  return `#${hex}`.toLowerCase()
}

function clamp(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function channel(value: number): string {
  return clamp(value).toString(16).padStart(2, '0')
}

/** #rrggbb → 0..255 channels (the caller has already normalized). */
function hexToRgb(color: string): { r: number; g: number; b: number } {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  }
}

/**
 * Derive one tone from a hex color at a target lightness (0..100) with the
 * saturation scaled down toward black — the CRT family desaturates as it
 * darkens, mirroring the original green's dim/border/panel tones rather than
 * keeping the accent's full saturation at every step.
 */
function tone(color: string, lightness: number, saturationScale: number): string {
  const { r, g, b } = hexToRgb(normalizeHex(color) ?? DEFAULT_THEME_COLOR)
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const delta = max - min
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  s *= saturationScale
  const target = clamp(lightness) / 100
  const q = target < 0.5 ? target * (1 + s) : target + s - target * s
  const p = 2 * target - q
  const hue = (value: number): number => {
    let t = value
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return `#${channel(hue(h / 360 + 1 / 3) * 255)}${channel(hue(h / 360) * 255)}${channel(hue(h / 360 - 1 / 3) * 255)}`
}

/** Derive the full CRT family from one accent color. */
export function paletteFor(color: string): EdexPalette {
  const primary = normalizeHex(color) ?? DEFAULT_THEME_COLOR
  return {
    primary,
    dim: tone(primary, 45, 0.67),
    border: tone(primary, 22, 0.72),
    panel2: tone(primary, 5, 0.55),
  }
}

/** The eDEX shell frame's CSS variables for one palette (amber/red/cyan stay in the stylesheet). */
export function shellVarsFor(palette: EdexPalette): Record<string, string> {
  return {
    '--edex-green': palette.primary,
    '--edex-dim': palette.dim,
    '--edex-border': palette.border,
    '--edex-panel-2': palette.panel2,
  }
}

/** One override-layer token value pair; both palettes carry the same value (the terminal skin is scheme-invariant). */
function both(value: string): { light: string; dark: string } {
  return { light: value, dark: value }
}

/**
 * The token override layer that recolors the whole original UI — every label
 * token that feeds icon glyphs included — from one palette. `label-tertiary`
 * and `label-caption` are the specific tokens behind the small icons beside
 * tool names (Bash / Read / Think / …) and their separators, so overriding
 * them is what makes those glyphs theme-colored like every other icon.
 */
export function tokenOverridesFor(palette: EdexPalette): ThemeTokenOverrides {
  return {
    // Backgrounds stay black; only the accent's tinted panel tone changes.
    '--dsw-alias-bg-base': both('#000000'),
    '--dsw-alias-bg-layer-1': both('#000000'),
    '--dsw-alias-bg-layer-2': both('#000000'),
    '--dsw-alias-bg-overlay': both('#000000'),
    '--dsw-alias-border-l1': both(palette.border),
    '--dsw-alias-border-l2': both(palette.dim),
    '--dsw-alias-border-l3': both(palette.primary),
    '--dsw-alias-brand-primary': both(palette.primary),
    '--dsw-alias-label-primary': both(palette.primary),
    '--dsw-alias-label-primary-bluish': both(palette.primary),
    '--dsw-alias-label-primary-dimmed': both(palette.dim),
    '--dsw-alias-label-secondary': both(palette.dim),
    '--dsw-alias-label-tertiary': both(palette.dim),
    '--dsw-alias-label-caption': both(palette.dim),
    '--dsw-alias-state-error-primary': both(FIXED_ACCENTS.red),
    '--dsw-alias-state-success-primary': both(palette.primary),
    '--dsw-alias-state-warn-primary': both(FIXED_ACCENTS.amber),
    '--dsw-alias-state-business-primary': both(palette.primary),
    '--dsw-alias-button-info-fill': both(palette.primary),
    '--dsw-alias-button-info-hover': both(palette.dim),
    '--dsw-specific-sidebar-fill': both('#000000'),
    '--dsw-specific-input-major': both('#000000'),
  }
}

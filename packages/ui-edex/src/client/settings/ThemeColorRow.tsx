/**
 * Theme Color settings row, registered into the General section item slot: the
 * label plus a swatch row of presets and a native color input for a custom
 * accent. Selecting a swatch (or picking a color) writes the themeColor field
 * through the eDEX settings scope; the current value rides the inject face's
 * observable hook, so the row stays in step with every change — including
 * ones made in the Host document while the dialog is open.
 */
import type { InjectFace, PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import { THEME_COLOR_PRESETS, type ThemeColorPreset } from '../../settings.ts'
import type { ObservableSource } from '../shared/types.ts'
import type { EdexThemeKey } from './locales.ts'
import css from './ThemeColorRow.module.css'

/** The row's inject face: the write plus the current-color hook source. */
export interface ThemeColorRowInjected {
  /** Persist one theme color (scope.set('themeColor', color)). */
  setColor: (color: string) => void
  /** Bare observable "current theme color" source bound to useColor. */
  hooks: { color: ObservableSource<string> }
}

/** Full composed props of the row. */
export type ThemeColorRowProps =
  & PropsLocale<'settings.edex'>
  & InjectFace<ThemeColorRowInjected>

/** One swatch button: aria-label from its localized preset name. */
function Swatch({
  preset, active, t, onSelect,
}: {
  preset: ThemeColorPreset
  active: boolean
  t: ThemeColorRowProps['t']
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={css.swatch}
      style={{ '--swatch': preset.color } as React.CSSProperties}
      data-active={active || undefined}
      aria-pressed={active}
      aria-label={t(preset.labelKey as EdexThemeKey)}
      onClick={onSelect}
    />
  )
}

/** The Theme Color row: label + presets + custom picker. */
export function ThemeColorRow({ useColor, setColor, t }: ThemeColorRowProps) {
  const color = useColor(s => s)
  const custom = !THEME_COLOR_PRESETS.some(preset => preset.color === color)
  return (
    <div className={css.row} data-testid="edex-theme-color-row">
      <span className={css.label}>{t('edex.themeColor')}</span>
      <div className={css.swatches}>
        {THEME_COLOR_PRESETS.map(preset => (
          <Swatch
            key={preset.id}
            preset={preset}
            active={preset.color === color}
            t={t}
            onSelect={() => { setColor(preset.color) }}
          />
        ))}
        <input
          type="color"
          className={css.picker}
          value={color}
          data-active={custom || undefined}
          aria-label={t('edex.custom')}
          title={t('edex.custom')}
          onChange={event => { setColor(event.target.value) }}
        />
      </div>
    </div>
  )
}

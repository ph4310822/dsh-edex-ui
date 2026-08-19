/**
 * The CRT bezel: left/right/bottom bars framing the whole UI. Pure
 * decoration — pointer-events none everywhere (the overlay container makes
 * children interactive by default, so the root pins it back off inline).
 */
import css from './CrtFrame.module.css'

/** The bezel overlay. */
export function CrtFrame() {
  return (
    <div className={css.frame} data-testid="crt-frame" style={{ pointerEvents: 'none' }}>
      <div className={css.barLeft} />
      <div className={css.barRight} />
      <div className={css.barBottom} />
    </div>
  )
}

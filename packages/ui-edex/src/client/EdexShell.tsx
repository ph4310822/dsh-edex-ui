/**
 * The eDEX shell frame: a fixed full-viewport layer whose left bar, right
 * bar, and bottom cells tile around the ORIGINAL web UI, which is squeezed
 * into the center region (≈55% × 70%) by reshaping the layout frame element
 * in place. The shell is registered into the `shell.overlay` list slot, so it
 * renders above every column without disabling or replacing anything in the
 * default surface; pointer events stay enabled only on the panel cells, so
 * the original UI remains fully interactive in the center.
 *
 * Frame reshaping: the overlay layer lives inside the layout frame (its
 * parent carries `data-shell-overlay`), so the effect climbs to the frame and
 * pins it to the center region with inline styles. Every change is restored
 * on dispose, so unloading this plugin restores the stock layout exactly.
 */
import { useLayoutEffect, useRef } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { FilesState, NetworkSnapshot, ObservableSource, PanelSnapshot } from './types.ts'
import { FilesBrowser } from './FilesBrowser.tsx'
import { NetworkPanel } from './NetworkPanel.tsx'
import { SystemPanel } from './SystemPanel.tsx'
import css from './EdexShell.module.css'

/** The frame region the original UI is squeezed into (grid-column track of the viewport). */
export const CENTER_LEFT = '20vw'
export const CENTER_RIGHT = '25vw'
export const CENTER_BOTTOM = '30vh'

/**
 * Find the layout frame element that owns the overlay layer this shell
 * renders in: the overlay layer carries `data-shell-overlay`, its parent is
 * the three-column frame (ui-layout AppFrame). Climbing instead of matching a
 * hashed class keeps this robust against per-entry host wrappers.
 * @param shellRoot - this shell's root element.
 * @returns the frame element, or null when it cannot be found.
 */
function findLayoutFrame(shellRoot: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = shellRoot.parentElement
  while (el !== null) {
    if (el.hasAttribute('data-shell-overlay')) return el.parentElement
    el = el.parentElement
  }
  return null
}

/** The shell entry's inject face: panel actions plus the three hook seats. */
export interface EdexShellInjected {
  /** Fetch storage + the current directory listing. */
  refreshFiles: () => void
  /** Navigate into a directory (or '..' up). */
  navigateFiles: (name: string) => void
  hooks: {
    panel: ObservableSource<PanelSnapshot>
    network: ObservableSource<NetworkSnapshot>
    files: ObservableSource<FilesState>
  }
}

/** Full composed props of the shell entry (hooks arrive as `use*` selector hooks). */
export type EdexShellProps = InjectFace<EdexShellInjected>

/** The full eDEX frame: left/right bars + bottom cells around the original UI. */
export function EdexShell({
  usePanel, useNetwork, useFiles, refreshFiles, navigateFiles,
}: EdexShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const shell = shellRef.current
    if (shell === null) return
    const frame = findLayoutFrame(shell)
    if (frame === null) return
    const saved = frame.getAttribute('style')
    frame.style.position = 'fixed'
    frame.style.top = '0'
    frame.style.left = CENTER_LEFT
    frame.style.right = CENTER_RIGHT
    frame.style.bottom = CENTER_BOTTOM
    frame.style.height = 'auto'
    frame.style.width = 'auto'
    return () => {
      if (saved === null) frame.removeAttribute('style')
      else frame.setAttribute('style', saved)
    }
  }, [])

  return (
    <div ref={shellRef} className={css.shell} data-edex-shell="" data-testid="edex-shell">
      <aside className={css.leftBar}>
        <SystemPanel usePanel={usePanel} />
      </aside>
      <aside className={css.rightBar}>
        <NetworkPanel useNetwork={useNetwork} />
      </aside>
      <section className={css.bottomLeft}>
        <FilesBrowser useFiles={useFiles} refresh={refreshFiles} navigate={navigateFiles} />
      </section>
      <section className={css.bottomRight} aria-hidden="true" />
    </div>
  )
}

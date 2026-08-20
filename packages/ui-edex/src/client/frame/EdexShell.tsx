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
import type { FilesState, NetworkSnapshot, ObservableSource, PanelSnapshot } from '../shared/types.ts'
import { BottomPanel } from '../bottom-panel/BottomPanel.tsx'
import { PreviewPane } from '../bottom-panel/PreviewPane.tsx'
import { RightBar } from '../right-bar/RightBar.tsx'
import { LeftBar } from '../left-bar/LeftBar.tsx'
import css from './EdexShell.module.css'
// Side-effect only: rethemes the stock composer capsule into a terminal input
// and the sidebar (new-session button + workspace tree) into terminal style
// (:global rules over their stable data hooks). The module class maps are
// unused; importing the files injects their <style data-plugin> tags.
import '../theme/TerminalComposer.module.css'
import '../theme/TerminalSidebar.module.css'

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
  /** Select a file in the current directory for the preview pane. */
  selectFile: (name: string) => void
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
  usePanel, useNetwork, useFiles, refreshFiles, navigateFiles, selectFile,
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
        <LeftBar usePanel={usePanel} />
      </aside>
      <aside className={css.rightBar}>
        <RightBar useNetwork={useNetwork} />
      </aside>
      <section className={css.bottomLeft}>
        <BottomPanel useFiles={useFiles} refresh={refreshFiles} navigate={navigateFiles} selectFile={selectFile} />
      </section>
      <section className={css.bottomRight}>
        <PreviewPane useFiles={useFiles} />
      </section>
      {/* Same faint CRT scanline texture as the panel cells, over the center
          region (the original UI), so the whole canvas reads as one surface. */}
      <section className={css.centerScanline} aria-hidden="true" />
    </div>
  )
}

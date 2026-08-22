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
import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { InjectFace } from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionListState, WorkspaceListState } from '@deepseek-ai/dsh-client-runtime/client'
import { paletteFor, shellVarsFor } from '../../settings.ts'
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
import '../theme/ConversationScrollbar.module.css'

/** The frame region the original UI is squeezed into (grid-column track of the viewport). */
export const CENTER_LEFT = '17vw'
export const CENTER_RIGHT = '21.25vw'
export const CENTER_BOTTOM = '36vh'

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

/** The last path segment. */
function basename(path: string): string {
  const trimmed = path.replace(/\/+$/, '')
  const index = trimmed.lastIndexOf('/')
  return index >= 0 ? trimmed.slice(index + 1) : trimmed
}

/** The shell entry's inject face: panel actions plus the four hook seats. */
export interface EdexShellInjected {
  /** Fetch storage + the current directory listing. */
  refreshFiles: () => void
  /** Navigate into a directory (or '..' up). */
  navigateFiles: (name: string) => void
  /** Select a file in the current directory for the preview pane. */
  selectFile: (name: string) => void
  /** Mark the open editor buffer dirty (called by the editor on doc changes). */
  markDirty: () => void
  /** Persist the editor buffer through the host `writeFile` Remote. */
  saveEditor: (content: string) => void
  /** Discard the dirty buffer and continue the paused navigation. */
  confirmDiscard: () => void
  /** Keep the dirty buffer and cancel the paused navigation. */
  cancelDiscard: () => void
  hooks: {
    panel: ObservableSource<PanelSnapshot>
    network: ObservableSource<NetworkSnapshot>
    files: ObservableSource<FilesState>
    /** Workspace list snapshot — feeds the terminal path prompt at the input's left edge. */
    workspaces: ObservableSource<WorkspaceListState>
    /** Session list snapshot — the prompt follows the ACTIVE conversation's workspace. */
    sessions: ObservableSource<SessionListState>
    /** Current theme color (the user's Settings → General → Theme Color pick). */
    themeColor: ObservableSource<string>
  }
}

/** Full composed props of the shell entry (hooks arrive as `use*` selector hooks). */
export type EdexShellProps = InjectFace<EdexShellInjected>

/** The full eDEX frame: left/right bars + bottom cells around the original UI. */
export function EdexShell({
  usePanel, useNetwork, useFiles, useWorkspaces, useSessions, useThemeColor,
  refreshFiles, navigateFiles, selectFile, markDirty, saveEditor, confirmDiscard, cancelDiscard,
}: EdexShellProps) {
  const shellRef = useRef<HTMLDivElement | null>(null)

  // The theme color drives the shell frame's --edex-* palette; the panel CSS
  // modules consume those variables, and the same palette feeds the token
  // override layer the browser half applies over the original UI.
  const themeColor = useThemeColor(s => s)
  const shellVars = shellVarsFor(paletteFor(themeColor))

  // The ACTIVE conversation's workspace folder — the terminal path prompt's
  // directory (same session→workspace mapping as the DIR panel).
  const sessionId = useSessions(s => s.current)
  const workspaces = useWorkspaces(s => s)
  const current = sessionId === undefined
    ? undefined
    : workspaces.items.find(workspace => workspace.sessionIds.includes(sessionId))
  const folder = current === undefined ? '' : basename(current.path)
  const folderRef = useRef(folder)
  folderRef.current = folder

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

  // Terminal path prompt at the LEFT edge of the composer input, on the same
  // line as the textarea (`~/<workspace> [input]`, classic-terminal style).
  // The composer card mounts lazily (per conversation), so a MutationObserver
  // injects the path element inside the draft scrollport, before the text
  // stack, once per card; TerminalComposer.module.css lays the scrollport out
  // as a flex row with the path (flex:none) beside the input (flex:1).
  useEffect(() => {
    const injected = new WeakSet<Element>()
    const syncPath = (el: HTMLElement): void => {
      const name = folderRef.current
      el.textContent = name === '' ? '' : `~/${name}`
      el.style.display = name === '' ? 'none' : 'inline-block'
    }
    const inject = (card: Element): void => {
      if (injected.has(card)) return
      injected.add(card)
      const scroll = card.querySelector('[data-input-scroll]')
      if (scroll === null) return
      const grow = scroll.firstElementChild // .grow — the text-stack wrapper
      if (grow === null) return
      const path = document.createElement('span')
      path.dataset.edexPath = ''
      path.className = css.pathPrompt ?? ''
      syncPath(path)
      scroll.insertBefore(path, grow)
    }
    const scan = (): void => {
      for (const card of document.querySelectorAll('[data-composer-card]')) inject(card)
    }
    scan()
    const observer = new MutationObserver(scan)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => { observer.disconnect() }
  }, [])

  // Keep every live path prompt in step with the active conversation's workspace.
  useEffect(() => {
    for (const el of document.querySelectorAll('[data-edex-path]')) {
      const path = el as HTMLElement
      path.textContent = folder === '' ? '' : `~/${folder}`
      path.style.display = folder === '' ? 'none' : 'inline-block'
    }
  }, [folder])

  // Fullscreen toggle button in the sidebar workspace browser header, next to
  // the three stock controls (search, view options, add workspace). The stock
  // header is owned by ui-workspace, so the button is injected into its action
  // cluster (the last direct <div> child of the section header — the search
  // slot is the previous one, the label a <span>) via the same MutationObserver
  // pattern as the path prompt. It drives the browser Fullscreen API on the
  // whole document and swaps its icon/aria-label on `fullscreenchange`.
  useEffect(() => {
    const injected = new WeakSet<Element>()
    let button: HTMLButtonElement | null = null
    const svg = (exit: boolean): string => exit
      // Compress: corners point inward (leave fullscreen).
      ? '<path d="M6 6H2V2M10 6h4V2M10 10h4v4M6 10H2v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
      // Expand: corners point outward (enter fullscreen).
      : '<path d="M6 2H2v4M10 2h4v4M10 14h4v-4M6 14H2v-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    const sync = (): void => {
      if (button === null) return
      const exit = document.fullscreenElement !== null
      const icon = button.querySelector('svg')
      if (icon !== null) icon.innerHTML = svg(exit)
      button.setAttribute('aria-label', exit ? 'Exit fullscreen' : 'Fullscreen')
    }
    document.addEventListener('fullscreenchange', sync)

    const inject = (): void => {
      if (button !== null && button.isConnected) return
      const host = document.querySelector('[data-slot="sidebar.workspaces"]')
      const root = host?.firstElementChild
      const header = root?.firstElementChild
      if (header === undefined || header === null) return
      // The stock action cluster (search, view options, add workspace) is the
      // header's button container — match its CSS-module class (local name
      // headerActions) rather than assuming a position, and fall back to the
      // first direct DIV child.
      const actions = header.querySelector('div[class*="headerActions"]')
        ?? [...header.children].find(el => el.tagName === 'DIV')
      if (actions === undefined || actions === null) return
      if (injected.has(actions)) return
      injected.add(actions)
      button = document.createElement('button')
      button.type = 'button'
      button.className = css.fullscreenBtn ?? ''
      button.setAttribute('data-edex-fullscreen', '')
      button.setAttribute('aria-label', 'Fullscreen')
      button.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">${svg(false)}</svg>`
      button.addEventListener('click', () => {
        if (document.fullscreenElement !== null) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen()
      })
      actions.appendChild(button)
      sync()
    }
    inject()
    const observer = new MutationObserver(inject)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
      document.removeEventListener('fullscreenchange', sync)
      button?.remove()
    }
  }, [])

  return (
    <div
      ref={shellRef}
      className={css.shell}
      style={shellVars as CSSProperties}
      data-edex-shell=""
      data-testid="edex-shell"
    >
      <aside className={css.leftBar}>
        <LeftBar usePanel={usePanel} />
      </aside>
      <aside className={css.rightBar}>
        <RightBar useNetwork={useNetwork} color={themeColor} />
      </aside>
      <section className={css.bottomLeft}>
        <BottomPanel useFiles={useFiles} refresh={refreshFiles} navigate={navigateFiles} selectFile={selectFile} />
      </section>
      <section className={css.bottomRight}>
        <PreviewPane
          useFiles={useFiles}
          markDirty={markDirty}
          saveEditor={saveEditor}
          confirmDiscard={confirmDiscard}
          cancelDiscard={cancelDiscard}
        />
      </section>
      {/* Same faint CRT scanline texture as the panel cells, over the center
          region (the original UI), so the whole canvas reads as one surface. */}
      <section className={css.centerScanline} aria-hidden="true" />
    </div>
  )
}

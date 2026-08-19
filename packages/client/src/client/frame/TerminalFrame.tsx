/**
 * Terminal shell root frame: boot sequence, top status bar, session rail,
 * the per-session workspace slot, and the monitor bar. Pure component —
 * everything arrives through the framework shares and the inject face.
 */
import { useEffect, useMemo, useState } from 'react'
import type {
  PropsLocale, PropsRenderSlots, PropsRuntime, PropsStore, TranslateNS,
} from '@deepseek-ai/dsh-client-ui-slots'
import type { SessionId } from '@deepseek-ai/dsh-api-remotes/client'
import type { SessionSummary } from '@deepseek-ai/dsh-client-runtime/client'
import type { ObservableSource } from '../pty-client.ts'
import type { MonitorObservation } from '../monitor-poller.ts'
import type { createTerminalFrameStore } from '../stores.ts'
import type { TerminalKey } from '../locales.ts'
import { BootSequence } from './BootSequence.tsx'
import { SystemMonitorBar } from './SystemMonitorBar.tsx'
import css from './TerminalFrame.module.css'

/** Boot overlay dwell time before the frame settles in. */
export const BOOT_DWELL_MS = 1600

/** The root entry's inject face: session navigation plus the monitor hook seat. */
export interface TerminalFrameInjected {
  /** Select a session as current. */
  openSession: (id: SessionId) => void
  /** Run the New Session flow (explicit, current, or recent workspace). */
  newSession: () => void
  /** Bare observable monitor source bound to the `useMonitor` hook by the renderer. */
  hooks: { monitor: ObservableSource<MonitorObservation> }
}

/** Localized shell string keys. */
export type ShellKey = TerminalKey

/** Full composed props: runtime share + child-slot render share + store share + locale + inject face. */
export type TerminalFrameProps =
  & PropsRuntime<'root'>
  & PropsRenderSlots<'terminal.workspace'>
  & PropsStore<ReturnType<typeof createTerminalFrameStore>>
  & PropsLocale<'terminal'>
  & TerminalFrameInjected

/** Render one status-bar segment value (clock). */
function clockNow(): string {
  return new Date().toLocaleTimeString()
}

/** One workspace group in the session rail. */
interface RailGroup {
  key: string
  title: string
  sessionIds: readonly SessionId[]
}

/** Collapsible workspace folder in the session rail. */
function RailFolder({
  title, sessionIds, byId, current, onOpen,
}: {
  title: string
  sessionIds: readonly SessionId[]
  byId: Record<SessionId, SessionSummary>
  current: SessionId | undefined
  onOpen: (id: SessionId) => void
}) {
  const [open, setOpen] = useState(true)
  return (
    <li className={css.railGroup}>
      <button
        type="button"
        className={css.railGroupHeader}
        aria-expanded={open}
        onClick={() => { setOpen(!open) }}
      >
        <span className={css.railChevron}>{open ? '▾' : '▸'}</span>
        <span className={css.railGroupTitle}>{title}</span>
      </button>
      {open && sessionIds.map((id) => {
        const summary = byId[id]
        return (
          <button
            key={id}
            type="button"
            className={css.railItem}
            data-active={current === id ? '' : undefined}
            onClick={() => { onOpen(id) }}
          >
            <span className={css.railTitle}>{summary?.displayTitle ?? id}</span>
            {summary?.running === true && <span className={css.railStatus}>▶</span>}
          </button>
        )
      })}
    </li>
  )
}

/** The root occupant: full-screen CRT frame around the per-session workspace. */
export function TerminalFrame({
  renderSlot, useStore, actions, useSessions, useWorkspaces, useMonitor, t,
  openSession, newSession,
}: TerminalFrameProps) {
  const frame = useStore(s => s)
  const sessions = useSessions(s => s)
  const workspaces = useWorkspaces(s => s)
  const monitor = useMonitor(o => o)
  const [clock, setClock] = useState(clockNow)
  const [booted, setBooted] = useState(false)

  // Session rail grouped by workspace folder (mirroring the default surface):
  // each workspace's accounted sessions, then the ungrouped bucket. Archived
  // sessions are hidden everywhere, matching the workspace grouping surfaces.
  const railGroups = useMemo(() => {
    const archived = new Set(workspaces.archivedSessionIds)
    const accounted = new Set<SessionId>()
    const groups: RailGroup[] = []
    for (const workspace of workspaces.items) {
      const sessionIds = workspace.sessionIds
        .filter(id => !archived.has(id) && sessions.byId[id] !== undefined)
      for (const id of sessionIds) accounted.add(id)
      if (sessionIds.length === 0) continue
      groups.push({ key: workspace.workspaceId, title: workspace.title, sessionIds })
    }
    const ungrouped = sessions.ids
      .filter(id => !archived.has(id) && sessions.byId[id] !== undefined && !accounted.has(id))
    if (ungrouped.length > 0) {
      groups.push({ key: '--', title: '—', sessionIds: ungrouped })
    }
    return groups
  }, [sessions, workspaces])

  useEffect(() => {
    const timer = setTimeout(() => setBooted(true), BOOT_DWELL_MS)
    return () => { clearTimeout(timer) }
  }, [])

  useEffect(() => {
    const timer = setInterval(() => { setClock(clockNow) }, 1000)
    return () => { clearInterval(timer) }
  }, [])

  return (
    <div className={css.shell} data-terminal-shell="">
      {!booted && <BootSequence t={t} />}
      <header className={css.topBar}>
        <span className={css.product}>{t('shell.title')}</span>
        <span className={css.spacer} />
        <button
          type="button"
          className={css.tabButton}
          data-active={frame.panel === 'chat' ? '' : undefined}
          onClick={() => actions.setPanel('chat')}
        >
          {t('shell.chat')}
        </button>
        <button
          type="button"
          className={css.tabButton}
          data-active={frame.panel === 'pty' ? '' : undefined}
          onClick={() => actions.setPanel('pty')}
        >
          {t('shell.shell')}
        </button>
        <span className={css.spacer} />
        <span className={css.clock}>{clock}</span>
      </header>
      <div className={css.body}>
        <nav className={css.rail} aria-label={t('shell.sessions')}>
          <div className={css.railHeader}>
            <span>{t('shell.sessions')}</span>
            <button type="button" className={css.railNew} onClick={newSession} aria-label={t('shell.newSession')}>
              +
            </button>
          </div>
          <ul className={css.railList}>
            {railGroups.map(group => (
              <RailFolder
                key={group.key}
                title={group.title}
                sessionIds={group.sessionIds}
                byId={sessions.byId}
                current={sessions.current}
                onOpen={openSession}
              />
            ))}
          </ul>
        </nav>
        <main className={css.workspace}>
          {renderSlot('terminal.workspace', {
            panel: frame.panel,
            onSetPanel: (panel: 'chat' | 'pty') => { actions.setPanel(panel) },
          })}
        </main>
      </div>
      {frame.monitorVisible && <SystemMonitorBar observation={monitor} t={t} />}
      <footer className={css.bottomBar}>
        <button
          type="button"
          className={css.monitorToggle}
          onClick={() => { actions.toggleMonitor() }}
        >
          {t('shell.monitor')} {frame.monitorVisible ? '◉' : '○'}
        </button>
      </footer>
    </div>
  )
}
